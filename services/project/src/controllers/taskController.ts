import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Task from "../models/Task";
import Milestone from "../models/Milestone";
import "../models/User";

// --- TASKS ---

export const getProjectTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .sort({ createdAt: -1 })
      .populate(
        "assignees",
        "profile.firstName profile.lastName profile.avatarKey email"
      )
      .populate("assignedTeams", "name");
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    let { assignees } = req.body;

    // Enforce at least one assignee (default to creator)
    if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
      assignees = [req.user!.id];
    }

    const task = await Task.create({
      ...req.body,
      assignees,
      projectId: req.params.projectId,
    });

    await task.populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- MILESTONES ---

export const getProjectMilestones = async (req: AuthRequest, res: Response) => {
  try {
    const milestones = await Milestone.find({ projectId: req.params.projectId })
      .sort({ dueDate: 1 })
      .populate(
        "assignees",
        "profile.firstName profile.lastName profile.avatarKey email"
      )
      .populate("assignedTeams", "name");
    res.json(milestones);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    // Default assignees logic can be handled here or frontend.
    // If not provided, we can leave it empty or default to creator.
    const milestone = await Milestone.create({
      ...req.body,
      projectId: req.params.projectId,
    });

    if (req.body.taskIds && Array.isArray(req.body.taskIds) && req.body.taskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: req.body.taskIds } },
        { milestoneId: milestone._id }
      );
    }

    res.status(201).json(milestone);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);

    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    if (req.body.status === "completed") {
      await Task.updateMany(
        { milestoneId: req.params.id, status: { $ne: "done" } },
        { status: "done" }
      );
    }
    res.json(milestone);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMilestone = async (req: AuthRequest, res: Response) => {
  try {
    await Milestone.findByIdAndDelete(req.params.id);
    await Task.updateMany(
      { milestoneId: req.params.id },
      { $unset: { milestoneId: "" } }
    );
    res.json({ message: "Milestone deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
