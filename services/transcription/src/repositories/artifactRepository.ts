import mongoose from "mongoose";
import {
  Artifact,
  ArtifactType,
  IArtifact,
  RecordingArtifact,
} from "@loopy/shared";

/**
 * Find a single artifact by meeting ID.
 * Handles both string and ObjectId formats for backward compatibility.
 */
export async function findByMeetingId(meetingId: string): Promise<IArtifact | null> {
  const meetingIds: (string | mongoose.Types.ObjectId)[] = [meetingId];

  if (mongoose.isValidObjectId(meetingId)) {
    meetingIds.push(new mongoose.Types.ObjectId(meetingId));
  }

  const recordingArtifact = await RecordingArtifact.findOne({
    meetingId: { $in: meetingIds },
  });
  if (recordingArtifact) return recordingArtifact;

  return Artifact.findOne({
    $or: [{ artifactType: ArtifactType.RECORDING }, { artifactType: { $exists: false } }],
    meetingId: { $in: meetingIds },
  });
}
