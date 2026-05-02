"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Word {
  text: string;
  start: number;
  end: number;
  type: "word" | "audio_event";
  speaker_id?: string;
}

export interface TranscriptUtterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
}

interface TranscriptPlayerProps {
  transcript: {
    words?: Word[];
    utterances?: TranscriptUtterance[];
    deepgram?: boolean;
    text?: string;
    /** Stored by transcription service from meeting host + participants. */
    speakerDisplayNames?: Record<string, string> | Record<number, string>;
  };
  audioUrl?: string;
  /** Meeting host — shown on flat transcripts and used as Deepgram speaker `0` when mapping names. */
  hostDisplayName?: string;
  /** Map Deepgram speaker index → display name (0 = host, 1+ = invitees in order). */
  speakerNames?: Record<number, string>;
}

const SPEAKER_ACCENT = [
  {
    bar: "border-l-[#cc2233]",
    bubble: "bg-[#fef5f6]",
    avatar: "bg-[#cc2233]/15 text-[#cc2233]",
  },
  {
    bar: "border-l-emerald-600",
    bubble: "bg-emerald-50/90",
    avatar: "bg-emerald-100 text-emerald-800",
  },
  {
    bar: "border-l-amber-500",
    bubble: "bg-amber-50/90",
    avatar: "bg-amber-100 text-amber-900",
  },
  {
    bar: "border-l-violet-600",
    bubble: "bg-violet-50/90",
    avatar: "bg-violet-100 text-violet-900",
  },
  {
    bar: "border-l-sky-600",
    bubble: "bg-sky-50/90",
    avatar: "bg-sky-100 text-sky-900",
  },
];

function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Normalize Deepgram-style speaker_0 / ElevenLabs ids into a numeric bucket for styling. */
function speakerIndexFromId(id: string): number {
  const m = /^speaker_(\d+)$/i.exec(id.trim());
  if (m) return parseInt(m[1], 10);
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 256;
}

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function resolveSpeakerLabel(
  speakerIndex: number,
  speakerNames?: Record<number, string>
): string {
  const n = speakerNames?.[speakerIndex]?.trim();
  if (n) return n;
  return `Speaker ${speakerIndex + 1}`;
}

function normalizeSpeakerDisplayNames(
  raw: Record<string, string> | Record<number, string> | undefined
): Record<number, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number.parseInt(k, 10);
    if (!Number.isFinite(n) || typeof v !== "string") continue;
    const t = v.trim();
    if (t) out[n] = t;
  }
  return out;
}

