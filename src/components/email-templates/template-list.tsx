"use client";

/**
 * Template List Component
 *
 * Displays all email templates in a list with enable/disable toggles and edit buttons.
 * Each row shows the template name, last edited time, and allows toggling/editing.
 */

import { useTransition } from "react";
import Link from "next/link";
import { Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toggleEmailTemplate } from "@/lib/email-templates/actions";
import type { EmailTemplate } from "@/lib/email-templates/types";

// ============================================================================
// Types
// ============================================================================

interface TemplateListProps {
  templates: EmailTemplate[];
}

// ============================================================================
// Component
// ============================================================================

export function TemplateList({ templates }: TemplateListProps) {
  const [isPending, startTransition] = useTransition();

  /**
   * Handle toggle switch for enabling/disabling a template
   */
  const handleToggle = (template: EmailTemplate) => {
    startTransition(async () => {
      const result = await toggleEmailTemplate(template.emailType);

      if (!result.success) {
        toast.error(result.error || "Failed to toggle template");
      }
    });
  };

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No email templates found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => {
        const lastEdited = formatDistanceToNow(new Date(template.updatedAt), {
          addSuffix: true,
        });

        return (
          <div
            key={template.id}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            {/* Enable/Disable Switch */}
            <Switch
              checked={template.isEnabled}
              onCheckedChange={() => handleToggle(template)}
              disabled={isPending}
              aria-label={`${template.isEnabled ? "Disable" : "Enable"} ${template.name}`}
            />

            {/* Template Name and Last Edited */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">
                {template.name}
              </p>
              <p className="text-sm text-slate-500">
                Last edited {lastEdited}
              </p>
            </div>

            {/* Edit Button */}
            <Link href={`/settings/email-templates/${template.emailType}`}>
              <Button variant="ghost" size="icon" aria-label={`Edit ${template.name}`}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
