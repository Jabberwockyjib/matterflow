"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/lib/toast";
import { approveIntakeForm, declineIntakeForm, scheduleCallAction, updateIntakeNotes, createInfoRequest } from "@/lib/data/actions";
import { InfoRequestComposer } from "@/components/clients/info-request-composer";
import { ScheduleCallModal } from "@/components/clients/schedule-call-modal";
import { DeclineIntakeModal } from "@/components/clients/decline-intake-modal";
import { InternalNotesSection } from "@/components/clients/internal-notes-section";
import { InfoRequestHistorySection } from "@/components/clients/info-request-history-section";
import { useDebounce } from "@/hooks/use-debounce";
import type { InfoRequestSummary } from "@/lib/data/queries";

interface IntakeReviewClientProps {
  intakeId: string;
  intakeResponse: {
    id: string;
    status: string;
    review_notes: string | null;
    review_status: string | null;
  };
  matter: {
    id: string;
    title: string;
    client_id: string | null;
  };
  client: {
    userId: string;
    fullName: string;
    email: string;
  };
  infoRequests: InfoRequestSummary[];
}

export function IntakeReviewClient({
  intakeId,
  intakeResponse,
  matter,
  client,
  infoRequests,
}: IntakeReviewClientProps) {
  const router = useRouter();

  // Modal state
  const [showInfoRequestModal, setShowInfoRequestModal] = useState(false);
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Internal notes state with auto-save
  const [notes, setNotes] = useState(intakeResponse.review_notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const debouncedNotes = useDebounce(notes, 1000);

  // Auto-save notes when debounced value changes
  useEffect(() => {
    if (debouncedNotes !== (intakeResponse.review_notes || "")) {
      setIsSavingNotes(true);
      updateIntakeNotes(intakeId, debouncedNotes)
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Failed to save notes:", err);
        })
        .finally(() => {
          setIsSavingNotes(false);
        });
    }
  }, [debouncedNotes, intakeId, intakeResponse.review_notes]);

  // Action handlers
  const handleApprove = async () => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);

    const result = await approveIntakeForm(formData);
    if (result.ok) {
      showSuccess("Intake form approved successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to approve intake form");
    }
  };

  const handleInfoRequest = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("questions", JSON.stringify(data.questions));
    if (data.message) formData.append("message", data.message);
    if (data.deadline) formData.append("deadline", data.deadline);

    const result = await createInfoRequest(formData);
    if (result.ok) {
      showSuccess("Information request sent successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to send information request");
    }
  };

  const handleScheduleCall = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("dateTime", data.dateTime);
    formData.append("duration", data.duration.toString());
    formData.append("meetingType", data.meetingType);
    if (data.meetingLink) formData.append("meetingLink", data.meetingLink);
    if (data.notes) formData.append("notes", data.notes);

    const result = await scheduleCallAction(formData);
    if (result.ok) {
      showSuccess("Call scheduled successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to schedule call");
    }
  };

  const handleDecline = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("reason", data.reason);
    if (data.notes) formData.append("notes", data.notes);

    const result = await declineIntakeForm(formData);
    if (result.ok) {
      showSuccess("Intake form declined");
      router.refresh();
    } else {
      showError(result.error || "Failed to decline intake form");
    }
  };

  // Check if there's a pending info request
  const hasPendingInfoRequest = infoRequests.some(
    (req) => req.status === "pending"
  );

  return (
    <div className="space-y-6">
      {/* Primary Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Button onClick={handleApprove} size="default">
          Approve Intake
        </Button>
        <Button
          onClick={() => setShowInfoRequestModal(true)}
          variant="outline"
          disabled={hasPendingInfoRequest}
        >
          Request More Info
        </Button>
        <Button
          onClick={() => setShowScheduleCallModal(true)}
          variant="outline"
        >
          Schedule Call
        </Button>
        <Button
          onClick={() => setShowDeclineModal(true)}
          variant="outline"
          className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
        >
          Decline
        </Button>
      </div>

      {/* Status Badge if info request pending */}
      {hasPendingInfoRequest && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Waiting for client response</strong> - An information request is pending.
          </p>
        </div>
      )}

      {/* Internal Notes Section */}
      <InternalNotesSection
        notes={notes}
        onChange={setNotes}
        isSaving={isSavingNotes}
        lastSaved={lastSaved}
      />

      {/* Info Request History */}
      <InfoRequestHistorySection infoRequests={infoRequests} />

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => router.push("/admin/intake")}>
          Back to Intake List
        </Button>
      </div>

      {/* Modals */}
      {showInfoRequestModal && (
        <InfoRequestComposer
          intakeResponseId={intakeId}
          onClose={() => setShowInfoRequestModal(false)}
          onSubmit={handleInfoRequest}
        />
      )}

      {showScheduleCallModal && (
        <ScheduleCallModal
          intakeResponseId={intakeId}
          clientName={client.fullName}
          clientEmail={client.email}
          onClose={() => setShowScheduleCallModal(false)}
          onSubmit={handleScheduleCall}
        />
      )}

      {showDeclineModal && (
        <DeclineIntakeModal
          intakeId={intakeId}
          clientName={client.fullName}
          onClose={() => setShowDeclineModal(false)}
          onSubmit={handleDecline}
        />
      )}
    </div>
  );
}
