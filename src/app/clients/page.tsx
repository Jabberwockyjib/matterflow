import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Users } from "lucide-react";
import { PipelineBoard } from "@/components/clients/pipeline-board";
import { ActiveClientsSection } from "@/components/clients/active-clients-section";
import {
  fetchClientInvitations,
  fetchIntakesByReviewStatus,
} from "@/lib/data/queries";

// Lazy load modal for code splitting
const InviteClientModal = dynamic(
  () => import("@/components/clients/invite-client-modal").then(mod => ({ default: mod.InviteClientModal }))
);

export default async function ClientsPage() {
  const [invitations, intakes] = await Promise.all([
    fetchClientInvitations(),
    fetchIntakesByReviewStatus(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Clients
        </h1>
        <InviteClientModal />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Invited</div>
          <div className="text-2xl font-bold text-slate-900">
            {invitations.pending.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Under Review</div>
          <div className="text-2xl font-bold text-slate-900">
            {intakes.pending.length + intakes.underReview.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Active</div>
          <div className="text-2xl font-bold text-slate-900">0</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Past</div>
          <div className="text-2xl font-bold text-slate-900">0</div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="mb-8">
        <Suspense fallback={<div>Loading pipeline...</div>}>
          <PipelineBoard invitations={invitations} intakes={intakes} />
        </Suspense>
      </div>

      {/* Active Clients Section */}
      <ActiveClientsSection />
    </div>
  );
}
