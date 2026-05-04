import mongoose from "mongoose";
import { Folder } from "@loopy/shared";
import { SystemFolderContext } from "@loopy/shared";

export async function getOrCreateSystemFolder(
  workspaceId: string,
  context: SystemFolderContext,
  name?: string
) {
  let folder = await Folder.findOne({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    systemContext: context,
    isSystem: true,
  });

  if (!folder) {
    folder = await Folder.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      name: name || context.charAt(0) + context.slice(1).toLowerCase(),
      isSystem: true,
      systemContext: context,
    });
  }

  return folder;
}

export async function getOrCreateSubFolder(
  workspaceId: string,
  parentId: mongoose.Types.ObjectId,
  name: string
) {
  let folder = await Folder.findOne({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    parentId,
    name,
  });

  if (!folder) {
    folder = await Folder.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      parentId,
      name,
      isSystem: false,
    });
  }

  return folder;
}
