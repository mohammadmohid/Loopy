"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Loader2, Folder, Calendar, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProjectModal } from "./_components/project-modal";
import { ProjectCard } from "./_components/project-card";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";

interface ProjectMember {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

interface Project {
  _id: string;
  id: string;
  name: string;
  description?: string;
  owner: {
    name: string;
    avatar: string;
  };
  startDate?: string;
  rawEndDate?: string;
  dueDate: string;
  isPinned: boolean;
  members?: ProjectMember[];
}

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const role = user?.workspaceRole;

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<any[]>("/projects");

      const mappedProjects: Project[] = data.map((p) => {
        // SAFETY: Handle missing owner or missing profile
        // If owner is populated it's an object, if not it's an ID string (or null)
        const ownerObj =
          typeof p.owner === "object" && p.owner !== null ? p.owner : null;
        const profile = ownerObj?.profile;

        return {
          _id: p._id,
          id: p._id,
          name: p.name,
          description: p.description,
          owner: {
            name: profile
              ? `${profile.firstName} ${profile.lastName}`
              : "Unknown User",
            avatar: profile
              ? (profile.firstName[0] + profile.lastName[0]).toUpperCase()
              : "NA",
          },
          startDate: p.startDate,
          rawEndDate: p.endDate,
          dueDate: p.endDate
            ? new Date(p.endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            : "No Date",
          isPinned: false,
          members: Array.isArray(p.members)
            ? p.members
              .filter((m: any) => m.user && m.user.profile)
              .map((m: any) => {
                const prof = m.user.profile;
                return {
                  id: m.user._id,
                  name: `${prof.firstName || ""} ${prof.lastName || ""}`.trim(),
                  avatarUrl: prof.avatarUrl,
                  initials: prof.firstName ? (prof.firstName[0] + (prof.lastName ? prof.lastName[0] : "")).toUpperCase() : "NA",
                };
              })
            : [],
        };
      });

      setProjects(mappedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectSuccess = (projectData: any) => {
    fetchProjects();
    setIsCreateOpen(false);
    setEditingProjectId(null);
  };

  const handleTogglePin = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isPinned: !p.isPinned } : p
      )
    );
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiRequest(`/projects/${projectId}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStartDate = true;
    if (filterStartDate) {
      matchesStartDate = p.startDate ? new Date(p.startDate) >= new Date(filterStartDate) : false;
    }
    
    let matchesEndDate = true;
    if (filterEndDate) {
      matchesEndDate = p.rawEndDate ? new Date(p.rawEndDate) <= new Date(filterEndDate) : false;
    }

    let matchesAssignee = true;
    if (filterAssignees.length > 0) {
      matchesAssignee = Boolean(p.members?.some(m => filterAssignees.includes(m.id)));
    }

    return matchesSearch && matchesStartDate && matchesEndDate && matchesAssignee;
  });

  // Extract unique members for filter dropdown
  const availableMembers = Array.from(
    new Map(
      projects.flatMap((p) => (p.members || []).map((m) => [m.id, m]))
    ).values()
  );

  const activeFilterCount = (filterStartDate ? 1 : 0) + (filterEndDate ? 1 : 0) + (filterAssignees.length > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage your ongoing projects and track progress
          </p>
        </div>
        {(role != "MEMBER") && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-primary shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )
        }
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white text-neutral-600 border-neutral-200 relative"
            >
              <Filter className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <h4 className="font-medium text-sm text-neutral-900">Filter Projects</h4>
                {activeFilterCount > 0 && (
                  <button 
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterAssignees([]);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Start Date (After)
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> End Date (Before)
                  </label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Assignees
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-neutral-200 rounded-lg bg-neutral-50/50 p-1">
                    {availableMembers.length === 0 ? (
                      <div className="text-xs text-neutral-500 p-2 text-center">No members found</div>
                    ) : (
                      availableMembers.map(member => {
                        const isSelected = filterAssignees.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => {
                              setFilterAssignees(prev => 
                                isSelected ? prev.filter(id => id !== member.id) : [...prev, member.id]
                              )
                            }}
                            className="flex items-center gap-2 p-1.5 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-neutral-300'}`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className="text-xs text-neutral-700">{member.name}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onTogglePin={handleTogglePin}
              onEdit={(pId) => setEditingProjectId(pId)}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
            <Folder className="w-6 h-6 text-neutral-400" />
          </div>
          <p className="font-medium text-neutral-900">No projects found</p>
          <p className="text-sm text-neutral-500">
            Create a new project to get started
          </p>
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={isCreateOpen || !!editingProjectId}
        onClose={() => { setIsCreateOpen(false); setEditingProjectId(null); }}
        onSuccess={handleProjectSuccess}
        onDelete={handleDeleteProject}
        projectIdToEdit={editingProjectId || undefined}
      />
    </div>
  );
}
