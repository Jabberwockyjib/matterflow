"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const declineFormSchema = z.object({
  reason: z.enum(["incomplete_info", "not_good_fit", "client_unresponsive", "other"]),
  notes: z.string().optional(),
});

type DeclineFormData = z.infer<typeof declineFormSchema>;

interface DeclineIntakeModalProps {
  intakeId: string;
  clientName: string;
  onClose: () => void;
  onSubmit: (data: DeclineFormData) => Promise<void>;
}

const REASON_LABELS = {
  incomplete_info: "Incomplete Information",
  not_good_fit: "Not a Good Fit",
  client_unresponsive: "Client Unresponsive",
  other: "Other",
};

export function DeclineIntakeModal({
  intakeId,
  clientName,
  onClose,
  onSubmit,
}: DeclineIntakeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeclineFormData>({
    resolver: zodResolver(declineFormSchema),
    defaultValues: {
      reason: "incomplete_info",
      notes: "",
    },
  });

  const reason = watch("reason");

  const onSubmitForm = async (data: DeclineFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success("Intake form declined");
      onClose();
    } catch (error) {
      toast.error("Failed to decline intake form");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Intake Form</DialogTitle>
          <DialogDescription>
            Decline the intake form for {clientName}. This will update the matter status and notify the client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Warning Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will decline the intake and update the matter to "Declined" status.
            </p>
          </div>

          {/* Reason Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Declining</Label>
            <Select
              onValueChange={(value) =>
                setValue("reason", value as any)
              }
              defaultValue="incomplete_info"
            >
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context for your team..."
              {...register("notes")}
              rows={4}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Declining..." : "Decline Intake"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