export function TranscriptPlayer({
  transcript,
  hostDisplayName,
  speakerNames,
}: TranscriptPlayerProps) {
  const mergedSpeakerNames = useMemo(() => {
    const fromArtifact = normalizeSpeakerDisplayNames(transcript?.speakerDisplayNames);
    const fromProps = speakerNames ?? {};
    return { ...fromArtifact, ...fromProps };
  }, [transcript?.speakerDisplayNames, speakerNames]);

  const effectiveSpeakerNames =
    Object.keys(mergedSpeakerNames).length > 0 ? mergedSpeakerNames : undefined;

  const resolvedHostLabel =
    hostDisplayName?.trim() ||
    effectiveSpeakerNames?.[0]?.trim() ||
    undefined;

  const plainText =
    typeof transcript?.text === "string" ? transcript.text.trim() : "";

  const hasUtterances =
    Array.isArray(transcript?.utterances) && transcript!.utterances!.length > 0;
  const hasWords = Array.isArray(transcript?.words) && transcript!.words!.length > 0;

  const showSegmented = hasUtterances || hasWords;
  const showFlatText = !showSegmented && plainText.length > 0;

  const segmentsFromWords = useMemo(() => {
    const grouped: { speaker: string; words: Word[] }[] = [];
    let currentSegment: { speaker: string; words: Word[] } | null = null;

    if (!transcript?.words) return [];

    transcript.words.forEach((word) => {
      const speaker = word.speaker_id || "unknown";

      if (currentSegment && currentSegment.speaker === speaker) {
        currentSegment.words.push(word);
      } else {
        if (currentSegment) grouped.push(currentSegment);
        currentSegment = { speaker, words: [word] };
      }
    });

    if (currentSegment) grouped.push(currentSegment);
    return grouped;
  }, [transcript]);

  const renderSpeakerBlock = (
    label: string,
    sublabel: string | undefined,
    body: ReactNode,
    speakerBucket: number,
    avatarInner: string
  ) => {
    const accent = SPEAKER_ACCENT[speakerBucket % SPEAKER_ACCENT.length];
    return (
      <div className="flex gap-4 group">
        <div className="w-28 shrink-0 pt-1">
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 border border-white shadow-sm leading-none px-0.5",
              accent.avatar
            )}
          >
            {avatarInner}
          </div>
          <div className="text-[10px] font-semibold text-neutral-600 normal-case tracking-tight leading-tight break-words">
            {label}
          </div>
          {sublabel ? (
            <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">{sublabel}</div>
          ) : null}
        </div>
        <div
          className={cn(
            "flex-1 rounded-r-xl rounded-bl-xl border border-neutral-100 border-l-4 pl-4 pr-4 py-3 shadow-sm",
            accent.bar,
            accent.bubble
          )}
        >
          {body}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          {hasUtterances ? (
            <>
              <p className="text-xs text-neutral-500 -mt-1 mb-4">
                Speakers are detected from the recording audio. Names use your meeting{" "}
                <span className="font-medium text-neutral-700">host</span> for speaker&nbsp;1 and{" "}
                <span className="font-medium text-neutral-700">invitees</span> in order for other
                speakers — if two people sound similar, a label can occasionally be wrong.
              </p>
              {transcript.utterances!.map((u, idx) => {
                const bucket = typeof u.speaker === "number" ? u.speaker : 0;
                const label = resolveSpeakerLabel(bucket, effectiveSpeakerNames);
                const avatarInner = effectiveSpeakerNames?.[bucket]
                  ? initialsFromDisplayName(effectiveSpeakerNames[bucket])
                  : String(bucket + 1);
                const ts =
                  formatTimestamp(u.start) !== ""
                    ? `${formatTimestamp(u.start)}`
                    : undefined;
                return (
                  <div key={idx}>
                    {renderSpeakerBlock(
                      label,
                      ts,
                      <p className="text-base leading-relaxed text-neutral-800 whitespace-pre-wrap">
                        {u.text}
                      </p>,
                      bucket,
                      avatarInner
                    )}
                  </div>
                );
              })}
            </>
          ) : hasWords ? (
            segmentsFromWords.map((segment, sIndex) => {
              const idMatch = /^speaker_(\d+)$/i.exec(segment.speaker);
              const numericSpeaker = idMatch ? parseInt(idMatch[1], 10) : null;
              const bucket =
                numericSpeaker !== null ? numericSpeaker : speakerIndexFromId(segment.speaker);
              const label =
                numericSpeaker !== null
                  ? resolveSpeakerLabel(numericSpeaker, effectiveSpeakerNames)
                  : segment.speaker.replace(/_/g, " ");
              const avatarInner =
                numericSpeaker !== null && effectiveSpeakerNames?.[numericSpeaker]
                  ? initialsFromDisplayName(effectiveSpeakerNames[numericSpeaker])
                  : String(bucket + 1);
              const startSec = segment.words[0]?.start;
              const ts =
                typeof startSec === "number" ? formatTimestamp(startSec) : undefined;

              return (
                <div key={sIndex}>
                  {renderSpeakerBlock(
                    label,
                    ts,
                    <p className="text-base leading-relaxed text-neutral-800">
                      {segment.words.map((word, wIndex) => {
                        const isEvent = word.type === "audio_event";
                        return (
                          <span
                            key={wIndex}
                            className={cn(
                              "inline-block px-0.5 py-0.5",
                              isEvent &&
                                "text-neutral-400 italic text-sm border border-neutral-100 px-1 rounded-md mx-1"
                            )}
                          >
                            {isEvent ? `[${word.text}]` : word.text}{" "}
                          </span>
                        );
                      })}
                    </p>,
                    bucket,
                    avatarInner
                  )}
                </div>
              );
            })
          ) : showFlatText ? (
            <div className="flex gap-6 group">
              <div className="w-28 shrink-0 pt-1">
                <div className="h-9 w-9 rounded-full bg-[#cc2233]/15 text-[#cc2233] flex items-center justify-center text-[10px] font-bold mb-2 border border-white shadow-sm">
                  {resolvedHostLabel
                    ? initialsFromDisplayName(resolvedHostLabel)
                    : "—"}
                </div>
                <div className="text-[10px] font-semibold text-neutral-600 leading-tight break-words">
                  {resolvedHostLabel ?? "Transcript"}
                </div>
              </div>
              <div className="flex-1 text-base leading-relaxed text-neutral-800 whitespace-pre-wrap border border-neutral-100 rounded-xl px-4 py-3 bg-neutral-50/50">
                {plainText || (
                  <span className="text-neutral-400 italic text-sm">
                    No spoken text was detected in this recording.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-neutral-400 py-12">
              No transcript content available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
