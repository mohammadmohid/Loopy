import { Response } from "express";
import { AuthRequest } from "@loopy/shared";
import Task from "../models/Task";
import Milestone from "../models/Milestone";

// Allowed fields for task creation/updates to prevent mass assignment
const ALLOWED_TASK_FIELDS = [
  "title", "description", "status", "type", "priority",
  "assignees", "assignedTeams", "dueDate", "milestoneId",
] as const;

const ALLOWED_MILESTONE_FIELDS = [
  "name", "description", "status", "dueDate",
  "assignees", "assignedTeams", "taskIds",
] as const;

/**
 * Picks only allowed fields from a request body.
 */
const pickFields = (body: any, allowed: readonly string[]): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
};

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
    const safeFields = pickFields(req.body, ALLOWED_TASK_FIELDS);

    // Enforce at least one assignee (default to creator)
    if (!safeFields.assignees || !Array.isArray(safeFields.assignees) || safeFields.assignees.length === 0) {
      safeFields.assignees = [req.user!.id];
    }

    if (!safeFields.title || !safeFields.title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = await Task.create({
      ...safeFields,
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
    const safeUpdates = pickFields(req.body, ALLOWED_TASK_FIELDS);

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, safeUpdates, {
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
    const safeFields = pickFields(req.body, ALLOWED_MILESTONE_FIELDS);
    const { taskIds, ...milestoneData } = safeFields;

    if (!milestoneData.name || !milestoneData.name.trim()) {
      return res.status(400).json({ message: "Milestone name is required" });
    }

    const milestone = await Milestone.create({
      ...milestoneData,
      projectId: req.params.projectId,
    });

    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: taskIds } },
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
    const safeUpdates = pickFields(req.body, ALLOWED_MILESTONE_FIELDS);

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      safeUpdates,
      { new: true }
    ).populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);

    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    if (safeUpdates.status === "completed") {
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
    const milestone = await Milestone.findByIdAndDelete(req.params.id);

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    await Task.updateMany(
      { milestoneId: req.params.id },
      { $unset: { milestoneId: "" } }
    );
    res.json({ message: "Milestone deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
