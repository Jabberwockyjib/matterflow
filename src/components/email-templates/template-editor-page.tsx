"use client";

/**
 * Template Editor Page Component
 *
 * Main editor interface that combines the placeholder sidebar, TipTap editor,
 * and email preview into a cohesive 3-column layout. Handles state management
 * for template content and provides save/test email functionality.
 */

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceholderSidebar } from "./placeholder-sidebar";
import { TiptapEditor, type TiptapEditorHandle } from "./tiptap-editor";
import { EmailPreview } from "./email-preview";
import { VersionDrawer } from "./version-drawer";
import { saveEmailTemplate, sendTestEmail } from "@/lib/email-templates/actions";
import type {
  EmailTemplate,
  EmailTemplateVersion,
  JSONContent,
} from "@/lib/email-templates/types";

// ============================================================================
// Types
// ============================================================================

interface TemplateEditorPageProps {
  /** The email template being edited */
  template: EmailTemplate;
  /** Version history for the template */
  versions: EmailTemplateVersion[];
  /** Optional practice name for preview */
  practiceName?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TemplateEditorPage({
  template,
  versions,
  practiceName,
}: TemplateEditorPageProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [bodyJson, setBodyJson] = useState<JSONContent>(template.bodyJson);
  const [isDirty, setIsDirty] = useState(false);

  // Transitions for async operations
  const [isSaving, startSaveTransition] = useTransition();
  const [isSendingTest, startSendTestTransition] = useTransition();

  // Ref for editor handle to insert placeholders
  const editorRef = useRef<TiptapEditorHandle>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Handle subject input change
   */
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
    setIsDirty(true);
  };

  /**
   * Handle editor content change
   */
  const handleEditorChange = (html: string, json: JSONContent) => {
    setBodyHtml(html);
    setBodyJson(json);
    setIsDirty(true);
  };

  /**
   * Insert a placeholder token at cursor position in the editor
   */
  const handleInsertPlaceholder = (token: string) => {
    editorRef.current?.insertPlaceholder(token);
  };

  /**
   * Save the template
   */
  const handleSave = () => {
    startSaveTransition(async () => {
      const result = await saveEmailTemplate({
        emailType: template.emailType,
        subject,
        bodyHtml,
        bodyJson,
      });

      if (result.success) {
        toast.success("Template saved successfully");
        setIsDirty(false);
      } else {
        toast.error(result.error || "Failed to save template");
      }
    });
  };

  /**
   * Send a test email to the current user
   */
  const handleSendTest = () => {
    startSendTestTransition(async () => {
      const result = await sendTestEmail(template.emailType);

      if (result.success) {
        toast.success("Test email sent to your inbox");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    });
  };

  // Get current version number (latest from versions array)
  const currentVersion =
    versions.length > 0
      ? Math.max(...versions.map((v) => v.version))
      : undefined;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Back link */}
          <Link
            href="/settings?tab=email-templates"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          {/* Template name and dirty indicator */}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-slate-900">
              {template.name}
            </h1>
            {isDirty && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Versions drawer */}
          <VersionDrawer
            templateId={template.id}
            versions={versions}
            currentVersion={currentVersion}
          />

          {/* Send test button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={isSendingTest || isDirty}
            title={isDirty ? "Save changes before sending test" : "Send test email"}
          >
            {isSendingTest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Test
          </Button>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Main content - 3 column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Placeholders (3 cols) */}
        <aside className="w-64 flex-shrink-0 overflow-y-auto border-r bg-slate-50">
          <PlaceholderSidebar
            emailType={template.emailType}
            onInsert={handleInsertPlaceholder}
          />
        </aside>

        {/* Editor (5 cols) */}
        <main className="flex-1 overflow-y-auto bg-white p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Subject line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={handleSubjectChange}
                placeholder="Enter email subject..."
              />
              <p className="text-xs text-slate-500">
                You can use placeholders like {"{{clientName}}"} in the subject line
              </p>
            </div>

            {/* Body editor */}
            <div className="space-y-2">
              <Label>Email Body</Label>
              <TiptapEditor
                ref={editorRef}
                content={bodyJson}
                onChange={handleEditorChange}
                placeholder="Write your email content here..."
              />
            </div>
          </div>
        </main>

        {/* Preview (4 cols) */}
        <aside className="w-96 flex-shrink-0 overflow-hidden border-l bg-slate-100">
          <EmailPreview
            subject={subject}
            bodyHtml={bodyHtml}
            practiceName={practiceName}
          />
        </aside>
      </div>
    </div>
  );
}
