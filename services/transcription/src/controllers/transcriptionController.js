import axios from "axios";
import Artifact from "../models/Artifact.js";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 👈 Replaces OpenAI
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';


//  Convert ElevenLabs or Deepgram JSON to plain text
const parseTranscriptToText = (transcriptJson) => {
  if (transcriptJson && transcriptJson.deepgram) return transcriptJson.text || "";
  if (!transcriptJson || !transcriptJson.words) return "";
  return transcriptJson.words.map(w => w.text).join(" ");
};

//  Gemini Logic
async function runGeminiSummary(fullText, { title, date } = {}) {
  if (!fullText || fullText.length < 50) return "Transcript too short to summarize.";

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        You are an expert professional meeting secretary. 
        Generate formal Meeting Minutes based on the transcript below.
        
        Metadata provided:
        - Meeting Title: ${title || "Untitled Meeting"}
        - Date: ${date || new Date().toLocaleString()}

        Please strictly format the output as a valid JSON object matching the exact structure below. DO NOT wrap it in markdown code blocks (\`\`\`json). Return ONLY the raw JSON object.
        
        {
          "overview": "A short 2-3 sentence general overview of the meeting's main purpose and outcome.",
          "agenda": ["Infer the mian agenda items discussed in the meeting"],
          "minutes": "The full detailed meeting minutes, formatted using markdown (bullet points, bold text, etc.) detailing all key discussion points, decisions, and action items. also include asignee to the action items in the following format [Task] assigned to [Assignee]."
        }

        TRANSCRIPT:
        ${fullText}
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Safety cleanup in case Gemini still wraps in Markdown
    if (text.startsWith("\`\`\`json")) {
      text = text.replace(/^\`\`\`json/i, "").replace(/\`\`\`$/i, "").trim();
    }

    return text;

  } catch (error) {
    console.error("⚠️ Gemini API Error:", error.message);
    return "Summary generation failed. Please try again.";
  }
}


// 1. TRIGGER TRANSCRIPTION (Automatic - Webhook)
export const startTranscription = async (req, res) => {
  console.log("RAW BODY:", req.body);
  try {
    const { meetingId, projectId, recordingUrl, filename } = req.body;
    console.log(`[Transcription] Request received for: ${filename}`);

    // Check if already exists to prevent duplicates
    let artifact = await Artifact.findOne({ meetingId });

    if (artifact) {
      if (artifact.transcriptionStatus === "COMPLETED") {
        return res.status(200).json({ message: "Already completed", artifact });
      }
      // If failed or pending, retry
      artifact.transcriptionStatus = "processing";
      await artifact.save();
    } else {
      // Create new record
      artifact = await Artifact.create({
        meetingId,
        projectId,
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
        const deepgram = createClient(process.env.DEEPGRAM_API_SECRET);

        const connection = deepgram.listen.live({
          model: 'nova-3',
          language: 'en',
          smart_format: true,
          diarize: true,
        });

        let fullTranscript = "";
        let isClosed = false;

        connection.on(LiveTranscriptionEvents.Open, async () => {
          console.log(`Transcribing ${recordingUrl}...`);

          const response = await fetch(recordingUrl, { redirect: 'follow' });
          const reader = response.body.getReader();

          const pump = async () => {
            const { done, value } = await reader.read();
            if (done) {
              connection.finish();
              return;
            }
            connection.send(value);
            pump();
          };
          pump();
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          if (data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript) {
              fullTranscript += transcript + " ";
              console.log(transcript);
            }
          }
        });

        connection.on(LiveTranscriptionEvents.SpeechStarted, (data) => {
          // Handle speech started event
        });

        connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
          // Handle utterance end event
        });

        connection.on(LiveTranscriptionEvents.Close, async () => {
          console.log('Connection closed.');
          if (isClosed) return;
          isClosed = true;

          try {
            console.log(`🧠 Generating Summary with Gemini...`);
            const summaryText = await runGeminiSummary(fullTranscript);
            console.log("✅ Summary Generated.");

            const transcriptData = { deepgram: true, text: fullTranscript.trim() };

            artifact.transcriptionStatus = "COMPLETED";
            artifact.transcriptJson = transcriptData;
            artifact.summary = summaryText;
            await artifact.save();

            console.log("💾 Database Updated Successfully.");
          } catch (err) {
            artifact.transcriptionStatus = "FAILED";
            artifact.error = err.message;
            await artifact.save();
          }
        });

        connection.on(LiveTranscriptionEvents.Error, async (err) => {
          console.error(err);
          if (isClosed) return;
          isClosed = true;
          artifact.transcriptionStatus = "FAILED";
          artifact.error = err.message || "Deepgram Error";
          await artifact.save();
        });
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

    // Robust query: checks for String OR ObjectId match
    const artifact = await Artifact.findOne({
      $or: [
        { meetingId: meetingId },
        { meetingId: mongoose.isValidObjectId(meetingId) ? new mongoose.Types.ObjectId(meetingId) : null }
      ]
    });

    if (!artifact) {
      return res.status(404).json({ message: "Artifact not found" });
    }
    res.status(200).json(artifact);
  } catch (error) {
    console.error("Get Artifact Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// 3. MANUAL SUMMARY (Updated to Fire-and-Forget)
export const generateSummary = async (req, res) => {
  try {
    const { meetingId } = req.body;
    console.log(`🧠 Manual Summary Trigger for: ${meetingId}`);

    // 1. Find the artifact
    const artifact = await Artifact.findOne({
      $or: [
        { meetingId: meetingId },
        { meetingId: mongoose.isValidObjectId(meetingId) ? new mongoose.Types.ObjectId(meetingId) : null }
      ]
    });

    if (!artifact || !artifact.transcriptJson) {
      return res.status(404).json({ message: "Transcript not found. Cannot summarize." });
    }

    // 2. Respond IMMEDIATELY to prevent 504 Timeout
    res.status(200).json({ message: "Summary generation started", artifactId: artifact._id });

    // 3. Run AI in Background
    (async () => {
      try {
        const fullText = parseTranscriptToText(artifact.transcriptJson);
        const summaryText = await runGeminiSummary(fullText);

        artifact.summary = summaryText;
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