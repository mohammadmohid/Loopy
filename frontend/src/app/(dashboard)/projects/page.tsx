"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Loader2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectModal } from "./_components/project-modal";
import { ProjectCard } from "./_components/project-card";
import { apiRequest } from "@/lib/api";

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
  dueDate: string;
  isPinned: boolean;
}

export default function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 bg-primary shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
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
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2 bg-white text-neutral-600 border-neutral-200"
        >
          <Filter className="w-4 h-4" />
          Filter
        </Button>
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
