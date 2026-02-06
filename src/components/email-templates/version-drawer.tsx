"use client";

/**
 * Version History Drawer Component
 *
 * Displays version history for an email template and allows restoring previous versions.
 * Uses Sheet component for slide-out drawer UX.
 */

import { useTransition } from "react";
import { History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { restoreEmailTemplateVersion } from "@/lib/email-templates/actions";
import type { EmailTemplateVersion } from "@/lib/email-templates/types";

// ============================================================================
// Types
// ============================================================================

interface VersionDrawerProps {
  templateId: string;
  versions: EmailTemplateVersion[];
  currentVersion?: number;
}

// ============================================================================
// Component
// ============================================================================

export function VersionDrawer({
  templateId,
  versions,
  currentVersion,
}: VersionDrawerProps) {
  const [isPending, startTransition] = useTransition();

  /**
   * Handle restore action for a specific version
   */
  const handleRestore = (version: number) => {
    startTransition(async () => {
      const result = await restoreEmailTemplateVersion(templateId, version);

      if (result.success) {
        toast.success(`Restored to version ${version}`);
      } else {
        toast.error(result.error || "Failed to restore version");
      }
    });
  };

  // Sort versions by version number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Versions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {sortedVersions.length === 0 ? (
            <p className="text-sm text-slate-500">No version history yet.</p>
          ) : (
            sortedVersions.map((version) => {
              const isCurrent = version.version === currentVersion;
              const timeAgo = formatDistanceToNow(new Date(version.createdAt), {
                addSuffix: true,
              });

              return (
                <div
                  key={version.id}
                  className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        Version {version.version}
                      </span>
                      {isCurrent && (
                        <Badge variant="success" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {timeAgo}
                      {version.createdByName && (
                        <span> by {version.createdByName}</span>
                      )}
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version.version)}
                      disabled={isPending}
                    >
                      {isPending ? "Restoring..." : "Restore"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
