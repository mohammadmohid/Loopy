import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import TokenBlocklist from "../models/TokenBlocklist.js";
import OTPToken from "../models/OTPToken.js";
import Workspace from "../models/Workspace.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";
import { sendOTPEmail } from "../config/mailer.js";

const generateToken = (id: string, role: string, workspaceId?: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

  return jwt.sign(
    { id, role, workspaceId: workspaceId || null, jti: uuidv4() },
    jwtSecret,
    { expiresIn: "1d" }
  );
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
  res: Response,
  extra?: Record<string, any>
) => {
  const token = generateToken(
    user._id.toString(),
    user.globalRole,
    user.activeWorkspace?.toString()
  );
  const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

  const isProduction = process.env.NODE_ENV === "production";

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  };

  // Get workspace name if available
  let workspaceName: string | null = null;
  let workspaceRole: string | null = null;
  if (user.activeWorkspace) {
    const ws = await Workspace.findById(user.activeWorkspace);
    if (ws) {
      workspaceName = ws.name;
      const member = ws.members.find(
        (m: any) => m.user.toString() === user._id.toString()
      );
      workspaceRole = member?.role || null;
    }
  }

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
        activeWorkspace: user.activeWorkspace || null,
        workspaceName,
        workspaceRole,
      },
      ...extra,
    });
};

// @desc    Get current user profile
// @route   GET /api/auth/users/:id
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

    let workspaceName: string | null = null;
    let workspaceRole: string | null = null;
    if (user.activeWorkspace) {
      const ws = await Workspace.findById(user.activeWorkspace);
      if (ws) {
        workspaceName = ws.name;
        const member = ws.members.find(
          (m: any) => m.user.toString() === user._id.toString()
        );
        workspaceRole = member?.role || null;
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: { ...user.profile, avatarUrl },
        globalRole: user.globalRole,
        isEmailConfirmed: user.isEmailConfirmed,
        activeWorkspace: user.activeWorkspace || null,
        workspaceName,
        workspaceRole,
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
    const { email, password, firstName, lastName, avatarKey } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      email,
      password,
      profile: { firstName, lastName, avatarKey },
      globalRole: "USER",
      isEmailConfirmed: false,
    });

    // Generate OTP and send email
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTPToken.create({
      userId: user._id,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    await sendOTPEmail(email, code, firstName);

    res.status(201).json({
      success: true,
      needsOTP: true,
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check email confirmation
    if (!user.isEmailConfirmed) {
      // Resend OTP
      await OTPToken.deleteMany({ userId: user._id });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await OTPToken.create({
        userId: user._id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await sendOTPEmail(email, code, user.profile.firstName);

      return res.status(200).json({
        success: true,
        needsOTP: true,
        userId: user._id,
        email: user.email,
      });
    }

    // Check if user needs workspace
    const needsWorkspace = !user.activeWorkspace;

    sendTokenResponse(user, 200, res, { needsWorkspace });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const logout = async (req: Request & { user?: any }, res: Response) => {
  try {
    const jti = req.user?.jti;
    if (jti) {
      await TokenBlocklist.create({ jti });
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

// @desc    Get all users in the current workspace
// @route   GET /api/auth/users
export const getUsers = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const workspaceId = req.user?.workspaceId;

    let userFilter: any = {};
    if (workspaceId) {
      // Only return users in the same workspace
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        const memberIds = workspace.members.map((m: any) => m.user);
        userFilter = { _id: { $in: memberIds } };
      }
    }

    const users = await User.find(userFilter)
      .select("email profile.firstName profile.lastName profile.avatarKey")
      .lean();

    const usersWithAvatar = await Promise.all(
      users.map(async (user: any) => {
        const avatarUrl = await getAvatarUrl(user.profile?.avatarKey);
        return {
          id: user._id,
          email: user.email,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          avatarUrl,
        };
      })
    );

    res.json(usersWithAvatar);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
export const updateProfile = async (
  req: Request & { user?: any },
  res: Response
) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (firstName) user.profile.firstName = firstName;
    if (lastName) user.profile.lastName = lastName;
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists)
        return res.status(400).json({ message: "Email already taken" });
      user.email = email;
    }

    await user.save();

    // Re-generate avatar URL
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
    res.status(500).json({ message: "Server Error", error });
  }
};
