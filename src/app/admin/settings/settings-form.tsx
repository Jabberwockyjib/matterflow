"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateFirmSettings } from "@/lib/data/actions";
import type { FirmSettings } from "@/types/firm-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LogoUpload } from "@/components/settings/logo-upload";

interface SettingsFormProps {
  initialSettings: FirmSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<FirmSettings>(initialSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const result = await updateFirmSettings({
        firm_name: settings.firm_name,
        tagline: settings.tagline,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        reply_to_email: settings.reply_to_email,
        footer_text: settings.footer_text,
      });

      if (result.ok) {
        setSuccess(true);
        router.refresh();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof FirmSettings>(
    key: K,
    value: FirmSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Firm Branding</CardTitle>
            <CardDescription>
              These settings customize how your emails appear to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved successfully
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="firm_name">Firm Name *</Label>
                <Input
                  id="firm_name"
                  type="text"
                  placeholder="Your Law Firm"
                  value={settings.firm_name}
                  onChange={(e) => updateSetting("firm_name", e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Displayed in email headers and footers
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  type="text"
                  placeholder="Your trusted legal partner"
                  value={settings.tagline}
                  onChange={(e) => updateSetting("tagline", e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Shown below firm name in email headers
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Firm Logo</Label>
                <LogoUpload
                  currentLogoUrl={settings.logo_url}
                  onLogoChange={(url) => updateSetting("logo_url", url)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="primary_color">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="text"
                    placeholder="#1e293b"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    value={settings.primary_color}
                    onChange={(e) =>
                      updateSetting("primary_color", e.target.value)
                    }
                    disabled={loading}
                    className="flex-1"
                  />
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) =>
                      updateSetting("primary_color", e.target.value)
                    }
                    disabled={loading}
                    className="h-10 w-10 cursor-pointer rounded border p-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Primary color for email headers and accents
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reply_to_email">Reply-To Email</Label>
                <Input
                  id="reply_to_email"
                  type="email"
                  placeholder="contact@yourfirm.com"
                  value={settings.reply_to_email || ""}
                  onChange={(e) =>
                    updateSetting("reply_to_email", e.target.value || null)
                  }
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Clients will reply to this address
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="footer_text">Footer Text</Label>
                <Textarea
                  id="footer_text"
                  placeholder="123 Main Street, Suite 100, City, State 12345"
                  value={settings.footer_text || ""}
                  onChange={(e) =>
                    updateSetting("footer_text", e.target.value || null)
                  }
                  disabled={loading}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Address or contact info shown in email footers
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>
              Preview how your emails will appear to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="overflow-hidden rounded-lg border"
              style={{ backgroundColor: "#f6f9fc" }}
            >
              {/* Email header preview */}
              <div
                className="p-6 text-center"
                style={{ backgroundColor: settings.primary_color }}
              >
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.firm_name}
                    className="mx-auto h-12 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-xl font-bold text-white">
                    {settings.firm_name}
                  </div>
                )}
                {settings.tagline && (
                  <div className="mt-1 text-sm text-white/80">
                    {settings.tagline}
                  </div>
                )}
              </div>

              {/* Email body preview */}
              <div className="bg-white p-6">
                <div className="mb-4 text-lg font-semibold text-slate-800">
                  Sample Email Subject
                </div>
                <p className="mb-4 text-sm text-slate-600">
                  Hi Client Name,
                </p>
                <p className="mb-4 text-sm text-slate-600">
                  This is a preview of how your emails will appear to clients.
                  The header uses your brand color and displays your firm name
                  or logo.
                </p>
                <div
                  className="mb-4 inline-block rounded px-6 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "#2563eb" }}
                >
                  Call to Action Button
                </div>
                <p className="text-sm text-slate-600">
                  Best regards,
                  <br />
                  {settings.firm_name}
                </p>
              </div>

              {/* Email footer preview */}
              <div className="border-t bg-slate-50 p-6 text-center">
                <div className="text-xs text-slate-500">
                  {settings.footer_text || settings.firm_name}
                </div>
                {settings.reply_to_email && (
                  <div className="mt-1 text-xs text-slate-400">
                    Reply to: {settings.reply_to_email}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
