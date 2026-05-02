import { OpenRouter } from "@openrouter/sdk";

export interface SummaryMetadata {
  title?: string;
  date?: string;
  /** Markdown lines for invited participants (e.g. "- Jane Doe") from the meeting record. */
  participantLines?: string[];
  hostDisplayName?: string;
}

const MIN_TRANSCRIPT_LENGTH = 50;

/** Paid route avoids upstream 429s on `:free` models (e.g. gemma-3-27b-it:free). Override with OPENROUTER_SUMMARY_MODEL. */
function summaryModel(): string {
  return (
    process.env.OPENROUTER_SUMMARY_MODEL?.trim() || "openai/gpt-4o-mini"
  );
}

function chatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL?.trim() || summaryModel();
}

let _client: OpenRouter | null = null;

function getOpenRouterApiKey(): string {
  const key =
    process.env.OPENROUTER_API?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("Set OPENROUTER_API (or OPENROUTER_API_KEY) in services/transcription/.env");
  }
  return key;
}

function getClient(): OpenRouter {
  if (!_client) {
    _client = new OpenRouter({ apiKey: getOpenRouterApiKey() });
  }
  return _client;
}

function logOpenRouterFailure(label: string, error: unknown): void {
  if (error instanceof Error) {
    const anyErr = error as Error & { status?: number; body?: unknown };
    console.error(
      `[${label}] OpenRouter error:`,
      error.message,
      anyErr.status != null ? `status=${anyErr.status}` : "",
      anyErr.body != null ? `body=${JSON.stringify(anyErr.body).slice(0, 500)}` : ""
    );
    if (error.cause) console.error(`[${label}] cause:`, error.cause);
    return;
  }
  console.error(`[${label}] OpenRouter error:`, error);
}

function buildSummaryPrompt(fullText: string, meta: SummaryMetadata): string {
  const title = meta.title || "Untitled Meeting";
  const date = meta.date || new Date().toLocaleString();
  const host = (meta.hostDisplayName ?? "").trim();
  const participantBlock =
    meta.participantLines && meta.participantLines.length > 0
      ? meta.participantLines.join("\n")
      : "None listed on the meeting invite.";

  return `You are an expert professional meeting secretary.
Generate formal Meeting Minutes from the transcript below.

Fixed metadata (use exactly as given — do NOT invent invited participants):
- Meeting Title: ${title}
- Date: ${date}
- Host: ${host || "Unknown"}
- Invited participants (list under "## Participants" exactly as below, one per line):
${participantBlock}

Output Markdown with this structure:

# ${title}

**Date and time:** ${date}

## Participants
${participantBlock}
${host ? `\n**Host:** ${host}` : ""}

## Overview
(2–4 sentences summarizing what the meeting covered, based only on the transcript.)

## Meeting minutes / key takeaways
(Bulleted list from the transcript.)

## Action items
Use two styles only:
- Work: \`- [ ] Clear description (Assignee Name)\` when someone must do work.
- Follow-up meeting: \`- [ ] Schedule / book … meeting / sync / call … (tomorrow | next day | date)\` when the outcome is to hold another meeting.

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
        model: summaryModel(),
        messages: [{ role: "user", content: buildSummaryPrompt(fullText, meta) }],
      },
    });

    return result.choices?.[0]?.message?.content || "Summary generation returned empty.";
  } catch (error: unknown) {
    logOpenRouterFailure("Summary", error);
    console.error(
      "[Summary] If you see 429 / rate limits, set OPENROUTER_SUMMARY_MODEL to another model (https://openrouter.ai/models) or wait and retry."
    );
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
        model: chatModel(),
        messages: [{ role: "user", content: buildQuestionPrompt(transcript, question) }],
      },
    });

    return result.choices?.[0]?.message?.content?.trim() || "No answer generated.";
  } catch (error: unknown) {
    logOpenRouterFailure("AskBot", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to answer question: ${message}`);
  }
}
