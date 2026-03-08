import React, { useState } from 'react';
import { X, Maximize, AppWindow, Mic, MicOff, Volume2, VolumeX, Video, VideoOff } from 'lucide-react';
import { useScreenRecorder } from '@/hooks/useScreenRecorder';

interface ScreenRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingStart: (isRecordingState: boolean) => void;
    useRecorder: ReturnType<typeof useScreenRecorder>;
}

export function ScreenRecordModal({ isOpen, onClose, onRecordingStart, useRecorder }: ScreenRecordModalProps) {
    const [recordingName, setRecordingName] = useState("");
    const [micEnabled, setMicEnabled] = useState(false);
    // System audio is handled natively by the browser prompt, but we add visual toggles to match the design
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    const [sendToIndividual, setSendToIndividual] = useState(true);

    if (!isOpen) return null;

    const handleStartRecording = async () => {
        // Determine filename
        const filename = recordingName.trim() || 'Screen-Recording';

        // We attach the chosen filename to the onStop hook so it knows what to name the file when downloading
        const originalOnStop = useRecorder.stopRecording;

        // Create a temporary override wrapper to handle the download logic
        const handleDownload = (blobUrl: string) => {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${filename}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        // Begin Native Recording Call 
        // We pass the Mic toggle boolean. Audio and Camera are purely visual for now 
        // because the browser takes over the Screen & System Audio selection prompt immediately after this UI closes.
        onClose();
        onRecordingStart(true);

        try {
            await useRecorder.startRecording(micEnabled);

            // We inject the download handler into a custom interval checker or just wait for the hook's native blob
            // Since useScreenRecorder doesn't accept onStop dynamically after mount, we do the download in the parent component `TopHeader`.
            // However, we just need the parent to know what the filename is.
            sessionStorage.setItem("next_recording_filename", filename);

        } catch (e) {
            onRecordingStart(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h2 className="text-lg font-semibold text-neutral-900">Start Screen Recording</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 pb-5 space-y-6">

                    {/* Top Selection Types - Visual Only, browser handles actual selection */}
                    <div className="grid grid-cols-3 gap-3">
                        <button className="flex flex-col items-center justify-center py-4 px-2 border-2 border-[#cc2233]/20 bg-[#cc2233]/5 rounded-xl text-[#cc2233] transition">
                            <Maximize className="w-6 h-6 mb-2" strokeWidth={1.5} />
                            <span className="text-xs font-medium">Full Screen</span>
                        </button>
                        <button className="flex flex-col items-center justify-center py-4 px-2 border border-neutral-200 bg-white rounded-xl text-neutral-500 hover:bg-neutral-50 transition">
                            <AppWindow className="w-6 h-6 mb-2" strokeWidth={1.5} />
                            <span className="text-xs font-medium">Window</span>
                        </button>
                        <button className="flex flex-col items-center justify-center py-4 px-2 border border-neutral-200 bg-white rounded-xl text-neutral-500 hover:bg-neutral-50 transition">
                            {/* Note: React Lucide doesn't have an exact 'Browser' icon, using AppWindow variant visually */}
                            <AppWindow className="w-6 h-6 mb-2" strokeWidth={1.5} />
                            <span className="text-xs font-medium">Browser tab</span>
                        </button>
                    </div>

                    {/* Name Recording Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-800 flex items-center gap-1">
                            Name your recording <span className="text-neutral-400 text-xs font-normal">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="E.g. Recap"
                            value={recordingName}
                            onChange={(e) => setRecordingName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc2233]/20 bg-neutral-50 text-neutral-800"
                        />
                    </div>

                    {/* Send to Individual Stub */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${sendToIndividual ? 'bg-[#cc2233] border-[#cc2233]' : 'border-neutral-300 group-hover:border-neutral-400'}`}>
                                {sendToIndividual && <span className="text-white text-xs font-bold leading-none select-none select-none transform translate-y-[-1px]">&#10003;</span>}
                            </div>
                            <input type="checkbox" className="hidden" checked={sendToIndividual} onChange={() => setSendToIndividual(!sendToIndividual)} />
                            <span className="text-sm text-neutral-800 font-medium">Send to an individual</span>
                        </label>

                        <div className={`space-y-1 transition-opacity duration-200 ${sendToIndividual ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <label className="text-sm font-medium text-neutral-800">User</label>
                            <p className="text-xs text-neutral-400 mb-1">Recording will be sent to the user's chat</p>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    disabled
                                    className="w-full border border-neutral-200 rounded-t-lg px-9 py-2.5 text-sm bg-white"
                                />
                                <div className="absolute left-3 top-3 text-neutral-400">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </div>
                                <div className="absolute right-3 top-3 text-neutral-400">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>

                                {/* Mock User List */}
                                <div className="border border-t-0 border-neutral-200 rounded-b-lg overflow-hidden bg-white">
                                    <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-50 transition bg-neutral-50 border-b border-neutral-100">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition bg-[#cc2233] border-[#cc2233]`}>
                                            <span className="text-white text-[10px] font-bold leading-none transform translate-y-[-0.5px]">&#10003;</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">MM</div>
                                        <span className="text-sm text-neutral-800">User Name</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-50 transition border-b border-neutral-100">
                                        <div className={`w-4 h-4 rounded border border-neutral-300 flex items-center justify-center transition`}>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">MM</div>
                                        <span className="text-sm text-neutral-800">User Name</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                        <div className="flex items-center gap-4 text-neutral-400">
                            <button
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                className={`transition ${audioEnabled ? 'text-[#cc2233]' : 'hover:text-neutral-600'}`}
                                title="System Audio"
                            >
                                {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setMicEnabled(!micEnabled)}
                                className={`transition ${micEnabled ? 'text-[#cc2233]' : 'hover:text-neutral-600'}`}
                                title="Microphone"
                            >
                                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setCameraEnabled(!cameraEnabled)}
                                className={`transition ${cameraEnabled ? 'text-[#cc2233]' : 'hover:text-neutral-600'}`}
                                title="Camera"
                            >
                                {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition border border-neutral-200">
                                Cancel
                            </button>
                            <button onClick={handleStartRecording} className="px-4 py-2 text-sm font-semibold text-white bg-[#cc2233] hover:bg-[#a31b29] rounded-lg transition shadow-sm">
                                Start Recording
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
