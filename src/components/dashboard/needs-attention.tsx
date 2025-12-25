import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Matter } from "@/lib/data/queries";
import { formatDueDate } from "@/lib/utils";

interface NeedsAttentionProps {
  awaitingReview: Matter[];
  overdue: Matter[];
}

export function NeedsAttention({ awaitingReview, overdue }: NeedsAttentionProps) {
  const today = new Date();
  const totalItems = awaitingReview.length + overdue.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <ContentCard className="border-amber-200 dark:border-amber-800">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Needs Your Attention ({totalItems})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        {awaitingReview.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              Awaiting Your Review ({awaitingReview.length})
            </h3>
            <div className="space-y-3">
              {awaitingReview.map((matter) => (
                <div
                  key={matter.id}
                  className="rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {matter.clientName} - {matter.matterType}
                        </h4>
                        <StageBadge stage={matter.stage} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDueDate(matter.updatedAt)}
                      </p>
                    </div>
                    <Link href={`/admin/intake?matterId=${matter.id}`}>
                      <Button size="sm" variant="default">
                        Review Intake
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              Overdue Next Actions ({overdue.length})
            </h3>
            <div className="space-y-3">
              {overdue.map((matter) => (
                <div
                  key={matter.id}
                  className="rounded-lg border border-red-200 dark:border-red-800 bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate mb-1">
                        {matter.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-1">
                        Next: {matter.nextAction}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Overdue by {Math.abs(Math.floor((new Date(matter.nextActionDueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))} days
                      </p>
                    </div>
                    <Link href={`/matters/${matter.id}`}>
                      <Button size="sm" variant="outline">
                        View Matter
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ContentCardContent>
    </ContentCard>
  );
}
