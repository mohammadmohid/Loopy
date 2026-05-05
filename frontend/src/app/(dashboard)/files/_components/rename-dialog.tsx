"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  itemType: "file" | "folder";
  onRename: (newName: string) => void;
  isSubmitting?: boolean;
}

export function RenameDialog({
  isOpen,
  onClose,
  currentName,
  itemType,
  onRename,
  isSubmitting = false,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName) return;
    onRename(name.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Rename {itemType}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="rename"
              className="text-sm font-semibold text-neutral-600 ml-1"
            >
              New Name
            </Label>
            <Input
              id="rename"
              className="h-12 bg-neutral-50 border-neutral-200 rounded-2xl focus:ring-primary/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => {
                // Select filename without extension
                const dotIndex = e.target.value.lastIndexOf(".");
                if (dotIndex > 0 && itemType === "file") {
                  e.target.setSelectionRange(0, dotIndex);
                } else {
                  e.target.select();
                }
              }}
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
              disabled={isSubmitting || !name.trim() || name === currentName}
            >
              {isSubmitting ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
