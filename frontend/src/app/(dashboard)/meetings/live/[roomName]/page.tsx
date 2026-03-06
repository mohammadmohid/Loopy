"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { UploadDialog } from "@/components/upload-dialog";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";

export default function LiveMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomName = params.roomName as string;
  const projectId = searchParams.get("projectId") || undefined;

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const { user } = useAuth();

  // 👇 NEW: State for User Name & Email
  const [userInfo, setUserInfo] = useState({
    displayName: "Loopy User",
    email: "user@loopy.local"
  });

  // 👇 NEW: Load User Info safely from AuthProvider
  useEffect(() => {
    if (user) {
      setUserInfo({
        displayName: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() || user.email || "Loopy User",
        email: user.email || "user@loopy.local"
      });
    }
  }, [user]);

  // 1. Fetch the Jitsi Token from your Backend
  useEffect(() => {
    const fetchToken = async () => {
      if (!roomName) return;

      try {
        setLoading(true);
        const res = await apiRequest<{ token: string }>(`/meetings/join/${roomName}`);
        setJwtToken(res.token);
      } catch (error) {
        console.error("Failed to get meeting token", error);
        alert("Could not join meeting. Please check your permissions.");
        router.push("/meetings");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [roomName, router]);

  const handleReadyToClose = async () => {
    try {
      console.log("Ending meeting...");

      let meetingId = null;

      // 🔍 SMART PARSING
      const isDirectId = /^[0-9a-fA-F]{24}$/.test(roomName);

      if (isDirectId) {
        meetingId = roomName;
      } else {
        const parts = roomName.split("-");
        if (parts.length >= 3) {
          meetingId = parts[2];
        }
      }

      if (meetingId) {
        await apiRequest(`/meetings/${meetingId}`, {
          method: "PATCH",
          data: { status: "ended" },
        });
        console.log("Meeting marked as ended.");
      } else {
        console.error("Could not parse Meeting ID from room name:", roomName);
      }
    } catch (err) {
      console.error("Failed to mark meeting ended", err);
    }

    // Redirect to dashboard
    router.push("/meetings");
  };

  if (loading || !roomName) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
        <span className="ml-2 text-neutral-400">Joining secure room...</span>
      </div>
    );
  }

  const appId = process.env.NEXT_PUBLIC_JITSI_APP_ID;
  const fullRoomName = appId ? `${appId}/${roomName}` : roomName;

  return (
    <div className="h-[calc(100vh-100px)] w-full bg-neutral-900 rounded-xl overflow-hidden relative">
      <JitsiMeeting
        domain="8x8.vc"
        roomName={fullRoomName}
        jwt={jwtToken || undefined}
        configOverwrite={{
          startWithAudioMuted: true,
          disableThirdPartyRequests: true,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "closedcaptions", "desktop",
            "fullscreen", "fodeviceselection", "hangup", "profile",
            "chat", "recording", "raisehand", "videoquality", "tileview"
          ],
        }}
        // 👇 UPDATE: Use the state variable here
        userInfo={{
          displayName: userInfo.displayName,
          email: userInfo.email,
        }}
        onReadyToClose={handleReadyToClose}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "100%";
        }}
      />

      <UploadDialog
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false);
          router.push("/meetings");
        }}
        onUploadComplete={() => {
          setShowUpload(false);
          router.push("/meetings");
        }}
        projectId={projectId}
      />
    </div>
  );
}