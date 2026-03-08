import { useState, useRef, useCallback } from 'react';

export interface UseScreenRecorderProps {
    onStop?: (blobUrl: string, blob: Blob) => void;
}

export const useScreenRecorder = ({ onStop }: UseScreenRecorderProps = {}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async (withMic: boolean = false) => {
        try {
            // 1. Request Screen (always prompts user)
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true, // Captures system audio if the user checks the box in the browser prompt
            });

            let finalStream = screenStream;

            // 2. Request Microphone if toggled on
            if (withMic) {
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                    // Combine audio tracks using AudioContext to mix system audio and mic together
                    const hasSystemAudio = screenStream.getAudioTracks().length > 0;

                    if (hasSystemAudio) {
                        const audioCtx = new AudioContext();
                        const dest = audioCtx.createMediaStreamDestination();

                        const screenSource = audioCtx.createMediaStreamSource(screenStream);
                        screenSource.connect(dest);

                        const micSource = audioCtx.createMediaStreamSource(micStream);
                        micSource.connect(dest);

                        const combinedTracks = [
                            ...screenStream.getVideoTracks(),
                            ...dest.stream.getAudioTracks()
                        ];

                        finalStream = new MediaStream(combinedTracks);
                    } else {
                        // Just append the mic track directly
                        finalStream = new MediaStream([
                            ...screenStream.getVideoTracks(),
                            ...micStream.getAudioTracks()
                        ]);
                    }

                    // Add mic tracks to the main stream ref so we can stop them later
                    micStream.getTracks().forEach(track => streamRef.current?.addTrack(track));
                } catch (err) {
                    console.warn("Microphone permission denied or not available. Continuing with screen only.", err);
                }
            }

            streamRef.current = finalStream;

            // 3. Setup Media Recorder
            const options = { mimeType: 'video/webm' };
            mediaRecorderRef.current = new MediaRecorder(finalStream, options);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    mediaChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(mediaChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setMediaBlobUrl(url);
                if (onStop) onStop(url, blob);
                mediaChunksRef.current = [];
            };

            // 4. Handle user clicking "Stop sharing" Native Browser button
            finalStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

            // 5. Start!
            mediaChunksRef.current = [];
            mediaRecorderRef.current.start(100); // chunk size in ms
            setIsRecording(true);
            setRecordingTime(0);
            setMediaBlobUrl(null);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Failed to start recording:", err);
            // Usually means the user cancelled the screen picker
        }
    }, [onStop]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Turn off all camera and mic lights immediately
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsRecording(false);
    }, []);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return {
        isRecording,
        recordingTime: formatTime(recordingTime),
        mediaBlobUrl,
        startRecording,
        stopRecording,
    };
};
