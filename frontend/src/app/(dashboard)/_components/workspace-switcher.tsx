"use client";

import { useAuth } from "@/lib/auth-provider";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Settings, Plus, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  membersCount: number;
}

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { user, login } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<{ workspaces: WorkspaceInfo[] }>("/auth/workspaces/me");
      setWorkspaces(data.workspaces);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === user?.activeWorkspace) return;
    try {
      setIsLoading(true);
      const { workspace, user: updatedUser } = await apiRequest<{
        workspace: { id: string; name: string };
        user: any;
      }>("/auth/workspaces/switch", {
        method: "POST",
        data: { workspaceId },
      });

      // Update the user via auth provider which will automatically refresh dashboard
      // However we only get workspace back here from switch API, we'll just reload the page for full sync
      window.location.href = "/projects";
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const activeWorkspaceInfo = workspaces.find((w) => w.id === user?.activeWorkspace);
  const activeName = activeWorkspaceInfo?.name || user?.workspaceName || "Workspace";

  return (
    <DropdownMenu onOpenChange={(open) => open && fetchWorkspaces()}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center w-full rounded-xl transition-all duration-200 outline-none select-none",
            collapsed
              ? "justify-center p-2 mt-4 hover:bg-neutral-100"
              : "gap-3 px-3 py-3 mt-4 mx-2 border border-transparent hover:bg-neutral-100 max-w-[calc(100%-16px)]"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-white font-medium text-sm shrink-0">
            {getInitials(activeName)}
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 items-start text-sm truncate">
                <span className="font-semibold text-neutral-900 truncate w-full text-left">
                  {activeName}
                </span>
                <span className="text-xs text-neutral-500 truncate w-full text-left">
                  {user?.workspaceRole === "ADMIN" ? "Admin" : "Member"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={collapsed ? "right" : "bottom"}
        sideOffset={8}
        className="w-64 p-2 rounded-xl"
      >
        <DropdownMenuLabel className="text-xs text-neutral-500 font-medium px-2 py-1.5 uppercase tracking-wider">
          Workspaces
        </DropdownMenuLabel>
        {isLoading && workspaces.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors focus:bg-neutral-100"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-md font-medium text-sm shrink-0",
                    ws.id === user?.activeWorkspace
                      ? "bg-brand text-white"
                      : "bg-neutral-100 text-neutral-700"
                  )}
                >
                  {getInitials(ws.name)}
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {ws.name}
                  </span>
                  <span className="text-xs text-neutral-500 truncate">
                    {ws.role === "ADMIN" ? "Admin" : "Member"}
                  </span>
                </div>
                {ws.id === user?.activeWorkspace && (
                  <Check className="w-4 h-4 text-brand shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer rounded-lg text-neutral-700 focus:bg-neutral-100"
          onClick={() => router.push("/workspaces")}
        >
          <div className="flex items-center justify-center w-8 h-8 shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          Manage workspaces
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer rounded-lg text-brand focus:bg-secondary focus:text-secondary-foreground"
          onClick={() => router.push("/create-workspace")}
        >
          <div className="flex items-center justify-center w-8 h-8 shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          Create new workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
