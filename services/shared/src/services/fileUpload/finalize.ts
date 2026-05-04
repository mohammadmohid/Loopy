import mongoose from "mongoose";
import Artifact, {
  ArtifactType,
  IArtifact,
  TranscriptionStatus,
} from "../../models/Artifact.js";
import FileVersion from "../../models/FileVersion.js";
import {
  clearUploadTracker,
} from "../fileCoordination/uploadTracker.js";

type ObjectIdLike = mongoose.Types.ObjectId | string;

export interface FinalizeUploadInput {
  workspaceId?: ObjectIdLike;
  folderId?: ObjectIdLike;
  projectId?: ObjectIdLike;
  uploadedBy?: ObjectIdLike;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  r2Key: string;
  expectedPrefix: string;
  uploadId?: string;
}

const toObjectIdOrUndefined = (
  value?: ObjectIdLike
): mongoose.Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.isValidObjectId(value)) return new mongoose.Types.ObjectId(value);
  return undefined;
};

export const assertExpectedR2Prefix = (r2Key: string, expectedPrefix: string) => {
  if (!r2Key.startsWith(expectedPrefix)) {
    throw new Error("Invalid R2 key prefix.");
  }
};

export const finalizeArtifactUpload = async ({
  workspaceId,
  folderId,
  projectId,
  uploadedBy,
  filename,
  mimeType,
  sizeBytes,
  r2Key,
  expectedPrefix,
  uploadId,
}: FinalizeUploadInput): Promise<IArtifact> => {
  assertExpectedR2Prefix(r2Key, expectedPrefix);

  const uploadedByOid = toObjectIdOrUndefined(uploadedBy);
  
  // Create the artifact
  const artifact = await Artifact.create({
    artifactType: ArtifactType.PROJECT_DOCUMENT,
    workspaceId: toObjectIdOrUndefined(workspaceId),
    folderId: toObjectIdOrUndefined(folderId),
    projectId: toObjectIdOrUndefined(projectId),
    uploadedBy: uploadedByOid,
    uploader: uploadedByOid,
    originalFilename: filename,
    filename,
    r2Key,
    storageKey: r2Key,
    mimeType,
    sizeBytes,
    transcriptionStatus: TranscriptionStatus.PENDING,
  });

  // Create the first FileVersion
  const fileVersion = await FileVersion.create({
    artifactId: artifact._id,
    versionNumber: 1,
    r2Key,
    author: uploadedByOid,
    changeDescription: "Initial upload",
  });

  // Update artifact with currentVersionId
  artifact.currentVersionId = fileVersion._id;
  await artifact.save();

  if (uploadId) {
    await clearUploadTracker(uploadId);
  }

  return artifact;
};
