import { CheckCircle, UserPlus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CloseButton } from "./close-button";
import Link from "next/link";

interface MatterWithOwner {
  title: string | null;
  client_id: string | null;
  invitation_id: string | null;
  profiles: { full_name: string | null } | null;
}

interface ThankYouPageProps {
  params: Promise<{ matterId: string }>;
  searchParams: Promise<{ code?: string }>;
}

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const { matterId } = await params;
  const { code } = await searchParams;

  // Get matter and lawyer details
  const supabase = supabaseAdmin();
  const { data: matter, error } = await supabase
    .from("matters")
    .select("title, client_id, invitation_id, profiles:owner_id(full_name)")
    .eq("id", matterId)
    .single();

  if (error) {
    console.error("Error fetching matter details:", error);
  }

  const typedMatter = matter as unknown as MatterWithOwner | null;
  const lawyerName = typedMatter?.profiles?.full_name || "your attorney";

  // Show account creation prompt if anonymous (has invite code and no linked client)
  const showAccountCreation = code && !typedMatter?.client_id;

  // Verify the invite code is valid if present
  let inviteCodeValid = false;
  if (code) {
    const { data: invitation } = await supabase
      .from("client_invitations")
      .select("id, status")
      .eq("invite_code", code)
      .single();

    inviteCodeValid = !!invitation;
  }

  const signUpUrl = inviteCodeValid ? `/auth/sign-up?code=${code}` : "/auth/sign-up";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Thank You!
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your intake form has been submitted successfully. We&apos;ve notified {lawyerName}.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            You&apos;ll hear from us within <strong>2 business days</strong>.
          </p>
        </div>

        {showAccountCreation && inviteCodeValid && (
          <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Create Your Account
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Set up an account to:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-4 ml-4 list-disc">
              <li>Track your matter&apos;s progress</li>
              <li>Communicate securely with your lawyer</li>
              <li>Complete tasks and upload documents</li>
              <li>View invoices and make payments</li>
            </ul>
            <Link
              href={signUpUrl}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
            >
              Create Your Account
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              You can also create an account later via email.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          You can close this window or check your email for confirmation.
        </p>

        <CloseButton />
      </div>
    </div>
  );
}
