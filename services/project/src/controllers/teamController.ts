import { Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import { AuthRequest } from "../middleware/auth.js";
import Team from "../models/Team.js";

// @desc    Create a new team
// @route   POST /api/projects/teams
// @access  Private (Admin, Project Manager)
export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { name, members } = req.body;
    const workspaceId = req.user!.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    if (!name) {
      return res.status(400).json({ message: "Team name is required" });
    }

    // Default leader to the creator
    const team = await Team.create({
      name,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      leader: new mongoose.Types.ObjectId(req.user!.id),
      members: members || [req.user!.id],
    });

    // Webhook: create team channel in chat service
    try {
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:5004";
      await axios.post(`${chatServiceUrl}/api/chat/channels/team-webhook`, {
        teamId: team._id.toString(),
        teamName: team.name,
        members: (team.members || []).map((m: any) => m.toString()),
        leaderId: req.user!.id,
        workspaceId: workspaceId,
      });
    } catch (err: any) {
      console.error("Failed to create team chat channel:", err.message);
    }

    res.status(201).json(team);
  } catch (error: any) {
    console.error("Create Team Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all teams for the active workspace
// @route   GET /api/projects/teams
// @access  Private
export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const teams = await Team.find({ workspaceId }).populate(
      "members leader",
      "profile.firstName profile.lastName profile.avatarKey email"
    );

    res.status(200).json(teams);
  } catch (error: any) {
    console.error("Get Teams Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a team
// @route   PATCH /api/projects/teams/:id
// @access  Private (Admin, Project Manager, or Team Leader)
export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { name, members, leader } = req.body;
    const teamId = req.params.id;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check authorization: Must be ADMIN, PROJECT_MANAGER, or the team leader
    const isAuthorized =
      req.user!.role === "ADMIN" ||
      req.user!.role === "PROJECT_MANAGER" ||
      team.leader.toString() === req.user!.id;

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update team" });
    }

    if (name) team.name = name;
    if (members) team.members = members;
    if (leader) team.leader = leader;

    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members leader",
      "profile.firstName profile.lastName profile.avatarKey email"
    );

    // Webhook: sync team channel members in chat service
    try {
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:5004";
      await axios.post(`${chatServiceUrl}/api/chat/channels/team-webhook`, {
        teamId: team._id.toString(),
        teamName: team.name,
        members: (team.members || []).map((m: any) => m.toString()),
        leaderId: (team.leader || "").toString(),
        workspaceId: (team.workspaceId || "").toString(),
      });
    } catch (err: any) {
      console.error("Failed to sync team chat channel:", err.message);
    }

    res.status(200).json(updatedTeam);
  } catch (error: any) {
    console.error("Update Team Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a team
// @route   DELETE /api/projects/teams/:id
// @access  Private (Admin, Project Manager, or Team Leader)
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.id;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check authorization
    const isAuthorized =
      req.user!.role === "ADMIN" ||
      req.user!.role === "PROJECT_MANAGER" ||
      team.leader.toString() === req.user!.id;

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to delete team" });
    }

    await team.deleteOne();

    // Webhook: delete team channel in chat service
    try {
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:5004";
      await axios.delete(`${chatServiceUrl}/api/chat/channels/team-webhook/${teamId}`);
    } catch (err: any) {
      console.error("Failed to delete team chat channel:", err.message);
    }

    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error: any) {
    console.error("Delete Team Error:", error);
    res.status(500).json({ message: error.message });
  }
};
