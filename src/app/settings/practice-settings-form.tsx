"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updatePracticeSettings, updateFirmSettings } from "@/lib/data/actions";
import type { PracticeSettings } from "@/lib/data/queries";
import type { FirmSettings } from "@/types/firm-settings";
import { DEFAULT_FIRM_SETTINGS } from "@/types/firm-settings";

const selectClass =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type PracticeSettingsFormProps = {
  settings: PracticeSettings | null;
  firmSettings?: FirmSettings;
};

export function PracticeSettingsForm({ settings, firmSettings }: PracticeSettingsFormProps) {
  const fs = firmSettings || DEFAULT_FIRM_SETTINGS;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firmName, setFirmName] = useState(settings?.firmName || "");
  const [contactEmail, setContactEmail] = useState(settings?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(settings?.contactPhone || "");
  const [address, setAddress] = useState(settings?.address || "");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(
    settings?.defaultHourlyRate?.toString() || ""
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState(
    settings?.paymentTermsDays?.toString() || "30"
  );
  const [lateFeePercentage, setLateFeePercentage] = useState(
    settings?.lateFeePercentage?.toString() || "0"
  );
  const [billingIncrementMinutes, setBillingIncrementMinutes] = useState(
    settings?.billingIncrementMinutes?.toString() || "6"
  );

  // Reminder settings (from firm_settings)
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(
    fs.automation_invoice_reminder_enabled === "true"
  );
  const [firstReminderDays, setFirstReminderDays] = useState(
    fs.automation_invoice_first_reminder_days || "15"
  );
  const [dueDateReminderEnabled, setDueDateReminderEnabled] = useState(
    fs.automation_invoice_due_date_reminder !== "false"
  );
  const [overdueFrequency, setOverdueFrequency] = useState(() => {
    const days = fs.automation_invoice_overdue_frequency_days || "7";
    if (["3", "7", "14", "30"].includes(days)) return days;
    return "custom";
  });
  const [customOverdueDays, setCustomOverdueDays] = useState(
    fs.automation_invoice_overdue_frequency_days || "7"
  );

  const handleFirmInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updatePracticeSettings({
        firmName,
        contactEmail,
        contactPhone,
        address,
      });

      if (result.ok) {
        toast.success("Firm information updated successfully");
      } else {
        toast.error(result.error || "Failed to update firm information");
      }
    } catch {
      toast.error("Failed to update firm information");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillingDefaultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save practice_settings (billing fields)
      const practiceResult = await updatePracticeSettings({
        defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : undefined,
        paymentTermsDays: parseInt(paymentTermsDays),
        lateFeePercentage: parseFloat(lateFeePercentage),
        billingIncrementMinutes: parseInt(billingIncrementMinutes),
      });

      if (!practiceResult.ok) {
        toast.error(practiceResult.error || "Failed to update billing defaults");
        return;
      }

      // Save reminder settings to firm_settings
      const effectiveOverdueDays = overdueFrequency === "custom" ? customOverdueDays : overdueFrequency;
      const firmResult = await updateFirmSettings({
        automation_invoice_reminder_enabled: String(autoRemindersEnabled),
        automation_invoice_first_reminder_days: firstReminderDays,
        automation_invoice_due_date_reminder: String(dueDateReminderEnabled),
        automation_invoice_overdue_frequency_days: effectiveOverdueDays,
      });

      if ("error" in firmResult && firmResult.error) {
        toast.error(firmResult.error);
      } else {
        toast.success("Billing defaults updated successfully");
      }
    } catch {
      toast.error("Failed to update billing defaults");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Firm Information */}
      <Card>
        <CardHeader>
          <CardTitle>Firm Information</CardTitle>
          <CardDescription>
            Update your law firm&apos;s contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFirmInfoSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Your Law Firm"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">
                Contact Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@lawfirm.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Required for sending client invitations and notifications via Gmail
              </p>
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St&#10;Suite 100&#10;City, State 12345"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Firm Information"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Billing Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Defaults</CardTitle>
          <CardDescription>
            Set default billing rates and payment terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBillingDefaultsSubmit} className="space-y-4">
            <div>
              <Label htmlFor="defaultHourlyRate">Default Hourly Rate ($)</Label>
              <Input
                id="defaultHourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
                placeholder="250.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default rate for time entries (can be overridden per matter)
              </p>
            </div>

            <div>
              <Label htmlFor="billingIncrementMinutes">Minimum Billing Increment</Label>
              <select
                id="billingIncrementMinutes"
                value={billingIncrementMinutes}
                onChange={(e) => setBillingIncrementMinutes(e.target.value)}
                className={selectClass}
              >
                <option value="1">1 minute (no rounding)</option>
                <option value="5">5 minutes</option>
                <option value="6">6 minutes (0.1 hour)</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes (0.25 hour)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Time entries are rounded up to the nearest increment for billing
              </p>
            </div>

            <div>
              <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
              <select
                id="paymentTermsDays"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                className={selectClass}
              >
                <option value="15">15 days</option>
                <option value="30">30 days</option>
                <option value="45">45 days</option>
                <option value="60">60 days</option>
              </select>
            </div>

            <div>
              <Label htmlFor="lateFeePercentage">Late Fee Percentage (%)</Label>
              <Input
                id="lateFeePercentage"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={lateFeePercentage}
                onChange={(e) => setLateFeePercentage(e.target.value)}
                placeholder="5.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Late fee applied to overdue invoices (0-10%)
              </p>
            </div>

            {/* Payment Reminder Configuration */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRemindersEnabled"
                  checked={autoRemindersEnabled}
                  onChange={(e) => setAutoRemindersEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="autoRemindersEnabled" className="cursor-pointer font-medium">
                  Enable automatic payment reminders
                </Label>
              </div>

              {autoRemindersEnabled && (
                <div className="mt-4 ml-6 space-y-4 border-l-2 border-slate-200 pl-4">
                  {/* First Reminder */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700">First Reminder</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={firstReminderDays}
                        onChange={(e) => setFirstReminderDays(e.target.value)}
                        className="w-20"
                        min={1}
                        max={90}
                      />
                      <span className="text-sm text-slate-600">days after invoice sent</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      A friendly reminder before the due date
                    </p>
                  </div>

                  {/* Due Date Reminder */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="dueDateReminderEnabled"
                      checked={dueDateReminderEnabled}
                      onChange={(e) => setDueDateReminderEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="dueDateReminderEnabled" className="cursor-pointer text-sm">
                      Send reminder on due date
                    </Label>
                  </div>

                  {/* Overdue Reminders */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Overdue Reminders</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={overdueFrequency}
                        onChange={(e) => {
                          setOverdueFrequency(e.target.value);
                          if (e.target.value !== "custom") {
                            setCustomOverdueDays(e.target.value);
                          }
                        }}
                        className={selectClass}
                        style={{ width: "auto" }}
                      >
                        <option value="3">Every 3 days</option>
                        <option value="7">Weekly</option>
                        <option value="14">Every 2 weeks</option>
                        <option value="30">Monthly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    {overdueFrequency === "custom" && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-slate-600">Every</span>
                        <Input
                          type="number"
                          value={customOverdueDays}
                          onChange={(e) => setCustomOverdueDays(e.target.value)}
                          className="w-20"
                          min={1}
                          max={90}
                        />
                        <span className="text-sm text-slate-600">days</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Recurring reminders after the due date has passed
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Billing Defaults"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
