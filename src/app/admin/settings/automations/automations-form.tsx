"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateFirmSettings } from "@/lib/data/actions";
import type { FirmSettings } from "@/types/firm-settings";

interface AutomationsFormProps {
  settings: FirmSettings;
}

export function AutomationsForm({ settings }: AutomationsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [intakeEnabled, setIntakeEnabled] = useState(
    settings.automation_intake_reminder_enabled === "true"
  );
  const [intakeHours, setIntakeHours] = useState(
    settings.automation_intake_reminder_hours || "24"
  );
  const [clientIdleEnabled, setClientIdleEnabled] = useState(
    settings.automation_client_idle_enabled === "true"
  );
  const [clientIdleDays, setClientIdleDays] = useState(
    settings.automation_client_idle_days || "3"
  );
  const [lawyerIdleEnabled, setLawyerIdleEnabled] = useState(
    settings.automation_lawyer_idle_enabled === "true"
  );
  const [lawyerIdleDays, setLawyerIdleDays] = useState(
    settings.automation_lawyer_idle_days || "7"
  );
  const [invoiceEnabled, setInvoiceEnabled] = useState(
    settings.automation_invoice_reminder_enabled === "true"
  );
  const [invoiceDays, setInvoiceDays] = useState(
    settings.automation_invoice_reminder_days || "3,7,14"
  );

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const updates: Partial<FirmSettings> = {
      automation_intake_reminder_enabled: String(intakeEnabled),
      automation_intake_reminder_hours: intakeHours,
      automation_client_idle_enabled: String(clientIdleEnabled),
      automation_client_idle_days: clientIdleDays,
      automation_lawyer_idle_enabled: String(lawyerIdleEnabled),
      automation_lawyer_idle_days: lawyerIdleDays,
      automation_invoice_reminder_enabled: String(invoiceEnabled),
      automation_invoice_reminder_days: invoiceDays,
    };

    const result = await updateFirmSettings(updates);

    if ("error" in result && result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully" });
      router.refresh();
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Intake Reminders</CardTitle>
              <CardDescription>
                Remind clients to complete intake forms
              </CardDescription>
            </div>
            <Switch checked={intakeEnabled} onCheckedChange={setIntakeEnabled} />
          </div>
        </CardHeader>
        {intakeEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminder after</Label>
              <Input
                type="number"
                value={intakeHours}
                onChange={(e) => setIntakeHours(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>hours</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Inactivity Reminders</CardTitle>
              <CardDescription>
                Nudge clients when matters are waiting on them
              </CardDescription>
            </div>
            <Switch
              checked={clientIdleEnabled}
              onCheckedChange={setClientIdleEnabled}
            />
          </div>
        </CardHeader>
        {clientIdleEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminder after</Label>
              <Input
                type="number"
                value={clientIdleDays}
                onChange={(e) => setClientIdleDays(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>days of inactivity</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lawyer Inactivity Alerts</CardTitle>
              <CardDescription>
                Alert yourself when you have idle matters
              </CardDescription>
            </div>
            <Switch
              checked={lawyerIdleEnabled}
              onCheckedChange={setLawyerIdleEnabled}
            />
          </div>
        </CardHeader>
        {lawyerIdleEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send alert after</Label>
              <Input
                type="number"
                value={lawyerIdleDays}
                onChange={(e) => setLawyerIdleDays(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>days of inactivity</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice Reminders</CardTitle>
              <CardDescription>
                Remind clients about unpaid invoices
              </CardDescription>
            </div>
            <Switch
              checked={invoiceEnabled}
              onCheckedChange={setInvoiceEnabled}
            />
          </div>
        </CardHeader>
        {invoiceEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminders at days overdue:</Label>
              <Input
                type="text"
                value={invoiceDays}
                onChange={(e) => setInvoiceDays(e.target.value)}
                className="w-32"
                placeholder="3,7,14"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Comma-separated list of days (e.g., 3,7,14)
            </p>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
