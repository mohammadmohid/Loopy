"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Pin,
  CornerDownLeft,
  FolderKanban,
  Video,
  MessageCircle,
  Folder,
  Loader2,
  File as FileIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { apiRequest } from "@/lib/api";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [results, setResults] = useState({
    chats: [] as any[],
    files: [] as any[],
    projects: [] as any[],
    meetings: [] as any[],
    tasks: [] as any[],
  });

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults({ chats: [], files: [], projects: [], meetings: [], tasks: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ chats: [], files: [], projects: [], meetings: [], tasks: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const [chatRes, fileRes, projectRes, meetingRes, taskRes] = await Promise.allSettled([
          apiRequest<{ results: any[] }>(`/chat/search?q=${encodeURIComponent(searchQuery)}`),
          apiRequest<{ files: any[] }>(`/files?search=${encodeURIComponent(searchQuery)}`),
          apiRequest<any[]>("/projects"),
          apiRequest<any[]>("/meetings"),
          apiRequest<any[]>(`/projects/tasks/search?q=${encodeURIComponent(searchQuery)}`),
        ]);

        const chats = chatRes.status === "fulfilled" ? chatRes.value.results : [];
        const files = fileRes.status === "fulfilled" ? fileRes.value.files : [];
        const tasks = taskRes.status === "fulfilled" ? taskRes.value : [];
        
        let projects = projectRes.status === "fulfilled" ? projectRes.value : [];
        projects = projects.filter((p: any) => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        let meetings = meetingRes.status === "fulfilled" ? meetingRes.value : [];
        meetings = meetings.filter((m: any) => 
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          m.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setResults({ chats, files, projects, meetings, tasks });
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    router.push(url);
  };

  const hasResults =
    results.chats.length > 0 ||
    results.files.length > 0 ||
    results.projects.length > 0 ||
    results.meetings.length > 0 ||
    results.tasks.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Global Search across files, tasks, meetings and chats"
      showCloseButton={false}
      className="max-w-2xl"
    >
      <CommandInput
        placeholder="Search files, projects, meetings, tasks or chats..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[500px]">
        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        )}

        {!loading && searchQuery && !hasResults && (
          <CommandEmpty>No results found for "{searchQuery}".</CommandEmpty>
        )}

        {!loading && !searchQuery && (
          <div className="p-4 text-center text-sm text-neutral-500">
            Start typing to search globally.
          </div>
        )}

        {!loading && hasResults && (
          <>
            {results.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {results.projects.map((project: any) => (
                  <CommandItem
                    key={`project-${project._id}`}
                    onSelect={() => handleSelect(`/projects/${project._id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <FolderKanban className="w-4 h-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-neutral-500 truncate max-w-sm">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {results.tasks.map((task: any) => (
                  <CommandItem
                    key={`task-${task._id}`}
                    onSelect={() => handleSelect(`/projects/${task.projectId?._id || task.projectId}?taskId=${task._id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <CornerDownLeft className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{task.title}</span>
                      <span className="text-xs text-neutral-500 truncate max-w-sm">
                        Project: {task.projectId?.name || "Unknown"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.files.length > 0 && (
              <CommandGroup heading="Files">
                {results.files.map((file: any) => (
                  <CommandItem
                    key={`file-${file._id}`}
                    onSelect={() => handleSelect(`/files?fileId=${file._id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <FileIcon className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{file.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.meetings.length > 0 && (
              <CommandGroup heading="Meetings">
                {results.meetings.map((meeting: any) => (
                  <CommandItem
                    key={`meeting-${meeting._id}`}
                    onSelect={() => handleSelect(`/meetings`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-amber-600" />
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{meeting.title}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(meeting.startTime).toLocaleString()}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.chats.length > 0 && (
              <CommandGroup heading="Chats">
                {results.chats.map((msg: any) => (
                  <CommandItem
                    key={`chat-${msg._id}`}
                    onSelect={() => handleSelect(`/chat?channelId=${msg.channelId?._id || msg.channelId}&messageId=${msg._id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-red-600" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-neutral-900 text-sm truncate">
                        {msg.content}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                        <span className="font-semibold text-neutral-700">
                          {msg.sender?.profile?.firstName}
                        </span>
                        {msg.channelId?.name && (
                          <>
                            <span>in</span>
                            <span className="bg-neutral-100 px-1 rounded text-neutral-600">
                              #{msg.channelId.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-center w-5 h-5 bg-neutral-200 rounded">
          <CornerDownLeft className="w-3 h-3 text-neutral-600" />
        </div>
        <span className="text-xs text-neutral-600">Select</span>
      </div>
    </CommandDialog>
  );
}
