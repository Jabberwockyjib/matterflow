"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateInvoiceStatus, resendInvoiceEmail } from "@/lib/data/actions";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  squarePaymentUrl: string | null;
}

export function InvoiceActions({ invoiceId, status, squarePaymentUrl }: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleMarkPaid() {
    setLoading("paid");
    const formData = new FormData();
    formData.set("id", invoiceId);
    formData.set("status", "paid");

    await updateInvoiceStatus(formData);
    setLoading(null);
    router.refresh();
  }

  async function handleResendEmail() {
    setLoading("resend");
    const result = await resendInvoiceEmail(invoiceId);
    setLoading(null);
    if ("error" in result) {
      console.error("Failed to resend invoice email:", result.error);
      // Could add toast notification here
    }
    router.refresh();
  }

  async function handleCopyLink() {
    if (squarePaymentUrl) {
      await navigator.clipboard.writeText(squarePaymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {squarePaymentUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
      )}

      {status === "sent" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendEmail}
          disabled={loading === "resend"}
        >
          <Mail className="h-4 w-4 mr-2" />
          {loading === "resend" ? "Sending..." : "Resend Email"}
        </Button>
      )}

      {status !== "paid" && (
        <Button
          size="sm"
          onClick={handleMarkPaid}
          disabled={loading === "paid"}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading === "paid" ? "Updating..." : "Mark Paid"}
        </Button>
      )}
    </div>
  );
}
