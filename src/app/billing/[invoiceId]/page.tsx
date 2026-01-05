import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle, Clock, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInvoice } from "@/lib/data/queries";
import { InvoiceActions } from "./invoice-actions";

interface InvoiceDetailPageProps {
  params: Promise<{ invoiceId: string }>;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "default", icon: <Clock className="h-4 w-4" /> },
  sent: { label: "Sent", variant: "warning", icon: <Mail className="h-4 w-4" /> },
  paid: { label: "Paid", variant: "success", icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
  overdue: { label: "Overdue", variant: "danger", icon: <AlertCircle className="h-4 w-4" /> },
  partial: { label: "Partial", variant: "warning", icon: <Clock className="h-4 w-4" /> },
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const { data: invoice, error } = await getInvoice(invoiceId);

  if (error || !invoice) {
    notFound();
  }

  const status = statusConfig[invoice.status] || statusConfig.draft;
  const squarePaymentUrl = invoice.squareInvoiceId
    ? `https://squareup.com/pay-invoice/${invoice.squareInvoiceId}`
    : null;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing
          </Button>
        </Link>
      </div>

      {/* Invoice Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Invoice #{invoice.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-lg text-slate-600 mt-1">{invoice.matterTitle}</p>
          {invoice.clientEmail && (
            <p className="text-sm text-slate-500 mt-1">
              {invoice.clientName || invoice.clientEmail}
            </p>
          )}
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          squarePaymentUrl={squarePaymentUrl}
        />
      </div>

      {/* Status and Amount Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
            Status
          </p>
          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
            {status.icon}
            {status.label}
          </Badge>
          <p className="text-sm text-slate-500 mt-2">
            Issued: {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-slate-500">
              Due: {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
            Amount
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(invoice.totalCents)}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Balance: {formatCurrency(invoice.status === "paid" ? 0 : invoice.totalCents)}
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-slate-200 bg-white mb-8">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Description
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Hours
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Rate
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No line items
                  </td>
                </tr>
              ) : (
                invoice.lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {item.hours ? item.hours.toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {item.rate ? formatCurrency(item.rate * 100) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                      {formatCurrency(item.amount * 100)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                  {formatCurrency(invoice.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Link */}
      {squarePaymentUrl && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment Link</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm text-slate-700 truncate">
              {squarePaymentUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
