import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import TokenBlocklist from "../models/TokenBlocklist.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";

const generateToken = (id: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

  return jwt.sign({ id, role, jti: uuidv4() }, jwtSecret, { expiresIn: "1d" });
};

const getAvatarUrl = async (key?: string) => {
  if (!key) return null;
  try {
    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    // Link valid for 24 hours (matches token expiry)
    return await getSignedUrl(r2, command, { expiresIn: 86400 });
  } catch (error) {
    console.error("Error signing avatar URL:", error);
    return null;
  }
};

// Helper to set cookie
const sendTokenResponse = async (
  user: any,
  statusCode: number,
  res: Response
) => {
  const token = generateToken(user._id.toString(), user.globalRole);
  const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "lax" as const,
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: { ...user.profile, avatarUrl },
        globalRole: user.globalRole,
      },
    });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const findUserById = async (
  req: Request & { id?: string },
  res: Response
) => {
  try {
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: { ...user.profile, avatarUrl },
        globalRole: user.globalRole,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: { ...user.profile, avatarUrl },
        globalRole: user.globalRole,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response) => {
  try {
    // 1. Destructure userType from the request body
    const { email, password, firstName, lastName, userType, avatarKey } =
      req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Map frontend "userType" to database "globalRole"
    // Only 'org_admin' gets the ADMIN global role. All others are USER.
    // You can add 'project_manager' here if you want them to be global admins too.
    let globalRole = "USER";
    if (userType === "org_admin") {
      globalRole = "ADMIN";
    }

    const user = await User.create({
      email,
      password,
      profile: { firstName, lastName, avatarKey },
      globalRole: globalRole, // 3. Save the determined role
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.matchPassword(password))) {
      sendTokenResponse(user, 200, res);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const logout = async (req: Request & { user?: any }, res: Response) => {
  try {
    const jti = req.user?.jti;
    if (jti) {
      await TokenBlocklist.create({ jti });
    }

    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};
