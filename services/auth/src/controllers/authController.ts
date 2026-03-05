import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import TokenBlocklist from "../models/TokenBlocklist.js";
<<<<<<< HEAD
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";

const generateToken = (id: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

  return jwt.sign({ id, role, jti: uuidv4() }, jwtSecret, { expiresIn: "1d" });
=======
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
>>>>>>> 2000e39 (feat: Workspace added)
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
<<<<<<< HEAD
  res: Response
) => {
  const token = generateToken(user._id.toString(), user.globalRole);
=======
  res: Response,
  extra?: Record<string, any>
) => {
  const token = generateToken(
    user._id.toString(),
    user.globalRole,
    user.activeWorkspace?.toString()
  );
>>>>>>> 2000e39 (feat: Workspace added)
  const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

  const isProduction = process.env.NODE_ENV === "production";

  const options = {
<<<<<<< HEAD
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
=======
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
>>>>>>> 2000e39 (feat: Workspace added)
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  };

<<<<<<< HEAD
=======
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

>>>>>>> 2000e39 (feat: Workspace added)
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
<<<<<<< HEAD
      },
=======
        activeWorkspace: user.activeWorkspace || null,
        workspaceName,
        workspaceRole,
      },
      ...extra,
>>>>>>> 2000e39 (feat: Workspace added)
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

<<<<<<< HEAD
=======
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

>>>>>>> 2000e39 (feat: Workspace added)
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: { ...user.profile, avatarUrl },
        globalRole: user.globalRole,
<<<<<<< HEAD
=======
        isEmailConfirmed: user.isEmailConfirmed,
        activeWorkspace: user.activeWorkspace || null,
        workspaceName,
        workspaceRole,
>>>>>>> 2000e39 (feat: Workspace added)
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
<<<<<<< HEAD
    // 1. Destructure userType from the request body
    const { email, password, firstName, lastName, userType, avatarKey } =
      req.body;
=======
    const { email, password, firstName, lastName, avatarKey } = req.body;
>>>>>>> 2000e39 (feat: Workspace added)

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

<<<<<<< HEAD
    // 2. Map frontend "userType" to database "globalRole"
    // Only 'org_admin' gets the ADMIN global role. All others are USER.
    // You can add 'project_manager' here if you want them to be global admins too.
    let globalRole = "USER";
    if (userType === "org_admin") {
      globalRole = "ADMIN";
    }

=======
>>>>>>> 2000e39 (feat: Workspace added)
    const user = await User.create({
      email,
      password,
      profile: { firstName, lastName, avatarKey },
<<<<<<< HEAD
      globalRole: globalRole, // 3. Save the determined role
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
=======
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
>>>>>>> 2000e39 (feat: Workspace added)
    res.status(500).json({ message: "Server Error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

<<<<<<< HEAD
    if (user && (await user.matchPassword(password))) {
      sendTokenResponse(user, 200, res);
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
=======
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
>>>>>>> 2000e39 (feat: Workspace added)
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

<<<<<<< HEAD
// @desc    Get all users (for search/selection)
// @route   GET /api/auth/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    // Return only necessary fields to protect privacy
    const users = await User.find({})
=======
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
>>>>>>> 2000e39 (feat: Workspace added)
      .select("email profile.firstName profile.lastName profile.avatarKey")
      .lean();

    const usersWithAvatar = await Promise.all(
      users.map(async (user: any) => {
<<<<<<< HEAD
        // Reuse your existing getAvatarUrl logic here if possible
        // For now, we return the structure
=======
        const avatarUrl = await getAvatarUrl(user.profile?.avatarKey);
>>>>>>> 2000e39 (feat: Workspace added)
        return {
          id: user._id,
          email: user.email,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
<<<<<<< HEAD
          // avatarUrl: ... (add if you have the helper imported)
=======
          avatarUrl,
>>>>>>> 2000e39 (feat: Workspace added)
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
