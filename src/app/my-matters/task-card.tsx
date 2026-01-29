"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarClock, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskResponseForm } from "@/components/forms/TaskResponseForm";
import type { ClientTaskSummary } from "@/lib/data/queries";

interface TaskCardProps {
  task: ClientTaskSummary;
}

const taskTypeIcons: Record<string, string> = {
  document_upload: "📄",
  information_request: "❓",
  confirmation: "✓",
  general: "📝",
};

export function TaskCard({ task }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const hasResponse = task.response !== null;
  const isPendingReview = task.status === "pending_review";
  const isDone = task.status === "done";
  const needsRevision = task.response?.status === "rejected";

  const getStatusBadge = () => {
    if (isDone) {
      return <Badge variant="success">Completed</Badge>;
    }
    if (isPendingReview) {
      return <Badge variant="warning">Pending Review</Badge>;
    }
    if (needsRevision) {
      return <Badge variant="danger">Revision Needed</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="danger">Overdue</Badge>;
    }
    return <Badge variant="default">Action Needed</Badge>;
  };

  const canRespond = task.status === "open" || needsRevision;

  return (
    <div
      className={`bg-white rounded-lg border transition-all ${
        isOverdue && !isDone ? "border-red-200 bg-red-50/50" : "border-slate-200"
      }`}
    >
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{taskTypeIcons[task.taskType]}</span>
              <h3 className="font-medium text-slate-900">{task.title}</h3>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{task.matterTitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  isOverdue && !isDone ? "text-red-600" : "text-slate-500"
                }`}
              >
                <CalendarClock className="h-4 w-4" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
            {getStatusBadge()}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          {/* Show revision notes if rejected */}
          {needsRevision && task.response?.reviewerNotes && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Revision Requested
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {task.response.reviewerNotes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show response form if can respond */}
          {canRespond && (
            <TaskResponseForm
              taskId={task.id}
              taskType={task.taskType}
              instructions={task.instructions}
              matterId={task.matterId}
              onSuccess={() => window.location.reload()}
            />
          )}

          {/* Show submitted response if pending review or done */}
          {hasResponse && !canRespond && (
            <div className="space-y-3">
              {task.response?.confirmedAt ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Confirmed on{" "}
                    {new Date(task.response.confirmedAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <>
                  {task.response?.responseText && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                        Your Response
                      </p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                        {task.response.responseText}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Show uploaded documents */}
              {task.documents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    Attached Files
                  </p>
                  <div className="space-y-2">
                    {task.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.webViewLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{doc.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {isPendingReview && (
                <div className="flex items-center gap-2 text-amber-600 pt-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Awaiting review from your lawyer</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
