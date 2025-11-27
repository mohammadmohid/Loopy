"use client";

import type React from "react";

import { useState, useMemo } from "react";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface TasksListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const tabs = ["Upcoming", "In Progress", "Completed", "Assigned (8)"];

const priorityBadgeColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export function TasksList({ tasks, onTaskClick }: TasksListProps) {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAll, setFilterAll] = useState("All");

  // Filter tasks based on tab and search
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Tab filter
    if (activeTab === "Upcoming") {
      filtered = filtered.filter((t) => t.status === "todo");
    } else if (activeTab === "In Progress") {
      filtered = filtered.filter((t) => t.status === "in-progress");
    } else if (activeTab === "Completed") {
      filtered = filtered.filter((t) => t.status === "done");
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [tasks, activeTab, searchQuery]);

  // Group tasks by time
  const todayTasks = filteredTasks.slice(0, 3);
  const weekTasks = filteredTasks.slice(3, 5);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900">Tasks</h3>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          </div>
          <button className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
            {filterAll}
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                activeTab === tab
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Today */}
        {todayTasks.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium text-neutral-500 mb-3">Today</p>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* This Week */}
        {weekTasks.length > 0 && (
          <div className="p-4 pt-0">
            <p className="text-xs font-medium text-neutral-500 mb-3">
              This Week
            </p>
            <div className="space-y-2">
              {weekTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="p-8 text-center text-neutral-500 text-sm">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const [completed, setCompleted] = useState(task.status === "done");

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleted(!completed);
  };

  // Status indicator colors
  const statusDotColors = {
    done: "bg-amber-500",
    "in-progress": "bg-emerald-500",
    todo: "bg-red-500",
  };

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group cursor-pointer"
    >
      <button
        onClick={handleCheckboxClick}
        className={cn(
          "mt-0.5 flex-shrink-0 transition-colors",
          completed
            ? "text-emerald-500"
            : "text-neutral-300 hover:text-neutral-400"
        )}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "font-medium text-sm transition-all",
              completed ? "text-neutral-400 line-through" : "text-neutral-900"
            )}
          >
            {task.title}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              priorityBadgeColors[task.priority]
            )}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </div>
        <p className="text-xs text-neutral-500">Project | Milestone</p>
      </div>

      <div className="w-7 h-7 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600 flex-shrink-0">
        {task.assignee?.avatar || "MM"}
      </div>
    </div>
  );
}
