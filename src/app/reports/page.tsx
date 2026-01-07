import Link from "next/link";
import { BarChart3, Clock, DollarSign, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { StatCard } from "@/components/cards/stat-card";
import {
  fetchTimeReport,
  fetchRevenueByMatterType,
  fetchInvoiceAging,
} from "@/lib/data/queries";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);

const formatHours = (minutes: number) => {
  const hours = minutes / 60;
  return hours.toFixed(1);
};

export const metadata = {
  title: "Reports | MatterFlow",
  description: "View time tracking, revenue, and invoice aging reports",
};

export default async function ReportsPage() {
  const [timeReport, revenueReport, invoiceAging] = await Promise.all([
    fetchTimeReport(),
    fetchRevenueByMatterType(),
    fetchInvoiceAging(),
  ]);

  // Calculate invoice aging summary
  const agingSummary = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  for (const invoice of invoiceAging.data) {
    agingSummary[invoice.ageBucket] += invoice.totalCents;
  }
  const totalOutstanding = Object.values(agingSummary).reduce((a, b) => a + b, 0);

  // Calculate revenue totals
  const totalRevenue = revenueReport.data.reduce((sum, r) => sum + r.totalCents, 0);
  const paidRevenue = revenueReport.data.reduce((sum, r) => sum + r.paidCents, 0);

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b-2 border-border bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              MatterFlow
            </p>
            <h1 className="font-lora text-4xl font-bold leading-tight text-foreground">
              Reports
            </h1>
            <p className="text-sm text-slate-600">
              Track time, revenue, and outstanding invoices.{" "}
              <span className="font-medium text-slate-700">
                {timeReport.source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={timeReport.source === "supabase" ? "success" : "warning"}>
              {timeReport.source === "supabase" ? "Live data" : "Mock data"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Summary Stats */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total Hours"
            value={formatHours(timeReport.data.totalMinutes)}
            helper={`${timeReport.data.totalEntries} entries`}
            icon={Clock}
          />
          <StatCard
            label="Approved Hours"
            value={formatHours(timeReport.data.approvedMinutes)}
            helper={`${timeReport.data.approvedEntries} approved entries`}
            icon={Clock}
          />
          <StatCard
            label="Total Invoiced"
            value={formatCurrency(totalRevenue)}
            helper={`${formatCurrency(paidRevenue)} collected`}
            icon={DollarSign}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(totalOutstanding)}
            helper={`${invoiceAging.data.length} unpaid invoices`}
            icon={AlertTriangle}
          />
        </section>

        {/* Time Report */}
        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Time by Matter Type
            </ContentCardTitle>
            <ContentCardDescription>
              Hours logged grouped by matter type
            </ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {timeReport.data.byMatterType.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No time entries recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {timeReport.data.byMatterType.map((item) => {
                  const percentage = timeReport.data.totalMinutes > 0
                    ? (item.minutes / timeReport.data.totalMinutes) * 100
                    : 0;
                  return (
                    <div key={item.matterType} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-900">
                          {item.matterType}
                        </span>
                        <span className="text-slate-600">
                          {formatHours(item.minutes)} hrs ({item.count} entries)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ContentCardContent>
        </ContentCard>

        {/* Revenue by Matter Type */}
        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Revenue by Matter Type
            </ContentCardTitle>
            <ContentCardDescription>
              Invoice totals and collection by matter type
            </ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {revenueReport.data.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No invoices created yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 text-left font-medium text-slate-500">
                        Matter Type
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Invoices
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Total
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Collected
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Collection Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueReport.data.map((item) => {
                      const collectionRate = item.totalCents > 0
                        ? (item.paidCents / item.totalCents) * 100
                        : 0;
                      return (
                        <tr
                          key={item.matterType}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 font-medium text-slate-900">
                            {item.matterType}
                          </td>
                          <td className="py-3 text-right text-slate-600">
                            {item.invoiceCount}
                          </td>
                          <td className="py-3 text-right text-slate-900 font-medium">
                            {formatCurrency(item.totalCents)}
                          </td>
                          <td className="py-3 text-right text-green-600">
                            {formatCurrency(item.paidCents)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge
                              variant={collectionRate >= 80 ? "success" : collectionRate >= 50 ? "warning" : "outline"}
                            >
                              {collectionRate.toFixed(0)}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">Total</td>
                      <td className="py-3 text-right font-medium text-slate-600">
                        {revenueReport.data.reduce((sum, r) => sum + r.invoiceCount, 0)}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="py-3 text-right font-bold text-green-600">
                        {formatCurrency(paidRevenue)}
                      </td>
                      <td className="py-3 text-right">
                        <Badge variant={paidRevenue / totalRevenue >= 0.8 ? "success" : "warning"}>
                          {totalRevenue > 0 ? ((paidRevenue / totalRevenue) * 100).toFixed(0) : 0}%
                        </Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </ContentCardContent>
        </ContentCard>

        {/* Invoice Aging */}
        <ContentCard>
          <ContentCardHeader>
            <ContentCardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Invoice Aging
            </ContentCardTitle>
            <ContentCardDescription>
              Outstanding invoices by age
            </ContentCardDescription>
          </ContentCardHeader>
          <ContentCardContent>
            {/* Aging Summary Bar */}
            <div className="mb-6 space-y-2">
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                {totalOutstanding > 0 ? (
                  <>
                    <div
                      className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${(agingSummary.current / totalOutstanding) * 100}%` }}
                      title={`Current: ${formatCurrency(agingSummary.current)}`}
                    >
                      {agingSummary.current > 0 && "Current"}
                    </div>
                    <div
                      className="bg-yellow-500 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${(agingSummary["1-30"] / totalOutstanding) * 100}%` }}
                      title={`1-30 days: ${formatCurrency(agingSummary["1-30"])}`}
                    >
                      {agingSummary["1-30"] > 0 && "1-30"}
                    </div>
                    <div
                      className="bg-orange-500 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${(agingSummary["31-60"] / totalOutstanding) * 100}%` }}
                      title={`31-60 days: ${formatCurrency(agingSummary["31-60"])}`}
                    >
                      {agingSummary["31-60"] > 0 && "31-60"}
                    </div>
                    <div
                      className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${(agingSummary["61-90"] / totalOutstanding) * 100}%` }}
                      title={`61-90 days: ${formatCurrency(agingSummary["61-90"])}`}
                    >
                      {agingSummary["61-90"] > 0 && "61-90"}
                    </div>
                    <div
                      className="bg-red-700 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${(agingSummary["90+"] / totalOutstanding) * 100}%` }}
                      title={`90+ days: ${formatCurrency(agingSummary["90+"])}`}
                    >
                      {agingSummary["90+"] > 0 && "90+"}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-200 w-full flex items-center justify-center text-xs text-slate-500">
                    No outstanding invoices
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Current: {formatCurrency(agingSummary.current)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500" />
                  <span>1-30 days: {formatCurrency(agingSummary["1-30"])}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>31-60 days: {formatCurrency(agingSummary["31-60"])}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>61-90 days: {formatCurrency(agingSummary["61-90"])}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-700" />
                  <span>90+ days: {formatCurrency(agingSummary["90+"])}</span>
                </div>
              </div>
            </div>

            {/* Invoice List */}
            {invoiceAging.data.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No outstanding invoices.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 text-left font-medium text-slate-500">
                        Matter
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Amount
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Due Date
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Days Overdue
                      </th>
                      <th className="py-3 text-center font-medium text-slate-500">
                        Status
                      </th>
                      <th className="py-3 text-right font-medium text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceAging.data.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3">
                          <Link
                            href={`/matters/${invoice.matterId}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {invoice.matterTitle}
                          </Link>
                        </td>
                        <td className="py-3 text-right font-medium text-slate-900">
                          {formatCurrency(invoice.totalCents)}
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString()
                            : "Not set"}
                        </td>
                        <td className="py-3 text-right">
                          {invoice.daysOverdue > 0 ? (
                            <span className="text-red-600 font-medium">
                              {invoice.daysOverdue} days
                            </span>
                          ) : (
                            <span className="text-green-600">Current</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant={
                              invoice.ageBucket === "current"
                                ? "success"
                                : invoice.ageBucket === "1-30"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/billing/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCardContent>
        </ContentCard>
      </main>
    </div>
  );
}
