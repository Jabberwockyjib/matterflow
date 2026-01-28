"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import { SectionEditDialog } from "./section-edit-dialog";
import type { TemplateSection } from "@/lib/document-templates/types";

interface SectionListProps {
  sections: TemplateSection[];
  onUpdate: (sectionId: string, updates: { name?: string; content?: string }) => void;
  onDelete: (sectionId: string) => void;
  onReorder: (sectionIds: string[]) => void;
  onAdd: () => void;
}

export function SectionList({
  sections,
  onUpdate,
  onDelete,
  onReorder,
  onAdd,
}: SectionListProps) {
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Add a small delay for visual feedback
    setTimeout(() => {
      e.currentTarget.classList.add("dragging");
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Reorder sections
      const newSections = [...sections];
      const [removed] = newSections.splice(dragIndex, 1);
      newSections.splice(dragOverIndex, 0, removed);
      onReorder(newSections.map((s) => s.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleEdit = (section: TemplateSection) => {
    setEditingSection(section);
  };

  const handleSaveEdit = (updates: { name: string; content: string }) => {
    if (editingSection) {
      onUpdate(editingSection.id, updates);
      setEditingSection(null);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600 mb-4">No sections defined yet.</p>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Section
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          index={index}
          onEdit={() => handleEdit(section)}
          onDelete={() => onDelete(section.id)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          isDragging={dragIndex === index}
          isDragOver={dragOverIndex === index && dragIndex !== index}
        />
      ))}

      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>

      <SectionEditDialog
        section={editingSection}
        open={editingSection !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSection(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
