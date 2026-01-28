"use client";

import { useState } from "react";
import { Mail, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendIntakeReminder } from "@/lib/data/actions";
import { toast } from "sonner";

interface ResendIntakeButtonProps {
  matterId: string;
}

export function ResendIntakeButton({ matterId }: ResendIntakeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const intakeLink = `${window.location.origin}/intake/${matterId}`;

  const handleResend = async () => {
    setLoading(true);
    try {
      const result = await resendIntakeReminder(matterId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Intake reminder sent successfully");
      }
    } catch (error) {
      toast.error("Failed to send reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(intakeLink);
      setCopied(true);
      toast.success("Intake link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleCopyLink}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? "Copied!" : "Copy Intake Link"}
      </Button>
      <Button
        onClick={handleResend}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {loading ? "Sending..." : "Email Reminder"}
      </Button>
    </div>
  );
}
