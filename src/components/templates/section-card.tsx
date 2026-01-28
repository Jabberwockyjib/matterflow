"use client";

import { useState } from "react";
import { GripVertical, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TemplateSection } from "@/lib/document-templates/types";

interface SectionCardProps {
  section: TemplateSection;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

export function SectionCard({
  section,
  index,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: SectionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  // Truncate content for preview (first 200 chars)
  const contentPreview =
    section.content.length > 200
      ? section.content.slice(0, 200) + "..."
      : section.content;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(e, index);
        }}
        onDragEnd={onDragEnd}
        className={`
          bg-white rounded-lg border border-slate-200 p-4 transition-all
          ${isDragging ? "opacity-50 scale-95" : ""}
          ${isDragOver ? "border-accent border-2 bg-accent/5" : ""}
          hover:shadow-sm
        `}
      >
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 mt-1"
            title="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-500">
                {index + 1}.
              </span>
              <h3 className="font-medium text-slate-900 truncate">
                {section.name}
              </h3>
              {section.isConditional && (
                <Badge variant="default" className="text-xs">
                  Conditional
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
              {contentPreview}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="Edit section"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Section
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{section.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
