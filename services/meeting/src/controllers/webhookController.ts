import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import Meeting from "../models/Meeting.js";
import JaasWebhookReceipt from "../models/JaasWebhookReceipt.js";
import { Request, Response } from "express";
import crypto from "crypto";
import { getR2Client } from "@loopy/shared";

const r2 = getR2Client();

const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, "_");

type RequestWithRaw = Request & { rawBody?: Buffer };

/** JaaS signs `timestamp + "." + raw JSON body` (8x8 docs). v1 is base64 and may contain "=" — only split on first "=" per segment. */
const verifyJaasSignature = (req: Request): boolean => {
  try {
    const signatureHeader = req.headers["x-jaas-signature"] as string;
    if (!signatureHeader) {
      console.log("Missing X-Jaas-Signature header");
      return false;
    }

    let timestamp = "";
    let v1Signature = "";
    const elements = signatureHeader.split(",");
    for (const el of elements) {
      const idx = el.indexOf("=");
      if (idx === -1) continue;
      const prefix = el.slice(0, idx).trim();
      const value = el.slice(idx + 1);
      if (prefix === "t") timestamp = value;
      if (prefix === "v1") v1Signature = value;
    }

    if (!timestamp || !v1Signature) return false;

    const raw = (req as RequestWithRaw).rawBody;
    const payloadString =
      raw !== undefined && raw.length > 0
        ? raw.toString("utf8")
        : JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${payloadString}`;

    const webhookSecret = process.env.JAAS_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      console.error("JAAS_WEBHOOK_SECRET not defined in enviroment");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(Buffer.from(signedPayload, "utf8"))
      .digest("base64");

    if (expectedSignature.length !== v1Signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(v1Signature));
  } catch (err) {
    console.error("Webhook Signature Verification Error:", err);
    return false;
  }
};

/** Transcription app mounts POST /api/artifacts/transcribe. Env may be service root or .../api/artifacts. */
function resolveTranscribeUrl(): string {
  const raw = (process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:5005")
    .trim()
    .replace(/\/$/, "");
  if (raw.endsWith("/api/artifacts")) {
    return `${raw}/transcribe`;
  }
  return `${raw}/api/artifacts/transcribe`;
}

const triggerTranscription = async (meeting: any, publicR2Url: string, fileName: string) => {
  try {
    const transcriptionServiceUrl = resolveTranscribeUrl();
    console.log(`[Webhook] Triggering transcription POST ${transcriptionServiceUrl}`);

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

    const domainRaw = (process.env.R2_PUBLIC_DOMAIN ?? "").trim();
    if (!domainRaw) {
      console.error("[Webhook] R2_PUBLIC_DOMAIN is not set; cannot publish recording URL.");
      return;
    }
    const keyClean = r2Key.replace(/^\/+/, "");
    const base = domainRaw.includes("://")
      ? domainRaw.replace(/\/+$/, "")
      : `https://${domainRaw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
    const publicR2Url = `${base}/${keyClean}`;

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
  const event = req.body as {
    eventType?: string;
    fqn?: string;
    idempotencyKey?: string;
  } | null;
  const idempotencyKey =
    typeof event?.idempotencyKey === "string" && event.idempotencyKey.length > 0
      ? event.idempotencyKey
      : undefined;

  console.log(
    `[JaaS webhook] hit eventType=${event?.eventType ?? "(missing)"} fqn=${(event as any)?.fqn ?? ""} idempotencyKey=${idempotencyKey ?? ""}`
  );

  // Validate signature if secret is provided in environment
  if (process.env.JAAS_WEBHOOK_SECRET) {
    const isValid = verifyJaasSignature(req);
    if (!isValid) {
      // JaaS has (had) a known edge case: retries may send a slightly different body while
      // keeping the same X-Jaas-Signature, so HMAC never matches on the retry. If we already
      // accepted this idempotencyKey, ACK so JaaS stops retrying (8x8/jaas_demo#8).
      if (idempotencyKey) {
        const already = await JaasWebhookReceipt.findOne({ idempotencyKey }).lean();
        if (already) {
          console.warn(
            "[JaaS webhook] Signature mismatch but idempotencyKey already processed — ACK duplicate (JaaS retry)"
          );
          return res.status(200).send("OK");
        }
      }
      console.error("[JaaS webhook] Signature verification failed (check JAAS_WEBHOOK_SECRET and raw body)");
      return res.status(401).json({ message: "Invalid Webhook Signature" });
    }
  } else {
    console.warn("[JaaS webhook] JAAS_WEBHOOK_SECRET not set — skipping signature check (dev only)");
  }

  // Dedupe: same idempotencyKey must not run R2/transcription twice
  if (idempotencyKey) {
    try {
      await JaasWebhookReceipt.create({
        idempotencyKey,
        eventType: event?.eventType,
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        console.log(
          `[JaaS webhook] Duplicate idempotencyKey=${idempotencyKey}, skipping background work`
        );
        return res.status(200).send("OK");
      }
      throw e;
    }
  }

  // Reply so JaaS knows it is received (after we claim idempotency)
  res.status(200).send("OK");

  try {
    if (!event || !event.eventType) return;

    if (
      event.eventType === "RECORDING_UPLOADED" ||
      event.eventType === "CERTIFIED_REC_UPLOADED"
    ) {
      console.log(`[JaaS webhook] Processing upload: ${event.eventType}`);
      processBackgroundUpload(event).catch((err) =>
        console.error("[JaaS webhook] Background upload error:", err)
      );
    } else {
      console.log(`[JaaS webhook] Ignoring event type: ${event.eventType}`);
    }
  } catch (error: any) {
    console.error("[JaaS webhook] Handler error:", error.message);
  }
};