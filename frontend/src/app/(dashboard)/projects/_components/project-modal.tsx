"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { X, Search, Users, User, Trash2, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

interface Member {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

interface Team {
  _id: string;
  id?: string;
  name: string;
  members: Member[];
}

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  onDelete?: (projectId: string) => void;
  projectIdToEdit?: string; // If passed, we are in edit mode
}

const colors = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

export function ProjectModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  projectIdToEdit,
}: ProjectModalProps) {
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [project, setProject] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  
  // Assignment state
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");

  const isEditMode = !!projectIdToEdit;

  // Get owner ID from fetched project data
  const ownerId = project?.owner?._id || project?.owner?.id || project?.owner || null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form initialization
  useEffect(() => {
    if (project) {
      reset({
        name: project.name || "",
        description: project.description || "",
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      });
      setSelectedColor(project.color || colors[0]);
      
      const pMembers = project.members?.map((m: any) => m.user?._id || m.user?.id || m.user || m) || [];
      const pTeams = project.assignedTeams?.map((t: any) => t.team?._id || t.team?.id || t.team || t) || [];
      // Ensure owner is always in selectedMembers
      const owId = project.owner?._id || project.owner?.id || project.owner;
      if (owId && !pMembers.includes(owId)) {
        pMembers.push(owId);
      }
      setSelectedMembers(pMembers);
      setSelectedTeams(pTeams);
    } else {
      reset({ name: "", description: "", startDate: "", endDate: "" });
      setSelectedColor(colors[0]);
      setSelectedMembers([]);
      setSelectedTeams([]);
    }
  }, [project, reset, isOpen]);

  // Fetch directory and project
  useEffect(() => {
    if (isOpen) {
      const fetchAssignments = async () => {
        setIsFetchingAssignments(true);
        try {
          const [membersData, teamsData] = await Promise.all([
            apiRequest<{ members: Member[] }>("/auth/workspaces/members").catch(() => ({ members: [] })),
            apiRequest<Team[]>("/projects/teams").catch(() => []),
          ]);
          setAvailableMembers(membersData.members);
          setAvailableTeams(teamsData);
        } catch (error) {
          console.error("Failed to load members and teams", error);
        } finally {
          setIsFetchingAssignments(false);
        }
      };
      
      const fetchProject = async () => {
        if (!projectIdToEdit) return;
        setIsLoadingProject(true);
        try {
          const data = await apiRequest<any>(`/projects/${projectIdToEdit}`);
          setProject(data);
        } catch (error) {
          console.error("Failed to fetch project details", error);
        } finally {
          setIsLoadingProject(false);
        }
      };

      fetchAssignments();
      fetchProject();
    } else {
      setProject(null); // Reset when closed
    }
  }, [isOpen, projectIdToEdit]);

  const toggleMember = (memberId: string) => {
    // Prevent toggling the project owner
    if (ownerId && memberId === ownerId) return;
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  // Compute indirectly assigned members (those in selected teams)
  const indirectlyAssignedMemberIds = new Set<string>();
  selectedTeams.forEach(teamId => {
    const team = availableTeams.find(t => t._id === teamId || t.id === teamId);
    if (team) {
      team.members.forEach(m => indirectlyAssignedMemberIds.add(m.id || m._id!));
    }
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const memberPayload = selectedMembers.map(id => ({ user: id, role: "EDITOR" }));
      const teamPayload = selectedTeams.map(id => ({ team: id, role: "EDITOR" }));

      const payload = {
        ...data,
        endDate: data.endDate ? data.endDate : null,
        color: selectedColor,
        members: memberPayload,
        assignedTeams: teamPayload,
      };

      if (isEditMode) {
        const updatedProject = await apiRequest(`/projects/${project.id || project._id}`, {
          method: "PATCH",
          data: payload,
        });
        onSuccess(updatedProject);
      } else {
        const newProject = await apiRequest("/projects", {
          method: "POST",
          data: payload,
        });
        onSuccess(newProject);
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to save project", error);
    }
  };

  if (!isOpen) return null;

  const filteredTeams = availableTeams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMembers = availableMembers.filter(m => 
    (m.firstName + " " + m.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEditMode ? "Edit Project" : "Create New Project"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {isLoadingProject ? (
          <div className="p-6 space-y-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-neutral-200 rounded"></div>
              <div className="h-10 w-full bg-neutral-100 rounded-xl"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-neutral-200 rounded"></div>
              <div className="h-24 w-full bg-neutral-100 rounded-xl"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-100 rounded-xl"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-100 rounded-xl"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto p-6">
            <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Project Name <span className="text-red-500">*</span>
                </label>
              <input
                {...register("name")}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Enter project name"
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Enter project description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("startDate")}
                  type="date"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  End Date
                </label>
                <input
                  {...register("endDate")}
                  type="date"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-sm font-medium text-neutral-700 flex justify-between items-center">
                <span>Assign to project</span>
                <a href="/team" className="text-brand hover:underline text-xs" target="_blank" rel="noreferrer">Manage Teams</a>
              </label>
              
              <div 
                className={cn(
                  "w-full px-4 py-2.5 border rounded-xl text-sm cursor-text flex items-center justify-between",
                  isDropdownOpen ? "border-brand ring-2 ring-brand/20 bg-white" : "border-neutral-200 bg-white"
                )}
                onClick={() => setIsDropdownOpen(true)}
              >
                <div className="flex-1 truncate">
                  {selectedTeams.length === 0 && selectedMembers.length === 0 ? (
                    <span className="text-neutral-500">Search for members or teams...</span>
                  ) : (
                    <span className="text-neutral-900 font-medium">
                      {selectedTeams.length} Team{selectedTeams.length !== 1 && "s"}, {selectedMembers.length} Member{selectedMembers.length !== 1 && "s"} selected
                    </span>
                  )}
                </div>
                {isFetchingAssignments && <span className="text-xs text-neutral-400">Loading...</span>}
              </div>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-neutral-100 sticky top-0 bg-white z-10 hidden">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search teams or members..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto p-2">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Type to search..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-brand"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {filteredTeams.length === 0 && filteredMembers.length === 0 && (
                      <div className="text-center py-6 text-sm text-neutral-500">
                        No matches found.
                      </div>
                    )}

                    {filteredTeams.length > 0 && (
                      <div className="mb-3">
                        <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> Teams
                        </div>
                        {filteredTeams.map(team => {
                          const tId = team._id || team.id!;
                          const isSelected = selectedTeams.includes(tId);
                          return (
                            <div 
                              key={tId} 
                              onClick={() => toggleTeam(tId)}
                              className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-neutral-50 rounded-lg cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-brand border-brand text-white" : "border-neutral-300")}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <span className="text-sm font-medium text-neutral-900">{team.name} <span className="text-xs text-neutral-400 font-normal">({team.members.length} members)</span></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredMembers.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Individual Members
                        </div>
                        {filteredMembers.map(member => {
                          const mId = member.id || member._id!;
                          const isOwner = isEditMode && ownerId === mId;
                          const isIndirectlyAssigned = !isOwner && indirectlyAssignedMemberIds.has(mId);
                          const isSelected = isOwner || isIndirectlyAssigned || selectedMembers.includes(mId);
                          const isDisabled = isOwner || isIndirectlyAssigned;
                          return (
                            <div 
                              key={mId} 
                              onClick={() => {
                                if (!isDisabled) toggleMember(mId);
                              }}
                              className={cn(
                                "flex items-center justify-between gap-3 px-2 py-2 rounded-lg cursor-pointer",
                                isDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", 
                                  isSelected ? "bg-brand border-brand text-white" : "border-neutral-300",
                                  isDisabled ? "opacity-50" : ""
                                )}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-neutral-200 border border-white flex items-center justify-center text-[10px] text-neutral-600 font-medium overflow-hidden shrink-0">
                                  {member.avatarUrl && looksLikeUrl(member.avatarUrl) ? (
                                    <Image
                                      src={member.avatarUrl}
                                      alt={`${member.firstName} ${member.lastName}`}
                                      width={24}
                                      height={24}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <span>{(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}</span>
                                  )}
                                </div>
                                <span className="text-sm text-neutral-900">{member.firstName} {member.lastName}</span>
                              </div>
                              {isOwner ? (
                                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md shrink-0">Owner</span>
                              ) : isIndirectlyAssigned ? (
                                <span className="text-xs text-neutral-500 italic bg-neutral-100 px-2 py-0.5 rounded-md shrink-0">via team</span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        )}
        
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 shrink-0 bg-neutral-50/50 rounded-b-2xl">
          {isEditMode && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this project? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    onDelete(project.id || project._id);
                    onClose();
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div /> // Spacer
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoadingProject || isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="project-form" disabled={isLoadingProject || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
