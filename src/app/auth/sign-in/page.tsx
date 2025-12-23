"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignInPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const signInWithPassword = () => {
    startTransition(async () => {
      setMessage(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        window.location.assign(redirect);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            Sign in to MatterFlow
          </CardTitle>
          <CardDescription>Use your email and password to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Password (if enabled)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <Button
              type="button"
              className="w-full"
              onClick={signInWithPassword}
              disabled={!email || !password || pending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          </div>
          {message && <p className="text-xs text-amber-700">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
