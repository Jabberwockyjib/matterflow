"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck, Chrome, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/ui/form-field";
import { supabaseBrowser } from "@/lib/supabase/client";
import { signUpSchema, type SignUpFormData } from "@/lib/validation/schemas";
import { validateInviteCode, signUpWithInviteCode } from "@/lib/auth/signup-actions";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";
import { showSuccess, showError } from "@/lib/toast";

export default function SignUpPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCodeFromUrl = searchParams.get("code") || "";
  const redirect = sanitizeReturnUrl(searchParams.get("redirect"));

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [inviteValidation, setInviteValidation] = useState<{
    status: "idle" | "validating" | "valid" | "invalid";
    error?: string;
    clientName?: string;
    clientEmail?: string;
  }>({ status: "idle" });

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      inviteCode: inviteCodeFromUrl,
      email: "",
      password: "",
      fullName: "",
    },
  });

  const inviteCode = watch("inviteCode");

  // Validate invite code with debounce
  const validateCode = useCallback(async (code: string) => {
    if (!code || code.trim().length === 0) {
      setInviteValidation({ status: "idle" });
      return;
    }

    setInviteValidation({ status: "validating" });

    const result = await validateInviteCode(code.trim());

    if (result.valid && result.invitation) {
      setInviteValidation({
        status: "valid",
        clientName: result.invitation.clientName,
        clientEmail: result.invitation.clientEmail,
      });
      // Pre-fill the email if it matches the invitation
      if (result.invitation.clientEmail) {
        setValue("email", result.invitation.clientEmail);
      }
      // Pre-fill the name
      if (result.invitation.clientName) {
        setValue("fullName", result.invitation.clientName);
      }
    } else {
      setInviteValidation({
        status: "invalid",
        error: result.error || "Invalid invite code",
      });
    }
  }, [setValue]);

  // Debounced validation effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateCode(inviteCode);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inviteCode, validateCode]);

  // Handle form submission
  const onSubmit = async (data: SignUpFormData) => {
    // Double-check invite code is valid
    if (inviteValidation.status !== "valid") {
      showError("Please enter a valid invite code");
      return;
    }

    const result = await signUpWithInviteCode(data);

    if (!result.success) {
      showError(result.error || "Failed to create account");
      return;
    }

    // Now sign in the user
    const supabase = supabaseBrowser();
    if (!supabase) {
      showError("Authentication service is not available");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      // Account was created but sign-in failed
      showError("Account created! Please sign in with your new credentials.");
      router.push("/auth/sign-in");
      return;
    }

    showSuccess("Account created successfully!");
    router.push(redirect);
  };

  // Handle Google OAuth sign-up
  const handleGoogleSignUp = async () => {
    if (inviteValidation.status !== "valid") {
      showError("Please enter a valid invite code first");
      return;
    }

    const supabase = supabaseBrowser();
    if (!supabase) {
      showError("Authentication service is not available");
      return;
    }

    // Store invite code in localStorage for the OAuth callback
    sessionStorage.setItem("matterflow_invite_code", inviteCode);

    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback/oauth?code=${inviteCode}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("[Google Sign-up] Error:", error);
      showError(error.message);
      setIsGoogleLoading(false);
      sessionStorage.removeItem("matterflow_invite_code");
    }
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            Create your MatterFlow account
          </CardTitle>
          <CardDescription>
            Enter your invite code to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Invite Code Field */}
            <div className="space-y-1">
              <FormInput
                label="Invite Code"
                type="text"
                placeholder="Enter your invite code"
                registration={register("inviteCode")}
                error={errors.inviteCode}
                required
              />
              {inviteValidation.status === "validating" && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating...
                </div>
              )}
              {inviteValidation.status === "valid" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  Valid invite for {inviteValidation.clientName}
                </div>
              )}
              {inviteValidation.status === "invalid" && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <X className="h-3 w-3" />
                  {inviteValidation.error}
                </div>
              )}
            </div>

            <FormInput
              label="Full Name"
              type="text"
              placeholder="John Doe"
              registration={register("fullName")}
              error={errors.fullName}
              required
              disabled={inviteValidation.status !== "valid"}
            />

            <FormInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              registration={register("email")}
              error={errors.email}
              required
              disabled={inviteValidation.status !== "valid"}
            />

            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              registration={register("password")}
              error={errors.password}
              required
              disabled={inviteValidation.status !== "valid"}
            />

            <p className="text-xs text-slate-500">
              Password must be at least 8 characters with uppercase, lowercase, and a number.
            </p>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isGoogleLoading || inviteValidation.status !== "valid"}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating account..." : "Create account with Email"}
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
            onClick={handleGoogleSignUp}
            disabled={isSubmitting || isGoogleLoading || inviteValidation.status !== "valid"}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isGoogleLoading ? "Redirecting..." : "Sign up with Google"}
          </Button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
