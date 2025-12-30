"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updatePracticeSettings } from "@/lib/data/actions";
import type { PracticeSettings } from "@/lib/data/queries";

type PracticeSettingsFormProps = {
  settings: PracticeSettings | null;
};

export function PracticeSettingsForm({ settings }: PracticeSettingsFormProps) {
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
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(
    settings?.autoRemindersEnabled ?? true
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
    } catch (error) {
      toast.error("Failed to update firm information");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillingDefaultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updatePracticeSettings({
        defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : undefined,
        paymentTermsDays: parseInt(paymentTermsDays),
        lateFeePercentage: parseFloat(lateFeePercentage),
        autoRemindersEnabled,
      });

      if (result.ok) {
        toast.success("Billing defaults updated successfully");
      } else {
        toast.error(result.error || "Failed to update billing defaults");
      }
    } catch (error) {
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
            Update your law firm's contact details
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
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@lawfirm.com"
              />
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
              <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
              <select
                id="paymentTermsDays"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRemindersEnabled"
                checked={autoRemindersEnabled}
                onChange={(e) => setAutoRemindersEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="autoRemindersEnabled" className="cursor-pointer">
                Enable automatic payment reminders
              </Label>
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
