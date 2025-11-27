"use client";

import Link from "next/link";
import { Clock, MoreVertical, Pin, Trash2, Edit } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  owner: { name: string; avatar: string };
  dueDate: string;
  isPinned: boolean;
  color: string;
}

interface ProjectCardProps {
  project: Project;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  onTogglePin,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-3 flex-1"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.color + "20" }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          </div>
          <span className="font-medium text-neutral-900 group-hover:text-primary transition-colors">
            {project.name}
          </span>
        </Link>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-neutral-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  onTogglePin(project.id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Pin className="w-4 h-4" />
                {project.isPinned ? "Unpin" : "Pin"}
              </button>
              <Link
                href={`/projects/${project.id}/edit`}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => {
                  onDelete(project.id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Owner */}
      <div className="mb-3">
        <p className="text-xs text-neutral-500 mb-1">Owner</p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600">
            {project.owner.avatar}
          </div>
          <span className="text-sm text-neutral-700">{project.owner.name}</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="flex items-center gap-2 text-neutral-500">
        <Clock className="w-4 h-4" />
        <span className="text-sm">Due: {project.dueDate}</span>
      </div>
    </div>
  );
}
