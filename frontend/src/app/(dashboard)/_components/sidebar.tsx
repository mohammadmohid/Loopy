"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  FolderKanban,
  Video,
  MessageCircle,
  Folder,
  Activity,
  Users,
  BarChart3,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "@/app/(dashboard)/_components/workspace-switcher";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Meetings", href: "/meetings", icon: Video },
  { label: "Chat", href: "/chat", icon: MessageCircle, badge: 3 },
  { label: "Files", href: "/files", icon: Folder },
  { label: "Meeting Status", href: "/meeting-status", icon: Activity },
  { label: "Team", href: "/team", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

interface SidebarProps {
  collapsed: boolean;
}

const NavItemWrapper = ({
  collapsed,
  children,
  label,
}: {
  collapsed: boolean;
  children: React.ReactNode;
  label: string;
}) => {
  if (!collapsed) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={700}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-neutral-200 text-foreground px-2 py-1"
        >
          <span className="text-xs">{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col bg-background border-r border-neutral-200 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-1">

        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <NavItemWrapper
              collapsed={collapsed}
              key={item.href}
              label={item.label}
            >
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <Icon
                  className={cn("w-5 h-5 shrink-0", isActive && "text-primary")}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-primary text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute left-10 bg-primary text-white text-xs font-semibold px-1 py-0.5 rounded-full min-w-[14px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            </NavItemWrapper>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-2 border-t border-neutral-200">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
