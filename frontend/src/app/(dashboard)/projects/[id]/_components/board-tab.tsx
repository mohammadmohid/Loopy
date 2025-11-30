"use client";

import React, { useState } from "react";
import {
  Plus,
  MoreVertical,
  Calendar,
  X,
  Check,
  Trash2,
  Edit2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

// ... (Interface definitions remain similar, add isLocked to BoardColumn)

export function BoardTab({
  tasks,
  columns,
  onTaskClick,
  onTaskUpdate,
  onColumnsUpdate,
  canEdit,
}: BoardTabProps) {
  // ... existing state ...
  const [editingColumnColor, setEditingColumnColor] = useState("");

  const colorOptions = [
    "bg-neutral-200",
    "bg-red-200",
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
  ];

  const handleUpdateColumnColor = (colId: string, color: string) => {
    onColumnsUpdate(columns.map((c) => (c.id === colId ? { ...c, color } : c)));
  };

  // ... (Drag handlers remain same)

  return (
    <div className="space-y-4">
      {/* ... Add Column Button ... */}

      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-neutral-50 rounded-xl p-4 min-w-[300px] w-[300px] flex-shrink-0 flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Color Circle Trigger */}
                <div className="relative group/color">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full cursor-pointer",
                      column.color
                    )}
                  />

                  {/* Color Picker Popover (Simplified) */}
                  {canEdit && !column.isLocked && (
                    <div className="absolute top-full left-0 mt-2 bg-white p-2 rounded shadow-lg hidden group-hover/color:flex gap-1 z-50">
                      {colorOptions.map((c) => (
                        <div
                          key={c}
                          className={cn(
                            "w-4 h-4 rounded-full cursor-pointer hover:scale-110 transition-transform",
                            c
                          )}
                          onClick={() => handleUpdateColumnColor(column.id, c)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <span className="font-medium text-neutral-900">
                  {column.label}
                </span>
                <span className="text-sm text-neutral-500">
                  ({tasks.filter((t) => t.status === column.id).length})
                </span>
              </div>

              {/* Lock Icon or Edit Actions */}
              {column.isLocked ? (
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                canEdit && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Task list rendering (same as before) */}
            {/* ... */}
          </div>
        ))}
      </div>
    </div>
  );
}
