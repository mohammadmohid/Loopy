import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Task from "../models/Task";
import Milestone from "../models/Milestone";

// --- TASKS ---

export const getProjectTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId }).sort({
      createdAt: -1,
    }); // Populate assignee if needed, but User is in Auth DB
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.create({
      ...req.body,
      projectId: req.params.projectId,
    });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
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
    const milestones = await Milestone.find({
      projectId: req.params.projectId,
    }).sort({ dueDate: 1 });
    res.json(milestones);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const milestone = await Milestone.create({
      ...req.body,
      projectId: req.params.projectId,
    });
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
    );
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });
    res.json(milestone);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMilestone = async (req: AuthRequest, res: Response) => {
  try {
    await Milestone.findByIdAndDelete(req.params.id);
    // Optional: Unassign tasks from this milestone
    await Task.updateMany(
      { milestoneId: req.params.id },
      { $unset: { milestoneId: "" } }
    );
    res.json({ message: "Milestone deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
