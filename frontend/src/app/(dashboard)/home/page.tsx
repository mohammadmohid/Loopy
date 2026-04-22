"use client";

import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ListTodo,
  Activity,
  Users,
  Layers,
  Plus,
  UserPlus,
  TrendingUp,
  Calendar,
  Target,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────
interface DashboardKPIs {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  totalMembers?: number;
  totalTeams?: number;
}

interface DashboardProject {
  _id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  owner: any;
  members: any[];
}

interface DashboardTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  dueDate?: string;
  projectId: string;
  assignees: any[];
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  targetName: string;
  projectId: string;
  timestamp: string;
  user: string;
}

interface DashboardData {
  kpis: DashboardKPIs;
  projects: DashboardProject[];
  myTasks: DashboardTask[];
  recentActivity: ActivityItem[];
  projectMap: Record<string, string>;
}

// ─── Helper Components ──────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color = "primary",
  subtitle,
}: {
  label: string;
  value: number;
  icon: any;
  color?: "primary" | "emerald" | "blue" | "amber" | "red" | "violet";
  subtitle?: string;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover-lift group">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            colorMap[color]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-3xl font-bold text-neutral-900 tabular-nums">
          {value}
        </span>
      </div>
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      {subtitle && (
        <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function TaskRow({
  task,
  projectName,
}: {
  task: DashboardTask;
  projectName?: string;
}) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    todo: { color: "bg-neutral-200 text-neutral-600", label: "To Do" },
    "in-progress": {
      color: "bg-blue-100 text-blue-700",
      label: "In Progress",
    },
    done: { color: "bg-emerald-100 text-emerald-700", label: "Done" },
  };
  const priorityConfig: Record<
    string,
    { color: string; dot: string }
  > = {
    high: { color: "text-red-600", dot: "bg-red-500" },
    medium: { color: "text-amber-600", dot: "bg-amber-500" },
    low: { color: "text-neutral-500", dot: "bg-neutral-400" },
  };

  const status = statusConfig[task.status] || statusConfig.todo;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "done";

  return (
    <Link
      href={`/projects/${task.projectId}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors rounded-lg group/row"
    >
      <div className={cn("w-2 h-2 rounded-full shrink-0", priority.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate group-hover/row:text-primary transition-colors">
          {task.title}
        </p>
        {projectName && (
          <p className="text-xs text-neutral-400 truncate">{projectName}</p>
        )}
      </div>
      {task.dueDate && (
        <span
          className={cn(
            "text-xs font-medium shrink-0",
            isOverdue ? "text-red-600" : "text-neutral-400"
          )}
        >
          {isOverdue && (
            <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
          )}
          {new Date(task.dueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      )}
      <span
        className={cn(
          "text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0",
          status.color
        )}
      >
        {status.label}
      </span>
    </Link>
  );
}

function ProjectMiniCard({ project }: { project: DashboardProject }) {
  const ownerName =
    project.owner?.profile
      ? `${project.owner.profile.firstName} ${project.owner.profile.lastName}`
      : "Unknown";

  return (
    <Link
      href={`/projects/${project._id}`}
      className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover-lift group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <FolderKanban className="w-4 h-4" />
        </div>
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full",
            project.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : project.status === "completed"
                ? "bg-blue-50 text-blue-700"
                : "bg-neutral-100 text-neutral-600"
          )}
        >
          {project.status}
        </span>
      </div>
      <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary transition-colors">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
        <span className="text-xs text-neutral-400">
          {ownerName}
        </span>
        {project.endDate && (
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(project.endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
      {/* Member avatars */}
      {project.members && project.members.length > 0 && (
        <div className="flex -space-x-2 mt-3">
          {project.members.slice(0, 5).map((m: any, i: number) => {
            const user = m.user;
            const initials = user?.profile
              ? `${user.profile.firstName?.[0] || ""}${user.profile.lastName?.[0] || ""}`
              : "?";
            return (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-500"
                title={
                  user?.profile
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : "Member"
                }
              >
                {initials.toUpperCase()}
              </div>
            );
          })}
          {project.members.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-500">
              +{project.members.length - 5}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

function ActivityRow({ item, projectMap }: { item: ActivityItem; projectMap: Record<string, string> }) {
  const actionConfig: Record<
    string,
    { icon: any; color: string; label: string }
  > = {
    created: {
      icon: Plus,
      color: "bg-emerald-100 text-emerald-600",
      label: "created",
    },
    updated: {
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-600",
      label: "updated",
    },
    completed: {
      icon: CheckCircle2,
      color: "bg-primary/10 text-primary",
      label: "completed",
    },
  };

  const config = actionConfig[item.action] || actionConfig.updated;
  const Icon = config.icon;
  const projectName = projectMap[item.projectId] || "";

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          config.color
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700">
          <span className="font-medium text-neutral-900">{item.user}</span>{" "}
          {config.label}{" "}
          <span className="font-medium text-neutral-900">
            {item.targetName}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-neutral-400">
            {formatTimeAgo(item.timestamp)}
          </span>
          {projectName && (
            <span className="text-[11px] text-neutral-400">
              • {projectName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-neutral-400" />
      </div>
      <p className="font-medium text-neutral-900 text-sm">{title}</p>
      <p className="text-xs text-neutral-500 mt-1">{description}</p>
    </div>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────────────

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data, error, isLoading } = useSWR<DashboardData>("/projects/dashboard", fetcher as any);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user || !data) return null;

  const displayName =
    user.profile?.firstName || user.profile?.lastName
      ? [user.profile?.firstName, user.profile?.lastName]
          .filter(Boolean)
          .join(" ")
      : user.email || "User";

  const role = user.workspaceRole || "MEMBER";
  const isAdmin = role === "ADMIN";
  const isPM = role === "PROJECT_MANAGER";
  const isMember = role === "MEMBER";

  const roleLabel = isAdmin
    ? "Administrator"
    : isPM
      ? "Project Manager"
      : "Team Member";
  const roleBadgeColor = isAdmin
    ? "bg-violet-100 text-violet-700"
    : isPM
      ? "bg-blue-100 text-blue-700"
      : "bg-emerald-100 text-emerald-700";

  const { kpis, projects, myTasks, recentActivity, projectMap } = data;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {greeting}, {displayName}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-neutral-500 text-sm">
              Here&apos;s your workspace overview
            </p>
            <span
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                roleBadgeColor
              )}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {(isAdmin || isPM) && (
          <div className="flex items-center gap-2">
            <Link href="/projects">
              <Button
                variant="outline"
                className="gap-2 h-9 text-sm bg-white border-neutral-200"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/team">
                <Button className="gap-2 h-9 text-sm">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={isMember ? "My Projects" : "Total Projects"}
          value={kpis.totalProjects}
          icon={FolderKanban}
          color="primary"
          subtitle={
            !isMember
              ? `${kpis.activeProjects} active`
              : undefined
          }
        />
        <KpiCard
          label="Completed"
          value={kpis.completedTasks}
          icon={CheckCircle2}
          color="emerald"
          subtitle={`of ${kpis.totalTasks} tasks`}
        />
        <KpiCard
          label="In Progress"
          value={kpis.inProgressTasks}
          icon={Clock}
          color="blue"
          subtitle={
            kpis.dueSoonTasks > 0
              ? `${kpis.dueSoonTasks} due soon`
              : undefined
          }
        />
        <KpiCard
          label="Overdue"
          value={kpis.overdueTasks}
          icon={AlertTriangle}
          color={kpis.overdueTasks > 0 ? "red" : "emerald"}
          subtitle={
            kpis.overdueTasks > 0 ? "Needs attention" : "All on track"
          }
        />
      </div>

      {/* ── Admin/PM Workspace Stats ────────────────────────── */}
      {(isAdmin || isPM) && kpis.totalTeams !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Workspace Members"
            value={kpis.totalMembers || 0}
            icon={Users}
            color="violet"
          />
          <KpiCard
            label="Teams"
            value={kpis.totalTeams || 0}
            icon={Layers}
            color="blue"
          />
          <KpiCard
            label="To Do"
            value={kpis.todoTasks}
            icon={ListTodo}
            color="amber"
          />
          <KpiCard
            label="Completion Rate"
            value={
              kpis.totalTasks > 0
                ? Math.round(
                    (kpis.completedTasks / kpis.totalTasks) * 100
                  )
                : 0
            }
            icon={Target}
            color="emerald"
            subtitle="% of all tasks"
          />
        </div>
      )}

      {/* ── Main Content Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Tasks (spanning 2 cols on large) */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Tasks */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-neutral-900">
                  {isMember ? "My Tasks" : "Your Assigned Tasks"}
                </h2>
                {myTasks.length > 0 && (
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {myTasks.length}
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-neutral-50">
              {myTasks.length > 0 ? (
                myTasks.map((task) => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    projectName={projectMap[task.projectId]}
                  />
                ))
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="All caught up!"
                  description="No tasks assigned to you right now."
                />
              )}
            </div>
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-neutral-900">
                  {isMember ? "My Projects" : "Recent Projects"}
                </h2>
              </div>
              <Link
                href="/projects"
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <ProjectMiniCard
                    key={project._id}
                    project={project}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm">
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description={
                    isMember
                      ? "You haven't been assigned to any projects."
                      : "Create your first project to get started."
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-neutral-900">
                Recent Activity
              </h2>
            </div>
            <div className="px-4 py-2">
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                  {recentActivity.map((item) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      projectMap={projectMap}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Activity will appear here as your team works."
                />
              )}
            </div>
          </div>

          {/* Task Breakdown Mini-Chart (visual bar) */}
          {kpis.totalTasks > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <CircleDot className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-neutral-900">
                  Task Breakdown
                </h2>
              </div>

              {/* Progress bar */}
              <div className="flex rounded-full h-3 overflow-hidden bg-neutral-100 mb-4">
                {kpis.completedTasks > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(kpis.completedTasks / kpis.totalTasks) * 100}%`,
                    }}
                  />
                )}
                {kpis.inProgressTasks > 0 && (
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${(kpis.inProgressTasks / kpis.totalTasks) * 100}%`,
                    }}
                  />
                )}
                {kpis.todoTasks > 0 && (
                  <div
                    className="bg-neutral-300 transition-all duration-500"
                    style={{
                      width: `${(kpis.todoTasks / kpis.totalTasks) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-neutral-600">Completed</span>
                  </div>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {kpis.completedTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-neutral-600">In Progress</span>
                  </div>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {kpis.inProgressTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neutral-300" />
                    <span className="text-neutral-600">To Do</span>
                  </div>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {kpis.todoTasks}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
