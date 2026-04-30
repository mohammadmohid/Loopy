import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@loopy/shared";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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

// @desc    Get Avatar (Redirects to presigned URL)
// @route   GET /api/auth/avatars/*
export const getAvatar = async (req: Request, res: Response) => {
  try {
    const key = req.params[0]; // Gets the wildcard match
    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    const r2Client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key, // Should be something like "avatars/123_abc"
    });

    // Cache at edge for 24 hours, browser cache for 24 hours
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 86400 });

    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.redirect(301, signedUrl);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load avatar", error: error.message });
  }
};
