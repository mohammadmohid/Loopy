"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Word {
  text: string;
  start: number;
  end: number;
  type: "word" | "audio_event";
  speaker_id?: string;
}

interface TranscriptPlayerProps {
  transcript: {
    words?: Word[];
    deepgram?: boolean;
    text?: string;
  };
  audioUrl?: string; // Kept in interface to prevent breaking parent, but unused
}

export function TranscriptPlayer({ transcript }: TranscriptPlayerProps) {
  const plainText =
    typeof transcript?.text === "string" ? transcript.text.trim() : "";
  const hasWords = Array.isArray(transcript?.words) && transcript.words.length > 0;
  /** Deepgram path in UI, or any flat `text` without word-level diarization */
  const showFlatText =
    Boolean(transcript?.deepgram) || (plainText.length > 0 && !hasWords);

  // 1. Grouping Algorithm (Kept this so it looks structured)
  const segments = useMemo(() => {
    const grouped: { speaker: string; words: Word[] }[] = [];
    let currentSegment: { speaker: string; words: Word[] } | null = null;

    if (!transcript?.words) return [];

    transcript.words.forEach((word) => {
      const speaker = word.speaker_id || "Unknown Speaker";

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

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">

      {/* Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          {/* Flat transcript (Deepgram or plain `text` from API) */}
          {showFlatText ? (
            <div className="flex gap-6 group">
              {/* Generic Speaker Avatar */}
              <div className="w-24 flex-shrink-0 pt-1">
                <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 mb-2 border border-white shadow-sm">
                  SP
                </div>
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider overflow-hidden text-ellipsis">
                  TRANSCRIPT
                </div>
              </div>
              {/* Text Content */}
              <div className="flex-1 text-base leading-relaxed text-neutral-800 whitespace-pre-wrap">
                {plainText || (
                  <span className="text-neutral-400 italic text-sm">
                    No spoken text was detected in this recording.
                  </span>
                )}
              </div>
            </div>
          ) : hasWords ? (
            /* ElevenLabs / Word-Array Support */
            segments.map((segment, sIndex) => (
              <div key={sIndex} className="flex gap-6 group">

                {/* Speaker Avatar (Left Side) */}
                <div className="w-24 flex-shrink-0 pt-1">
                  <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 mb-2 border border-white shadow-sm">
                    {(segment.speaker.split("_").pop() || "U")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider overflow-hidden text-ellipsis">
                    {segment.speaker.replace(/_/g, " ")}
                  </div>
                </div>

                {/* Text Content (Right Side) */}
                <div className="flex-1">
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
                  </p>
                </div>
              </div>
            ))
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