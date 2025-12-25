import { CheckCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CloseButton } from "./close-button";

interface ThankYouPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { matterId } = await params;

  // Get matter and lawyer details
  const supabase = supabaseAdmin();
  const { data: matter } = await supabase
    .from("matters")
    .select("title, profiles:owner_id(full_name)")
    .eq("id", matterId)
    .single();

  const lawyerName = (matter?.profiles as any)?.full_name || "your attorney";

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

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          You can close this window or check your email for confirmation.
        </p>

        <CloseButton />
      </div>
    </div>
  );
}
