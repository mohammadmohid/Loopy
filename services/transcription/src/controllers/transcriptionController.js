import axios from "axios";
import Artifact from "../models/Artifact.js";
import Meeting from "../models/Meeting.js";
import UserRead from "../models/UserRead.js";
import mongoose from "mongoose";
import { buildRelatedMeetingsContextBlock } from "../utils/relatedMeetingsContext.js";
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";

//  Convert ElevenLabs or Deepgram JSON to plain text
const parseTranscriptToText = (transcriptJson) => {
  if (transcriptJson && transcriptJson.deepgram) return transcriptJson.text || "";
  if (!transcriptJson || !transcriptJson.words) return "";
  return transcriptJson.words.map(w => w.text).join(" ");
};

// OpenRouter disabled by request: Gemini-only pipeline.
// function getOpenRouterApiKey() {
//   const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API;
//   return key && String(key).trim() ? String(key).trim() : "";
// }

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  return key && String(key).trim() ? String(key).trim() : "";
}

const MAX_TRANSCRIPT_CHARS_FOR_SUMMARY = 120000;

/** Match artifacts whether meetingId was stored as string or ObjectId (same as getArtifact). */
function buildArtifactMeetingIdQuery(meetingId) {
  const sid = String(meetingId);
  const or = [{ meetingId: sid }];
  if (mongoose.isValidObjectId(sid)) {
    or.push({ meetingId: new mongoose.Types.ObjectId(sid) });
  }
  return { $or: or };
}

async function findArtifactByMeetingId(meetingId) {
  return Artifact.findOne(buildArtifactMeetingIdQuery(meetingId));
}

/** Wall-clock cap for Deepgram + summary; 0 = disabled. Env: TRANSCRIPTION_MAX_PROCESSING_MS (default 15 min). */
function getMaxProcessingMs() {
  const raw = process.env.TRANSCRIPTION_MAX_PROCESSING_MS;
  if (raw === "0" || raw === "") return 0;
  const v = Number(raw ?? "900000");
  return Number.isFinite(v) && v > 0 ? v : 900000;
}

/**
 * If artifact has been processing/pending longer than TRANSCRIPTION_MAX_PROCESSING_MS, mark FAILED (atomic).
 * Returns the document to use for the response / follow-up logic (refreshed from DB when possible).
 */
async function markStaleProcessingAsFailed(artifact) {
  if (!artifact) return artifact;
  const maxMs = getMaxProcessingMs();
  if (maxMs <= 0) return artifact;

  const st = artifact.transcriptionStatus;
  if (st !== "processing" && st !== "pending") return artifact;

  const cutoff = new Date(Date.now() - maxMs);
  const errMsg = `Transcription exceeded the maximum processing time (${Math.round(maxMs / 60000)} minutes). You can try generating the transcript again.`;

  const updated = await Artifact.findOneAndUpdate(
    {
      _id: artifact._id,
      transcriptionStatus: { $in: ["processing", "pending"] },
      updatedAt: { $lte: cutoff },
    },
    { $set: { transcriptionStatus: "FAILED", error: errMsg } },
    { new: true }
  );

  if (updated) {
    console.warn(
      `[Transcription] Stale ${st} → FAILED (>${maxMs}ms) artifact=${artifact._id} meetingId=${artifact.meetingId}`
    );
    return updated;
  }

  const refreshed = await Artifact.findById(artifact._id);
  return refreshed || artifact;
}

function mdTableCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "/")
    .replace(/\r?\n/g, " ")
    .trim();
}

