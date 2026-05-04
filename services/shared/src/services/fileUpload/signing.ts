import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../../utils/r2.js";

export type UploadCategory = "avatar" | "chat-attachment" | "project-document";

const MIME_POLICY: Record<UploadCategory, RegExp[]> = {
  avatar: [/^image\/.+$/i],
  "chat-attachment": [
    /^image\/.+$/i,
    /^application\/.+$/i,
    /^text\/.+$/i,
    /^video\/.+$/i,
    /^audio\/.+$/i,
  ],
  "project-document": [
    /^application\/.+$/i,
    /^text\/.+$/i,
    /^image\/.+$/i,
    /^video\/.+$/i,
    /^audio\/.+$/i,
  ],
};

export interface SignUploadInput {
  key: string;
  contentType: string;
  category: UploadCategory;
  expiresInSeconds?: number;
}

export interface SignUploadResult {
  uploadUrl: string;
  key: string;
}

export const assertAllowedContentType = (
  contentType: string,
  category: UploadCategory
) => {
  const allowed = MIME_POLICY[category].some((rule) => rule.test(contentType));
  if (!allowed) {
    throw new Error(`Unsupported content type "${contentType}" for ${category}.`);
  }
};

export const createPresignedUploadUrl = async ({
  key,
  contentType,
  category,
  expiresInSeconds = 600,
}: SignUploadInput): Promise<SignUploadResult> => {
  assertAllowedContentType(contentType, category);

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured.");

  const r2 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, {
    expiresIn: Math.max(expiresInSeconds, 60),
  });

  return { uploadUrl, key };
};
