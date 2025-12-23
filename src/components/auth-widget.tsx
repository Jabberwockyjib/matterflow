"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AuthWidget({ email }: { email?: string | null }) {
  const supabase = supabaseBrowser();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const handleSignOut = () => {
    startTransition(async () => {
      setStatus(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatus(error.message);
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span role="alert" className="text-xs text-red-600">{status}</span>
      )}
      {email ? (
        <>
          <span className="text-xs text-slate-600">{email}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSignOut}
            disabled={pending}
          >
            <LogOut className="mr-1 h-4 w-4" />
            Sign out
          </Button>
        </>
      ) : (
        <span className="text-xs text-slate-500">
          Sign in via /auth/sign-in
        </span>
      )}
    </div>
  );
}