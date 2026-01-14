"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { UploadDialog } from "@/components/upload-dialog"; // Reusing your existing component

export default function LiveMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const roomName = params.roomName as string;
  const [showUpload, setShowUpload] = useState(false);

  // Handle meeting end
  const handleReadyToClose = () => {
    // Check if user wants to upload the recording immediately
    const shouldUpload = window.confirm(
      "Meeting ended. Do you have a recording to upload for transcription?"
    );

    if (shouldUpload) {
      setShowUpload(true);
    } else {
      router.push("/meetings");
    }
  };

  if (!roomName) return <Loader2 className="animate-spin" />;

  return (
    <div className="h-[calc(100vh-100px)] w-full bg-neutral-900 rounded-xl overflow-hidden relative">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableThirdPartyRequests: true,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          // Custom toolbar with recording button
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "closedcaptions", "desktop", 
            "fullscreen", "fodeviceselection", "hangup", "profile", 
            "chat", "recording", "raisehand", "videoquality", "tileview"
          ],
        }}
        userInfo={{
          displayName: "Loopy User",
          email: "user@loopy.local",
        }}
        onReadyToClose={handleReadyToClose}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "100%";
        }}
      />

      {/* Reusing your existing Upload Dialog */}
      <UploadDialog 
        isOpen={showUpload} 
        onClose={() => {
            setShowUpload(false);
            router.push("/meetings"); // Redirect after closing dialog
        }}
        onUploadComplete={() => {
            setShowUpload(false);
            router.push("/meetings"); // Redirect after successful upload
        }}
        // You can pass the projectId here if you stored it in the URL query params
      />
    </div>
  );
}