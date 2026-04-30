import { DeepgramClient } from "@deepgram/sdk";

export interface TranscriptResult {
  raw: TranscriptJson;
}

export interface TranscriptJson {
  [key: string]: any;
}

let _client: DeepgramClient | null = null;

function getClient(): DeepgramClient {
  if (!_client) {
    const apiKey = process.env.DEEPGRAM_API_SECRET;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_SECRET key is not configured.");
    }
    // Deepgram v5 constructor requires an options object
    _client = new DeepgramClient({ apiKey });
  }
  return _client;
}

export async function transcribeFromUrl(recordingUrl: string): Promise<TranscriptResult> {
  try {
    const client = getClient();

    const result = await client.listen.v1.media.transcribeUrl({
      url: recordingUrl,
      model: "nova-3",
      smart_format: true,
      diarize: true,
      punctuate: true,
    });

    if (!result || !("results" in result)) {
      throw new Error("Deepgram returned an accepted response but no transcription results. Check if async mode or callbacks are enabled.");
    }

    const text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return {
      raw: { text: text.trim() },
    };
  } catch (error: any) {
    console.error("[Transcription] Deepgram Error:", error.message || error);
    throw new Error(error.message || "Deepgram returned an error");
  }
}
