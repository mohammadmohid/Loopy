export type TaskStatus = "todo" | "in-progress" | "done" | string;
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
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  priority: Priority;
  assignees: User[];
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
  assignees: User[];
  team?: string;
  tasks: Task[];
  attachments?: string[];
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner: User;
  startDate: string;
  endDate: string;
  members: User[];
  boardColumns: {
    id: string;
    label: string;
    color: string;
    isLocked?: boolean;
  }[];
  stats: {
    completed: number;
    created: number;
    updated: number;
    dueSoon: number;
  };
}

export interface Activity {
  id: string;
  type: "task" | "milestone" | "project";
  action: "created" | "updated" | "deleted" | "completed";
  targetName: string;
  targetId: string;
  user: string;
  timestamp: string;
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
