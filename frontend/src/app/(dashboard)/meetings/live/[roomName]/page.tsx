"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { UploadDialog } from "@/components/upload-dialog";
import { apiRequest } from "@/lib/api";

export default function LiveMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomName = params.roomName as string;
  const projectId = searchParams.get("projectId") || undefined;

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // 1. Fetch the Jitsi Token from your Backend
  useEffect(() => {
    const fetchToken = async () => {
      if (!roomName) return;
      
      try {
        setLoading(true);
        // This calls the endpoint we created: GET /api/meetings/join/:roomName
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

  // Handle meeting end
 /* const handleReadyToClose = async () => {
    // 1. Tell backend to mark as ended BEFORE asking for upload
    try {
      console.log("Ending meeting...");
      await apiRequest(`/meetings/end/${roomName}`, { method: "PATCH" });
      console.log("Meeting marked as ended.");
    } catch (err) {
      console.error("Failed to mark meeting ended", err);
      // We continue anyway so the user isn't stuck
    }

    // 2. Ask user about upload
    const shouldUpload = window.confirm(
      "Meeting ended. Do you have a recording to upload for transcription?"
    );

    if (shouldUpload) {
      setShowUpload(true);
    } else {
      router.push("/meetings");
    }
  }; */

  const handleReadyToClose = async () => {
    try {
      console.log("Ending meeting...");

      // 1. EXTRACT ID from "Loopy-<ProjectID>-<MeetingID>"
      // The roomName format is strict, so we grab the 3rd part (index 2)
      const parts = (roomName as string).split("-");
      const meetingId = parts.length >= 3 ? parts[2] : null;

      if (meetingId) {
        // 2. CALL API with the correct ID
        await apiRequest(`/meetings/${meetingId}`, {
          method: "PATCH",
          data: { status: "ended" }, // Send status update in body
        });
        console.log("Meeting marked as ended.");
      } else {
        console.error("Could not parse Meeting ID from room name:", roomName);
      }
    } catch (err) {
      console.error("Failed to mark meeting ended", err);
    }

    // 3. Ask user about upload (or just redirect)
    // Since you have auto-recording, you might typically skip this, 
    // but keeping your logic intact:
    const shouldUpload = window.confirm(
      "Meeting ended. Do you have a local recording to upload manually?"
    );

    if (shouldUpload) {
      setShowUpload(true);
    } else {
      router.push("/meetings");
    }
  };

  if (loading || !roomName) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
        <span className="ml-2 text-neutral-400">Joining secure room...</span>
      </div>
    );
  }

  // 2. Construct the full JaaS Room ID (AppID/RoomName)
  // Ensure NEXT_PUBLIC_JITSI_APP_ID is set in your frontend .env
  const appId = process.env.NEXT_PUBLIC_JITSI_APP_ID;
  const fullRoomName = appId ? `${appId}/${roomName}` : roomName;

  return (
    <div className="h-[calc(100vh-100px)] w-full bg-neutral-900 rounded-xl overflow-hidden relative">
      <JitsiMeeting
        domain="8x8.vc" // Use the 8x8 JaaS domain
        roomName={fullRoomName}
        jwt={jwtToken || undefined} // Pass the token here
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
        userInfo={{
          displayName: "Loopy User", // The JWT will actually override this
          email: "user@loopy.local",
        }}
        onReadyToClose={handleReadyToClose}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "100%";
        }}
      />

      {/* Upload Dialog with Project Context */}
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
        projectId={projectId} // Pass projectId so upload is auto-tagged
      />
    </div>
  );
}