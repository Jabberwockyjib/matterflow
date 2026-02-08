"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddTimeEntryDialog } from "@/components/time/quick-add-dialog";

interface AddTimeEntryModalProps {
  matterId: string;
  matterTitle?: string;
}

export function AddTimeEntryModal({ matterId, matterTitle }: AddTimeEntryModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Time Entry
      </Button>
      <QuickAddTimeEntryDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
        defaultMatterId={matterId}
        defaultMatterTitle={matterTitle}
      />
    </>
  );
}
