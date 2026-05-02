"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceMemberRow = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

export function AddProjectMembersDialog({
  open,
  onOpenChange,
  projectId,
  existingMembersPayload,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Current project members as API expects: `{ user, role }` */
  existingMembersPayload: { user: string; role: string }[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberRow[]>(
    []
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const memberSet = useMemo(
    () => new Set(existingMembersPayload.map((m) => String(m.user))),
    [existingMembersPayload]
  );

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ members: WorkspaceMemberRow[] }>(
        "/auth/workspaces/members"
      );
      setWorkspaceMembers(Array.isArray(res.members) ? res.members : []);
    } catch (e) {
      console.error(e);
      setWorkspaceMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Set());
      return;
    }
    void loadMembers();
  }, [open, loadMembers]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaceMembers.filter((m) => {
      const id = m.id != null ? String(m.id) : "";
      if (!id || memberSet.has(id)) return false;
      if (!q) return true;
      const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [workspaceMembers, memberSet, query]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    try {
      setSaving(true);
      const additions = [...selected].map((userId) => ({
        user: userId,
        role: "VIEWER",
      }));
      const merged = [...existingMembersPayload, ...additions];
      const seen = new Set<string>();
      const members = merged.filter((row) => {
        const k = String(row.user);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      await apiRequest(`/projects/${projectId}`, {
        method: "PATCH",
        data: { members },
      });

      onOpenChange(false);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not add members");
    } finally {
      setSaving(false);
    }
  };

  const addLabel =
    selected.size === 0
      ? "Add members"
      : selected.size === 1
        ? "Add 1 member"
        : `Add ${selected.size} members`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add project members</DialogTitle>
          <DialogDescription>
            Choose people from your workspace. New members are added with viewer
            access.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>

        <div className="max-h-[280px] overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50/50">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : available.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              {workspaceMembers.length === 0
                ? "No workspace members loaded."
                : "Everyone in your workspace is already on this project, or nothing matches your search."}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {available.map((m) => {
                const id = String(m.id);
                const name =
                  `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                  m.email ||
                  "Member";
                const initials = name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const checked = selected.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        checked
                          ? "bg-primary/10 text-neutral-900"
                          : "text-neutral-700 hover:bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-semibold",
                          checked
                            ? "border-primary ring-2 ring-primary/30 bg-neutral-100 text-neutral-700"
                            : "border-neutral-200 bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {m.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{name}</span>
                        {m.email ? (
                          <span className="block truncate text-xs text-neutral-500">
                            {m.email}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving || selected.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              addLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
