import mongoose from "mongoose";
import { Artifact, IArtifact } from "@loopy/shared";

/**
 * Find a single artifact by meeting ID.
 * Handles both string and ObjectId formats for backward compatibility.
 */
export async function findByMeetingId(meetingId: string): Promise<IArtifact | null> {
  const conditions: mongoose.FilterQuery<IArtifact>[] = [{ meetingId }];

  if (mongoose.isValidObjectId(meetingId)) {
    conditions.push({ meetingId: new mongoose.Types.ObjectId(meetingId) as unknown as string });
  }

  return Artifact.findOne({ $or: conditions });
}
