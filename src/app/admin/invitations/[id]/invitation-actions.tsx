"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resendInvitationEmail, cancelInvitation, extendInvitation } from "@/lib/data/actions";

interface InvitationActionsProps {
  invitationId: string;
  status: string;
  clientEmail: string;
  clientName: string;
  inviteCode: string;
}

export function InvitationActions({
  invitationId,
  status,
  clientEmail,
  clientName,
  inviteCode,
}: InvitationActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/invite/${inviteCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invitation link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const result = await resendInvitationEmail(invitationId);
      if (result.ok) {
        toast.success(`Invitation email sent to ${clientEmail}`);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${clientName}?`)) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.ok) {
        toast.success("Invitation cancelled");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel invitation");
      }
    } catch (error) {
      toast.error("Failed to cancel invitation");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      const result = await extendInvitation(invitationId);
      if (result.ok) {
        toast.success("Invitation extended by 7 days");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to extend invitation");
      }
    } catch (error) {
      toast.error("Failed to extend invitation");
    } finally {
      setIsExtending(false);
    }
  };

  const isPending = status === "pending";
  const isExpired = status === "expired";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Actions</h2>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCopyLink} variant="outline" className="gap-2">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </Button>

        {(isPending || isExpired) && (
          <>
            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="gap-2"
              disabled={isResending}
            >
              <Mail className="h-4 w-4" />
              {isResending ? "Sending..." : "Resend Email"}
            </Button>

            {isExpired && (
              <Button
                onClick={handleExtend}
                variant="outline"
                className="gap-2"
                disabled={isExtending}
              >
                <RefreshCw className="h-4 w-4" />
                {isExtending ? "Extending..." : "Extend 7 Days"}
              </Button>
            )}

            <Button
              onClick={handleCancel}
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
              disabled={isCancelling}
            >
              <XCircle className="h-4 w-4" />
              {isCancelling ? "Cancelling..." : "Cancel Invitation"}
            </Button>
          </>
        )}

        {status === "completed" && (
          <p className="text-sm text-green-600">
            This invitation has been completed. The client has signed up.
          </p>
        )}

        {status === "cancelled" && (
          <p className="text-sm text-red-600">
            This invitation has been cancelled.
          </p>
        )}
      </div>
    </div>
  );
}
