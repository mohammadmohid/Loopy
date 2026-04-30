import express from "express";
import mongoose from "mongoose";
import { AuthRequest, getR2Client } from "@loopy/shared";

type Response = express.Response;
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Team from "../models/Team.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { notifyProjectCreated, notifyProjectDeleted } from "../events/projectEvents.js";
import {
  resolveOwnerAvatar,
  resolveMemberAvatars,
  buildScopedProjectQuery,
} from "../helpers.js";

interface Member {
  user: mongoose.Types.ObjectId;
  role: string;
}

// @desc    Create a new project
// @access  Private (Admin, Project Manager)
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      teamLead,
      members,
      assignedTeams,
    } = req.body;

    const workspaceId = req.user!.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const initialMembers: Member[] = [];

    // Add Owner as MANAGER
    initialMembers.push({
      user: new mongoose.Types.ObjectId(req.user!.id),
      role: "MANAGER",
    });

    // Add Team Lead as MANAGER (if provided and different from owner)
    if (teamLead && teamLead !== req.user!.id) {
      if (!mongoose.Types.ObjectId.isValid(teamLead)) {
        return res.status(400).json({ message: "Invalid team lead ID" });
      }
      initialMembers.push({
        user: new mongoose.Types.ObjectId(teamLead),
        role: "MANAGER",
      });
    }

    // Add other members
    if (members && Array.isArray(members)) {
      members.forEach((m: any) => {
        const rawId = typeof m === "string" ? m : m.user;
        const memberRole = typeof m === "object" && m.role ? m.role : "VIEWER";

        if (mongoose.Types.ObjectId.isValid(rawId)) {
          const memberId = new mongoose.Types.ObjectId(rawId);
          const exists = initialMembers.find((im) => im.user.equals(memberId));

          if (!exists) {
            initialMembers.push({ user: memberId, role: memberRole });
          }
        }
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      startDate,
      endDate,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      owner: new mongoose.Types.ObjectId(req.user!.id),
      members: initialMembers,
      assignedTeams: assignedTeams || [],
    });

    // Notify chat service (awaited for Vercel compatibility)
    await notifyProjectCreated({
      projectId: project._id.toString(),
      projectName: project.name,
      members: initialMembers.map((m) => m.user.toString()),
      createdBy: req.user!.id,
      workspaceId: workspaceId,
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error("Create Project Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get projects (scoped to workspace)
// @access  Private
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspaceId;

    if (!workspaceId) {
      return res.status(200).json([]);
    }

    const query = await buildScopedProjectQuery(req.user);
    if (!query) return res.status(200).json([]);

    const projects = await Project.find(query)
      .populate("owner", "profile.firstName profile.lastName profile.avatarKey")
      .populate("members.user", "profile.firstName profile.lastName profile.avatarKey")
      .sort({ updatedAt: -1 })
      .lean();

    // Resolve avatars
    for (const project of projects as any[]) {
      resolveOwnerAvatar(project.owner);
      resolveMemberAvatars(project.members);
    }

    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID format" });
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const workspaceId = req.user!.workspaceId;

    const project = await Project.findOne({ _id: id, workspaceId })
      .populate("owner", "profile.firstName profile.lastName profile.avatarKey")
      .populate("members.user", "profile.firstName profile.lastName email profile.avatarKey")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Access control: if not admin/pm, check if member
    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      const isDirectMember = project.members?.some(
        (m: any) => m.user?._id?.toString() === userId || m.user?.toString() === userId
      );
      const isOwner = project.owner?._id?.toString() === userId || project.owner?.toString() === userId;

      let isTeamMember = false;
      if (!isDirectMember && !isOwner && project.assignedTeams?.length > 0) {
        const teamIds = project.assignedTeams.map((at: any) => at.team);
        const userTeams = await Team.find({ _id: { $in: teamIds }, members: userId }).select("_id").lean();
        isTeamMember = userTeams.length > 0;
      }

      if (!isDirectMember && !isOwner && !isTeamMember) {
        return res.status(403).json({ message: "Not authorized to view this project" });
      }
    }

    // Resolve avatars
    resolveOwnerAvatar((project as any).owner);
    resolveMemberAvatars((project as any).members);

    res.status(200).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only Owner or Admin can delete
    if (
      project.owner.toString() !== req.user!.id &&
      req.user!.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this project" });
    }

    await project.deleteOne();

    // Notify chat service (awaited for Vercel)
    await notifyProjectDeleted(project._id.toString());

    res.status(200).json({ message: "Project removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Project (e.g. Board Columns, Owner Transfer)
// @route   PATCH /api/projects/:id
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwner = project.owner.toString() === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user!.id
    );

    if (!isMember && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Board Columns (all members)
    if (req.body.boardColumns) project.boardColumns = req.body.boardColumns;

    // Owner/Admin only updates
    if (isOwner || isAdmin) {
      if (req.body.name) project.name = req.body.name;
      if (req.body.description !== undefined) project.description = req.body.description;
      if (req.body.startDate !== undefined) project.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) project.endDate = req.body.endDate ? req.body.endDate : null;

      // Owner Transfer (ADMIN only)
      if (req.body.newOwner && isAdmin) {
        if (!mongoose.Types.ObjectId.isValid(req.body.newOwner)) {
          return res.status(400).json({ message: "Invalid new owner ID" });
        }
        project.owner = new mongoose.Types.ObjectId(req.body.newOwner);
        // Ensure new owner is in members as MANAGER
        const ownerInMembers = project.members.find(
          (m) => m.user.toString() === req.body.newOwner
        );
        if (!ownerInMembers) {
          project.members.push({
            user: new mongoose.Types.ObjectId(req.body.newOwner),
            role: "MANAGER",
          });
        } else {
          ownerInMembers.role = "MANAGER";
        }
      }

      // Member Management
      if (req.body.members !== undefined) {
        const membersList = Array.isArray(req.body.members) ? req.body.members : [];
        const newMembers = membersList.map((m: any) => ({
          user: new mongoose.Types.ObjectId(m.user || m.id),
          role: m.role || "VIEWER",
        }));

        const ownerExists = newMembers.find(
          (m: any) => m.user.toString() === project.owner.toString()
        );
        if (!ownerExists) {
          newMembers.push({ user: project.owner, role: "MANAGER" });
        }

        project.members = newMembers;
      }

      // Team Management
      if (req.body.assignedTeams !== undefined) {
        const teamsList = Array.isArray(req.body.assignedTeams) ? req.body.assignedTeams : [];
        project.assignedTeams = teamsList.map((t: any) => ({
          team: new mongoose.Types.ObjectId(t.team || t.id),
          role: t.role || "VIEWER",
        }));
      }
    }

    await project.save();

    await project.populate(
      "members.user",
      "profile.firstName profile.lastName email"
    );
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign Team Lead (Updates Member Role to MANAGER)
// @route   PUT /api/projects/:id/assign-lead
export const assignTeamLead = async (req: AuthRequest, res: Response) => {
  try {
    const { teamLeadId } = req.body;

    if (!teamLeadId || !mongoose.Types.ObjectId.isValid(teamLeadId)) {
      return res.status(400).json({ message: "Valid team lead ID is required" });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is owner or admin
    if (
      project.owner.toString() !== req.user!.id &&
      req.user!.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this project" });
    }

    // Check if the user is already a member
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === teamLeadId
    );

    if (memberIndex > -1) {
      // User exists, upgrade role to MANAGER
      project.members[memberIndex].role = "MANAGER";
    } else {
      // User does not exist, add as MANAGER
      project.members.push({
        user: new mongoose.Types.ObjectId(teamLeadId),
        role: "MANAGER",
      });
    }

    await project.save();

    res.status(200).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent activity for a project
// @route   GET /api/projects/:projectId/activity
export const getProjectActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Fetch latest tasks
    const tasks = await Task.find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("assignees", "profile.firstName profile.lastName")
      .lean();

    // Fetch latest milestones
    const milestones = await Milestone.find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    // Normalize and merge activities
    const activities = [
      ...tasks.map((t: any) => ({
        id: t._id,
        type: "task",
        action:
          t.status === "done"
            ? "completed"
            : t.createdAt.getTime() === t.updatedAt.getTime()
              ? "created"
              : "updated",
        targetName: t.title,
        timestamp: t.updatedAt,
        user: t.assignees?.[0]
          ? `${t.assignees[0].profile.firstName} ${t.assignees[0].profile.lastName}`
          : "Team Member",
      })),
      ...milestones.map((m: any) => ({
        id: m._id,
        type: "milestone",
        action:
          m.createdAt.getTime() === m.updatedAt.getTime()
            ? "created"
            : "updated",
        targetName: m.name,
        timestamp: m.updatedAt,
        user: "Project Manager",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete all projects for a workspace (Webhook)
// @route   DELETE /api/projects/workspace-webhook/:workspaceId
export const deleteWorkspaceProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Find all projects in the workspace
    const projects = await Project.find({ workspaceId });

    if (projects.length > 0) {
      // Delete all projects
      await Project.deleteMany({ workspaceId });

      // Notify chat service for each deleted project (awaited for Vercel)
      await Promise.allSettled(
        projects.map((p) => notifyProjectDeleted(p._id.toString()))
      );
    }

    res.status(200).json({ message: `Deleted ${projects.length} projects for workspace ${workspaceId}` });
  } catch (error: any) {
    console.error("deleteWorkspaceProjects Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate a Presigned URL for Screen Recording Upload
// @route   POST /api/projects/upload/screen-recording
// @access  Private
export const generateScreenRecordingUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { filename, contentType } = req.body;
    const userId = req.user!.id;

    if (!filename || !contentType) {
      return res.status(400).json({ message: "filename and contentType are required" });
    }

    // Secure the filename by stripping out weird path characters
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Create the unique Key path in R2
    const key = `UserRecordings/${userId}/${Date.now()}_${sanitizedFilename}`;

    const r2 = getR2Client();

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate link valid for 30 minutes
    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 1800 });

    // The final URL where the file can be publicly accessed
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;

    console.log(`Started secure cloud upload for file: ${sanitizedFilename} by user: ${userId}`);

    res.status(200).json({ presignedUrl, publicUrl, key });
  } catch (error: any) {
    console.error("Screen Recording Upload URL Error:", error);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
};
