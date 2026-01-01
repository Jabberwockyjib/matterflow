import Link from "next/link";
import { ArrowLeft, Mail, User } from "lucide-react";
import { getClientProfile } from "@/lib/data/queries";
import { ClientDetailClient } from "./client-detail-client";

interface ClientDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { userId } = await params;

  const result = await getClientProfile(userId);

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Not Found</h2>
          <p className="text-red-700">{result.error || "Client not found"}</p>
          <Link
            href="/clients"
            className="inline-flex items-center mt-4 text-red-800 hover:text-red-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const { profile, matters, intakes, infoRequests } = result.data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User className="h-8 w-8" />
              {profile.fullName || "Unnamed Client"}
            </h1>
            <p className="text-slate-600 flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ClientDetailClient
        profile={profile}
        matters={matters}
        intakes={intakes}
        infoRequests={infoRequests}
      />
    </div>
  );
}
