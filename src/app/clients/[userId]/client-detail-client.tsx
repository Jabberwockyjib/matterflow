"use client";

import { ClientProfileForm } from "@/components/clients/client-profile-form";
import { ClientMattersList } from "@/components/clients/client-matters-list";
import { ClientIntakesList } from "@/components/clients/client-intakes-list";
import { ClientInfoRequestsList } from "@/components/clients/client-info-requests-list";
import type {
  ClientProfile,
  ClientMatterSummary,
  ClientIntakeSummary,
  ClientInfoRequestSummary,
} from "@/lib/data/queries";

interface ClientDetailClientProps {
  profile: ClientProfile;
  matters: ClientMatterSummary[];
  intakes: ClientIntakeSummary[];
  infoRequests: ClientInfoRequestSummary[];
}

export function ClientDetailClient({
  profile,
  matters,
  intakes,
  infoRequests,
}: ClientDetailClientProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Editable Form */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Contact Information
          </h2>
          <ClientProfileForm
            userId={profile.userId}
            initialData={{
              phone: profile.phone,
              phoneType: profile.phoneType,
              phoneSecondary: profile.phoneSecondary,
              phoneSecondaryType: profile.phoneSecondaryType,
              companyName: profile.companyName,
              addressStreet: profile.addressStreet,
              addressCity: profile.addressCity,
              addressState: profile.addressState,
              addressZip: profile.addressZip,
              addressCountry: profile.addressCountry,
              emergencyContactName: profile.emergencyContactName,
              emergencyContactPhone: profile.emergencyContactPhone,
              preferredContactMethod: profile.preferredContactMethod,
              internalNotes: profile.internalNotes,
            }}
          />
        </div>
      </div>

      {/* Right Column - Read-Only Context */}
      <div className="space-y-6">
        {/* Matters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Associated Matters
          </h2>
          <ClientMattersList matters={matters} />
        </div>

        {/* Intakes */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Intake Submissions
          </h2>
          <ClientIntakesList intakes={intakes} />
        </div>

        {/* Info Requests */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Info Requests
          </h2>
          <ClientInfoRequestsList infoRequests={infoRequests} />
        </div>
      </div>
    </div>
  );
}
