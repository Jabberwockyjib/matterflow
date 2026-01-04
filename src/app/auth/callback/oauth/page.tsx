"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseBrowser } from "@/lib/supabase/client";
import { validateInviteCode } from "@/lib/auth/signup-actions";
import { linkUserToInvitation } from "@/lib/auth/signup-actions";
import { showSuccess, showError } from "@/lib/toast";

/**
 * OAuth callback page for sign-up with invite code.
 * This page is reached after Google OAuth completes.
 * It validates the invite code and links the new user to the invitation.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processOAuthCallback = async () => {
      const supabase = supabaseBrowser();
      if (!supabase) {
        setStatus("error");
        setErrorMessage("Authentication service is not available");
        return;
      }

      // Get the current session (set by Supabase OAuth flow)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setStatus("error");
        setErrorMessage("Failed to complete sign-in. Please try again.");
        return;
      }

      // Get invite code from URL or localStorage
      const inviteCode = searchParams.get("code") || localStorage.getItem("matterflow_invite_code");
      localStorage.removeItem("matterflow_invite_code"); // Clean up

      // Check if this is a new user by looking at profile creation time
      // The trigger creates profiles immediately, so we check if it was created recently
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, role, created_at, invited_at")
        .eq("user_id", session.user.id)
        .single();

      // If user is admin or staff (invited via inviteUser action), let them through
      if (profile && (profile.role === "admin" || profile.role === "staff")) {
        router.push("/dashboard");
        return;
      }

      // If profile has invited_at set, they were invited via the internal system
      if (profile?.invited_at) {
        router.push("/dashboard");
        return;
      }

      // For clients, check if this is a new signup (created in last 5 minutes) without invite
      const isNewUser = profile && new Date(profile.created_at).getTime() > Date.now() - 5 * 60 * 1000;

      if (!inviteCode) {
        if (isNewUser) {
          // New user without invite code - sign them out and show error
          await supabase.auth.signOut();
          setStatus("error");
          setErrorMessage("An invite code is required to create an account. Please use your invite link.");
          return;
        }
        // Existing user, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      // Validate the invite code
      const inviteResult = await validateInviteCode(inviteCode);

      if (!inviteResult.valid || !inviteResult.invitation) {
        // Invalid invite code - sign out and show error
        await supabase.auth.signOut();
        setStatus("error");
        setErrorMessage(inviteResult.error || "Invalid invite code. Please use a valid invite link.");
        return;
      }

      // Link the user to the invitation
      const linkResult = await linkUserToInvitation(session.user.id, inviteResult.invitation.id);

      if (!linkResult.success) {
        // Failed to link - but user is created
        // Log the error but let them continue
        console.error("[OAuth Callback] Failed to link user to invitation:", linkResult.error);
      }

      setStatus("success");
      showSuccess("Account created successfully!");
      router.push("/dashboard");
    };

    processOAuthCallback();
  }, [router, searchParams]);

  if (status === "processing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
            <p className="mt-4 text-slate-600">Completing sign-up...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Sign-up Error</h2>
            <p className="mt-2 text-slate-600">{errorMessage}</p>
            <div className="mt-6 space-y-2">
              <a
                href="/auth/sign-up"
                className="block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              >
                Try again
              </a>
              <a
                href="/auth/sign-in"
                className="block text-sm text-slate-600 hover:text-slate-900"
              >
                Already have an account? Sign in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md border-slate-200">
        <CardContent className="p-8 text-center">
          <p className="text-slate-600">Redirecting...</p>
        </CardContent>
      </Card>
    </div>
  );
}
