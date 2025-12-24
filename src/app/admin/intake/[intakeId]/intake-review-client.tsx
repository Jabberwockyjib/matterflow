"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveIntakeForm } from "@/lib/intake";
import { Button } from "@/components/ui/button";

interface IntakeReviewClientProps {
  intakeId: string;
}

export function IntakeReviewClient({ intakeId }: IntakeReviewClientProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    setIsApproving(true);

    try {
      const result = await approveIntakeForm(intakeId);

      if ("error" in result) {
        setError(result.error || "Failed to approve intake form");
      } else {
        router.refresh();
        router.push("/admin/intake");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Review Actions
        </h3>
        <p className="text-gray-600 mb-6">
          Approving this intake form will update the matter stage to "Under
          Review" and notify the client.
        </p>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-6"
          >
            {isApproving ? "Approving..." : "Approve Intake Form"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/intake")}
            disabled={isApproving}
          >
            Back to List
          </Button>
        </div>
      </div>
    </div>
  );
}
