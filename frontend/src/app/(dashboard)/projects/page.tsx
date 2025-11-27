"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./_components/project-card";
import { CreateProjectModal } from "./_components/create-project-modal";
import { Search, Plus, Pin, ChevronDown } from "lucide-react";

// Mock data for projects
const mockProjects = [
  {
    id: "1",
    name: "Website Redesign",
    owner: { name: "John Doe", avatar: "JD" },
    dueDate: "Dec 15, 2025",
    isPinned: true,
    color: "#EF4444",
  },
  {
    id: "2",
    name: "Mobile App Development",
    owner: { name: "Jane Smith", avatar: "JS" },
    dueDate: "Jan 20, 2026",
    isPinned: true,
    color: "#3B82F6",
  },
  {
    id: "3",
    name: "Marketing Campaign",
    owner: { name: "Mike Johnson", avatar: "MJ" },
    dueDate: "Dec 30, 2025",
    isPinned: true,
    color: "#10B981",
  },
  {
    id: "4",
    name: "Product Launch",
    owner: { name: "Sarah Wilson", avatar: "SW" },
    dueDate: "Feb 15, 2026",
    isPinned: false,
    color: "#F59E0B",
  },
  {
    id: "5",
    name: "API Integration",
    owner: { name: "Tom Brown", avatar: "TB" },
    dueDate: "Jan 10, 2026",
    isPinned: false,
    color: "#8B5CF6",
  },
  {
    id: "6",
    name: "Database Migration",
    owner: { name: "Emily Davis", avatar: "ED" },
    dueDate: "Dec 20, 2025",
    isPinned: false,
    color: "#EC4899",
  },
];

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projects, setProjects] = useState(mockProjects);

  const pinnedProjects = projects.filter((p) => p.isPinned);
  const allProjects = projects.filter((p) => !p.isPinned);

  const filteredPinned = pinnedProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAll = allProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePin = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isPinned: !p.isPinned } : p
      )
    );
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search Projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <FilterDropdown label="Owner" />
        <FilterDropdown label="Team" />
        <FilterDropdown label="Members" />
      </div>

      {/* Pinned Projects */}
      {filteredPinned.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 mb-4">
            <Pin className="w-4 h-4 text-primary" />
            Pinned Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPinned.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Projects */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-900 mb-4">
          All Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAll.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      </section>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={(newProject) => {
          setProjects((prev) => [
            ...prev,
            { ...newProject, id: String(Date.now()), isPinned: false },
          ]);
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
      {label}
      <ChevronDown className="w-4 h-4 text-neutral-400" />
    </button>
  );
}
