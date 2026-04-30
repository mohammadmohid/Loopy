import express from "express";
import mongoose from "mongoose";
import { AuthRequest } from "@loopy/shared";

type Response = express.Response;
import {
  notifyTeamCreated,
  notifyTeamUpdated,
  notifyTeamDeleted,
} from "../events/projectEvents.js";
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

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }

    // Default leader to the creator
    const team = await Team.create({
      name: name.trim(),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      leader: new mongoose.Types.ObjectId(req.user!.id),
      members: members || [req.user!.id],
    });

    // Notify chat service (awaited for Vercel)
    await notifyTeamCreated({
      teamId: team._id.toString(),
      teamName: team.name,
      members: (team.members || []).map((m: any) => m.toString()),
      leaderId: req.user!.id,
      workspaceId: workspaceId,
    });

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

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }

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

    if (name) team.name = name.trim();
    if (members) team.members = members;
    if (leader) {
      if (!mongoose.Types.ObjectId.isValid(leader)) {
        return res.status(400).json({ message: "Invalid leader ID format" });
      }
      team.leader = leader;
    }

    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members leader",
      "profile.firstName profile.lastName profile.avatarKey email"
    );

    // Notify chat service of team update (awaited for Vercel)
    await notifyTeamUpdated({
      teamId: team._id.toString(),
      teamName: team.name,
      members: (team.members || []).map((m: any) => m.toString()),
      leaderId: (team.leader || "").toString(),
      workspaceId: (team.workspaceId || "").toString(),
    });

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

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }

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

    // Notify chat service (awaited for Vercel)
    await notifyTeamDeleted(teamId);

    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error: any) {
    console.error("Delete Team Error:", error);
    res.status(500).json({ message: error.message });
  }
};
