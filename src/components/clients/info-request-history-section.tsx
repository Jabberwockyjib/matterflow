"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import type { InfoRequestSummary } from "@/lib/data/queries";

interface InfoRequestHistorySectionProps {
  infoRequests: InfoRequestSummary[];
}

export function InfoRequestHistorySection({
  infoRequests,
}: InfoRequestHistorySectionProps) {
  if (infoRequests.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-sm text-gray-500 text-center">
          No additional information requested yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Information Requests ({infoRequests.length})
      </h3>

      <Accordion type="single" collapsible className="space-y-2">
        {infoRequests.map((request) => {
          const isPending = request.status === "pending";
          const isCompleted = request.status === "completed";
          const isOverdue =
            isPending &&
            request.responseDeadline &&
            new Date(request.responseDeadline) < new Date();

          const statusColor = isCompleted
            ? "bg-green-100 text-green-800"
            : isOverdue
            ? "bg-red-100 text-red-800"
            : "bg-yellow-100 text-yellow-800";

          const statusLabel = isCompleted
            ? "Completed"
            : isOverdue
            ? "Overdue"
            : "Pending Response";

          return (
            <AccordionItem
              key={request.id}
              value={request.id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Info Request #{infoRequests.indexOf(request) + 1}
                      </span>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.requestedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {Array.isArray(request.questions)
                        ? request.questions.length
                        : Object.keys(request.questions).length}{" "}
                      questions
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Personal Message */}
                  {request.message && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Personal Message:
                      </p>
                      <p className="text-sm text-blue-800">{request.message}</p>
                    </div>
                  )}

                  {/* Deadline */}
                  {request.responseDeadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Deadline:{" "}
                        {new Date(request.responseDeadline).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}

                  {/* Questions */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Questions:
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                      {(Array.isArray(request.questions)
                        ? request.questions
                        : Object.values(request.questions)
                      ).map((q: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">
                          {q.question || q.questionText || q.text}
                          {q.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Client Responses */}
                  {isCompleted && request.responses && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Client Responses:
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 mb-2">
                          <strong>Completed on:</strong>{" "}
                          {request.respondedAt &&
                            new Date(request.respondedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                        </p>
                        <div className="space-y-2">
                          {Object.entries(request.responses).map(
                            ([key, value]) => (
                              <div key={key}>
                                <p className="text-sm font-medium text-gray-700">
                                  {key}:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
