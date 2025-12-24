import { NextResponse } from "next/server";
import { runAllAutomations } from "@/lib/email/automations";

/**
 * API route for running email automations
 * Should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external cron service)
 *
 * Example: GET /api/cron/email-automations
 *
 * Security: Use CRON_SECRET environment variable to authenticate requests
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("[Cron] Starting email automations...");
    const startTime = Date.now();

    const results = await runAllAutomations();

    const duration = Date.now() - startTime;
    const totalSent = results.intake.sent + results.activity.sent + results.invoices.sent;
    const totalFailed = results.intake.failed + results.activity.failed + results.invoices.failed;

    console.log(`[Cron] Email automations completed in ${duration}ms`, {
      sent: totalSent,
      failed: totalFailed,
    });

    return NextResponse.json({
      success: true,
      duration,
      results: {
        intake: {
          sent: results.intake.sent,
          failed: results.intake.failed,
          errors: results.intake.errors.length > 0 ? results.intake.errors : undefined,
        },
        activity: {
          sent: results.activity.sent,
          failed: results.activity.failed,
          errors: results.activity.errors.length > 0 ? results.activity.errors : undefined,
        },
        invoices: {
          sent: results.invoices.sent,
          failed: results.invoices.failed,
          errors: results.invoices.errors.length > 0 ? results.invoices.errors : undefined,
        },
      },
      totals: {
        sent: totalSent,
        failed: totalFailed,
      },
    });
  } catch (error) {
    console.error("[Cron] Email automations failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for testing individual automations
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { type } = body;

    const { runAllAutomations, sendIntakeReminders, sendActivityReminders, sendInvoiceReminders } = await import("@/lib/email/automations");

    let result;
    switch (type) {
      case "intake":
        result = await sendIntakeReminders();
        break;
      case "activity":
        result = await sendActivityReminders();
        break;
      case "invoices":
        result = await sendInvoiceReminders();
        break;
      case "all":
      default:
        result = await runAllAutomations();
        break;
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
