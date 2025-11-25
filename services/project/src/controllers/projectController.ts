import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";

// @desc    Create a new project
// @access  Private (Admin, Project Manager)
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, startDate, endDate, teamLead, members } =
      req.body;

    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      owner: req.user!.id, // The creator is the owner
      teamLead,
      members,
    });

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get projects (Filtered by Role)
// @access  Private
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;
    let query = {};

    if (role === "org_admin") {
      // Admin sees all projects
      query = {};
    } else if (role === "project_manager") {
      // PM sees projects they own (created)
      query = { owner: id };
    } else if (role === "team_lead") {
      // Team Lead sees projects they lead OR are a member of
      query = { $or: [{ teamLead: id }, { members: id }] };
    } else {
      // Team Members only see projects they are assigned to
      query = { members: id };
    }

    const projects = await Project.find(query);
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign Team Lead (Only Owner/Admin)
// @route   PUT /api/projects/:id/assign-lead
export const assignTeamLead = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is owner or admin
    if (
      project.owner.toString() !== req.user!.id &&
      req.user!.role !== "org_admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this project" });
    }

    project.teamLead = req.body.teamLeadId;
    await project.save();

    res.status(200).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
