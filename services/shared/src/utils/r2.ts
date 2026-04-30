import { S3Client } from "@aws-sdk/client-s3";

export const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("CRITICAL R2 CONFIG ERROR:", {
      accountId: accountId ? "Set" : "MISSING",
      accessKeyId: accessKeyId ? "Set" : "MISSING",
      secretAccessKey: secretAccessKey ? "Set" : "MISSING",
    });
    throw new Error("R2 Environment variables are missing at runtime.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
};
