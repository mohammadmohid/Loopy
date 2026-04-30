import dotenv from "dotenv";
dotenv.config();

import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import Meeting from "../models/Meeting.js";
import { Request, Response } from "express";
import crypto from "crypto";
import { getR2Client } from "@loopy/shared";

const r2 = getR2Client();

const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, "_");

const verifyJaasSignature = (req: Request): boolean => {
  try {
    const signatureHeader = req.headers['x-jaas-signature'] as string;
    if (!signatureHeader) {
      console.log("Missing X-Jaas-Signature header");
      return false;
    }

    const elements = signatureHeader.split(',');
    let timestamp = '';
    let v1Signature = '';

    for (const el of elements) {
      const [prefix, value] = el.split('=');
      if (prefix === 't') timestamp = value;
      if (prefix === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) return false;

    const payloadString = JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${payloadString}`;

    const webhookSecret = process.env.JAAS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("JAAS_WEBHOOK_SECRET not defined in enviroment");
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('base64');

    return v1Signature === expectedSignature;
  } catch (err) {
    console.error("Webhook Signature Verification Error:", err);
    return false;
  }
};

const triggerTranscription = async (meeting: any, publicR2Url: string, fileName: string) => {
  try {
    const transcriptionServiceUrl = `${process.env.TRANSCRIPTION_SERVICE_URL}/transcribe`;
    console.log(`Triggering Transcription`);

    await axios.post(transcriptionServiceUrl, {
      meetingId: meeting._id,
      projectId: meeting.projectId,
      recordingUrl: publicR2Url,
      filename: fileName
    }, { timeout: 2000 });

    console.log("Transcription acknowledge receipt.");
  } catch (err: any) {
    if (err.code === 'ECONNABORTED') {
      console.log("Trigger sent (Background processing started - timeout ignored)");
    } else {
      console.error("Trigger Warning:", err.message);
    }
  }
};

const processBackgroundUpload = async (event: any) => {
  try {
    const { data } = event;
    const downloadLink = data.preAuthenticatedLink;

    let jaasRoomName = "";
    if (event.fqn) {
      jaasRoomName = event.fqn.split("/")[1];
    }

    console.log(`Analyzing Room String: ${jaasRoomName}`);

    let meetingId = null;
    let projectId = null;

    const isDirectId = /^[0-9a-fA-F]{24}$/.test(jaasRoomName);

    if (isDirectId) {
      meetingId = jaasRoomName;
      console.log(`Direct ID Match: ${meetingId}`);
    } else {
      const parts = jaasRoomName.split("-");
      if (parts.length >= 3) {
        projectId = parts[1];
        meetingId = parts[2];
        console.log(`Parsed Long Format -> Project: ${projectId} | Meeting: ${meetingId}`);
      }
    }

    let meeting = null;
    if (meetingId) {
      try {
        meeting = await Meeting.findById(meetingId);
      } catch (e) {
        console.log("Parsed Meeting ID was not a valid Mongo ID");
      }
    }

    let folderName = "Uncategorized";
    let fileName = "Untitled";

    if (meeting) {
      folderName = `Project_${meeting.projectId}`;
      fileName = sanitize(meeting.title || "Untitled_Meeting");
      console.log(`Saving to "${folderName}/${fileName}"`);
    } else if (projectId) {
      folderName = `Project_${projectId}`;
      fileName = `Meeting_${meetingId || "Unknown"}`;
      console.log(`Lookup failed. Using IDs from URL for folder name.`);
    }

    if (!downloadLink) {
      console.log("No download link. Stopping.");
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now().toString().slice(-4);
    const r2Key = `${folderName}/${fileName}_${timestamp}_${uniqueSuffix}.mp4`;

    const response = await axios({
      method: "get",
      url: downloadLink,
      responseType: "stream",
    });

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: response.data,
        ContentType: "video/mp4",
      },
    });

    // Handle stream errors
    response.data.on('error', (err: any) => {
      console.error("Stream error downloading from JaaS:", err);
    });

    await upload.done();
    console.log(`Bridge Complete: Uploaded to "${r2Key}"`);

    const publicR2Url = `${process.env.R2_PUBLIC_DOMAIN}/${r2Key}`;

    if (meeting) {
      meeting.recordingUrl = publicR2Url;
      await meeting.save();
      console.log("Database updated.");

      await triggerTranscription(meeting, publicR2Url, fileName);
    }
  } catch (error: any) {
    console.error(" Background Processing Error:", error.message);
  }
};

export const handleJaaSWebhook = async (req: Request, res: Response) => {
  // Validate signature if secret is provided in environment
  if (process.env.JAAS_WEBHOOK_SECRET) {
    const isValid = verifyJaasSignature(req);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid Webhook Signature" });
    }
  }

  // Reply first so JaaS knows its is received
  res.status(200).send("OK");

  try {
    const event = req.body;
    if (!event || !event.eventType) return;

    if (event.eventType === "RECORDING_UPLOADED") {
      console.log(`Processing Background Upload: ${event.eventType}`);
      processBackgroundUpload(event).catch(err => console.error("Unhandled Background Error:", err));
    }
  } catch (error: any) {
    console.error(" Webhook Handler Error:", error.message);
  }
};