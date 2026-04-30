import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, Workspace, getR2Client } from "@loopy/shared";
import OTPToken from "../models/OTPToken.js";
import { sendOTPEmail, sendInviteEmail } from "../config/mailer.js";
import axios from "axios";
import { notifyWorkspaceMemberSync } from "../events/authEvents.js";

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
    const baseUrl = process.env.GATEWAY_URL;
    return `${baseUrl}/api/auth/avatars/${key}`;
};

// @desc    Verify OTP code and auto-login
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ message: "User ID and code are required" });
        }

        const otpRecord = await OTPToken.findOne({ userId });

        if (!otpRecord || !(await (otpRecord as any).matchCode(code))) {
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

        // Get workspace role if available
        let workspaceRole = null;
        if (user.activeWorkspace) {
            const ws = await Workspace.findById(user.activeWorkspace);
            if (ws) {
                const member = ws.members.find(
                    (m: any) => m.user.toString() === user._id.toString()
                );
                workspaceRole = member?.role || null;
            }
        }

        // Auto-login: set cookie
        const token = generateToken(
            user._id.toString(),
            workspaceRole || "USER",
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

        // Re-issue JWT with workspace ID and ADMIN role
        const user = await User.findById(userId);
        const token = generateToken(
            userId,
            "ADMIN",
            workspace._id.toString()
        );
        sendTokenCookie(token, res);

        // Notify chat service to create global "Everyone" channel (awaited for Vercel)
        await notifyWorkspaceMemberSync({
            workspaceId: workspace._id.toString(),
            userId: userId,
        });

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
            (m: any) => m.user.toString() === userId
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can invite members" });
        }

        // Check if user is already a member
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            const alreadyMember = workspace.members.some(
                (m: any) => m.user.toString() === existingUser._id.toString()
            );
            if (alreadyMember) {
                return res.status(400).json({ message: "User is already a member" });
            }
        }

        // Check for existing unused invite
        const existingInvite = workspace.inviteTokens.find(
            (t: any) => t.email === email.toLowerCase() && !t.used && t.expiresAt > new Date()
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
            (t: any) => t.token === token && !t.used
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
            (t: any) => t.token === token && !t.used
        );
        if (!invite || invite.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invite has expired" });
        }

        // Check not already member
        const alreadyMember = workspace.members.some(
            (m: any) => m.user.toString() === userId
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

        // Re-issue JWT with workspace role
        const user = await User.findById(userId);
        const jwtToken = generateToken(
            userId,
            invite.role,
            workspace._id.toString()
        );
        sendTokenCookie(jwtToken, res);

        // Notify chat service to sync new member to global channel (awaited for Vercel)
        await notifyWorkspaceMemberSync({
            workspaceId: workspace._id.toString(),
            userId: userId,
        });

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
            .filter((t: any) => !t.used && t.expiresAt > new Date())
            .map((t: any) => ({
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

// @desc    Get workspace members by ID
// @route   GET /api/auth/workspaces/:id/members
export const getWorkspaceMembersById = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const workspace = await Workspace.findById(id).populate(
            "members.user",
            "email profile.firstName profile.lastName profile.avatarKey"
        );

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Verify the user is actually a member
        const isMember = workspace.members.some(
            (m: any) => m.user?._id.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: "Not authorized to view members of this workspace" });
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
            .filter((t: any) => !t.used && t.expiresAt > new Date())
            .map((t: any) => ({
                email: t.email,
                role: t.role,
                expiresAt: t.expiresAt,
            }));

        res.json({ members, pendingInvites, workspaceName: workspace.name });
    } catch (error) {
        console.error("getWorkspaceMembersById error:", error);
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
            (m: any) => m.user.toString() === req.user.id
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can change roles" });
        }

        // Cannot change owner's role
        if (workspace.owner.toString() === memberId) {
            return res.status(400).json({ message: "Cannot change the workspace owner's role" });
        }

        const targetMember = workspace.members.find(
            (m: any) => m.user.toString() === memberId
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

// @desc    Remove a member from the workspace (ADMIN only)
// @route   DELETE /api/auth/workspaces/members/:memberId
export const removeMember = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { memberId } = req.params;
        const workspaceId = req.user.workspaceId;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Verify caller is ADMIN
        const callerMember = workspace.members.find(
            (m: any) => m.user.toString() === req.user.id
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can remove members" });
        }

        // Cannot remove owner
        if (workspace.owner.toString() === memberId) {
            return res.status(400).json({ message: "Cannot remove the workspace owner" });
        }

        const memberIndex = workspace.members.findIndex(
            (m: any) => m.user.toString() === memberId
        );
        if (memberIndex === -1) {
            return res.status(404).json({ message: "Member not found" });
        }

        workspace.members.splice(memberIndex, 1);
        await workspace.save();

        // Also clean up the user's workspaces array
        const user = await User.findById(memberId);
        if (user) {
            user.workspaces = user.workspaces.filter((id: any) => id.toString() !== workspaceId);
            if (user.activeWorkspace?.toString() === workspaceId) {
                user.activeWorkspace = undefined;
            }
            await user.save();
        }

        res.json({ success: true, message: "Member removed from workspace" });
    } catch (error) {
        console.error("removeMember error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Resend a pending invite
// @route   POST /api/auth/workspaces/invites/resend
export const resendInvite = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const { email } = req.body;
        const workspaceId = req.user.workspaceId;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Verify caller is ADMIN
        const callerMember = workspace.members.find(
            (m: any) => m.user.toString() === req.user.id
        );
        if (!callerMember || callerMember.role !== "ADMIN") {
            return res.status(403).json({ message: "Only admins can resend invites" });
        }

        const invite = workspace.inviteTokens.find(
            (t: any) => t.email === email.toLowerCase() && !t.used
        );

        if (!invite) {
            return res.status(404).json({ message: "No pending invite found for this email" });
        }

        // Refresh expiry
        invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await workspace.save();

        const inviter = await User.findById(req.user.id);
        const inviterName = inviter
            ? `${inviter.profile.firstName} ${inviter.profile.lastName}`
            : "A team member";

        await sendInviteEmail(email, invite.token, workspace.name, inviterName);

        res.json({ success: true, message: "Invite resent successfully" });
    } catch (error) {
        console.error("resendInvite error:", error);
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
            (w: any) => w.toString() === workspaceId
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this workspace" });
        }

        user.activeWorkspace = workspaceId;
        await user.save();

        const workspace = await Workspace.findById(workspaceId);
        const member = workspace?.members.find(
            (m: any) => m.user.toString() === userId.toString()
        );

        // Re-issue JWT
        const token = generateToken(userId, member!.role, workspaceId);
        sendTokenCookie(token, res);

        res.json({
            success: true,
            workspace: { id: workspace?._id, name: workspace?.name },
        });
    } catch (error) {
        console.error("switchWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get user's workspaces and pending invites
// @route   GET /api/auth/workspaces/me
export const getMyWorkspaces = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Find workspaces where user is a member
        const workspaces = await Workspace.find({
            "members.user": userId,
        });

        // Find workspaces where user has a pending invite
        const pendingInvites = await Workspace.find({
            inviteTokens: {
                $elemMatch: {
                    email: user.email,
                    used: false,
                    expiresAt: { $gt: new Date() }
                }
            }
        });

        res.json({
            success: true,
            workspaces: workspaces.map(ws => ({
                id: ws._id,
                name: ws.name,
                role: ws.members.find((m: any) => m.user.toString() === userId)?.role,
                membersCount: ws.members.length,
                ownerId: ws.owner
            })),
            pendingInvites: pendingInvites.map(ws => {
                const invite = ws.inviteTokens.find(
                    (t: any) => t.email === user.email && !t.used && t.expiresAt > new Date()
                );
                return {
                    workspaceId: ws._id,
                    workspaceName: ws.name,
                    role: invite?.role,
                    token: invite?.token
                };
            })
        });
    } catch (error) {
        console.error("getMyWorkspaces error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Leave a workspace
// @route   POST /api/auth/workspaces/:id/leave
export const leaveWorkspace = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const workspaceId = req.params.id;
        const userId = req.user.id;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        const isMember = workspace.members.some((m: any) => m.user.toString() === userId);
        if (!isMember) return res.status(400).json({ message: "Not a member of this workspace" });

        // If user is owner, they cannot leave without transferring ownership
        if (workspace.owner.toString() === userId) {
            return res.status(400).json({ message: "You are the owner. Transfer ownership before leaving." });
        }

        // Remove from workspace members
        workspace.members = workspace.members.filter((m: any) => m.user.toString() !== userId);
        await workspace.save();

        // Remove from user's workspaces list
        const user = await User.findById(userId);
        if (user) {
            user.workspaces = user.workspaces.filter((id: any) => id.toString() !== workspaceId);
            if (user.activeWorkspace?.toString() === workspaceId) {
                user.activeWorkspace = undefined;
            }
            await user.save();
        }

        res.json({ success: true, message: "Successfully left the workspace" });
    } catch (error) {
        console.error("leaveWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Transfer ownership of a workspace
// @route   POST /api/auth/workspaces/:id/transfer-ownership
export const transferOwnership = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const workspaceId = req.params.id;
        const userId = req.user.id;
        const { newOwnerId } = req.body;

        if (!newOwnerId) return res.status(400).json({ message: "New owner ID is required" });

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        if (workspace.owner.toString() !== userId) {
            return res.status(403).json({ message: "Only the owner can transfer ownership" });
        }

        const newOwnerMember = workspace.members.find((m: any) => m.user.toString() === newOwnerId);
        if (!newOwnerMember) {
            return res.status(400).json({ message: "New owner must be a member of the workspace" });
        }

        // Change old owner to ADMIN (or keep ADMIN if they were) // Owner must always be ADMIN implicitly but setting explicilty
        const oldOwnerMember = workspace.members.find((m: any) => m.user.toString() === userId);
        if (oldOwnerMember) oldOwnerMember.role = "ADMIN";

        // Change new owner to ADMIN
        newOwnerMember.role = "ADMIN";

        workspace.owner = newOwnerId;
        await workspace.save();

        res.json({ success: true, message: "Ownership transferred successfully" });
    } catch (error) {
        console.error("transferOwnership error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete workspace (Owner only, 1 member only)
// @route   DELETE /api/auth/workspaces/:id
export const deleteWorkspace = async (
    req: Request & { user?: any },
    res: Response
) => {
    try {
        const workspaceId = req.params.id;
        const userId = req.user.id;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        if (workspace.owner.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only the owner can delete a workspace" });
        }

        if (workspace.members.length > 1) {
            return res.status(400).json({ message: "Cannot delete a workspace with other members." });
        }

        // Cascade delete via Project Service webhook
        try {
            const projectServiceUrl = process.env.PROJECT_SERVICE_URL || "http://localhost:5003";
            await axios.delete(`${projectServiceUrl}/api/projects/workspace-webhook/${workspaceId}`);
        } catch (webhookErr: any) {
            console.error("Failed to webhook project service for cascade deletion:", webhookErr.message);
            // Non-blocking but should be logged.
        }

        await Workspace.findByIdAndDelete(workspaceId);

        // Remove workspace reference from this user (and ideally all members, but definitely the owner)
        const user = await User.findById(userId);
        let hasOtherWorkspaces = false;

        if (user) {
            // Remove the deleted workspace from their workspaces array
            user.workspaces = user.workspaces.filter((id: any) => id.toString() !== workspaceId);

            if (user.activeWorkspace?.toString() === workspaceId) {
                user.activeWorkspace = undefined;
                // Best effort auto-switch to another workspace they belong to
                const otherWorkspace = await Workspace.findOne({ "members.user": userId });
                if (otherWorkspace) {
                    user.activeWorkspace = otherWorkspace._id;
                    hasOtherWorkspaces = true;
                }
            } else {
                const otherWorkspace = await Workspace.findOne({ "members.user": userId });
                hasOtherWorkspaces = !!otherWorkspace;
            }
            await user.save();
        }

        let newWorkspaceRole = "USER";
        if (user && user.activeWorkspace) {
            const activeWs = await Workspace.findById(user.activeWorkspace);
            if (activeWs) {
                const member = activeWs.members.find((m: any) => m.user.toString() === userId.toString());
                if (member) newWorkspaceRole = member.role;
            }
        }

        // Return the updated token
        const token = generateToken(
            userId,
            newWorkspaceRole,
            user?.activeWorkspace?.toString()
        );
        sendTokenCookie(token, res);

        res.json({ success: true, message: "Workspace deleted successfully", hasOtherWorkspaces });
    } catch (error) {
        console.error("deleteWorkspace error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
