"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Play, Pause, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Word {
  text: string;
  start: number;
  end: number;
  type: "word" | "audio_event";
  speaker_id?: string;
}

interface TranscriptPlayerProps {
  transcript: { words: Word[] };
  // In a real scenario, this would be a presigned URL from the backend
  audioUrl?: string;
}

export function TranscriptPlayer({
  transcript,
  audioUrl,
}: TranscriptPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Grouping Algorithm: Merging linear words into speaker segments
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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleWordClick = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      {/* Audio Controls */}
      <div className="bg-neutral-50 border-b border-neutral-200 p-4 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors shadow-sm"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-1" />
          )}
        </button>

        <div className="flex-1 mx-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="w-full accent-primary h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <span className="text-xs font-mono text-neutral-500 w-24 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => {
              if (audioRef.current)
                setCurrentTime(audioRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      {/* Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          {segments.map((segment, sIndex) => (
            <div key={sIndex} className="flex gap-6 group">
              {/* Speaker Avatar */}
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

              {/* Text Content */}
              <div className="flex-1">
                <p className="text-base leading-relaxed text-neutral-800">
                  {segment.words.map((word, wIndex) => {
                    const isActive =
                      currentTime >= word.start && currentTime <= word.end;
                    const isEvent = word.type === "audio_event";

                    return (
                      <span
                        key={wIndex}
                        onClick={() => handleWordClick(word.start)}
                        className={cn(
                          "cursor-pointer transition-colors duration-150 rounded px-0.5 py-0.5 inline-block",
                          isActive
                            ? "bg-primary/20 text-primary-dark font-medium"
                            : "hover:bg-neutral-100",
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
          ))}
        </div>
      </div>
    </div>
  );
}
