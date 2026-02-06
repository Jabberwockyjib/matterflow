"use client";

import { useState, useMemo } from "react";
import { Monitor, Smartphone } from "lucide-react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderEmailWithPlaceholders } from "@/lib/email-templates/renderer";

type DeviceView = "desktop" | "mobile";

/**
 * Sample data for previewing email templates.
 * Uses realistic values to help users visualize how emails will look.
 */
const SAMPLE_DATA = {
  practiceName: "Acme Law Firm",
  practiceLogo: "",
  practiceEmail: "contact@acmelaw.com",
  practicePhone: "(555) 123-4567",
  practiceAddress: "123 Legal St, Suite 100, New York, NY 10001",
  clientName: "John Smith",
  clientEmail: "john.smith@example.com",
  matterTitle: "Contract Review - ABC Corp",
  matterType: "Contract Review",
  lawyerName: "Jane Attorney",
  invoiceAmount: "$2,500.00",
  invoiceNumber: "INV-2026-001",
  dueDate: "February 19, 2026",
  paymentLink: "#",
  taskTitle: "Review Draft Agreement",
  taskLink: "#",
  intakeLink: "#",
  currentYear: "2026",
};

interface EmailPreviewProps {
  /** The email subject line (may contain placeholders) */
  subject: string;
  /** The email body as HTML (may contain placeholders) */
  bodyHtml: string;
  /** Optional practice name override for the preview */
  practiceName?: string;
}

/**
 * EmailPreview component displays a rendered email template with sample data.
 * Supports toggling between desktop and mobile view to see how the email
 * will appear on different devices.
 */
export function EmailPreview({
  subject,
  bodyHtml,
  practiceName,
}: EmailPreviewProps) {
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");

  // Merge practice name override with sample data
  const previewData = {
    ...SAMPLE_DATA,
    ...(practiceName && { practiceName }),
  };

  // Render subject and body with sample data, sanitizing HTML to prevent XSS
  const renderedSubject = renderEmailWithPlaceholders(subject, previewData);
  const renderedBody = useMemo(() => {
    const raw = renderEmailWithPlaceholders(bodyHtml, previewData);
    return DOMPurify.sanitize(raw);
  }, [bodyHtml, previewData]);

  return (
    <div className="flex flex-col h-full">
      {/* Device toggle */}
      <div className="flex justify-end gap-1 p-3 border-b bg-white">
        <Button
          variant={deviceView === "desktop" ? "default" : "ghost"}
          size="sm"
          onClick={() => setDeviceView("desktop")}
          aria-label="Desktop view"
          aria-pressed={deviceView === "desktop"}
        >
          <Monitor className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Desktop</span>
        </Button>
        <Button
          variant={deviceView === "mobile" ? "default" : "ghost"}
          size="sm"
          onClick={() => setDeviceView("mobile")}
          aria-label="Mobile view"
          aria-pressed={deviceView === "mobile"}
        >
          <Smartphone className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Mobile</span>
        </Button>
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-auto bg-slate-100 p-6">
        <div
          className={cn(
            "mx-auto transition-all duration-300",
            deviceView === "mobile" ? "max-w-[375px]" : "max-w-full"
          )}
        >
          {/* Email card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Email header */}
            <div className="border-b px-6 py-4 bg-slate-50">
              <div className="text-sm text-slate-500">Subject:</div>
              <div className="font-medium text-slate-900 mt-1">
                {renderedSubject || (
                  <span className="text-slate-400 italic">No subject</span>
                )}
              </div>
            </div>

            {/* Email body */}
            <div className="px-6 py-4">
              {renderedBody ? (
                <div
                  className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: renderedBody }}
                />
              ) : (
                <div className="text-slate-400 italic text-center py-8">
                  Email content will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
