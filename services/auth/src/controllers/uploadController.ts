import { Request, Response } from "express";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedUploadUrl, getR2Client } from "@loopy/shared";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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
    const { uploadUrl } = await createPresignedUploadUrl({
      key: fileKey,
      contentType: fileType,
      category: "avatar",
      expiresInSeconds: 300,
    });

    res.json({ signedUrl: uploadUrl, key: fileKey });
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
    const params = req.params as Record<string, string | string[] | undefined>;
    const raw = params.path ?? params["0"];
    const key = Array.isArray(raw) ? raw.join("/") : raw ? String(raw) : "";
    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    const r2Client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // Cache at edge for 24 hours, browser cache for 24 hours
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 86400 });

    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.redirect(307, signedUrl);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load avatar", error: error.message });
  }
};
