import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";
import Task from "../models/Task";
import Milestone from "../models/Milestone";
import Team from "../models/Team";
import "../models/User";

/**
 * @desc    Get aggregated dashboard data for the home page
 * @route   GET /api/projects/dashboard
 * @access  Private
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId, role } = req.user!;
    const workspaceId = req.user!.workspaceId;

    if (!workspaceId) {
      return res.status(200).json({
        kpis: {},
        projects: [],
        myTasks: [],
        recentActivity: [],
      });
    }

    // ── 1. Fetch Projects (scoped by role) ──────────────────────────
    let projectQuery: any = { workspaceId };

    if (role !== "ADMIN" && role !== "PROJECT_MANAGER") {
      const userTeams = await Team.find({ members: userId }).select("_id");
      const userTeamIds = userTeams.map((t) => t._id);

      projectQuery = {
        workspaceId,
        $or: [
          { owner: userId },
          { "members.user": userId },
          { "assignedTeams.team": { $in: userTeamIds } },
        ],
      };
    }

    const projects = await Project.find(projectQuery)
      .populate(
        "owner",
        "profile.firstName profile.lastName profile.avatarKey"
      )
      .populate(
        "members.user",
        "profile.firstName profile.lastName profile.avatarKey"
      )
      .sort({ updatedAt: -1 })
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    // ── 2. Fetch Tasks ──────────────────────────────────────────────
    const allTasks = await Task.find({ projectId: { $in: projectIds } })
      .populate(
        "assignees",
        "profile.firstName profile.lastName profile.avatarKey email"
      )
      .sort({ updatedAt: -1 })
      .lean();

    // For MEMBER role, filter to only tasks assigned to the current user
    const myTasks =
      role === "ADMIN" || role === "PROJECT_MANAGER"
        ? allTasks.filter((t: any) =>
            t.assignees?.some(
              (a: any) => a._id?.toString() === userId
            )
          )
        : allTasks.filter((t: any) =>
            t.assignees?.some(
              (a: any) => a._id?.toString() === userId
            )
          );

    // ── 3. Compute KPIs ─────────────────────────────────────────────
    const now = new Date();
    const sevenDaysFromNow = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    // For MEMBER: KPIs are scoped to their assigned tasks only
    // For PM/ADMIN: KPIs cover all workspace tasks
    const kpiTasks =
      role === "ADMIN" || role === "PROJECT_MANAGER"
        ? allTasks
        : myTasks;

    const completedTasks = kpiTasks.filter(
      (t: any) => t.status === "done"
    ).length;
    const inProgressTasks = kpiTasks.filter(
      (t: any) => t.status === "in-progress"
    ).length;
    const todoTasks = kpiTasks.filter(
      (t: any) => t.status === "todo"
    ).length;
    const overdueTasks = kpiTasks.filter(
      (t: any) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done"
    ).length;
    const dueSoonTasks = kpiTasks.filter(
      (t: any) =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= sevenDaysFromNow &&
        t.status !== "done"
    ).length;

    const kpis: any = {
      totalProjects: projects.length,
      activeProjects: projects.filter((p: any) => p.status === "active")
        .length,
      totalTasks: kpiTasks.length,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      dueSoonTasks,
    };

    // ADMIN-only: workspace-level stats
    if (role === "ADMIN" || role === "PROJECT_MANAGER") {
      const teams = await Team.find({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      }).lean();
      kpis.totalTeams = teams.length;

      // Unique member count across all teams
      const memberSet = new Set<string>();
      teams.forEach((team: any) => {
        if (Array.isArray(team.members)) {
          team.members.forEach((m: any) =>
            memberSet.add(m.toString())
          );
        }
      });
      kpis.totalMembers = memberSet.size;
    }

    // ── 4. Recent Activity (last 10) ────────────────────────────────
    const recentTasks = allTasks.slice(0, 15);
    const milestones = await Milestone.find({
      projectId: { $in: projectIds },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate(
        "assignees",
        "profile.firstName profile.lastName"
      )
      .lean();

    const recentActivity = [
      ...recentTasks.map((t: any) => ({
        id: t._id,
        type: "task",
        action:
          t.status === "done"
            ? "completed"
            : t.createdAt?.getTime?.() === t.updatedAt?.getTime?.()
              ? "created"
              : "updated",
        targetName: t.title,
        projectId: t.projectId,
        timestamp: t.updatedAt,
        user: t.assignees?.[0]
          ? `${t.assignees[0].profile?.firstName || ""} ${t.assignees[0].profile?.lastName || ""}`.trim()
          : "Team Member",
      })),
      ...milestones.map((m: any) => ({
        id: m._id,
        type: "milestone",
        action:
          m.createdAt?.getTime?.() === m.updatedAt?.getTime?.()
            ? "created"
            : "updated",
        targetName: m.name,
        projectId: m.projectId,
        timestamp: m.updatedAt,
        user: m.assignees?.[0]
          ? `${m.assignees[0].profile?.firstName || ""} ${m.assignees[0].profile?.lastName || ""}`.trim()
          : "Project Manager",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    // ── 5. Build project name map for frontend convenience ─────────
    const projectMap: Record<string, string> = {};
    projects.forEach((p: any) => {
      projectMap[p._id.toString()] = p.name;
    });

    // ── 6. Response ─────────────────────────────────────────────────
    res.status(200).json({
      kpis,
      projects: projects.slice(0, 6),
      myTasks: myTasks.slice(0, 10),
      recentActivity,
      projectMap,
    });
  } catch (error: any) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};
