import Link from "next/link";
import { ReceiptText, Eye, Clock, Mail, CheckCircle, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { fetchInvoices } from "@/lib/data/queries";
import type { InvoiceSummary } from "@/lib/data/queries";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "default", icon: <Clock className="h-3.5 w-3.5" /> },
  sent: { label: "Sent", variant: "warning", icon: <Mail className="h-3.5 w-3.5" /> },
  paid: { label: "Paid", variant: "success", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  overdue: { label: "Overdue", variant: "danger", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  partial: { label: "Partial", variant: "warning", icon: <Clock className="h-3.5 w-3.5" /> },
};

function InvoiceGroup({ title, invoices, icon }: { title: string; invoices: InvoiceSummary[]; icon: React.ReactNode }) {
  if (invoices.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
        <Badge variant="outline" className="text-xs">{invoices.length}</Badge>
      </div>
      <div className="grid gap-3">
        {invoices.map((invoice) => {
          const status = statusConfig[invoice.status] || statusConfig.draft;
          return (
            <Link key={invoice.id} href={`/billing/${invoice.id}`}>
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4 min-w-0">
                  <Badge variant={status.variant} className="flex items-center gap-1 shrink-0">
                    {status.icon}
                    {status.label}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {invoice.matterTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      #{invoice.id.slice(0, 8).toUpperCase()}
                      {invoice.lineItemCount > 0 && ` · ${invoice.lineItemCount} item${invoice.lineItemCount !== 1 ? "s" : ""}`}
                      {invoice.dueDate && ` · Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.totalCents)}
                  </span>
                  <Eye className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const { data: invoices, source, error } = await fetchInvoices();
  const draftInvoices = invoices.filter(i => i.status === "draft");
  const sentInvoices = invoices.filter(i => i.status === "sent");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const partialInvoices = invoices.filter(i => i.status === "partial");

  const totalOutstanding = [...sentInvoices, ...overdueInvoices, ...partialInvoices]
    .reduce((sum, i) => sum + i.totalCents, 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.totalCents, 0);
  const totalDraft = draftInvoices.reduce((sum, i) => sum + i.totalCents, 0);

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
              Invoices are auto-created from time entries. Edit drafts before sending.{" "}
              <span className="font-medium text-slate-700">
                {source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
              {error ? ` — ${error}` : null}
            </p>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Draft</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalDraft)}</p>
            <p className="text-xs text-slate-500">{draftInvoices.length} invoice{draftInvoices.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-slate-500">{sentInvoices.length + overdueInvoices.length + partialInvoices.length} invoice{sentInvoices.length + overdueInvoices.length + partialInvoices.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Collected</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-slate-500">{paidInvoices.length} invoice{paidInvoices.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Grouped Invoice Lists */}
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <ReceiptText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No invoices yet. Log time on a matter to auto-create a draft invoice.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <InvoiceGroup
              title="Drafts"
              invoices={draftInvoices}
              icon={<Clock className="h-4 w-4 text-slate-500" />}
            />
            <InvoiceGroup
              title="Overdue"
              invoices={overdueInvoices}
              icon={<AlertCircle className="h-4 w-4 text-red-500" />}
            />
            <InvoiceGroup
              title="Sent"
              invoices={[...sentInvoices, ...partialInvoices]}
              icon={<Mail className="h-4 w-4 text-amber-500" />}
            />
            <InvoiceGroup
              title="Paid"
              invoices={paidInvoices}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            />
          </div>
        )}
      </main>
    </div>
  );
}
