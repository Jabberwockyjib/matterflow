"use client";

import Link from "next/link";
import { Folder, Clock, AlertCircle, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";

type Matter = {
  id: string;
  title: string;
  matterType: string;
  stage: string;
  nextAction: string | null;
  nextActionDueDate: string | null;
  responsibleParty: string;
};

type ClientDashboardProps = {
  profileName: string | null;
  matters: Matter[];
  pendingIntake: {
    hasPendingIntake: boolean;
    matterId: string | null;
    matterTitle: string | null;
  };
};

const stageConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "outline" }> = {
  "Lead Created": { label: "New", variant: "default" },
  "Intake Sent": { label: "Intake Pending", variant: "warning" },
  "Intake Received": { label: "Under Review", variant: "default" },
  "Under Review": { label: "Under Review", variant: "default" },
  "Active": { label: "Active", variant: "success" },
  "On Hold": { label: "On Hold", variant: "outline" },
  "Completed": { label: "Completed", variant: "success" },
  "Archived": { label: "Archived", variant: "outline" },
};

export function ClientDashboard({ profileName, matters, pendingIntake }: ClientDashboardProps) {
  const activeMatters = matters.filter(m => m.stage !== "Completed" && m.stage !== "Archived");
  const actionRequired = matters.filter(m => m.responsibleParty === "client");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              MatterFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Welcome{profileName ? `, ${profileName}` : ""}
            </h1>
            <p className="text-sm text-slate-600">
              View your matters and complete any pending actions
            </p>
          </div>
          <Link href="/my-matters">
            <Button size="sm">
              View All Matters
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Pending Intake Alert */}
        {pendingIntake.hasPendingIntake && pendingIntake.matterId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-amber-900">
                  Action Required: Complete Your Intake Form
                </h2>
                <p className="text-amber-700 mt-1">
                  Please complete the intake form for &quot;{pendingIntake.matterTitle}&quot; to proceed with your matter.
                </p>
                <Link href={`/intake/${pendingIntake.matterId}`}>
                  <Button className="mt-4" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Complete Intake Form
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <ContentCard>
            <ContentCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{activeMatters.length}</p>
                  <p className="text-sm text-slate-500">Active Matters</p>
                </div>
              </div>
            </ContentCardContent>
          </ContentCard>

          <ContentCard>
            <ContentCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${actionRequired.length > 0 ? "bg-amber-100" : "bg-green-100"}`}>
                  {actionRequired.length > 0 ? (
                    <Clock className="h-6 w-6 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{actionRequired.length}</p>
                  <p className="text-sm text-slate-500">Actions Required</p>
                </div>
              </div>
            </ContentCardContent>
          </ContentCard>

          <ContentCard>
            <ContentCardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <FileText className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{matters.length}</p>
                  <p className="text-sm text-slate-500">Total Matters</p>
                </div>
              </div>
            </ContentCardContent>
          </ContentCard>
        </div>

        {/* Matters List */}
        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Your Matters
            </ContentCardTitle>
            <ContentCardDescription>
              Overview of your legal matters and their current status
            </ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent className="space-y-4">
            {matters.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No matters yet</h3>
                <p className="text-slate-600 mt-1">
                  Your legal matters will appear here once they are created.
                </p>
              </div>
            ) : (
              matters.map((matter) => {
                const stage = stageConfig[matter.stage] || { label: matter.stage, variant: "default" as const };
                const isActionRequired = matter.responsibleParty === "client";
                const isOverdue = matter.nextActionDueDate && new Date(matter.nextActionDueDate) < new Date();

                return (
                  <div
                    key={matter.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{matter.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={stage.variant}>{stage.label}</Badge>
                          <span className="text-sm text-slate-500 capitalize">{matter.matterType}</span>
                        </div>
                      </div>
                      {isActionRequired && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isOverdue ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          Action Required
                        </div>
                      )}
                    </div>

                    {/* Next Action */}
                    {matter.nextAction && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                          Next Step
                        </p>
                        <p className="text-sm text-slate-900">{matter.nextAction}</p>
                        {matter.nextActionDueDate && (
                          <p className={`text-xs mt-1 ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                            Due: {new Date(matter.nextActionDueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Links */}
                    {matter.stage === "Intake Sent" && (
                      <div className="mt-4">
                        <Link href={`/intake/${matter.id}`}>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete Intake Form
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </ContentCardContent>
        </ContentCard>

        {/* Help Section */}
        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle>Need Help?</ContentCardTitle>
          </ContentCardHeader>
          <ContentCardContent>
            <p className="text-slate-600">
              If you have questions about your matter or need assistance, please contact your attorney directly.
            </p>
          </ContentCardContent>
        </ContentCard>
      </main>
    </div>
  );
}
