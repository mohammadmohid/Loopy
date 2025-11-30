import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "../config/r2.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Get presigned URL for avatar upload
// @route   POST /api/auth/upload/avatar/sign
export const signAvatarUpload = async (req: Request, res: Response) => {
  try {
    const { fileType } = req.body;

    // Simple validation
    if (!fileType.startsWith("image/")) {
      return res.status(400).json({ message: "Only images allowed" });
    }

    const fileKey = `avatars/${Date.now()}_${uuidv4()}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    res.json({ uploadUrl, key: fileKey });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Upload sign failed", error: error.message });
  }
};
