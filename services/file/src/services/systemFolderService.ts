import mongoose from "mongoose";
import { Folder, SystemFolderContext, FolderEntityType } from "@loopy/shared";

/**
 * Gets or creates a top-level system folder (Projects, Chat, Meetings).
 * These are workspace-scoped singletons per systemContext.
 */
export async function getOrCreateSystemFolder(
  workspaceId: string,
  context: SystemFolderContext,
  name?: string
) {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);

  let folder = await Folder.findOne({
    workspaceId: wsOid,
    systemContext: context,
    isSystem: true,
    parentId: null,
  });

  if (!folder) {
    const displayNames: Record<string, string> = {
      PROJECTS: "Projects",
      CHAT: "Chat",
      MEETINGS: "Meetings",
    };
    folder = await Folder.create({
      workspaceId: wsOid,
      name: name || displayNames[context] || context,
      isSystem: true,
      systemContext: context,
      parentId: null,
    });
  }

  return folder;
}

/**
 * Gets or creates a sub-folder (no entity link).
 */
export async function getOrCreateSubFolder(
  workspaceId: string,
  parentId: mongoose.Types.ObjectId,
  name: string
) {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);

  let folder = await Folder.findOne({
    workspaceId: wsOid,
    parentId,
    name,
  });

  if (!folder) {
    folder = await Folder.create({
      workspaceId: wsOid,
      parentId,
      name,
      isSystem: false,
    });
  }

  return folder;
}

/**
 * Gets or creates a sub-folder linked to a source entity (project, channel).
 */
export async function getOrCreateEntityFolder(
  workspaceId: string,
  parentId: mongoose.Types.ObjectId,
  entityId: string,
  entityType: FolderEntityType,
  name: string
) {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);
  const entityOid = new mongoose.Types.ObjectId(entityId);

  // First try to find by entity link (more reliable than name which can change)
  let folder = await Folder.findOne({
    workspaceId: wsOid,
    sourceEntityId: entityOid,
    sourceEntityType: entityType,
  });

  if (!folder) {
    folder = await Folder.create({
      workspaceId: wsOid,
      parentId,
      name,
      isSystem: false,
      sourceEntityId: entityOid,
      sourceEntityType: entityType,
    });
  } else if (folder.name !== name) {
    // Entity was renamed, update folder name
    folder.name = name;
    await folder.save();
  }

  return folder;
}

// ─── Project Sync ─────────────────────────────────────────────────────────

/**
 * Ensures Projects/{ProjectName}/Tasks hierarchy exists.
 */
export async function syncProjectFolders(
  workspaceId: string,
  projectId: string,
  projectName: string
) {
  const projectsRoot = await getOrCreateSystemFolder(
    workspaceId,
    SystemFolderContext.PROJECTS
  );

  const projectFolder = await getOrCreateEntityFolder(
    workspaceId,
    projectsRoot._id,
    projectId,
    FolderEntityType.PROJECT,
    projectName
  );

  // Ensure Tasks subfolder exists
  await getOrCreateSubFolder(workspaceId, projectFolder._id, "Tasks");

  return projectFolder;
}

/**
 * Removes a project's folder hierarchy (cascade delete).
 */
export async function removeProjectFolder(
  workspaceId: string,
  projectId: string
) {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);
  const entityOid = new mongoose.Types.ObjectId(projectId);

  const projectFolder = await Folder.findOne({
    workspaceId: wsOid,
    sourceEntityId: entityOid,
    sourceEntityType: FolderEntityType.PROJECT,
  });

  if (!projectFolder) return;

  // Delete all subfolders recursively
  await deleteSubfoldersRecursive(wsOid, projectFolder._id);
  // Delete the project folder itself
  await Folder.deleteOne({ _id: projectFolder._id });
}

// ─── Chat Channel Sync ───────────────────────────────────────────────────

/**
 * Ensures Chat/{Type}/{ChannelName} folder exists.
 * Types: Teams, Project, Everyone, Users (Direct)
 */
export async function syncChatChannelFolder(
  workspaceId: string,
  channelId: string,
  channelName: string,
  channelType?: string
) {
  const chatRoot = await getOrCreateSystemFolder(
    workspaceId,
    SystemFolderContext.CHAT
  );

  let typeFolderLabel = "Everyone";
  if (channelType === "team") typeFolderLabel = "Teams";
  else if (channelType === "project") typeFolderLabel = "Project";
  else if (channelType === "direct") typeFolderLabel = "Users";
  else if (channelType === "global") typeFolderLabel = "Everyone";

  const typeFolder = await getOrCreateSubFolder(
    workspaceId,
    chatRoot._id,
    typeFolderLabel
  );

  const folderName = channelType === "direct" ? channelName : `#${channelName}`;

  const channelFolder = await getOrCreateEntityFolder(
    workspaceId,
    typeFolder._id,
    channelId,
    FolderEntityType.CHANNEL,
    folderName
  );

  return channelFolder;
}

/**
 * Removes a chat channel's folder.
 */
export async function removeChatChannelFolder(
  workspaceId: string,
  channelId: string
) {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);
  const entityOid = new mongoose.Types.ObjectId(channelId);

  const channelFolder = await Folder.findOne({
    workspaceId: wsOid,
    sourceEntityId: entityOid,
    sourceEntityType: FolderEntityType.CHANNEL,
  });

  if (!channelFolder) return;

  await deleteSubfoldersRecursive(wsOid, channelFolder._id);
  await Folder.deleteOne({ _id: channelFolder._id });
}

// ─── Meeting Channel Sync ────────────────────────────────────────────────

/**
 * Ensures Meetings/{ChannelName} folder exists.
 */
export async function syncMeetingChannelFolder(
  workspaceId: string,
  channelId: string,
  channelName: string
) {
  const meetingsRoot = await getOrCreateSystemFolder(
    workspaceId,
    SystemFolderContext.MEETINGS
  );

  const meetingFolder = await getOrCreateEntityFolder(
    workspaceId,
    meetingsRoot._id,
    channelId,
    FolderEntityType.MEETING_CHANNEL,
    channelName
  );

  return meetingFolder;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Recursively deletes all subfolders of a given folder.
 * Note: Does NOT delete files — that should be handled separately by caller.
 */
async function deleteSubfoldersRecursive(
  workspaceId: mongoose.Types.ObjectId,
  parentId: mongoose.Types.ObjectId
) {
  const children = await Folder.find({
    workspaceId,
    parentId,
  });

  for (const child of children) {
    await deleteSubfoldersRecursive(workspaceId, child._id);
    await Folder.deleteOne({ _id: child._id });
  }
}

/**
 * Gets the full folder path from root to a given folder.
 * Returns an array of { _id, name } objects ordered from root to target.
 */
export async function getFolderPath(
  folderId: string,
  workspaceId: string
): Promise<{ _id: string; name: string; isSystem: boolean; systemContext?: string }[]> {
  const wsOid = new mongoose.Types.ObjectId(workspaceId);
  const path: { _id: string; name: string; isSystem: boolean; systemContext?: string }[] = [];

  let current = await Folder.findOne({
    _id: new mongoose.Types.ObjectId(folderId),
    workspaceId: wsOid,
  });

  while (current) {
    path.unshift({
      _id: current._id.toString(),
      name: current.name,
      isSystem: current.isSystem,
      systemContext: current.systemContext,
    });

    if (!current.parentId) break;

    current = await Folder.findOne({
      _id: current.parentId,
      workspaceId: wsOid,
    });
  }

  return path;
}
