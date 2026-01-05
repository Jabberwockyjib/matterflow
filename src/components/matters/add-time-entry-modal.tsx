"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTimeEntry } from "@/lib/data/actions";

interface AddTimeEntryModalProps {
  matterId: string;
}

export function AddTimeEntryModal({ matterId }: AddTimeEntryModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billable, setBillable] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("matterId", matterId);

    // Convert hours to minutes
    const hours = parseFloat(formData.get("hours") as string) || 0;
    const minutes = Math.round(hours * 60);
    formData.set("minutes", String(minutes));
    formData.delete("hours");

    const result = await createTimeEntry(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Time Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Log time spent on this matter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="e.g., Reviewed contract and made revisions..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                step="0.25"
                min="0.25"
                placeholder="1.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              name="billable"
              checked={billable}
              onCheckedChange={(checked) => setBillable(checked as boolean)}
            />
            <Label htmlFor="billable" className="text-sm font-normal">
              Billable time
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
