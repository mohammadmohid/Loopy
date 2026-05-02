import { DeepgramClient } from "@deepgram/sdk";

export interface TranscriptUtterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  type: "word";
  speaker_id: string;
}

export interface TranscriptResult {
  raw: TranscriptJson;
}

export interface TranscriptJson {
  deepgram?: boolean;
  /** Plaintext fallback; when diarized, also prefixed per speaker for summaries/search. */
  text?: string;
  /** Preferred: one block per speaker turn (from Deepgram utterances or grouped words). */
  utterances?: TranscriptUtterance[];
  /** Word-level timeline with speaker_id — transcript player can group by speaker. */
  words?: TranscriptWord[];
  /** Filled when saving the artifact: meeting host (0) + participants (1..). */
  speakerDisplayNames?: Record<number, string>;
  [key: string]: unknown;
}

function speakerNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Deepgram `paragraphs=true` blocks — another path to per-speaker text when utterances are empty. */
function utterancesFromParagraphsBlock(firstAlt: Record<string, unknown>): TranscriptUtterance[] {
  const paras = firstAlt.paragraphs as unknown;
  const list: Array<Record<string, unknown>> | undefined = Array.isArray(paras)
    ? (paras as Array<Record<string, unknown>>)
    : paras &&
        typeof paras === "object" &&
        Array.isArray((paras as { paragraphs?: unknown }).paragraphs)
      ? ((paras as { paragraphs: Array<Record<string, unknown>> }).paragraphs)
      : undefined;

  if (!list?.length) return [];

  const out: TranscriptUtterance[] = [];
  for (const p of list) {
    const sp = speakerNum(p.speaker);
    let text = "";
    const sentences = p.sentences as Array<{ text?: string }> | undefined;
    if (Array.isArray(sentences)) {
      text = sentences
        .map((s) => (typeof s.text === "string" ? s.text : ""))
        .join(" ")
        .trim();
    }
    if (!text && typeof p.text === "string") text = p.text.trim();
    if (!text) continue;
    out.push({
      speaker: sp,
      text,
      start: typeof p.start === "number" ? p.start : 0,
      end: typeof p.end === "number" ? p.end : 0,
    });
  }
  return out;
}

/** Group consecutive words from Deepgram into speaker turns when utterances are absent. */
function groupWordsBySpeaker(
  words: Array<{
    word?: string;
    punctuated_word?: string;
    start?: number;
    end?: number;
    speaker?: number | string;
  }>
): TranscriptUtterance[] {
  const out: TranscriptUtterance[] = [];
  let cur: TranscriptUtterance | null = null;

  for (const w of words) {
    const piece = (w.punctuated_word ?? w.word ?? "").trim();
    if (!piece) continue;
    const sp = speakerNum(w.speaker);
    const start = typeof w.start === "number" ? w.start : 0;
    const end = typeof w.end === "number" ? w.end : start;

    if (cur && cur.speaker === sp) {
      cur.text = `${cur.text} ${piece}`.trim();
      cur.end = end;
    } else {
      if (cur) out.push(cur);
      cur = { speaker: sp, text: piece, start, end };
    }
  }
  if (cur) out.push(cur);
  return out;
}

function wordsToTranscriptWords(
  words: Array<{
    word?: string;
    punctuated_word?: string;
    start?: number;
    end?: number;
    speaker?: number | string;
  }>
): TranscriptWord[] {
  return words
    .map((w) => {
      const text = (w.punctuated_word ?? w.word ?? "").trim();
      if (!text) return null;
      const sp = speakerNum(w.speaker);
      return {
        text,
        start: typeof w.start === "number" ? w.start : 0,
        end: typeof w.end === "number" ? w.end : 0,
        type: "word" as const,
        speaker_id: `speaker_${sp}`,
      };
    })
    .filter((x): x is TranscriptWord => x != null);
}

function buildLabeledText(utterances: TranscriptUtterance[]): string {
  return utterances
    .map((u) => `Speaker ${u.speaker + 1}: ${u.text}`)
    .join("\n\n")
    .trim();
}

/**
 * Prefer real names on each turn for storage + LLM; fallback to generic Speaker N.
 * For a single flat paragraph (no utterances), prefix with host name when known.
 */
export function applySpeakerDisplayNamesToText(
  raw: TranscriptJson,
  speakerDisplayNames: Record<number, string>
): string {
  const utterances = raw.utterances;
  if (Array.isArray(utterances) && utterances.length > 0) {
    return utterances
      .map((u) => {
        const label =
          speakerDisplayNames[u.speaker]?.trim() || `Speaker ${u.speaker + 1}`;
        return `${label}: ${u.text}`;
      })
      .join("\n\n")
      .trim();
  }

  const flat = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!flat) return "";
  const host = speakerDisplayNames[0]?.trim();
  if (host && !/^\s*Speaker\s+\d+\s*:/im.test(flat)) {
    return `${host}:\n\n${flat}`;
  }
  return flat;
}

