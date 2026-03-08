"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut, Check, X, Building, ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  role: string;
  membersCount: number;
  ownerId: string;
}

interface PendingInvite {
  workspaceId: string;
  workspaceName: string;
  role: string;
  token: string;
}

export default function ManageWorkspacesPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [leaveDialog, setLeaveDialog] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });

  const [transferDialog, setTransferDialog] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<{
        workspaces: Workspace[];
        pendingInvites: PendingInvite[];
      }>("/auth/workspaces/me");

      setWorkspaces(data.workspaces);
      setInvites(data.pendingInvites);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeave = async () => {
    if (!leaveDialog.workspace) return;
    try {
      await apiRequest(`/auth/workspaces/${leaveDialog.workspace.id}/leave`, {
        method: "POST",
      });
      toast.success("Left workspace successfully");
      fetchData();

      // If left the active workspace, redirect to home to re-evaluate active workspace
      if (user?.activeWorkspace === leaveDialog.workspace.id) {
        window.location.href = "/projects";
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to leave workspace");
    } finally {
      setLeaveDialog({ open: false, workspace: null });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.workspace) return;
    try {
      const response = await apiRequest<{ hasOtherWorkspaces: boolean }>(`/auth/workspaces/${deleteDialog.workspace.id}`, {
        method: "DELETE",
      });
      toast.success("Workspace deleted successfully");
      fetchData();

      // If deleted the active workspace, redirect to projects to re-evaluate active workspace
      if (user?.activeWorkspace === deleteDialog.workspace.id) {
        if (response.hasOtherWorkspaces) {
          window.location.href = "/projects";
        } else {
          window.location.href = "/create-workspace";
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to delete workspace");
    } finally {
      setDeleteDialog({ open: false, workspace: null });
    }
  };

  const handleTransferClick = async (ws: Workspace) => {
    setTransferDialog({ open: true, workspace: ws });
    try {
      const data = await apiRequest<{ members: any[] }>(`/auth/workspaces/${ws.id}/members`);
      setMembers(data.members.filter((m) => m.id !== user?.id));
    } catch (e) {
      console.error(e);
    }
  };

  const executeTransfer = async () => {
    if (!transferDialog.workspace || !selectedMember) return;
    try {
      await apiRequest(`/auth/workspaces/${transferDialog.workspace.id}/transfer-ownership`, {
        method: "POST",
        data: { newOwnerId: selectedMember },
      });
      toast.success("Ownership transferred successfully");

      // Check if user still owns any workspace
      const ownedWorkspaces = workspaces.filter(w => w.ownerId === user?.id && w.id !== transferDialog.workspace!.id);
      if (ownedWorkspaces.length === 0) {
        toast.info("You no longer own any workspace. Please create one to continue managing your own projects.");
      }

      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to transfer ownership");
    } finally {
      setTransferDialog({ open: false, workspace: null });
      setSelectedMember("");
    }
  };

  const handleAcceptInvite = async (token: string) => {
    try {
      await apiRequest("/auth/workspaces/join", {
        method: "POST",
        data: { token },
      });
      toast.success("Joined workspace successfully");
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to join workspace");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const ownedCount = workspaces.filter((w) => w.ownerId === user?.id).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Manage Workspaces</h1>
          <p className="text-neutral-500">View and manage the workspaces you belong to</p>
        </div>
        <Button onClick={() => router.push("/create-workspace")} variant="secondary" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Workspace
        </Button>
      </div>

      {ownedCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <Building className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">You don&apos;t own any workspaces</h3>
            <p className="text-sm mt-1">We recommend owning at least one workspace to ensure you can always create your own projects independently.</p>
            <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={() => router.push("/create-workspace")}>Create One Now</Button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-900 border-b border-neutral-200 pb-2">Pending Invites</h2>
          <div className="grid gap-4">
            {invites.map((invite) => (
              <div key={invite.workspaceId} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-medium text-neutral-900">{invite.workspaceName}</h3>
                  <p className="text-sm text-neutral-500">Invited as {invite.role === "ADMIN" ? "Admin" : "Member"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleAcceptInvite(invite.token)} className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                    <Check className="w-4 h-4" /> Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-neutral-900 border-b border-neutral-200 pb-2">Your Workspaces</h2>
        {workspaces.length === 0 ? (
          <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
            <p className="text-neutral-500">You don&apos;t belong to any workspaces yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workspaces.map((ws) => {
              const isActive = ws.id === user?.activeWorkspace;
              const isOwner = ws.ownerId === user?.id;

              return (
                <div key={ws.id} className={cn("bg-background border border-border rounded-xl p-5", (isActive && "border-brand"))}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-lg bg-accent text-brand flex items-center justify-center font-bold text-lg shrink-0">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 truncate pr-2">
                        <h3 className="font-semibold text-neutral-900 truncate flex items-center gap-2">
                          {ws.name}
                          {isActive && <span className="text-[10px] font-bold tracking-wider uppercase bg-accent text-brand px-2 py-0.5 rounded-full">Active</span>}
                        </h3>
                        <p className="text-sm text-neutral-500 flex items-center gap-2">
                          {ws.role === "ADMIN" ? "Admin" : "Member"} • {ws.membersCount} member{ws.membersCount !== 1 && 's'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-4 border-t border-neutral-100">
                    {isOwner ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleTransferClick(ws)}>
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Transfer
                        </Button>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="flex-1 flex">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                  disabled={ws.membersCount > 1}
                                  onClick={() => setDeleteDialog({ open: true, workspace: ws })}
                                >
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {ws.membersCount > 1 && (
                              <TooltipContent>
                                <p>You must transfer ownership to leave or remove other members before deleting.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setLeaveDialog({ open: true, workspace: ws })}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Workspace
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={leaveDialog.open} onOpenChange={(open) => !open && setLeaveDialog({ open: false, workspace: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave <strong>{leaveDialog.workspace?.name}</strong>? You will lose access to all projects and documents inside it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog({ open: false, workspace: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeave}>Leave Workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, workspace: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteDialog.workspace?.name}</strong>? This will destroy all projects and files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, workspace: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialog.open} onOpenChange={(open) => !open && setTransferDialog({ open: false, workspace: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Transfer Ownership</DialogTitle>
            <DialogDescription>
              You are about to transfer ownership of <strong>{transferDialog.workspace?.name}</strong>. This is a destructive action and cannot be undone. You will be downgraded to an Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Select new owner</label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="" disabled>Select a member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ open: false, workspace: null })}>Cancel</Button>
            <Button variant="destructive" onClick={executeTransfer} disabled={!selectedMember}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
