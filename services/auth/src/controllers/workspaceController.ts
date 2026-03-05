import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import OTPToken from "../models/OTPToken.js";
import Workspace from "../models/Workspace.js";
import { sendOTPEmail, sendInviteEmail } from "../config/mailer.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";

// ── Helpers ──────────────────────────────────────────────

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const generateToken = (
    id: string,
    role: string,
    workspaceId?: string
) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

    return jwt.sign(
        { id, role, workspaceId: workspaceId || null, jti: uuidv4() },
        jwtSecret,
        { expiresIn: "1d" }
    );
};

const sendTokenCookie = (token: string, res: Response) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    });
};

const getAvatarUrl = async (key?: string) => {
    if (!key) return null;
    try {
        const r2 = getR2Client();
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });
        return await getSignedUrl(r2, command, { expiresIn: 86400 });
    } catch {
        return null;
    }
};

// ── OTP Verification ─────────────────────────────────────

// @desc    Verify OTP code and auto-login
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ message: "User ID and code are required" });
        }

        const otpRecord = await OTPToken.findOne({ userId, code });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        if (otpRecord.expiresAt < new Date()) {
            await otpRecord.deleteOne();
            return res.status(400).json({ message: "Code has expired" });
        }

        // Mark user as confirmed
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isEmailConfirmed = true;
        await user.save();

        // Clean up OTP
        await OTPToken.deleteMany({ userId });

        // Auto-login: set cookie
        const token = generateToken(
            user._id.toString(),
            user.globalRole,
            user.activeWorkspace?.toString()
        );
        sendTokenCookie(token, res);

        const avatarUrl = await getAvatarUrl(user.profile.avatarKey);

        res.json({
            success: true,
            needsWorkspace: !user.activeWorkspace,
            user: {
                id: user._id,
                email: user.email,
                profile: {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    avatarKey: user.profile.avatarKey,
                    avatarUrl,
                },
                globalRole: user.globalRole,
                activeWorkspace: user.activeWorkspace || null,
            },
        });
    } catch (error) {
        console.error("verifyOTP error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Resend OTP code
// @route   POST /api/auth/resend-otp
export const resendOTP = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.isEmailConfirmed) {
            return res.status(400).json({ message: "Email already confirmed" });
        }

        // Remove old OTPs for this user
        await OTPToken.deleteMany({ userId });

        const code = generateOTP();
        await OTPToken.create({
            userId,
            code,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        });

        await sendOTPEmail(user.email, code, user.profile.firstName);

        res.json({ success: true, message: "OTP resent" });
    } catch (error) {
        console.error("resendOTP error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ── Workspace CRUD ───────────────────────────────────────

// @desc    Create workspace (required after email verification)
// @route   POST /api/auth/workspaces
export const createWorkspace = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        const userId = req.user.id;

        const workspace = await Workspace.create({
            name: name.trim(),
            owner: userId,
            members: [{ user: userId, role: "ADMIN", joinedAt: new Date() }],
        });

        // Link workspace to user
        await User.findByIdAndUpdate(userId, {
            $push: { workspaces: workspace._id },
            $set: { activeWorkspace: workspace._id },
        });

        // Re-issue JWT with workspace ID
        const user = await User.findById(userId);
        const token = generateToken(
            userId,
            user!.globalRole,
            workspace._id.toString()
        );
        sendTokenCookie(token, res);

        res.status(201).json({
            success: true,
            workspace: {
                id: workspace._id,
                name: workspace.name,
            },
        });
    } catch (error) {
        console.error("createWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ── Invite System ────────────────────────────────────────

// @desc    Invite a member to workspace
// @route   POST /api/auth/workspaces/invite
export const inviteMember = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { email, role } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const inviteRole = role === "PROJECT_MANAGER" ? "PROJECT_MANAGER" : "MEMBER";
        const userId = req.user.id;
        const workspaceId = req.user.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ message: "No active workspace" });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Only ADMIN can invite
        const callerMember = workspace.members.find(
            (m) => m.user.toString() === userId
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can invite members" });
        }

        // Check if user is already a member
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            const alreadyMember = workspace.members.some(
                (m) => m.user.toString() === existingUser._id.toString()
            );
            if (alreadyMember) {
                return res.status(400).json({ message: "User is already a member" });
            }
        }

        // Check for existing unused invite
        const existingInvite = workspace.inviteTokens.find(
            (t) => t.email === email.toLowerCase() && !t.used && t.expiresAt > new Date()
        );
        if (existingInvite) {
            return res.status(400).json({ message: "An active invite already exists for this email" });
        }

        // Create invite token
        const inviteToken = uuidv4();
        workspace.inviteTokens.push({
            token: inviteToken,
            email: email.toLowerCase(),
            role: inviteRole,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            used: false,
        });
        await workspace.save();

        // Send invite email
        const inviter = await User.findById(userId);
        const inviterName = inviter
            ? `${inviter.profile.firstName} ${inviter.profile.lastName}`
            : "A team member";

        await sendInviteEmail(email, inviteToken, workspace.name, inviterName);

        res.json({ success: true, message: "Invite sent" });
    } catch (error) {
        console.error("inviteMember error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Accept workspace invitation
// @route   POST /api/auth/workspaces/accept-invite
export const acceptInvite = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Invite token is required" });
        }

        // Find workspace with this invite token
        const workspace = await Workspace.findOne({
            "inviteTokens.token": token,
            "inviteTokens.used": false,
        });

        if (!workspace) {
            return res.status(400).json({ message: "Invalid or expired invite" });
        }

        const invite = workspace.inviteTokens.find(
            (t) => t.token === token && !t.used
        );
        if (!invite || invite.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invite has expired" });
        }

        // Return invite details so frontend knows next steps
        res.json({
            success: true,
            invite: {
                email: invite.email,
                role: invite.role,
                workspaceName: workspace.name,
                workspaceId: workspace._id,
            },
        });
    } catch (error) {
        console.error("acceptInvite error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Actually join workspace after registration/login (called after accept-invite)
// @route   POST /api/auth/workspaces/join
export const joinWorkspace = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const workspace = await Workspace.findOne({
            "inviteTokens.token": token,
            "inviteTokens.used": false,
        });

        if (!workspace) {
            return res.status(400).json({ message: "Invalid or expired invite" });
        }

        const invite = workspace.inviteTokens.find(
            (t) => t.token === token && !t.used
        );
        if (!invite || invite.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invite has expired" });
        }

        // Check not already member
        const alreadyMember = workspace.members.some(
            (m) => m.user.toString() === userId
        );
        if (alreadyMember) {
            invite.used = true;
            await workspace.save();
            return res.status(400).json({ message: "Already a member of this workspace" });
        }

        // Add user as member
        workspace.members.push({
            user: userId,
            role: invite.role,
            joinedAt: new Date(),
        });
        invite.used = true;
        await workspace.save();

        // Add workspace to user's list
        await User.findByIdAndUpdate(userId, {
            $push: { workspaces: workspace._id },
            $set: { activeWorkspace: workspace._id },
        });

        // Re-issue JWT
        const user = await User.findById(userId);
        const jwtToken = generateToken(
            userId,
            user!.globalRole,
            workspace._id.toString()
        );
        sendTokenCookie(jwtToken, res);

        res.json({
            success: true,
            workspace: { id: workspace._id, name: workspace.name },
        });
    } catch (error) {
        console.error("joinWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ── Workspace Members Management ─────────────────────────

// @desc    Get workspace members
// @route   GET /api/auth/workspaces/members
export const getMembers = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) {
            return res.status(400).json({ message: "No active workspace" });
        }

        const workspace = await Workspace.findById(workspaceId).populate(
            "members.user",
            "email profile.firstName profile.lastName profile.avatarKey"
        );

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        const members = await Promise.all(
            workspace.members.map(async (m: any) => {
                const avatarUrl = await getAvatarUrl(m.user?.profile?.avatarKey);
                return {
                    id: m.user?._id,
                    email: m.user?.email,
                    firstName: m.user?.profile?.firstName,
                    lastName: m.user?.profile?.lastName,
                    avatarUrl,
                    role: m.role,
                    joinedAt: m.joinedAt,
                };
            })
        );

        // Pending invites
        const pendingInvites = workspace.inviteTokens
            .filter((t) => !t.used && t.expiresAt > new Date())
            .map((t) => ({
                email: t.email,
                role: t.role,
                expiresAt: t.expiresAt,
            }));

        res.json({ members, pendingInvites, workspaceName: workspace.name });
    } catch (error) {
        console.error("getMembers error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update member role (ADMIN only)
// @route   PATCH /api/auth/workspaces/members/:memberId
export const updateMemberRole = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { memberId } = req.params;
        const { role } = req.body;
        const workspaceId = req.user.workspaceId;

        if (!["PROJECT_MANAGER", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Verify caller is ADMIN
        const callerMember = workspace.members.find(
            (m) => m.user.toString() === req.user.id
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can change roles" });
        }

        // Cannot change owner's role
        if (workspace.owner.toString() === memberId) {
            return res.status(400).json({ message: "Cannot change the workspace owner's role" });
        }

        const targetMember = workspace.members.find(
            (m) => m.user.toString() === memberId
        );
        if (!targetMember) {
            return res.status(404).json({ message: "Member not found" });
        }

        targetMember.role = role;
        await workspace.save();

        res.json({ success: true, message: "Role updated" });
    } catch (error) {
        console.error("updateMemberRole error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Switch active workspace
// @route   POST /api/auth/workspaces/switch
export const switchWorkspace = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { workspaceId } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify user is a member
        const isMember = user.workspaces.some(
            (w) => w.toString() === workspaceId
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this workspace" });
        }

        user.activeWorkspace = workspaceId;
        await user.save();

        // Re-issue JWT
        const token = generateToken(userId, user.globalRole, workspaceId);
        sendTokenCookie(token, res);

        const workspace = await Workspace.findById(workspaceId);

        res.json({
            success: true,
            workspace: { id: workspace?._id, name: workspace?.name },
        });
    } catch (error) {
        console.error("switchWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
