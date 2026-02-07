import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { testDriveConnection } from "@/lib/google-drive/client";
import { getSessionWithProfile } from "@/lib/auth/server";

/**
 * Test the Google Drive connection
 * GET /api/google/test-connection
 */
export async function GET() {
  try {
    // Verify user is authenticated and is staff/admin
    const { session, profile } = await getSessionWithProfile();
    if (!session || !profile || !["admin", "staff"].includes(profile.role ?? "")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the refresh token from practice settings
    const supabase = supabaseAdmin();
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("google_refresh_token, google_connected_email")
      .limit(1)
      .maybeSingle() as { data: { google_refresh_token: string | null; google_connected_email: string | null } | null };

    if (!settings?.google_refresh_token) {
      return NextResponse.json({
        success: false,
        error: "Google Drive is not connected",
      });
    }

    // Test the connection
    const result = await testDriveConnection(settings.google_refresh_token);

    // If we got an email and it differs from stored, update it
    if (result.success && result.email && result.email !== settings.google_connected_email) {
      await supabase
        .from("practice_settings")
        .update({ google_connected_email: result.email } as Record<string, string>)
        .eq("google_refresh_token", settings.google_refresh_token);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    });
  }
}
