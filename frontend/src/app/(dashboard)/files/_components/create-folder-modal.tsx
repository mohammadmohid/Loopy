"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  parentId: string | null;
}

export function CreateFolderModal({ isOpen, onClose, onCreated, parentId }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await apiRequest("/api/files/folders", {
        method: "POST",
        data: { name, parentId }
      });
      toast.success("Folder created successfully");
      onCreated();
      onClose();
      setName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-neutral-600 ml-1">
              Folder Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Design Assets"
              className="h-12 bg-neutral-50 border-neutral-200 rounded-2xl focus:ring-primary/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="rounded-xl h-12 px-8 bg-[#D12B3D] hover:bg-[#B02433]"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
