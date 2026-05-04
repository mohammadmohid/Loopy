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
  _id?: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  workspaceId?: string;
  workspaceRole?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  priority: Priority;
  assignees: User[];
  assignedTeams?: { id: string; name: string; _id?: string }[];
  dueDate?: string;
  projectId: string;
  milestoneId?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  status?: "open" | "completed";
  startDate: string;
  dueDate: string;
  duration?: string;
  goal?: string;
  createdBy?: User;
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
  type: "project" | "team" | "private" | "direct" | "global";
  projectId?: string;
  teamId?: string;
  workspaceId: string;
  members: ChannelMember[];
  createdBy?: string; // Optional for global channels
  isArchived: boolean;
  restrictedChat?: boolean;
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
  fileId?: string;
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


export interface Folder {
  _id: string;
  workspaceId: string;
  name: string;
  parentId?: string | null;
  isSystem: boolean;
  systemContext?: "MEETINGS" | "PROJECTS" | "CHAT" | "USERS" | "OTHER";
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  _id: string;
  artifactType: string;
  workspaceId: string;
  folderId?: string;
  uploadedBy: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  originalFilename: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  projectId?: {
    _id: string;
    name: string;
  };
  meetingId?: string;
  transcriptionStatus: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilePermission {
  role: "OWNER" | "MEMBER" | "GUEST" | "PROJECT_MANAGER";
  access: "VIEW" | "EDIT" | "DELETE";
}

export interface FileSourceContext {
  type: "TASK" | "CHAT_MESSAGE" | "CHANNEL" | "CUSTOM" | "RECORDING";
  id?: string;
}

export interface File {
  _id: string;
  workspaceId: string;
  folderId?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  r2Key: string;
  uploadedBy: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatarKey?: string;
    };
  };
  permissions: FilePermission[];
  sourceContext: FileSourceContext;
  currentVersionId?: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}
