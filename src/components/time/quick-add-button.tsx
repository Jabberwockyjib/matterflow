"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { QuickAddTimeEntryDialog } from "@/components/time/quick-add-dialog";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

export function QuickAddButton() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Register Cmd/Ctrl+K keyboard shortcut to open the quick add dialog
  useKeyboardShortcut(
    { key: "k", cmdOrCtrl: true },
    () => setOpen(true)
  );

  const handleSuccess = () => {
    // Refresh the page data to show new time entry
    router.refresh();
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Quick Add
      </Button>
      <QuickAddTimeEntryDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
