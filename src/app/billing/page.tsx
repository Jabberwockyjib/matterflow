import Link from "next/link";
import { ReceiptText, Wallet2, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { createInvoice, updateInvoiceStatus } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchInvoices, fetchMatters } from "@/lib/data/queries";
import { supabaseEnvReady } from "@/lib/supabase/server";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);

export default async function BillingPage() {
  const { data: invoices, source, error } = await fetchInvoices();
  const { data: matters } = await fetchMatters();
  const supabaseReady = supabaseEnvReady();
  const { profile } = await getSessionWithProfile();
  const canEdit = supabaseReady && profile?.role !== "client";

  return (
    <div className="bg-background">
      <header className="border-b-2 border-border bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              MatterFlow
            </p>
            <h1 className="font-lora text-4xl font-bold leading-tight text-foreground">
              Billing & Invoices
            </h1>
            <p className="text-sm text-slate-600">
              MatterFlow is the source of truth; Square handles collection.{" "}
              <span className="font-medium text-slate-700">
                {source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
              {error ? ` — ${error}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Retry failed syncs
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <ContentCard>
          <ContentCardHeader className="pb-2">
            <ContentCardTitle>Create invoice</ContentCardTitle>
            <ContentCardDescription>Billing stays here; Square handles payment.</ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {canEdit ? (
              <form action={createInvoice as unknown as (formData: FormData) => void} className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Matter ID
                  </span>
                  <select
                    name="matterId"
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a matter
                    </option>
                    {matters.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Amount (USD)
                  </span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="1800"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    name="status"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue="draft"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </label>
                <div className="md:col-span-3">
                  <Button type="submit">
                    New Invoice
                    <ReceiptText className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-amber-700">
                {supabaseReady
                  ? "Clients cannot create invoices. Sign in as staff/admin."
                  : "Supabase env vars not set; creation disabled."}
              </p>
            )}
          </ContentCardContent>
        </ContentCard>

        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <ContentCard
              key={invoice.id}
              className="border-slate-200 bg-white transition hover:shadow-sm"
            >
              <ContentCardHeader className="pb-2">
                <ContentCardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Wallet2 className="h-4 w-4 text-slate-500" />
                  Invoice {invoice.id.slice(0, 8)}
                </ContentCardTitle>
                <ContentCardDescription className="text-xs text-slate-600">
                  Matter ID: {invoice.matterId}
                </ContentCardDescription>
              </ContentCardHeader>
              <ContentCardContent className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                <Badge variant="outline" className="capitalize">
                  {invoice.status}
                </Badge>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(invoice.totalCents)}
                </span>
                <span className="text-slate-600">
                  Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Unset"}
                </span>
                {invoice.squareInvoiceId ? (
                  <Badge variant="success">Square: {invoice.squareInvoiceId}</Badge>
                ) : (
                  <Badge variant="warning">Not synced to Square</Badge>
                )}
                <Link href={`/billing/${invoice.id}`}>
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                {canEdit ? (
                  <form action={updateInvoiceStatus as unknown as (formData: FormData) => void} className="flex items-center gap-2 text-xs">
                    <input type="hidden" name="id" value={invoice.id} />
                    <select
                      name="status"
                      defaultValue={invoice.status}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    <Button size="sm" variant="secondary" type="submit">
                      Update
                    </Button>
                  </form>
                ) : null}
              </ContentCardContent>
            </ContentCard>
          ))}
        </div>
      </main>
    </div>
  );
}
