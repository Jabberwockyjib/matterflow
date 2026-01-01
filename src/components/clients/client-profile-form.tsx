"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateClientProfileSchema, type UpdateClientProfileData, phoneTypeValues, preferredContactMethodValues } from "@/lib/validation/schemas";
import { updateClientProfile } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface ClientProfileFormProps {
  userId: string;
  initialData: {
    phone?: string | null;
    phoneType?: string | null;
    phoneSecondary?: string | null;
    phoneSecondaryType?: string | null;
    companyName?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZip?: string | null;
    addressCountry?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    preferredContactMethod?: string | null;
    internalNotes?: string | null;
  };
  onSaved?: () => void;
}

export function ClientProfileForm({ userId, initialData, onSaved }: ClientProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<UpdateClientProfileData>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: {
      userId,
      phone: initialData.phone || "",
      phoneType: (initialData.phoneType as typeof phoneTypeValues[number]) || undefined,
      phoneSecondary: initialData.phoneSecondary || "",
      phoneSecondaryType: (initialData.phoneSecondaryType as typeof phoneTypeValues[number]) || undefined,
      companyName: initialData.companyName || "",
      addressStreet: initialData.addressStreet || "",
      addressCity: initialData.addressCity || "",
      addressState: initialData.addressState || "",
      addressZip: initialData.addressZip || "",
      addressCountry: initialData.addressCountry || "",
      emergencyContactName: initialData.emergencyContactName || "",
      emergencyContactPhone: initialData.emergencyContactPhone || "",
      preferredContactMethod: (initialData.preferredContactMethod as typeof preferredContactMethodValues[number]) || undefined,
      internalNotes: initialData.internalNotes || "",
    },
  });

  const onSubmit = async (data: UpdateClientProfileData) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.set(key, String(value));
        }
      });

      const result = await updateClientProfile(formData);

      if (result.ok) {
        setSuccess(true);
        onSaved?.();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Phone Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Phone</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Primary Phone</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder="555-123-4567"
            />
          </div>
          <div>
            <Label htmlFor="phoneType">Type</Label>
            <Select
              value={form.watch("phoneType") || ""}
              onValueChange={(value) => form.setValue("phoneType", value as typeof phoneTypeValues[number])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {phoneTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phoneSecondary">Secondary Phone</Label>
            <Input
              id="phoneSecondary"
              {...form.register("phoneSecondary")}
              placeholder="555-987-6543"
            />
          </div>
          <div>
            <Label htmlFor="phoneSecondaryType">Type</Label>
            <Select
              value={form.watch("phoneSecondaryType") || ""}
              onValueChange={(value) => form.setValue("phoneSecondaryType", value as typeof phoneTypeValues[number])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {phoneTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Company */}
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          {...form.register("companyName")}
          placeholder="Acme Corp"
        />
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Address</h3>
        <div>
          <Label htmlFor="addressStreet">Street Address</Label>
          <Input
            id="addressStreet"
            {...form.register("addressStreet")}
            placeholder="123 Main St"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressCity">City</Label>
            <Input
              id="addressCity"
              {...form.register("addressCity")}
              placeholder="Springfield"
            />
          </div>
          <div>
            <Label htmlFor="addressState">State</Label>
            <Input
              id="addressState"
              {...form.register("addressState")}
              placeholder="IL"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressZip">ZIP Code</Label>
            <Input
              id="addressZip"
              {...form.register("addressZip")}
              placeholder="62701"
            />
          </div>
          <div>
            <Label htmlFor="addressCountry">Country</Label>
            <Input
              id="addressCountry"
              {...form.register("addressCountry")}
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Emergency Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input
              id="emergencyContactName"
              {...form.register("emergencyContactName")}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input
              id="emergencyContactPhone"
              {...form.register("emergencyContactPhone")}
              placeholder="555-111-2222"
            />
          </div>
        </div>
      </div>

      {/* Preferred Contact Method */}
      <div>
        <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
        <Select
          value={form.watch("preferredContactMethod") || ""}
          onValueChange={(value) => form.setValue("preferredContactMethod", value as typeof preferredContactMethodValues[number])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select preferred method" />
          </SelectTrigger>
          <SelectContent>
            {preferredContactMethodValues.map((method) => (
              <SelectItem key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Internal Notes */}
      <div>
        <Label htmlFor="internalNotes">Internal Notes</Label>
        <p className="text-xs text-slate-500 mb-1">Only visible to staff</p>
        <Textarea
          id="internalNotes"
          {...form.register("internalNotes")}
          placeholder="Notes about this client..."
          rows={4}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        {success && (
          <span className="text-sm text-green-600">Changes saved successfully</span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </form>
  );
}
