import { Suspense } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/clients/pipeline-board";
import { ActiveClientsSection } from "@/components/clients/active-clients-section";
import { InviteClientModal } from "@/components/clients/invite-client-modal";
import {
  fetchClientInvitations,
  fetchIntakesByReviewStatus,
} from "@/lib/data/queries";

export default async function ClientsPage() {
  const [invitations, intakes] = await Promise.all([
    fetchClientInvitations(),
    fetchIntakesByReviewStatus(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Clients
          </h1>
          <p className="text-slate-600 mt-1">
            Manage client invitations, intake reviews, and active clients
          </p>
        </div>

        <div className="flex gap-2">
          <InviteClientModal />
          <Button variant="outline">Add Client Manually</Button>
        </div>
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
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Client Pipeline
        </h2>
        <Suspense fallback={<div>Loading pipeline...</div>}>
          <PipelineBoard invitations={invitations} intakes={intakes} />
        </Suspense>
      </div>

      {/* Active Clients Section */}
      <ActiveClientsSection />
    </div>
  );
}
