"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateMatterStage, createTask } from "@/lib/data/actions";
import {
  matterStageValues,
  responsiblePartyValues,
} from "@/lib/validation/schemas";

interface EditMatterWorkflowModalProps {
  matterId: string;
  currentStage: string;
  currentResponsibleParty: string;
  currentNextAction: string | null;
  currentNextActionDueDate: string | null;
}

export function EditMatterWorkflowModal({
  matterId,
  currentStage,
  currentResponsibleParty,
  currentNextAction,
  currentNextActionDueDate,
}: EditMatterWorkflowModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createTaskChecked, setCreateTaskChecked] = useState(false);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const newNextAction = formData.get("nextAction") as string;
    const newDueDate = formData.get("nextActionDueDate") as string;
    const newResponsibleParty = formData.get("responsibleParty") as string;

    // Update matter workflow
    formData.set("id", matterId);
    const result = await updateMatterStage(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Optionally create a task if checkbox is checked and next action changed
    if (createTaskChecked && newNextAction && newNextAction !== currentNextAction) {
      const taskFormData = new FormData();
      taskFormData.set("matterId", matterId);
      taskFormData.set("title", newNextAction);
      taskFormData.set("responsibleParty", newResponsibleParty || "lawyer");
      if (newDueDate) {
        taskFormData.set("dueDate", newDueDate);
      }

      const taskResult = await createTask(taskFormData);
      if (taskResult.error) {
        // Log but don't fail - matter was updated successfully
        console.error("Failed to create task:", taskResult.error);
      }
    }

    setLoading(false);
    setOpen(false);
    setCreateTaskChecked(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Matter Workflow</DialogTitle>
          <DialogDescription>
            Update the stage, next action, and responsible party for this matter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="stage">Stage *</Label>
            <Select name="stage" defaultValue={currentStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {matterStageValues.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsibleParty">Responsible Party *</Label>
            <Select name="responsibleParty" defaultValue={currentResponsibleParty}>
              <SelectTrigger>
                <SelectValue placeholder="Select responsible party" />
              </SelectTrigger>
              <SelectContent>
                {responsiblePartyValues.map((party) => (
                  <SelectItem key={party} value={party}>
                    {party.charAt(0).toUpperCase() + party.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextAction">Next Action *</Label>
            <Input
              id="nextAction"
              name="nextAction"
              defaultValue={currentNextAction || ""}
              placeholder="e.g., Review documents"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextActionDueDate">Due Date *</Label>
            <Input
              id="nextActionDueDate"
              name="nextActionDueDate"
              type="date"
              defaultValue={formatDateForInput(currentNextActionDueDate)}
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="createTask"
              checked={createTaskChecked}
              onCheckedChange={(checked) => setCreateTaskChecked(checked === true)}
            />
            <Label
              htmlFor="createTask"
              className="text-sm font-normal cursor-pointer"
            >
              Also create a task for this action
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
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
