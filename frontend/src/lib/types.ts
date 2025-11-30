// Shared types for the project management system

export type TaskStatus = string;
export type TaskType = "task" | "bug" | "feature" | "story";
export type EventType = "task" | "milestone" | "meeting" | "deadline";
export type Priority = "high" | "medium" | "low";
export type UserRole =
  | "admin"
  | "project-manager"
  | "team-lead"
  | "team-member";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
}

export interface Task {
  _id: string;
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  priority: Priority;
  assignee?: User;
  dueDate?: string;
  milestoneId?: string;
  projectId: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  dueDate: string;
  assignee?: User;
  team?: string;
  tasks: Task[];
  attachments?: string[];
  projectId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  status: TaskStatus;
  startDate: string;
  endDate?: string;
  description?: string;
  assignees?: User[];
  projectId: string;
}

export interface Project {
  _id: string;
  id: string;
  name: string;
  description?: string;
  owner: User;
  startDate: string;
  endDate: string;
  color: string;
  members: User[];
  boardColumns: { id: string; label: string; color: string }[]; // Added
  stats: {
    completed: number;
    created: number;
    updated: number;
    dueSoon: number;
  };
}

export interface Activity {
  id: string;
  type: "file" | "meeting" | "task" | "comment";
  user?: string;
  action: string;
  target?: string;
  time: string;
  icon: "file" | "calendar" | "check" | "message";
  color: string;
}
