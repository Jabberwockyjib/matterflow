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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Zod schema for call scheduling
const scheduleCallSchema = z.object({
  dateTime: z.string().min(1, "Date and time is required"),
  duration: z.coerce.number().int().positive(),
  meetingType: z.enum(["phone", "video", "in_person"]),
  meetingLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ScheduleCallFormData = z.infer<typeof scheduleCallSchema>;

interface ScheduleCallModalProps {
  intakeResponseId: string;
  clientName: string;
  clientEmail: string;
  onClose: () => void;
  onSubmit: (data: ScheduleCallFormData & { intakeResponseId: string }) => void;
}

export function ScheduleCallModal({
  intakeResponseId,
  clientName,
  clientEmail,
  onClose,
  onSubmit,
}: ScheduleCallModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScheduleCallFormData>({
    resolver: zodResolver(scheduleCallSchema),
    defaultValues: {
      duration: 60,
      meetingType: "phone",
      notes: "",
      meetingLink: "",
    },
  });

  const meetingType = watch("meetingType");

  const onSubmitForm = async (data: ScheduleCallFormData) => {
    setIsSubmitting(true);
    try {
      // If meeting type is not video, remove meeting link
      const submitData = {
        ...data,
        meetingLink: data.meetingType === "video" ? data.meetingLink : undefined,
        intakeResponseId,
      };

      await onSubmit(submitData);
      toast.success("Calendar invite sent successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to schedule call");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Consultation Call</DialogTitle>
          <DialogDescription>
            Schedule a consultation call with {clientName} ({clientEmail})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Date & Time */}
          <div className="space-y-2">
            <Label htmlFor="dateTime">Date & Time</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              {...register("dateTime")}
              aria-invalid={errors.dateTime ? "true" : "false"}
            />
            {errors.dateTime && (
              <p className="text-sm text-red-500">{errors.dateTime.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select
              onValueChange={(value) => setValue("duration", parseInt(value))}
              defaultValue="60"
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
            {errors.duration && (
              <p className="text-sm text-red-500">{errors.duration.message}</p>
            )}
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meetingType">Meeting Type</Label>
            <Select
              onValueChange={(value) =>
                setValue("meetingType", value as "phone" | "video" | "in_person")
              }
              defaultValue="phone"
            >
              <SelectTrigger id="meetingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="in_person">In-Person Meeting</SelectItem>
              </SelectContent>
            </Select>
            {errors.meetingType && (
              <p className="text-sm text-red-500">{errors.meetingType.message}</p>
            )}
          </div>

          {/* Meeting Link (conditional) */}
          {meetingType === "video" && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://zoom.us/j/..."
                {...register("meetingLink")}
                aria-invalid={errors.meetingLink ? "true" : "false"}
              />
              {errors.meetingLink && (
                <p className="text-sm text-red-500">{errors.meetingLink.message}</p>
              )}
            </div>
          )}

          {/* Notes to Client */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes to Client (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information for the client..."
              {...register("notes")}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Calendar Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