async function buildParticipantsBulletLines(meetingLean) {
  const hostLabel = (meetingLean.hostName || "").trim() || "Unspecified";
  const lines = [`Host (${hostLabel})`];
  const rawIds = Array.isArray(meetingLean.participants) ? meetingLean.participants : [];
  const hostIdStr = meetingLean.hostId != null ? String(meetingLean.hostId) : null;
  const others = [...new Set(rawIds.map((x) => String(x)))].filter(
    (id) => !hostIdStr || id !== hostIdStr
  );

  const oids = others.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
  let users = [];
  if (oids.length) {
    try {
      users = await UserRead.find({ _id: { $in: oids } })
        .select("profile.firstName profile.lastName email")
        .lean();
    } catch (e) {
      console.warn("[Summary] participant name lookup failed:", e.message);
    }
  }
  const byId = new Map(users.map((u) => [String(u._id), u]));

  for (const id of others) {
    const u = byId.get(id);
    const name = u
      ? `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.email || id
      : id;
    lines.push(name);
  }
  return lines;
}

async function buildParticipantsMarkdownBlock(meetingLean) {
  if (!meetingLean) {
    return "**Participants:**\n- Host (Unspecified)\n";
  }
  const lines = await buildParticipantsBulletLines(meetingLean);
  return `**Participants:**\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
}

async function loadMeetingSummaryContext({ meetingId, projectId }) {
  let title = null;
  let agenda = "";
  let projectName = null;
  let meetingCreatedAtIso = null;
  let participantsBlock = "**Participants:**\n- Host (Unspecified)\n";
  let meetingLean = null;

  try {
    meetingLean = await Meeting.findById(meetingId)
      .select("title agenda projectName hostId hostName participants createdAt")
      .lean();
    if (meetingLean) {
      title = meetingLean.title || null;
      agenda = meetingLean.agenda || "";
      projectName = meetingLean.projectName || null;
      meetingCreatedAtIso = meetingLean.createdAt
        ? new Date(meetingLean.createdAt).toISOString()
        : null;
      participantsBlock = await buildParticipantsMarkdownBlock(meetingLean);
    }
  } catch (e) {
    console.warn("[Summary] could not load meeting:", e.message);
  }

  let relatedMeetingsContext = "";
  try {
    relatedMeetingsContext = await buildRelatedMeetingsContextBlock({
      currentMeetingId: meetingId,
      projectId,
      currentAgenda: agenda,
    });
  } catch (e) {
    console.warn("[Summary] related meetings context failed:", e.message);
  }

  return {
    title,
    agenda,
    relatedMeetingsContext,
    projectName,
    meetingCreatedAtIso,
    participantsBlock,
  };
}

function stripLeadingNoise(markdown) {
  const s = String(markdown || "").trim();
  const marker = "**Agenda**";
  const idx = s.indexOf(marker);
  if (idx > 0) return s.slice(idx).trim();
  return s;
}

function assembleLoopyMinutesMarkdown({
  headerLeft,
  headerRight,
  meetingTitle,
  meetingIsoDate,
  participantsBlock,
  llmSectionsMarkdown,
}) {
  const left = mdTableCell(headerLeft);
  const right = mdTableCell(headerRight);
  const titleLine = mdTableCell(meetingTitle);
  const cleaned = stripLeadingNoise(llmSectionsMarkdown);
  return [
    `|  |  |`,
    `| :--- | ---: |`,
    `| ${left} | **${right}** |`,
    ``,
    `---`,
    ``,
    `# ${titleLine}`,
    ``,
    `**Date and Time:**`,
    meetingIsoDate,
    ``,
    String(participantsBlock || "").trim(),
    ``,
    cleaned,
  ].join("\n");
}

function buildInnerMinutesSectionsPrompt(fullText, { title, hostAgenda, relatedMeetingsContext } = {}) {
  const clipped =
    fullText.length > MAX_TRANSCRIPT_CHARS_FOR_SUMMARY
      ? `${fullText.slice(0, MAX_TRANSCRIPT_CHARS_FOR_SUMMARY)}\n\n[... transcript truncated for AI processing ...]`
      : fullText;

  const relatedBlock = relatedMeetingsContext
    ? `${relatedMeetingsContext}\n`
    : "";

  const agendaHint = (hostAgenda || "").trim()
    ? `Host-provided agenda (use as the basis for the **Agenda** bullets; keep items short; add bullets only for clearly discussed topics not already listed):\n${String(hostAgenda).trim()}\n\n`
    : "";

  const safeTitle = (title || "Meeting").replace(/"/g, "'");

  return `You are an expert professional meeting secretary.

Produce ONLY these three markdown sections for the meeting "${safeTitle}". Do not add any other sections, titles, horizontal rules, tables, participant lists, or date lines.

Output rules (strict):
1) The first line of your response MUST be exactly: **Agenda**
2) Use these exact bold headings in order: **Agenda**, **Meeting Minutes / Key Takeaways**, **Action Items**
3) **Agenda**: bullet list using "- " for each item.
4) **Meeting Minutes / Key Takeaways**: bullet list of factual recap from the transcript only (no invented facts).
5) **Action Items**: each line must look like: - [ ] Task description (AssigneeName). Use "Unspecified" if assignee unknown.

${agendaHint}${relatedBlock}TRANSCRIPT:
${clipped}`;
}

function deriveOverviewFromText(summaryText, transcriptText = "") {
  const summary = (summaryText || "").trim();
  if (!summary) return "";

  const overviewMatch = summary.match(
    /(?:^|\n)\s*overview(?:\s*\(.*?\))?\s*:\s*([\s\S]*?)(?:\n\s*(?:\*\*)?(participants|agenda|meeting minutes|action items)\b|$)/i
  );
  if (overviewMatch?.[1]) {
    const cleaned = overviewMatch[1].replace(/\n+/g, " ").trim();
    if (cleaned) return cleaned.slice(0, 520);
  }

  const mmMatch = summary.match(
    /\*\*Meeting Minutes \/ Key Takeaways\*\*\s*([\s\S]*?)(?=\n\*\*Action Items\*\*|$)/i
  );
  if (mmMatch?.[1]) {
    const body = mmMatch[1].trim();
    const bulletTexts = body
      .split(/\n/)
      .filter((l) => /^\s*-\s+/.test(l))
      .map((l) => l.replace(/^\s*-\s+/, "").trim())
      .filter(Boolean);
    if (bulletTexts.length) {
      return bulletTexts
        .slice(0, 4)
        .join(" ")
        .slice(0, 520);
    }
    const cleaned = body.replace(/\n+/g, " ").trim();
    if (cleaned) return cleaned.slice(0, 520);
  }

  const source = (transcriptText || summary).replace(/\s+/g, " ").trim();
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const short = sentences.slice(0, 4).join(" ");
  return short.slice(0, 520);
}

/** @returns {Promise<string|null>} markdown minutes or null on failure */
async function summarizeWithGemini(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const modelName = "gemini-2.5-flash";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const c = response.candidates?.[0];
    if (!c?.content?.parts?.length) {
      const br = c?.finishReason || response.promptFeedback?.blockReason;
      console.warn(`[Summary] Gemini (${modelName}) empty response`, br || "");
      return null;
    }
    const text = response.text().trim();
    return text || null;
  } catch (err) {
    console.warn(`[Summary] Gemini (${modelName}) failed:`, err.message);
    return null;
  }
}

/** @returns {Promise<string|null>} markdown minutes or null on failure */
// async function summarizeWithOpenRouter(prompt) { ... } // disabled

const MAX_TRANSCRIPT_CHARS_FOR_ASK_BOT = Number(
  process.env.ASK_BOT_MAX_TRANSCRIPT_CHARS || "100000"
);

function clipTranscriptForAskBot(fullText) {
  const max = Number.isFinite(MAX_TRANSCRIPT_CHARS_FOR_ASK_BOT)
    ? MAX_TRANSCRIPT_CHARS_FOR_ASK_BOT
    : 100000;
  if (!fullText || fullText.length <= max) return fullText;
  return `${fullText.slice(0, max)}\n\n[... transcript truncated ...]`;
}

function buildAskBotUserContent(fullText, question) {
  const clipped = clipTranscriptForAskBot(fullText);
  return `TRANSCRIPT:
${clipped}

USER QUESTION:
${question}`;
}

const ASK_BOT_SYSTEM = `You are a helpful, professional AI assistant assigned to answer questions about a specific meeting.
Your ONLY source of truth is the transcript provided in the user message.
If the user's question cannot be answered using the transcript, politely inform them that it wasn't mentioned in the meeting.
Keep answers concise unless the user asks for detail.`;

// async function askBotWithOpenRouter(userContent) { ... } // disabled

/** @returns {Promise<string|null>} */
async function askBotWithGemini(userContent) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const modelName = "gemini-2.5-flash";
  const prompt = `${ASK_BOT_SYSTEM}\n\n${userContent}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const c = response.candidates?.[0];
    if (!c?.content?.parts?.length) {
      console.warn(`[AskBot] Gemini (${modelName}) empty response`);
      return null;
    }
    const text = response.text().trim();
    return text || null;
  } catch (err) {
    console.warn(`[AskBot] Gemini (${modelName}) failed:`, err.message);
    return null;
  }
}

// function defaultChatAiOrder() { ... } // disabled (Gemini-only)

async function runAskBotAnswer(fullText, question) {
  const userContent = buildAskBotUserContent(fullText, question);
  return await askBotWithGemini(userContent);
}

/** Meeting minutes via Gemini only (gemini-2.5-flash). Assembles fixed header + DB participants + LLM sections. */
async function runGeminiSummary(
  fullText,
  { title, date, meetingId, projectId } = {}
) {
  if (!fullText || fullText.length < 50) return "Transcript too short to summarize.";

  let ctx = {
    title: title || null,
    agenda: "",
    relatedMeetingsContext: "",
    projectName: null,
    meetingCreatedAtIso: null,
    participantsBlock: "**Participants:**\n- Host (Unspecified)\n",
  };

  if (meetingId) {
    try {
      ctx = { ...ctx, ...(await loadMeetingSummaryContext({ meetingId: String(meetingId), projectId })) };
    } catch (e) {
      console.warn("[Summary] loadMeetingSummaryContext failed:", e.message);
    }
  }

  const meetingTitle = ctx.title || title || "Meeting Minutes";
  const headerRight = ctx.projectName || meetingTitle;
  const headerLeft = new Date().toLocaleString();
  let meetingIsoDate = ctx.meetingCreatedAtIso;
  if (!meetingIsoDate && date) {
    const d = new Date(date);
    meetingIsoDate = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (!meetingIsoDate) meetingIsoDate = new Date().toISOString();

  const innerPrompt = buildInnerMinutesSectionsPrompt(fullText, {
    title: meetingTitle,
    hostAgenda: ctx.agenda || "",
    relatedMeetingsContext: ctx.relatedMeetingsContext || "",
  });

  const llmBody = await summarizeWithGemini(innerPrompt);
  if (llmBody) {
    return assembleLoopyMinutesMarkdown({
      headerLeft,
      headerRight,
      meetingTitle,
      meetingIsoDate,
      participantsBlock: ctx.participantsBlock,
      llmSectionsMarkdown: llmBody,
    });
  }

  if (!getGeminiApiKey()) {
    console.error("[Summary] No Gemini key: set GEMINI_API_KEY in services/transcription/.env");
    return "Summary generation failed: configure GEMINI_API_KEY.";
  }
  console.error("[Summary] Gemini failed.");
  return "Summary generation failed. Please try again.";
}


// 1. TRIGGER TRANSCRIPTION (Automatic - Webhook)
export const startTranscription = async (req, res) => {
  console.log("RAW BODY:", req.body);
  try {
    const { meetingId, projectId, recordingUrl, filename } = req.body;
    const meetingIdStr = meetingId != null ? String(meetingId) : "";
    console.log(`[Transcription] Request received for: ${filename}`);

    if (!meetingIdStr || !projectId || !recordingUrl) {
      return res.status(400).json({
        message: "meetingId, projectId, and recordingUrl are required.",
      });
    }

    // Check if already exists to prevent duplicates
    let artifact = await findArtifactByMeetingId(meetingIdStr);
    if (artifact) {
      artifact = await markStaleProcessingAsFailed(artifact);
    }

    if (artifact) {
      if (artifact.transcriptionStatus === "COMPLETED") {
        return res.status(200).json({ message: "Already completed", artifact });
      }
      if (
        artifact.transcriptionStatus === "processing" ||
        artifact.transcriptionStatus === "pending"
      ) {
        return res.status(200).json({ message: "Already processing", artifact });
      }
      // If failed or pending, retry
      artifact.transcriptionStatus = "processing";
      await artifact.save();
    } else {
      // Create new record
      artifact = await Artifact.create({
        meetingId: meetingIdStr,
        projectId: String(projectId),
        recordingUrl,
        filename,
        transcriptionStatus: "processing"
      });
    }

    // Respond fast so we don't block the caller
    res.status(200).json({ message: "Transcription started", artifactId: artifact._id });

    // --- BACKGROUND PROCESS (DEEPGRAM) ---
    /*
    // --- OLD ELEVENLABS BACKGROUND PROCESS ---
    (async () => {
      try {
        console.log(`Downloading audio file from R2...`);
        // A. Get File as ArrayBuffer to solve the Multipart Boundary Content-Length bug
        const fileResponse = await axios({
          method: "get",
          url: recordingUrl,
          responseType: "arraybuffer"
        });

        // B. Prepare Native FormData
        const form = new FormData();
        const fileBlob = new Blob([fileResponse.data], { type: "video/mp4" });
        form.append("file", fileBlob, "audio.mp4");
        form.append("model_id", "scribe_v1");
        form.append("language_code", "en");

        console.log(` Sending to ElevenLabs API...`);
        // We use native fetch because axios + form-data in Node stream bugs out the multipart boundaries and API key 
        const elevenRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            // DO NOT set Content-Type manually with fetch, the browser/node native FormData will set the boundary automatically 
          },
          body: form,
        });

        if (!elevenRes.ok) {
          const errText = await elevenRes.text();
          throw new Error(`ElevenLabs Error ${elevenRes.status}: ${errText}`);
        }

        // --- TRANSCRIPTION COMPLETE ---
        const transcriptData = await elevenRes.json();
        console.log(`✅ Transcription Success! Generated ${transcriptData.words?.length || 0} words.`);

        // --- C. GENERATE SUMMARY (Gemini) ---
        console.log(`🧠 Generating Summary with Gemini...`);
        const fullText = parseTranscriptToText(transcriptData);

        // Use the helper function
        const summaryText = await runGeminiSummary(fullText);
        console.log("✅ Summary Generated.");

        // --- D. SAVE EVERYTHING TO DB ---
        artifact.transcriptionStatus = "COMPLETED";
        artifact.transcriptJson = transcriptData;
        artifact.summary = summaryText;
        await artifact.save();

        console.log("💾 Database Updated Successfully.");

      } catch (err) {
        console.error(`Pipeline Failed:`, err.response?.data || err.message);
        artifact.transcriptionStatus = "FAILED";
        artifact.error = err.message;
        await artifact.save();
      }
    })();
    */

    (async () => {
      try {
        console.log(`Sending URL to Deepgram: ${recordingUrl}`);
        const deepgram = createClient(process.env.DEEPGRAM_API_SECRET);

        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
          { url: recordingUrl },
          { model: 'nova-3', smart_format: true, diarize: true, language: 'en' }
        );

        if (error) {
          throw new Error(error.message || "Deepgram returned an error");
        }

        let fullTranscript = "";
        if (result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
          fullTranscript = result.results.channels[0].alternatives[0].transcript;
        }

        console.log("✅ Transcription Success! Generated text length:", fullTranscript.length);

        console.log(`🧠 Generating meeting minutes (LLM)...`);
        const summaryText = await runGeminiSummary(fullTranscript, {
          title: filename,
          meetingId: meetingIdStr,
          projectId,
        });
        console.log("✅ Summary / minutes generated.");

        const transcriptData = { deepgram: true, text: fullTranscript.trim() };

        artifact.transcriptionStatus = "COMPLETED";
        artifact.transcriptJson = transcriptData;

        // runGeminiSummary returns a Markdown string (not { minutes, overview })
        artifact.summary =
          typeof summaryText === "string" && summaryText.trim()
            ? summaryText.trim()
            : "No minutes generated.";
        artifact.overview = deriveOverviewFromText(artifact.summary, fullTranscript);

        await artifact.save();

        console.log("💾 Database Updated Successfully.");
      } catch (err) {
        console.error(`Pipeline setup failed:`, err);
        artifact.transcriptionStatus = "FAILED";
        artifact.error = err.message;
        await artifact.save();
      }
    })();

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ message: "Failed to init transcription" });
  }
};


// 2. GET ARTIFACT (Called by Frontend)
export const getArtifact = async (req, res) => {
  try {
    const { meetingId } = req.params;

    let artifact = await findArtifactByMeetingId(meetingId);

    if (!artifact) {
      return res.status(404).json({ message: "Artifact not found" });
    }

    artifact = await markStaleProcessingAsFailed(artifact);
    res.status(200).json(artifact);
  } catch (error) {
    console.error("Get Artifact Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// 3. MANUAL SUMMARY (Updated to Fire-and-Forget)
export const generateSummary = async (req, res) => {
  try {
    const { meetingId, meetingTitle, date } = req.body;
    console.log(`🧠 Manual Summary Trigger for: ${meetingId}`);

    // 1. Find the artifact
    const artifact = await findArtifactByMeetingId(meetingId);

    if (!artifact || !artifact.transcriptJson) {
      return res.status(404).json({ message: "Transcript not found. Cannot summarize." });
    }

    // 2. Respond IMMEDIATELY to prevent 504 Timeout
    res.status(200).json({ message: "Summary generation started", artifactId: artifact._id });

    // 3. Run AI in Background
    (async () => {
      try {
        const fullText = parseTranscriptToText(artifact.transcriptJson);
        const summaryText = await runGeminiSummary(fullText, {
          title: meetingTitle,
          date,
          meetingId: String(meetingId),
          projectId: artifact.projectId,
        });

        artifact.summary =
          typeof summaryText === "string" && summaryText.trim()
            ? summaryText.trim()
            : "No minutes generated.";
        artifact.overview = deriveOverviewFromText(artifact.summary, fullText);

        await artifact.save();
        console.log("✅ Manual Summary Generated & Saved (Background).");
      } catch (bgError) {
        console.error("Background Summary Failed:", bgError);
        artifact.summary = "Summary generation failed. Please try again.";
        await artifact.save();
      }
    })();

  } catch (error) {
    console.error("Summary Request Error:", error);
    // Only send response if we haven't already (though we likely haven't if we are here)
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to init summary", error: error.message });
    }
  }
};

// 4. UPDATE SUMMARY (Manual Edit by User)
export const updateArtifactSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { minutes } = req.body; // The newly edited markdown text

    if (!minutes) {
      return res.status(400).json({ message: "Minutes content is required." });
    }

    const artifact = await findArtifactByMeetingId(meetingId);

    if (!artifact) {
      return res.status(404).json({ message: "Artifact not found." });
    }

    // Overwrite the summary string with the new manual edits
    artifact.summary = minutes;
    await artifact.save();

    res.status(200).json({ message: "Minutes updated successfully", artifact });
  } catch (error) {
    console.error("Update Summary Error:", error);
    res.status(500).json({ message: "Failed to update summary." });
  }
};

// 5. ASK BOT (Chat with Transcript)
export const askQuestion = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required." });
    }

    const artifact = await findArtifactByMeetingId(meetingId);

    if (!artifact || !artifact.transcriptJson) {
      return res.status(404).json({ message: "Artifact or transcript not found." });
    }

    const fullText = parseTranscriptToText(artifact.transcriptJson);

    const answer = await runAskBotAnswer(fullText, question);
    if (!answer) {
      return res.status(503).json({
        message:
          "AI chat could not get a reply from Gemini. Check GEMINI_API_KEY, quota/billing, and model access for gemini-2.5-flash.",
      });
    }

    // Optionally save to history
    artifact.chatHistory.push({ role: "user", content: question });
    artifact.chatHistory.push({ role: "model", content: answer });
    await artifact.save();

    res.status(200).json({ answer, chatHistory: artifact.chatHistory });
  } catch (error) {
    console.error("Ask Bot Error:", error);
    res.status(500).json({ message: "Failed to generate answer." });
  }
};