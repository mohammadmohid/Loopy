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

// --- Chat Types ---

export interface ChannelMember {
  user: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarKey?: string;
      avatarUrl?: string;
    };
  };
  role: "admin" | "member";
  joinedAt: string;
}

export interface Channel {
  _id: string;
  name: string;
  description?: string;
  type: "project" | "team" | "private" | "direct";
  projectId?: string;
  members: ChannelMember[];
  createdBy: string;
  isArchived: boolean;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface Attachment {
  name: string;
  key: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface ChatMessage {
  _id: string;
  channelId: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarKey?: string;
      avatarUrl?: string;
    };
  };
  content: string;
  type: "text" | "system" | "file";
  threadParentId?: string;
  replyCount: number;
  mentions: string[];
  reactions: Reaction[];
  attachments: Attachment[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

