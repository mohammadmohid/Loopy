"use client";

import Link from "next/link";
import { Clock, MoreVertical, Pin, Trash2, Edit } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
} from "@/components/ui/alert-dialog";

interface ProjectMember {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

interface Project {
  id: string;
  name: string;
  owner: { name: string; avatar: string };
  dueDate: string;
  isPinned: boolean;
  members?: ProjectMember[];
}

interface ProjectCardProps {
  project: Project;
  onTogglePin: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  onTogglePin,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
            <div className="absolute right-0 top-8 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
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
              <button
                onClick={() => {
                  onEdit(project.id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  setIsDeleteDialogOpen(true);
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(project.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Owner */}
      <div className="mb-3">
        <p className="text-xs text-neutral-500 mb-1">Owner</p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600">
            {project.owner.avatar && (
              looksLikeUrl(project.owner.avatar) ? (
                <Image
                  src={project.owner.avatar}
                  alt={`${project.owner.name}'s avatar`}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <span className="select-none">{project.owner.avatar}</span>
              )
            )}
          </div>
          <span className="text-sm text-neutral-700">{project.owner.name}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-neutral-100">
        {/* Due Date */}
        <div className="flex items-center gap-1.5 text-neutral-500">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-medium">{project.dueDate}</span>
        </div>

        {/* Member Avatars */}
        {project.members && project.members.length > 0 && (
          <div className="flex items-center -space-x-2">
            {project.members.slice(0, 3).map((member, i) => (
              <div
                key={member.id}
                className="w-7 h-7 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-medium text-neutral-600 relative overflow-hidden"
                style={{ zIndex: 10 - i }}
                title={member.name}
              >
                {member.avatarUrl && looksLikeUrl(member.avatarUrl) ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{member.initials}</span>
                )}
              </div>
            ))}
            {project.members.length > 3 && (
              <div
                className="w-7 h-7 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[10px] font-medium text-neutral-600 relative z-0"
                title={`${project.members.length - 3} more members`}
              >
                +{project.members.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
