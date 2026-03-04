import dotenv from "dotenv";
dotenv.config();

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import Meeting from "../models/Meeting.js";

// --- CONFIG & SAFETY CHECKS ---
const hasKeys = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
const validEndpoint = process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.startsWith("https://");

console.log("🔐 R2 Config Status:", {
  KeyID: hasKeys ? "✅ Loaded" : "❌ MISSING",
  Endpoint: validEndpoint ? "✅ Valid HTTPS" : "❌ INVALID",
  Bucket: process.env.R2_BUCKET_NAME
});

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true
});

const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");

export const handleJaaSWebhook = async (req, res) => {

  // We reply immediately so JaaS knows we received it.
  res.status(200).send("OK");

  try {
    const event = req.body;

    // Safety check
    if (!event || !event.eventType) return;

    if (event.eventType === "RECORDING_UPLOADED" ||
      event.eventType === "CERTIFIED_REC_UPLOADED") {

      console.log(`📥 Processing Background Upload: ${event.eventType}`);

      const { data } = event;
      const downloadLink = data.preAuthenticatedLink;

      // 1. PARSE ROOM NAME (Position Based)
      // Expected Format: "Loopy-<ProjectID>-<MeetingID>-<SessionUUID>"
      let jaasRoomName = "";
      if (event.fqn) {
        jaasRoomName = event.fqn.split("/")[1];
      }

      console.log(`🔎 Analyzing Room String: ${jaasRoomName}`);

      let meetingId = null;
      let projectId = null;

      // 2. SMART PARSING (The Fix)
      // Regex for a 24-character Mongo ID
      const isDirectId = /^[0-9a-fA-F]{24}$/.test(jaasRoomName);

      if (isDirectId) {
        // CASE A: Room Name IS the Meeting ID
        meetingId = jaasRoomName;
        console.log(`🧩 Direct ID Match: ${meetingId}`);
      } else {
        // CASE B: Room Name is "Loopy-ProjectID-MeetingID"
        const parts = jaasRoomName.split("-");
        if (parts.length >= 3) {
          projectId = parts[1];
          meetingId = parts[2];
          console.log(`🧩 Parsed Long Format -> Project: ${projectId} | Meeting: ${meetingId}`);
        }
      }

      // 3. DATABASE LOOKUP
      let meeting = null;
      if (meetingId) {
        try {
          meeting = await Meeting.findById(meetingId);
        } catch (e) {
          console.log("⚠️ Parsed Meeting ID was not a valid Mongo ID");
        }
      }

      // 3. DETERMINE FOLDERS
      let folderName = "Uncategorized";
      let fileName = "Untitled";

      if (meeting) {
        // Success! We found the exact doc.
        folderName = sanitize(meeting.projectName || "Unknown_Project");
        fileName = sanitize(meeting.title || "Untitled_Meeting");
        console.log(` DATABASE MATCH: Saving to "${folderName}/${fileName}"`);
      }
      else if (projectId) {
        // Fallback: If DB lookup fails, use the Project ID from the URL!
        folderName = `Project_${projectId}`;
        fileName = `Meeting_${meetingId || "Unknown"}`;
        console.log(` DB Lookup failed. Using IDs from URL for folder name.`);
      }

      if (!downloadLink) {
        console.log(" No download link. Stopping.");
        return;
      }

      // 4. UPLOAD LOGIC
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

      await upload.done()
      console.log(`Bridge Complete: Uploaded to "${r2Key}"`);

      // 5. UPDATE DB
      const publicR2Url = `${process.env.R2_PUBLIC_DOMAIN}/${r2Key}`;                         //`${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${r2Key}`;

      if (meeting) {
        meeting.recordingUrl = publicR2Url;
        await meeting.save();
        console.log("Database updated.");
        // 🟢 NEW FAST WAY (Fire-and-Forget)
        const transcriptionServiceUrl = `${process.env.TRANSCRIPTION_SERVICE_URL}/transcribe`;

        console.log("🚀 Triggering Transcription Service...");

        // 2. Timeout of 1000ms ensures we don't hang if the port is weird.
        axios.post(transcriptionServiceUrl, {
          meetingId: meeting._id,
          projectId: meeting.projectId,
          recordingUrl: publicR2Url,
          filename: fileName
        }, { timeout: 2000 })
          .then(() => console.log("✅ Transcription Service acknowledge receipt."))
          .catch((err) => {
            // We ignore timeouts because that means the request was sent!
            if (err.code === 'ECONNABORTED') {
              console.log("✅ Trigger sent (Background processing started)");
            } else {
              console.error("⚠️ Trigger Warning:", err.message);
            }
          });
      }
    }
  } catch (error) {
    console.error(" Background Error:", error.message);
  }
};