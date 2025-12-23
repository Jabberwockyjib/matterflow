"use client";

import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";

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
  const redirect = searchParams.get("redirect") || "/";

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
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      showError(error.message, {
        onRetry: () => handleSubmit(onSubmit)(),
      });
    } else {
      // Clear draft on successful login
      clearDraft();
      showSuccess("Signed in successfully");
      // Small delay to show toast before redirect
      setTimeout(() => {
        window.location.assign(redirect);
      }, 500);
    }
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
              disabled={isSubmitting}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}