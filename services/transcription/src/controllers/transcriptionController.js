import axios from "axios";
import FormData from "form-data";
import Artifact from "../models/Artifact.js";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 👈 Replaces OpenAI

// Helper: Convert ElevenLabs JSON to plain text
const parseTranscriptToText = (transcriptJson) => {
    if (!transcriptJson || !transcriptJson.words) return "";
    return transcriptJson.words.map(w => w.text).join(" ");
};

// --- HELPER: Gemini Logic (Reusable) ---
async function runGeminiSummary(fullText, { title, date } = {} ) {
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

        Please strictly format the output using the following Markdown structure:

         ${title || "Meeting Minutes"}
        
        Date and Time: ${date || "Not specified"}
        
        Participants: - [List participants identified from speech or context. If unknown, write "Unspecified"]

         Agenda
        - [Infer the main agenda items discussed]

         Meeting Minutes / Key Takeaways
        - [Bulleted list of key discussion points and decisions]

         Action Items
        - [ ] [Task 1] (Assignee)
        - [ ] [Task 2] (Assignee)

        TRANSCRIPT:
        ${fullText}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error("⚠️ Gemini API Error:", error.message);
        return "Summary generation failed. Please try again.";
    }
}


// 1. TRIGGER TRANSCRIPTION (Automatic - Webhook)
export const startTranscription = async (req, res) => {
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

    // --- BACKGROUND PROCESS ---
    (async () => {
      try {
        console.log(`Downloading audio stream from R2...`);
        // A. Get File Stream from R2
        const fileResponse = await axios({
          method: "get",
          url: recordingUrl,
          responseType: "stream"
        });

        // B. Prepare ElevenLabs Form
        const form = new FormData();
        form.append("file", fileResponse.data, { filename: "audio.mp4" });
        form.append("model_id", "scribe_v1");
        form.append("language_code", "en"); 

        console.log(` Sending to ElevenLabs API...`);
        const elevenRes = await axios.post(
          "https://api.elevenlabs.io/v1/speech-to-text",
          form,
          {
            headers: {
              ...form.getHeaders(),
              "xi-api-key": process.env.ELEVENLABS_API_KEY
            },
            maxBodyLength: Infinity, 
            maxContentLength: Infinity
          }
        );

        // --- TRANSCRIPTION COMPLETE ---
        const transcriptData = elevenRes.data;
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