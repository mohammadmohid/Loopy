import { OpenRouter } from "@openrouter/sdk";

interface SummaryMetadata {
  title?: string;
  date?: string;
}

const SUMMARY_MODEL = "google/gemma-3-27b-it:free";
const CHAT_MODEL = "google/gemma-3-27b-it:free";
const MIN_TRANSCRIPT_LENGTH = 50;

let _client: OpenRouter | null = null;

function getClient(): OpenRouter {
  if (!_client) {
    const apiKey = process.env.OPENROUTER_API;
    if (!apiKey) {
      throw new Error("OPENROUTER_API key is not configured.");
    }
    _client = new OpenRouter({ apiKey });
  }
  return _client;
}

function buildSummaryPrompt(fullText: string, meta: SummaryMetadata): string {
  const title = meta.title || "Untitled Meeting";
  const date = meta.date || new Date().toLocaleString();

  return `You are an expert professional meeting secretary. 
Generate formal Meeting Minutes based on the transcript below.

Metadata provided:
- Meeting Title: ${title}
- Date: ${date}

Please strictly format the output using the following Markdown structure:

 ${title}

Date and Time: ${date}

Participants: - [List participants identified from speech or context. If unknown, write "Unspecified"]

 Agenda
- [Infer the main agenda items discussed]

 Meeting Minutes / Key Takeaways
- [Bulleted list of key discussion points and decisions]

 Action Items
- [ ] [Task 1] (Assignee)
- [ ] [Task 2] (Assignee)

TRANSCRIPT:
${fullText}`;
}

function buildQuestionPrompt(transcript: string, question: string): string {
  return `You are a helpful, professional AI assistant assigned to answer questions about a specific meeting.
Your ONLY source of truth is the transcript provided below.
If the user's question cannot be answered using the transcript, politely inform them that it wasn't mentioned in the meeting.

TRANSCRIPT:
${transcript}

USER QUESTION:
${question}`;
}

export async function generateSummary(
  fullText: string,
  meta: SummaryMetadata = {}
): Promise<string> {
  if (!fullText || fullText.length < MIN_TRANSCRIPT_LENGTH) {
    return "Transcript too short to summarize.";
  }

  try {
    const client = getClient();

    const result = await client.chat.send({
      chatRequest: {
        model: SUMMARY_MODEL,
        messages: [{ role: "user", content: buildSummaryPrompt(fullText, meta) }],
      },
    });

    return result.choices?.[0]?.message?.content || "Summary generation returned empty.";
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Summary] OpenRouter API Error:", message);
    return "Summary generation failed. Please try again.";
  }
}

export async function answerQuestion(
  transcript: string,
  question: string
): Promise<string> {
  try {
    const client = getClient();

    const result = await client.chat.send({
      chatRequest: {
        model: CHAT_MODEL,
        messages: [{ role: "user", content: buildQuestionPrompt(transcript, question) }],
      },
    });

    return result.choices?.[0]?.message?.content?.trim() || "No answer generated.";
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AskBot] OpenRouter API Error:", message);
    throw new Error(`Failed to answer question: ${message}`);
  }
}
