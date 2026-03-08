"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut, Check, X, Shield, Users, Mail, UserPlus, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "MEMBER";
  joinedAt: string;
}

interface PendingInvite {
  email: string;
  role: string;
  expiresAt: string;
}

interface Team {
  _id: string;
  name: string;
  workspaceId: string;
  leader: Member;
  members: Member[];
}

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"members" | "teams">("members");

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "PROJECT_MANAGER">("MEMBER");

  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [membersData, teamsData] = await Promise.all([
        apiRequest<{ members: Member[]; pendingInvites: PendingInvite[] }>("/auth/workspaces/members"),
        apiRequest<Team[]>("/projects/teams").catch(() => []) // Graceful fail if no active workspace
      ]);

      setMembers(membersData.members);
      setPendingInvites(membersData.pendingInvites);
      setTeams(teamsData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = async () => {
    try {
      await apiRequest("/auth/workspaces/invite", {
        method: "POST",
        data: { email: inviteEmail, role: inviteRole },
      });
      toast.success("Invitation sent");
      setInviteDialog(false);
      setInviteEmail("");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to send invite");
    }
  };

  const handleResendInvite = async (email: string) => {
    try {
      await apiRequest("/auth/workspaces/invites/resend", {
        method: "POST",
        data: { email },
      });
      toast.success("Invitation resent");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to resend invite");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await apiRequest(`/auth/workspaces/members/${memberId}`, {
        method: "PATCH",
        data: { role: newRole },
      });
      toast.success("Role updated");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiRequest(`/auth/workspaces/members/${memberId}`, {
        method: "DELETE",
      });
      toast.success("Member removed");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to remove member");
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    try {
      await apiRequest("/projects/teams", {
        method: "POST",
        data: { name: newTeamName, members: selectedTeamMembers },
      });
      toast.success("Team created");
      setCreateTeamDialog(false);
      setNewTeamName("");
      setSelectedTeamMembers([]);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await apiRequest(`/projects/teams/${teamId}`, {
        method: "DELETE",
      });
      toast.success("Team deleted");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete team");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const isAdmin = members.find(m => m.id === user?.id)?.role === "ADMIN";
  const isPM = members.find(m => m.id === user?.id)?.role === "PROJECT_MANAGER";
  const canManageTeams = isAdmin || isPM;

  const groupedMembers = {
    ADMIN: members.filter(m => m.role === "ADMIN"),
    PROJECT_MANAGER: members.filter(m => m.role === "PROJECT_MANAGER"),
    MEMBER: members.filter(m => m.role === "MEMBER"),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Workspace Team</h1>
          <p className="text-neutral-500">Manage members, roles, and functional teams.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteDialog(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "px-4 py-3 font-medium text-sm transition-colors border-b-2",
            activeTab === "members" ? "border-brand text-brand" : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={cn(
            "px-4 py-3 font-medium text-sm transition-colors border-b-2",
            activeTab === "teams" ? "border-brand text-brand" : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
        >
          Functional Teams ({teams.length})
        </button>
      </div>

      {activeTab === "members" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-900 border-b border-neutral-200 pb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-neutral-400" />
                Pending Invites
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.email} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="font-medium text-neutral-900 truncate max-w-[200px]">{invite.email}</h3>
                      <p className="text-xs text-neutral-500">
                        {invite.role === "PROJECT_MANAGER" ? "Project Manager" : "Member"} • Expires soon
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleResendInvite(invite.email)}>
                      Resend
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-6">
            {(["ADMIN", "PROJECT_MANAGER", "MEMBER"] as const).map((roleKey) => {
              const roleGroup = groupedMembers[roleKey];
              if (roleGroup.length === 0) return null;

              return (
                <div key={roleKey} className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                    {roleKey.replace("_", " ")}S ({roleGroup.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleGroup.map((member) => (
                      <div key={member.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-neutral-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold relative overflow-hidden">
                            {member.avatarUrl ? (
                              <Image src={member.avatarUrl} alt={member.firstName} fill className="object-cover" />
                            ) : (
                              member.firstName[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-900 flex items-center gap-2">
                              {member.firstName} {member.lastName}
                              {member.id === user?.id && <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">You</span>}
                            </h4>
                            <p className="text-xs text-neutral-500 truncate max-w-[180px]">{member.email}</p>
                          </div>
                        </div>

                        {isAdmin && member.id !== user?.id && member.role !== "ADMIN" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role === "MEMBER" && (
                                <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "PROJECT_MANAGER")}>
                                  Promote to Project Manager
                                </DropdownMenuItem>
                              )}
                              {member.role === "PROJECT_MANAGER" && (
                                <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "MEMBER")}>
                                  Demote to Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member.id)}>
                                Remove from Workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "teams" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-neutral-900">Functional Teams</h2>
            {canManageTeams && (
              <Button onClick={() => setCreateTeamDialog(true)} variant="secondary" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Team
              </Button>
            )}
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-16 bg-white border border-neutral-200 border-dashed rounded-2xl">
              <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-900">No teams created yet</h3>
              <p className="text-neutral-500 mb-4 max-w-sm mx-auto">Group members into functional teams (like Engineering or Design) to easily assign them to projects.</p>
              {canManageTeams && <Button onClick={() => setCreateTeamDialog(true)}>Create First Team</Button>}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <div key={team._id} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-neutral-900">{team.name}</h3>
                      <p className="text-sm text-neutral-500">{team.members.length} members</p>
                    </div>
                    {canManageTeams && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTeam(team._id)}>
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700">
                        {m.firstName} {m.lastName}
                        {m.id === team.leader.id && <Shield className="w-3 h-3 text-brand ml-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an email invitation to join this workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
              <select
                className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "PROJECT_MANAGER")}
              >
                <option value="MEMBER">Member (Can view and edit assigned projects)</option>
                <option value="PROJECT_MANAGER">Project Manager (Can create projects and teams)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialog} onOpenChange={setCreateTeamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Functional Team</DialogTitle>
            <DialogDescription>Group members into a team for easier project assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Team Name</label>
              <Input
                placeholder="e.g. Engineering, Marketing..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Select Members</label>
              <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-md divide-y divide-neutral-100">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-brand focus:ring-brand"
                      checked={selectedTeamMembers.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeamMembers([...selectedTeamMembers, m.id]);
                        } else {
                          setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== m.id));
                        }
                      }}
                    />
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium text-neutral-900 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-neutral-500 truncate">{m.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName || selectedTeamMembers.length === 0}>Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