function parseDeepgramListenResult(result: Record<string, unknown>): TranscriptJson {
  const results = result.results as Record<string, unknown> | undefined;
  const channel = results?.channels as Array<Record<string, unknown>> | undefined;
  const alt = channel?.[0]?.alternatives as Array<Record<string, unknown>> | undefined;
  const firstAlt = alt?.[0];

  const flatTranscript =
    typeof firstAlt?.transcript === "string" ? firstAlt.transcript.trim() : "";

  type UtteranceRow = {
    speaker?: number | string;
    transcript?: string;
    start?: number;
    end?: number;
  };

  const utterancesRaw =
    (results?.utterances as UtteranceRow[] | undefined) ??
    (result.utterances as UtteranceRow[] | undefined);

  let utterances: TranscriptUtterance[] = [];

  if (Array.isArray(utterancesRaw) && utterancesRaw.length > 0) {
    utterances = utterancesRaw
      .filter((u) => typeof u.transcript === "string" && u.transcript.trim().length > 0)
      .map((u) => ({
        speaker: speakerNum(u.speaker),
        text: u.transcript!.trim(),
        start: typeof u.start === "number" ? u.start : 0,
        end: typeof u.end === "number" ? u.end : 0,
      }));
  }

  const dgWords = firstAlt?.words as Array<Record<string, unknown>> | undefined;

  if (utterances.length === 0 && firstAlt) {
    utterances = utterancesFromParagraphsBlock(firstAlt);
  }

  if (utterances.length === 0 && Array.isArray(dgWords) && dgWords.length > 0) {
    utterances = groupWordsBySpeaker(dgWords as Parameters<typeof groupWordsBySpeaker>[0]);
  }

  const words =
    Array.isArray(dgWords) && dgWords.length > 0
      ? wordsToTranscriptWords(dgWords as Parameters<typeof wordsToTranscriptWords>[0])
      : undefined;

  const text =
    utterances.length > 0 ? buildLabeledText(utterances) : flatTranscript;

  return {
    deepgram: true,
    text,
    ...(utterances.length > 0 ? { utterances } : {}),
    ...(words && words.length > 0 ? { words } : {}),
  };
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

/**
 * Deepgram rejects payloads where `url` is not an absolute http(s) URL (err_code PAYLOAD_ERROR).
 * Handles missing schemes (e.g. `pub-xxx.r2.dev/key`), scheme-relative `//host/path`, and trims whitespace.
 */
export function normalizeRecordingUrlForDeepgram(raw: string): string {
  let s = raw.trim();
  if (!s) {
    throw new Error("recordingUrl is empty.");
  }
  const lower = s.toLowerCase();
  if (lower.startsWith("blob:") || lower.startsWith("data:")) {
    throw new Error(
      "recordingUrl must be a public http(s) URL; blob/data URLs cannot be fetched by the transcription service."
    );
  }
  // App-relative paths play in the browser but are invalid for Deepgram.
  if (s.startsWith("/") && !s.startsWith("//")) {
    throw new Error(
      "recordingUrl must be an absolute http(s) URL (got a site-relative path)."
    );
  }
  if (s.startsWith("//")) {
    s = `https:${s}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    const withScheme = `https://${s.replace(/^\/+/, "")}`;
    try {
      parsed = new URL(withScheme);
    } catch {
      throw new Error(
        "recordingUrl is not a valid URL. Use a full https:// link to the recording file."
      );
    }
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`recordingUrl must use http or https (got ${parsed.protocol}).`);
  }

  return parsed.href;
}

export async function transcribeFromUrl(recordingUrl: string): Promise<TranscriptResult> {
  try {
    const client = getClient();
    const url = normalizeRecordingUrlForDeepgram(recordingUrl);

    const result = await client.listen.v1.media.transcribeUrl({
      url,
      model: "nova-3",
      smart_format: true,
      diarize: true,
      utterances: true,
      paragraphs: true,
      punctuate: true,
      words: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK types omit `words`
    } as any);

    if (!result || !("results" in result)) {
      throw new Error("Deepgram returned an accepted response but no transcription results. Check if async mode or callbacks are enabled.");
    }

    const raw = parseDeepgramListenResult(result as unknown as Record<string, unknown>);

    return { raw };
  } catch (error: any) {
    console.error("[Transcription] Deepgram Error:", error.message || error);
    throw new Error(error.message || "Deepgram returned an error");
  }
}
