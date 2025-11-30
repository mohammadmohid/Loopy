import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Get presigned URL for avatar upload
// @route   POST /api/auth/upload/avatar/sign
export const signAvatarUpload = async (req: Request, res: Response) => {
  try {
    const r2Client = getR2Client();
    const { fileType } = req.body;

    // Simple validation
    if (!fileType.startsWith("image/")) {
      return res.status(400).json({ message: "Only images allowed" });
    }

    const fileKey = `avatars/${Date.now()}_${uuidv4()}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    console.log(process.env.R2_BUCKET_NAME);

    res.json({ signedUrl, key: fileKey });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Upload sign failed", error: error.message });
  }
};
