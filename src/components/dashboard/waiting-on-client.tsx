import Link from "next/link";
import { Mail } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Matter } from "@/lib/data/queries";

interface WaitingOnClientProps {
  awaitingIntake: Matter[];
}

export function WaitingOnClient({ awaitingIntake }: WaitingOnClientProps) {
  if (awaitingIntake.length === 0) {
    return null;
  }

  return (
    <ContentCard className="border-blue-200 dark:border-blue-800">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Waiting on Client ({awaitingIntake.length})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Awaiting Intake ({awaitingIntake.length})
          </h3>
          <div className="space-y-3">
            {awaitingIntake.map((matter) => {
              const daysWaiting = Math.floor(
                (Date.now() - new Date(matter.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={matter.id}
                  className="rounded-lg border border-border bg-card p-3"
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
                        Sent {daysWaiting} {daysWaiting === 1 ? "day" : "days"} ago
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/matters/${matter.id}`}>
                        <Button size="sm" variant="ghost">
                          View Matter
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ContentCardContent>
    </ContentCard>
  );
}
