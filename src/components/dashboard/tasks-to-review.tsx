"use client";

import { useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronUp, FileText, Check, X } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { approveTaskResponse, requestTaskRevision } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";
import type { TaskForReview } from "@/lib/data/queries";

interface TasksToReviewProps {
  tasks: TaskForReview[];
}

function ReviewCard({ task }: { task: TaskForReview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    const result = await approveTaskResponse(task.id);
    if (result.error) {
      showFormError("Response", "approve");
    } else {
      showFormSuccess("Response", "approved");
      window.location.reload();
    }
    setIsApproving(false);
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) return;
    setIsRequesting(true);
    const result = await requestTaskRevision(task.id, revisionNotes);
    if (result.error) {
      showFormError("Revision", "request");
    } else {
      showFormSuccess("Revision", "requested");
      window.location.reload();
    }
    setIsRequesting(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors">
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {task.taskTitle}
            </h4>
            <p className="text-xs text-muted-foreground">
              {task.matterTitle} {task.clientName && `- ${task.clientName}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(task.submittedAt).toLocaleDateString()}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* Response text */}
          {task.responseText && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                Client Response
              </p>
              <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                {task.responseText}
              </p>
            </div>
          )}

          {/* Documents */}
          {task.documents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Attached Files ({task.documents.length})
              </p>
              <div className="space-y-2">
                {task.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.webViewLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{doc.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Revision form */}
          {showRevisionForm ? (
            <div className="space-y-3">
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Explain what changes are needed..."
                className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRequestRevision}
                  disabled={isRequesting || !revisionNotes.trim()}
                >
                  {isRequesting ? "Sending..." : "Send Revision Request"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApprove} disabled={isApproving}>
                <Check className="h-4 w-4 mr-1" />
                {isApproving ? "Approving..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
              >
                <X className="h-4 w-4 mr-1" />
                Request Revision
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TasksToReview({ tasks }: TasksToReviewProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <ContentCard className="border-blue-200 dark:border-blue-800 mb-6">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Tasks to Review ({tasks.length})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <ReviewCard key={task.id} task={task} />
          ))}
        </div>
      </ContentCardContent>
    </ContentCard>
  );
}
