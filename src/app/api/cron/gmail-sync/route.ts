import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { syncGmailForMatterInternal } from "@/lib/data/actions";

/**
 * Cron endpoint for automatic Gmail sync
 * GET /api/cron/gmail-sync
 *
 * Syncs Gmail emails for all active matters that have clients assigned.
 * Should be called periodically (e.g., every hour) via Vercel Cron or external cron.
 *
 * Requires CRON_SECRET header for authentication.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = supabaseAdmin();

  // Get practice-wide Google refresh token
  const { data: practiceSettings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token")
    .limit(1)
    .single();

  if (!practiceSettings?.google_refresh_token) {
    return NextResponse.json(
      { error: "Google account not connected", synced: 0 },
      { status: 200 }
    );
  }

  // Get all active matters with clients (exclude archived and completed)
  const { data: matters, error: mattersError } = await supabase
    .from("matters")
    .select("id, title")
    .not("client_id", "is", null)
    .not("stage", "in", '("Completed","Archived")');

  if (mattersError) {
    console.error("Failed to fetch matters:", mattersError);
    return NextResponse.json(
      { error: "Failed to fetch matters" },
      { status: 500 }
    );
  }

  if (!matters || matters.length === 0) {
    return NextResponse.json({
      message: "No active matters with clients to sync",
      synced: 0,
    });
  }

  const results: Array<{
    matterId: string;
    title: string;
    synced: number;
    skipped: number;
    error?: string;
  }> = [];

  let totalSynced = 0;
  let totalSkipped = 0;
  let errors = 0;

  // Sync each matter
  for (const matter of matters) {
    try {
      const result = await syncGmailForMatterInternal(
        matter.id,
        practiceSettings.google_refresh_token
      );

      if (result.ok) {
        totalSynced += result.synced || 0;
        totalSkipped += result.skipped || 0;
        results.push({
          matterId: matter.id,
          title: matter.title,
          synced: result.synced || 0,
          skipped: result.skipped || 0,
        });
      } else {
        errors++;
        results.push({
          matterId: matter.id,
          title: matter.title,
          synced: 0,
          skipped: 0,
          error: result.error,
        });
      }
    } catch (error) {
      errors++;
      results.push({
        matterId: matter.id,
        title: matter.title,
        synced: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Small delay between matters to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Log summary
  console.log(`Gmail sync complete: ${totalSynced} synced, ${totalSkipped} skipped, ${errors} errors`);

  return NextResponse.json({
    message: "Gmail sync complete",
    summary: {
      mattersProcessed: matters.length,
      totalSynced,
      totalSkipped,
      errors,
    },
    results,
  });
}
