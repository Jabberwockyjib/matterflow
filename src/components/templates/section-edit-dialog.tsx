"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TemplateSection } from "@/lib/document-templates/types";

interface SectionEditDialogProps {
  section: TemplateSection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: { name: string; content: string }) => void;
}

export function SectionEditDialog({
  section,
  open,
  onOpenChange,
  onSave,
}: SectionEditDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  // Reset form when section changes
  useEffect(() => {
    if (section) {
      setName(section.name);
      setContent(section.content);
    }
  }, [section]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), content });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>
            Modify the section name and content. Use placeholders like{" "}
            {`{{field_name}}`} for dynamic content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Introduction, Terms of Service"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-content">Content</Label>
            <Textarea
              id="section-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the section content..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Tip: Use {`{{placeholder_name}}`} for fields that will be
              auto-filled from intake forms or entered manually.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
