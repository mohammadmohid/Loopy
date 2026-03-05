import { Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";
import Task from "../models/Task";
import Milestone from "../models/Milestone";
import Team from "../models/Team";
import "../models/User";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2.js";

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

    const initialMembers: Member[] = [];

    // 1. Add Owner as MANAGER
    initialMembers.push({
      user: new mongoose.Types.ObjectId(req.user!.id),
      role: "MANAGER",
    });

    // 2. Add Team Lead as MANAGER (if provided and different from owner)
    if (teamLead && teamLead !== req.user!.id) {
      initialMembers.push({
        user: new mongoose.Types.ObjectId(teamLead),
        role: "MANAGER",
      });
    }

    // 3. Add other members
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
      name,
      description,
      startDate,
      endDate,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      owner: new mongoose.Types.ObjectId(req.user!.id),
      members: initialMembers,
      assignedTeams: assignedTeams || [],
    });

    // Auto-create a chat channel for this project (non-blocking)
    try {
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:5004";
      await axios.post(`${chatServiceUrl}/api/chat/channels/project-webhook`, {
        projectId: project._id,
        projectName: project.name,
        members: initialMembers.map((m) => m.user.toString()),
        createdBy: req.user!.id,
      });
    } catch (chatErr: any) {
      console.error("Failed to create project chat channel:", chatErr.message);
    }

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
    const { id, role } = req.user!;
    const workspaceId = req.user!.workspaceId;

    if (!workspaceId) {
      return res.status(200).json([]);
    }

    // Always filter by workspace — even ADMINs only see their workspace's projects
    let query: any = { workspaceId };

    // Non-ADMIN and non-PM users only see projects they're part of
    if (role !== "ADMIN" && role !== "PROJECT_MANAGER") {
      const userTeams = await Team.find({ members: id }).select("_id");
      const userTeamIds = userTeams.map((t) => t._id);

      query = {
        workspaceId,
        $or: [
          { owner: id },
          { "members.user": id },
          { "assignedTeams.team": { $in: userTeamIds } },
        ],
      };
    }

    const projects = await Project.find(query)
      .populate("owner", "profile.firstName profile.lastName profile.avatarKey")
      .sort({ updatedAt: -1 })
      .lean();

    // Sign Avatars
    const projectsWithAvatars = await Promise.all(
      projects.map(async (project: any) => {
        if (
          project.owner &&
          project.owner.profile &&
          project.owner.profile.avatarKey
        ) {
          try {
            const r2 = getR2Client();
            const command = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: project.owner.profile.avatarKey,
            });
            const avatarUrl = await getSignedUrl(r2, command, {
              expiresIn: 86400,
            });
            project.owner.profile.avatarUrl = avatarUrl;
          } catch (error) {
            console.error("Failed to sign avatar for project", project._id);
          }
        }
        return project;
      })
    );

    res.status(200).json(projectsWithAvatars);
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
      if (req.body.description) project.description = req.body.description;

      // Owner Transfer (ADMIN only)
      if (req.body.newOwner && isAdmin) {
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
      if (req.body.members && Array.isArray(req.body.members)) {
        const newMembers = req.body.members.map((m: any) => ({
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
