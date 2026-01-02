"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck, Chrome } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-field";
import { supabaseBrowser } from "@/lib/supabase/client";
import { signInSchema, type SignInFormData } from "@/lib/validation/schemas";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { showSuccess, showError } from "@/lib/toast";

export default function SignInPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/";
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsCheckingAuth(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Already logged in, redirect to dashboard
        router.push(redirect);
      } else {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [supabase, router, redirect]);

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Enable draft persistence for form state across page refreshes
  const { clearDraft } = useDraftPersistence({
    formId: "sign-in",
    watch,
    reset,
  });

  // Warn users when navigating away with unsaved changes
  useUnsavedChanges({ isDirty });

  // Handle form submission
  const onSubmit = async (data: SignInFormData) => {
    console.log('[Sign-in] Attempting sign in...');
    const supabase = supabaseBrowser();
    if (!supabase) {
      showError("Authentication service is not available");
      return;
    }
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    console.log('[Sign-in] Result:', { error, session: !!authData?.session });

    if (error) {
      console.error('[Sign-in] Error:', error);
      showError(error.message, {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      console.log('[Sign-in] Success! Session:', authData.session);
      // Clear draft on successful login
      clearDraft();
      showSuccess("Signed in successfully");
      // AuthListener will handle the redirect, just let it know we're done
      console.log('[Sign-in] Sign-in successful, AuthListener will handle redirect');
    }
  };

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      showError("Authentication service is not available");
      return;
    }

    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirect}`,
      },
    });

    if (error) {
      console.error('[Google Sign-in] Error:', error);
      showError(error.message);
      setIsGoogleLoading(false);
    }
    // If successful, the page will redirect to Google
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              registration={register("email")}
              error={errors.email}
              required
            />
            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              registration={register("password")}
              error={errors.password}
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isGoogleLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleLoading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isGoogleLoading ? "Redirecting..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}