"use client";

import { Button } from "@/components/ui/button";

export function CloseButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.close()}
      className="w-full"
    >
      Close Window
    </Button>
  );
}
