import { Response } from "express";
import { AuthRequest } from "@loopy/shared";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import {
  dispatchToUsers,
  getPMRecipientIds,
  formatWhen,
  formatTaskTypeLabel,
} from "../services/notificationDispatch.js";
import Team from "../models/Team.js";
import { buildScopedProjectQuery } from "../helpers.js";

// Allowed fields for task creation/updates to prevent mass assignment
const ALLOWED_TASK_FIELDS = [
  "title", "description", "status", "type", "priority",
  "assignees", "assignedTeams", "dueDate",
] as const;

const ALLOWED_MILESTONE_FIELDS = [
  "name", "description", "status", "startDate", "dueDate", "duration", "goal", "tasks",
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
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Rule 1: Members can create tasks but only assign to themselves or people in their teams.
    if (userRole === "MEMBER") {
      const userTeams = await Team.find({ members: userId }).select("members").lean();
      const allowedAssigneeIds = new Set([userId]);
      userTeams.forEach((team: any) => {
        team.members.forEach((m: any) => allowedAssigneeIds.add(m.toString()));
      });

      const requestedAssignees = safeFields.assignees || [];
      const invalidAssignees = requestedAssignees.filter((id: string) => !allowedAssigneeIds.has(id));

      if (invalidAssignees.length > 0) {
        return res.status(403).json({ message: "You can only assign tasks to yourself or members of your teams." });
      }
    }

    // Enforce at least one assignee (default to creator)
    if (!safeFields.assignees || !Array.isArray(safeFields.assignees) || safeFields.assignees.length === 0) {
      safeFields.assignees = [userId];
    }

    if (!safeFields.title || !safeFields.title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = await Task.create({
      ...safeFields,
      projectId: req.params.projectId,
      createdBy: userId,
    });
    // ... rest of notifications logic

    // If milestoneId is provided, add task to that milestone's tasks array
    if (req.body.milestoneId) {
      await Milestone.findByIdAndUpdate(req.body.milestoneId, {
        $push: { tasks: task._id }
      });
    }

    await task.populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);

    const proj = await Project.findById(task.projectId).select("name workspaceId").lean();
    if (proj) {
      const ws = String(proj.workspaceId);
      const assigneeIds = (task.assignees || []).map((a) =>
        String((a as { _id?: unknown })._id ?? a)
      );
      const dueLine = task.dueDate ? ` Due ${formatWhen(task.dueDate)}.` : "";
      const typeLabel = formatTaskTypeLabel(task.type);
      const typeLead = `[${typeLabel}] `;

      await dispatchToUsers({
        workspaceId: ws,
        userIds: assigneeIds,
        category: "task",
        kind: "TASK_ASSIGNED",
        title: "New task assigned",
        body: `${typeLead}"${task.title}"${dueLine}`,
        metadata: {
          taskId: String(task._id),
          projectId: String(task.projectId),
          taskType: task.type ?? "task",
        },
      });

      const pms = await getPMRecipientIds(ws, String(task.projectId), assigneeIds);
      if (pms.length) {
        await dispatchToUsers({
          workspaceId: ws,
          userIds: pms,
          category: "update",
          kind: "PM_TASK_ASSIGNED",
          title: "Task assignment",
          body: `${typeLead}"${task.title}" assigned in ${proj.name}.${dueLine}`,
          metadata: {
            taskId: String(task._id),
            projectId: String(task.projectId),
            taskType: task.type ?? "task",
          },
        });
      }
    }

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const safeUpdates = pickFields(req.body, ALLOWED_TASK_FIELDS);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const taskToUpdate = await Task.findById(req.params.id);
    if (!taskToUpdate) return res.status(404).json({ message: "Task not found" });

    // Rule 2: Only assignee, creator, or admin/pm can edit. But if task is completely unassigned, anyone can edit.
    const isAssignee = (taskToUpdate.assignees || []).some((a: any) => a.toString() === userId);
    const isCreator = taskToUpdate.createdBy?.toString() === userId;
    const isAdminOrPM = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
    const isUnassigned = (taskToUpdate.assignees || []).length === 0 && (!taskToUpdate.assignedTeams || taskToUpdate.assignedTeams.length === 0);

    if (!isAssignee && !isCreator && !isAdminOrPM && !isUnassigned) {
      return res.status(403).json({ message: "You are not authorized to edit this task." });
    }

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const prev = taskToUpdate.toObject();
    
    const task = await Task.findByIdAndUpdate(req.params.id, safeUpdates, {
      new: true,
    }).populate([
      { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
      { path: "assignedTeams", select: "name" }
    ]);

    if (!task) return res.status(404).json({ message: "Task not found" });

    const proj = await Project.findById(task.projectId).select("name workspaceId").lean();
    if (proj && prev) {
      const ws = String(proj.workspaceId);
      const pid = String(task.projectId);
      const prevAssignees = new Set((prev.assignees || []).map(String));
      const nextAssignees = (task.assignees || []).map((a) =>
        String((a as { _id?: unknown })._id ?? a)
      );
      const addedAssignees = nextAssignees.filter((id) => !prevAssignees.has(id));

      if (addedAssignees.length) {
        const typeLabel = formatTaskTypeLabel(task.type);
        const typeLead = `[${typeLabel}] `;
        await dispatchToUsers({
          workspaceId: ws,
          userIds: addedAssignees,
          category: "task",
          kind: "TASK_ASSIGNED",
          title: "New task assigned",
          body: `${typeLead}"${task.title}"${task.dueDate ? ` — due ${formatWhen(task.dueDate)}.` : "."}`,
          metadata: {
            taskId: String(task._id),
            projectId: pid,
            taskType: task.type ?? "task",
          },
        });
        const pms = await getPMRecipientIds(ws, pid, [...nextAssignees]);
        if (pms.length) {
          await dispatchToUsers({
            workspaceId: ws,
            userIds: pms,
            category: "update",
            kind: "PM_TASK_ASSIGNED",
            title: "Task assignment",
            body: `${typeLead}"${task.title}" reassigned in ${proj.name}.`,
            metadata: {
              taskId: String(task._id),
              projectId: pid,
              taskType: task.type ?? "task",
            },
          });
        }
      }

      if (
        safeUpdates.dueDate !== undefined &&
        String(prev.dueDate ?? "") !== String(task.dueDate ?? "")
      ) {
        const typeLabel = formatTaskTypeLabel(task.type);
        const typeLead = `[${typeLabel}] `;
        await dispatchToUsers({
          workspaceId: ws,
          userIds: nextAssignees,
          category: "task",
          kind: "TASK_DUE_UPDATED",
          title: "Task deadline updated",
          body: `${typeLead}"${task.title}" — new deadline ${task.dueDate ? formatWhen(task.dueDate) : "cleared"}.`,
          metadata: {
            taskId: String(task._id),
            projectId: pid,
            taskType: task.type ?? "task",
          },
        });
      }

      if (task.status === "done" && prev.status !== "done") {
        const pms = await getPMRecipientIds(ws, pid, []);
        if (pms.length) {
          const typeLabel = formatTaskTypeLabel(task.type);
          const typeLead = `[${typeLabel}] `;
          await dispatchToUsers({
            workspaceId: ws,
            userIds: pms,
            category: "update",
            kind: "PM_TASK_COMPLETED",
            title: "Task completed",
            body: `${typeLead}"${task.title}" marked done in ${proj.name}.`,
            metadata: {
              taskId: String(task._id),
              projectId: pid,
              taskType: task.type ?? "task",
            },
          });
        }
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAssignee = (task.assignees || []).some((a: any) => a.toString() === userId);
    const isCreator = task.createdBy?.toString() === userId;
    const isAdminOrPM = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
    const isUnassigned = (task.assignees || []).length === 0 && (!task.assignedTeams || task.assignedTeams.length === 0);

    if (!isAssignee && !isCreator && !isAdminOrPM && !isUnassigned) {
      return res.status(403).json({ message: "You are not authorized to delete this task." });
    }

    await task.deleteOne();
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
      .populate({
        path: "tasks",
        populate: [
          { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
          { 
            path: "assignedTeams", 
            select: "name members",
            populate: { path: "members", select: "profile.firstName profile.lastName profile.avatarKey email" }
          }
        ]
      });

    // Aggregate unique assignees and teams from tasks for each milestone
    const enhancedMilestones = milestones.map((m: any) => {
      const milestoneObj = m.toObject();
      const uniqueUsers = new Map();
      const uniqueTeams = new Map();

      (m.tasks || []).forEach((t: any) => {
        (t.assignees || []).forEach((u: any) => uniqueUsers.set(u._id.toString(), u));
        (t.assignedTeams || []).forEach((team: any) => {
          uniqueTeams.set(team._id.toString(), team);
          // Also add all team members to uniqueUsers
          (team.members || []).forEach((member: any) => {
            uniqueUsers.set(member._id.toString(), member);
          });
        });
      });

      milestoneObj.assignees = Array.from(uniqueUsers.values());
      milestoneObj.assignedTeams = Array.from(uniqueTeams.values());
      return milestoneObj;
    });

    res.json(enhancedMilestones);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const safeFields = pickFields(req.body, ALLOWED_MILESTONE_FIELDS);

    if (!safeFields.name || !safeFields.name.trim()) {
      return res.status(400).json({ message: "Milestone name is required" });
    }

    const milestone = await Milestone.create({
      ...safeFields,
      projectId: req.params.projectId,
      createdBy: req.user!.id,
    });

    const proj = await Project.findById(req.params.projectId)
      .select("name workspaceId")
      .lean();
    if (proj) {
      const ws = String(proj.workspaceId);
      const pid = String(req.params.projectId);
      const pms = await getPMRecipientIds(ws, pid, []);
      if (pms.length) {
        await dispatchToUsers({
          workspaceId: ws,
          userIds: pms,
          category: "update",
          kind: "PM_MILESTONE_CREATED",
          title: "New milestone",
          body: `"${milestone.name}" added to ${proj.name}${milestone.dueDate ? ` (due ${formatWhen(milestone.dueDate)})` : ""}.`,
          metadata: { milestoneId: String(milestone._id), projectId: pid },
        });
      }
    }

    const taskIds = safeFields.tasks;
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: taskIds } },
        { milestoneId: milestone._id }
      );
    }

    await milestone.populate({
      path: "tasks",
      populate: [
        { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
        { path: "assignedTeams", select: "name" }
      ]
    });

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
    ).populate({
      path: "tasks",
      populate: [
        { path: "assignees", select: "profile.firstName profile.lastName profile.avatarKey email" },
        { path: "assignedTeams", select: "name" }
      ]
    });

    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    if (safeUpdates.status === "completed") {
      // Complete all tasks in this milestone
      await Task.updateMany(
        { _id: { $in: milestone.tasks } },
        { status: "done" }
      );
    }

    const proj = milestone.projectId
      ? await Project.findById(milestone.projectId).select("name workspaceId").lean()
      : null;
    if (proj) {
      const ws = String(proj.workspaceId);
      const pid = String(milestone.projectId);
      const pms = await getPMRecipientIds(ws, pid, []);
      if (pms.length) {
        await dispatchToUsers({
          workspaceId: ws,
          userIds: pms,
          category: "update",
          kind:
            safeUpdates.status === "completed"
              ? "PM_MILESTONE_COMPLETED"
              : "PM_MILESTONE_UPDATED",
          title:
            safeUpdates.status === "completed"
              ? "Milestone completed"
              : "Milestone updated",
          body:
            safeUpdates.status === "completed"
              ? `"${milestone.name}" completed on ${proj.name}.`
              : `"${milestone.name}" updated on ${proj.name}.`,
          metadata: { milestoneId: String(milestone._id), projectId: pid },
        });
      }
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

    res.json({ message: "Milestone deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- FILE ATTACHMENTS ---

export const attachFileToTask = async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.body;
    const { id: taskId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { $addToSet: { attachments: fileId } },
      { new: true }
    ).populate("attachments");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "File attached to task", task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const detachFileFromTask = async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.body;
    const { id: taskId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { $pull: { attachments: fileId } },
      { new: true }
    ).populate("attachments");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "File detached from task", task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTaskAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { id: taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate({
        path: "attachments",
        select: "name mimeType sizeBytes uploadedBy createdAt updatedBy currentVersionId",
        populate: [
          { path: "uploadedBy", select: "profile.firstName profile.lastName profile.avatarKey email" },
          { path: "currentVersionId", select: "versionNumber author" }
        ]
      });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ attachments: task.attachments });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const searchTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const projectQuery = await buildScopedProjectQuery(req.user);
    if (!projectQuery) return res.json([]);

    const projects = await Project.find(projectQuery).select("_id").lean();
    const projectIds = projects.map((p: any) => p._id);

    const tasks = await Task.find({
      projectId: { $in: projectIds },
      $or: [
        { title: { $regex: q as string, $options: "i" } },
        { description: { $regex: q as string, $options: "i" } }
      ]
    })
      .limit(20)
      .populate("projectId", "name")
      .lean();

    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
