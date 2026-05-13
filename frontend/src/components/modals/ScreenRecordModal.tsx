import React, { useState, useEffect, useMemo } from 'react';
import { X, Maximize, AppWindow, Mic, MicOff, Volume2, VolumeX, Video, VideoOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useScreenRecorder } from '@/hooks/useScreenRecorder';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { storeScreenRecordingRecipients } from '@/lib/screen-recording-chat';

interface WorkspaceUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
}

interface ScreenRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingStart: (isRecordingState: boolean) => void;
    useRecorder: ReturnType<typeof useScreenRecorder>;
}

function getInitials(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
}

export function ScreenRecordModal({ isOpen, onClose, onRecordingStart, useRecorder }: ScreenRecordModalProps) {
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id ?? '';

    const [recordingName, setRecordingName] = useState("");
    const [micEnabled, setMicEnabled] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    const [sendToIndividual, setSendToIndividual] = useState(false);
    const [users, setUsers] = useState<WorkspaceUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchUsers = async () => {
            try {
                setLoadingUsers(true);
                const raw = await apiRequest<unknown[]>("/auth/users");
                const mapped = (Array.isArray(raw) ? raw : [])
                    .map((entry) => {
                        const u = entry as {
                            _id?: string;
                            id?: string;
                            email?: string;
                            profile?: {
                                firstName?: string;
                                lastName?: string;
                                avatarUrl?: string;
                            };
                        };
                        const id = String(u._id ?? u.id ?? "").trim();
                        return {
                            id,
                            email: u.email ?? "",
                            firstName: u.profile?.firstName ?? "",
                            lastName: u.profile?.lastName ?? "",
                            avatarUrl: u.profile?.avatarUrl,
                        };
                    })
                    .filter((u) => u.id && u.id !== currentUserId);

                setUsers(mapped);
            } catch (error) {
                console.error("Failed to load workspace users", error);
                setUsers([]);
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchUsers();
        setUserSearch("");
        setSelectedUserIds([]);
    }, [isOpen, currentUserId]);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();
        if (!query) return users;
        return users.filter((u) => {
            const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
            return fullName.includes(query) || u.email.toLowerCase().includes(query);
        });
    }, [users, userSearch]);

    const toggleUser = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const handleStartRecording = async () => {
        const filename = recordingName.trim() || 'Screen-Recording';

        const recipients = sendToIndividual
            ? users
                .filter((u) => selectedUserIds.includes(u.id))
                .map((u) => ({
                    id: u.id,
                    name: `${u.firstName} ${u.lastName}`.trim() || u.email,
                }))
            : [];

        storeScreenRecordingRecipients(sendToIndividual, recipients);
        sessionStorage.setItem("next_recording_filename", filename);

        onClose();
        onRecordingStart(true);

        try {
            await useRecorder.startRecording(micEnabled);
        } catch {
            onRecordingStart(false);
        }
    };

    if (!isOpen) return null;

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

                    {/* Send to Individual */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${sendToIndividual ? 'bg-[#cc2233] border-[#cc2233]' : 'border-neutral-300 group-hover:border-neutral-400'}`}>
                                {sendToIndividual && <span className="text-white text-xs font-bold leading-none select-none transform translate-y-[-1px]">&#10003;</span>}
                            </div>
                            <input type="checkbox" className="hidden" checked={sendToIndividual} onChange={() => setSendToIndividual(!sendToIndividual)} />
                            <span className="text-sm text-neutral-800 font-medium">Send to an individual</span>
                        </label>

                        <div className={`space-y-1 transition-opacity duration-200 ${sendToIndividual ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <label className="text-sm font-medium text-neutral-800">User</label>
                            <p className="text-xs text-neutral-400 mb-1">Recording will be sent to the user&apos;s chat after cloud upload</p>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    disabled={!sendToIndividual}
                                    className="w-full border border-neutral-200 rounded-t-lg px-9 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cc2233]/20 disabled:bg-neutral-50"
                                />
                                <div className="absolute left-3 top-3 text-neutral-400">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </div>

                                <div className="border border-t-0 border-neutral-200 rounded-b-lg overflow-hidden bg-white max-h-40 overflow-y-auto">
                                    {loadingUsers ? (
                                        <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-neutral-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading users...
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="px-3 py-4 text-sm text-neutral-400 text-center">
                                            {users.length === 0 ? "No workspace members found" : "No users match your search"}
                                        </div>
                                    ) : (
                                        filteredUsers.map((workspaceUser) => {
                                            const isSelected = selectedUserIds.includes(workspaceUser.id);
                                            const displayName = `${workspaceUser.firstName} ${workspaceUser.lastName}`.trim() || workspaceUser.email;

                                            return (
                                                <button
                                                    key={workspaceUser.id}
                                                    type="button"
                                                    onClick={() => toggleUser(workspaceUser.id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-50 transition border-b border-neutral-100 last:border-b-0 text-left ${isSelected ? 'bg-neutral-50' : ''}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${isSelected ? 'bg-[#cc2233] border-[#cc2233]' : 'border-neutral-300'}`}>
                                                        {isSelected && <span className="text-white text-[10px] font-bold leading-none transform translate-y-[-0.5px]">&#10003;</span>}
                                                    </div>
                                                    {workspaceUser.avatarUrl ? (
                                                        <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                                                            <Image
                                                                src={workspaceUser.avatarUrl}
                                                                alt={displayName}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0">
                                                            {getInitials(workspaceUser.firstName, workspaceUser.lastName)}
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-neutral-800 truncate">{displayName}</span>
                                                </button>
                                            );
                                        })
                                    )}
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
