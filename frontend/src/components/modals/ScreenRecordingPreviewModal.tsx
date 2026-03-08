import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Scissors, MessageSquare, Download, Loader2 } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { apiRequest } from '@/lib/api';

interface Comment {
    id: string;
    timestamp: number;
    text: string;
}

interface ScreenRecordingPreviewModalProps {
    isOpen: boolean;
    videoUrl: string | null;
    videoBlob: Blob | null;
    filename: string;
    onClose: () => void;
}

export function ScreenRecordingPreviewModal({ isOpen, videoUrl, videoBlob, filename, onClose }: ScreenRecordingPreviewModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const ffmpegRef = useRef(new FFmpeg());

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Trimming State
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(100); // Set to 100 initially until metadata loads

    // Custom Dragging State
    const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
    const [isDraggingStart, setIsDraggingStart] = useState(false);
    const [isDraggingEnd, setIsDraggingEnd] = useState(false);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [newCommentText, setNewCommentText] = useState("");

    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [message, setMessage] = useState("Ready");

    useEffect(() => {
        const loadFFmpeg = async () => {
            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg.loaded) {
                ffmpeg.on('progress', ({ progress, time }) => {
                    setExportProgress(progress * 100);
                });
                ffmpeg.on('log', ({ message }) => {
                    console.log(message);
                });
                await ffmpeg.load({
                    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
                    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
                });
                setMessage("FFmpeg loaded");
            }
        };
        if (isOpen) {
            loadFFmpeg().catch((e) => console.error("Error loading FFmpeg", e));
        }
    }, [isOpen]);

    // Video Event Handlers
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Auto-loop if it hits trim end
        if (time >= trimEnd && !isDraggingTimeline) {
            videoRef.current.pause();
            setIsPlaying(false);
            videoRef.current.currentTime = trimStart;
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            if (d === Infinity || isNaN(d)) {
                // Workaround for Chrome webm duration bug
                videoRef.current.currentTime = 1e101;
                setTimeout(() => {
                    if (videoRef.current) {
                        const actualDuration = videoRef.current.duration;
                        videoRef.current.currentTime = 0;
                        setDuration(actualDuration);
                        setTrimEnd(actualDuration);
                    }
                }, 100);
            } else {
                setDuration(d);
                setTrimEnd(d);
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else {
                if (videoRef.current.currentTime >= trimEnd) {
                    videoRef.current.currentTime = trimStart;
                }
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Timeline Interactions
    const updateTimelineFromMouse = (e: React.PointerEvent | PointerEvent) => {
        if (!timelineRef.current || duration === 0 || !isFinite(duration)) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * duration;

        if (!isFinite(newTime)) return;

        const safeTrimEnd = isFinite(trimEnd) ? trimEnd : duration;
        const safeTrimStart = isFinite(trimStart) ? trimStart : 0;

        if (isDraggingStart) {
            const cappedTime = Math.min(newTime, safeTrimEnd - 0.5); // Prevent crossing
            if (isFinite(cappedTime)) {
                setTrimStart(cappedTime);
                if (videoRef.current) videoRef.current.currentTime = cappedTime;
            }
        } else if (isDraggingEnd) {
            const cappedTime = Math.max(newTime, safeTrimStart + 0.5); // Prevent crossing
            if (isFinite(cappedTime)) {
                setTrimEnd(cappedTime);
                if (videoRef.current) videoRef.current.currentTime = cappedTime;
            }
        } else if (isDraggingTimeline) {
            if (videoRef.current && isFinite(newTime)) {
                videoRef.current.currentTime = newTime;
                setCurrentTime(newTime);
            }
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (isDraggingStart || isDraggingEnd || isDraggingTimeline) {
            updateTimelineFromMouse(e);
        }
    };

    const handlePointerUp = () => {
        setIsDraggingTimeline(false);
        setIsDraggingStart(false);
        setIsDraggingEnd(false);
    };

    useEffect(() => {
        if (isDraggingStart || isDraggingEnd || isDraggingTimeline) {
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDraggingStart, isDraggingEnd, isDraggingTimeline, duration, trimStart, trimEnd]);

    // Comment System
    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        // Pause video to type comment
        if (isPlaying) togglePlay();

        setComments([...comments, {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: currentTime,
            text: newCommentText.trim()
        }]);
        setNewCommentText("");
    };

    const jumpToComment = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    // Export Logic with FFmpeg
    const handleExport = async () => {
        if (!videoBlob) return;
        try {
            setIsExporting(true);
            setMessage("Preparing...");
            const ffmpeg = ffmpegRef.current;

            // Write the file to memory
            setMessage("Writing file to memory...");
            await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));

            // Trim the file
            // If no trimming happened, we could just download the blob directly, but we will run it through ffmpeg to ensure duration metadata is fixed
            setMessage("Trimming and Processing Video...");
            await ffmpeg.exec([
                '-i', 'input.webm',
                '-ss', trimStart.toString(),
                '-to', trimEnd.toString(),
                '-c', 'copy', // Fast stream copy! No re-encoding
                'output.webm'
            ]);

            setMessage("Finalizing...");
            const data = await ffmpeg.readFile('output.webm');

            const trimmedBlob = new Blob([data as unknown as BlobPart], { type: 'video/webm' });
            const trimmedUrl = URL.createObjectURL(trimmedBlob);

            // Trigger automatic download
            const a = document.createElement("a");
            a.href = trimmedUrl;
            a.download = `${filename}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(trimmedUrl), 100);

            setMessage("Done!");
            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1000);

        } catch (error) {
            console.error(error);
            setMessage("Error exporting video. Please try again.");
            setTimeout(() => setIsExporting(false), 3000);
        }
    };

    const handleCloudUpload = async () => {
        if (!videoBlob) return;
        try {
            setIsExporting(true);
            setMessage("Generating secure upload link...");

            // 1. Get the Presigned URL from the Gateway -> Project Service
            const { presignedUrl, publicUrl } = await apiRequest<any>('/api/projects/upload/screen-recording', {
                method: 'POST',
                data: {
                    filename: `${filename}.webm`,
                    contentType: 'video/webm'
                }
            });

            // 2. We need to run FFmpeg first just like in export, to ensure properties/trimming are correct!
            setMessage("Preparing video for upload...");
            const ffmpeg = ffmpegRef.current;
            await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));

            setMessage("Processing Video...");

            // Fix: Ensure trimEnd is a valid number, otherwise FFmpeg crashes
            const validTrimEnd = isFinite(trimEnd) && trimEnd > 0 ? trimEnd : (isFinite(duration) ? duration : 0);

            const ffmpegArgs = [
                '-i', 'input.webm',
                '-ss', trimStart.toString()
            ];

            if (validTrimEnd > 0) {
                ffmpegArgs.push('-to', validTrimEnd.toString());
            }

            ffmpegArgs.push('-c', 'copy', 'output_upload.webm');

            await ffmpeg.exec(ffmpegArgs);

            const data = await ffmpeg.readFile('output_upload.webm');
            const trimmedBlob = new Blob([data as unknown as BlobPart], { type: 'video/webm' });

            // 3. Upload DIRECTLY to the temporary R2 URL
            setMessage("Uploading to Cloud Storage...");

            // XHR Upload to track progress
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        setExportProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error during upload"));

                xhr.open('PUT', presignedUrl, true);
                xhr.setRequestHeader('Content-Type', 'video/webm');
                xhr.send(trimmedBlob);
            });

            setMessage("Upload Complete! Available in Cloud.");
            console.log("Uploaded successfully to:", publicUrl);

            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1500);

        } catch (error: any) {
            console.error("Cloud Upload Error:", error);
            setMessage(error.message || "Error uploading video.");
            setTimeout(() => setIsExporting(false), 3000);
        }
    };

    // Formatting Helper
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!isOpen || !videoUrl || !videoBlob) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8">

            {/* Export Loading Overlay */}
            {isExporting && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md rounded-2xl m-4 sm:m-8">
                    <Loader2 className="w-12 h-12 text-[#cc2233] animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">Processing Video</h3>
                    <p className="text-neutral-500 mb-6">{message}</p>

                    <div className="w-64 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#cc2233] transition-all duration-300 ease-out" style={{ width: `${exportProgress}%` }} />
                    </div>
                    <p className="text-sm font-medium text-neutral-500 mt-2">{Math.round(exportProgress)}%</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[800px] flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-[#cc2233]" />
                        <h2 className="text-lg font-semibold text-neutral-900">Preview & Trim: {filename}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition">
                            Discard
                        </button>
                        <button onClick={handleCloudUpload} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition">
                            <Download className="w-4 h-4 rotate-180" />
                            Upload to Cloud
                        </button>
                        <button onClick={handleExport} className="px-4 py-2 text-sm font-semibold text-white bg-[#cc2233] hover:bg-[#a31b29] rounded-lg shadow-sm flex items-center gap-2 transition">
                            <Download className="w-4 h-4" />
                            Save & Export
                        </button>
                    </div>
                </div>

                {/* Content Split */}
                <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-neutral-50">

                    {/* Main Video Area */}
                    <div className="flex-1 flex flex-col relative border-r border-neutral-200">
                        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px]">
                            {duration === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                                </div>
                            )}
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="max-h-full max-w-full"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onClick={togglePlay}
                            />

                            {/* Click to Play Overlay */}
                            {!isPlaying && duration > 0 && (
                                <button onClick={togglePlay} className="absolute w-16 h-16 bg-[#cc2233]/90 hover:bg-[#cc2233] rounded-full flex items-center justify-center text-white transition shadow-lg backdrop-blur-sm">
                                    <Play className="w-6 h-6 ml-1" fill="currentColor" />
                                </button>
                            )}
                        </div>

                        {/* Custom Interactive Timeline */}
                        <div className="h-32 bg-white border-t border-neutral-200 p-6 shrink-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between text-xs font-mono text-neutral-500 mb-2">
                                <span>{formatTime(currentTime)}</span>
                                <span className="font-semibold text-neutral-800">TRIM DURATION: {formatTime(trimEnd - trimStart)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>

                            {/* Scrub Container */}
                            <div
                                className="relative w-full h-12 bg-neutral-100 rounded-lg select-none group"
                                ref={timelineRef}
                                onPointerDown={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.dataset.handle === 'start') setIsDraggingStart(true);
                                    else if (target.dataset.handle === 'end') setIsDraggingEnd(true);
                                    else {
                                        setIsDraggingTimeline(true);
                                        updateTimelineFromMouse(e);
                                    }
                                }}
                            >
                                {/* The Trimmed Area Highlight */}
                                <div
                                    className="absolute top-0 bottom-0 bg-[#cc2233]/10 border-y-2 border-[#cc2233] cursor-pointer"
                                    style={{ left: `${(trimStart / Math.max(duration, 1)) * 100}%`, right: `${100 - (trimEnd / Math.max(duration, 1)) * 100}%` }}
                                />

                                {/* Unplayabale Overlays (Grayed out) */}
                                <div className="absolute top-0 bottom-0 left-0 bg-neutral-200/50 backdrop-blur-[1px]" style={{ width: `${(trimStart / Math.max(duration, 1)) * 100}%` }} />
                                <div className="absolute top-0 bottom-0 right-0 bg-neutral-200/50 backdrop-blur-[1px]" style={{ width: `${100 - (trimEnd / Math.max(duration, 1)) * 100}%` }} />

                                {/* Progress Bar (Current Playhead) */}
                                <div
                                    className="absolute top-0 bottom-0 w-[2px] bg-[#cc2233] z-10 pointer-events-none"
                                    style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }}
                                >
                                    <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-[#cc2233]" />
                                </div>

                                {/* Trim Handles */}
                                <div
                                    data-handle="start"
                                    className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-[#cc2233] cursor-ew-resize rounded-l z-20 hover:scale-x-150 transition-transform origin-right"
                                    style={{ left: `${(trimStart / Math.max(duration, 1)) * 100}%` }}
                                />
                                <div
                                    data-handle="end"
                                    className="absolute top-0 bottom-0 w-3 -mr-1.5 bg-[#cc2233] cursor-ew-resize rounded-r z-20 hover:scale-x-150 transition-transform origin-left"
                                    style={{ right: `${100 - (trimEnd / Math.max(duration, 1)) * 100}%` }}
                                />

                                {/* Comment Markers */}
                                {comments.map((comment, i) => (
                                    <div
                                        key={i}
                                        title={comment.text}
                                        onClick={(e) => { e.stopPropagation(); jumpToComment(comment.timestamp); }}
                                        className="absolute -top-4 -translate-x-1/2 cursor-pointer z-30 group/marker"
                                        style={{ left: `${(comment.timestamp / Math.max(duration, 1)) * 100}%` }}
                                    >
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-sm ring-2 ring-transparent group-hover/marker:ring-blue-200 transition" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Area: Comments */}
                    <div className="w-full lg:w-[350px] bg-white flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-neutral-100 flex items-center gap-2 shrink-0">
                            <MessageSquare className="w-5 h-5 text-neutral-400" />
                            <h3 className="font-semibold text-neutral-900">Timestamp Comments</h3>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {comments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-center space-y-2 opacity-50">
                                    <MessageSquare className="w-8 h-8" />
                                    <p className="text-sm">No comments yet.<br />Type below to add one at the current timestamp.</p>
                                </div>
                            ) : (
                                comments.sort((a, b) => a.timestamp - b.timestamp).map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 cursor-pointer hover:border-neutral-300 transition group"
                                        onClick={() => jumpToComment(comment.timestamp)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                {formatTime(comment.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-700 leading-relaxed">{comment.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="p-4 border-t border-neutral-100 bg-neutral-50 shrink-0">
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded pointer-events-none">
                                        {formatTime(currentTime)}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        className="w-full pl-16 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newCommentText.trim()}
                                    className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-neutral-800 transition"
                                >
                                    Add
                                </button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
