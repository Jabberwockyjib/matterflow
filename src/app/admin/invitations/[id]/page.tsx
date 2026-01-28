import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvitationActions } from "./invitation-actions";

interface InvitationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitationDetailPage({
  params,
}: InvitationDetailPageProps) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  // Get the invitation
  const { data: invitation, error } = await supabase
    .from("client_invitations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !invitation) {
    notFound();
  }

  // Get inviter details
  let inviterName = "Unknown";
  if (invitation.invited_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", invitation.invited_by)
      .single();
    inviterName = profile?.full_name || "Unknown";
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
  };

  const isExpired =
    invitation.expires_at && new Date(invitation.expires_at) < new Date();
  const displayStatus = isExpired && invitation.status === "pending"
    ? "expired"
    : invitation.status;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>

      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Invitation Details
          </h1>
          <Badge className={statusColors[displayStatus] || statusColors.pending}>
            {displayStatus}
          </Badge>
        </div>
        <p className="text-slate-600">
          View and manage client invitation
        </p>
      </div>

      {/* Invitation Details Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Client Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Client Name
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {invitation.client_name}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Client Email
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {invitation.client_email}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Matter Type
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {invitation.matter_type || "General"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Invited By
            </p>
            <p className="mt-1 text-sm text-slate-900">{inviterName}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Invited At
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {invitation.created_at
                ? new Date(invitation.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Expires At
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {invitation.expires_at
                ? new Date(invitation.expires_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No expiration"}
            </p>
          </div>
        </div>

        {invitation.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Notes
            </p>
            <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
              {invitation.notes}
            </p>
          </div>
        )}
      </div>

      {/* Invitation Link Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Invitation Link
        </h2>
        <div className="bg-slate-50 rounded-md p-3 font-mono text-sm break-all">
          {process.env.NEXT_PUBLIC_APP_URL || "https://matter.develotype.com"}
          /intake/invite/{invitation.invite_code}
        </div>
      </div>

      {/* Actions */}
      <InvitationActions
        invitationId={invitation.id}
        status={displayStatus}
        clientEmail={invitation.client_email}
        clientName={invitation.client_name}
        inviteCode={invitation.invite_code}
      />
    </div>
  );
}
