import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateLogoFile } from "@/lib/uploads/validation";
import { invalidateFirmSettingsCache } from "@/lib/data/queries";
import { uploadLimiter, getRateLimitKey } from "@/lib/rate-limit";

const BUCKET = "firm-assets";
const LOGO_PREFIX = "logos/firm-logo";
const MAX_WIDTH = 400;
const MAX_HEIGHT = 200;

/**
 * POST /api/settings/logo — Upload a new firm logo
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitKey = getRateLimitKey(request);
    const rateCheck = uploadLimiter.check(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    // Auth: admin only
    const { session, profile } = await getSessionWithProfile();
    if (!session || !profile) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (profile.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Only admins can upload a firm logo" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate
    const validationError = validateLogoFile(file);
    if (validationError) {
      return NextResponse.json(
        { ok: false, error: validationError },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();
    const arrayBuffer = await file.arrayBuffer();
    const isSvg = file.type === "image/svg+xml";

    let uploadBuffer: Buffer;
    let ext: string;
    let contentType: string;

    if (isSvg) {
      // Pass SVG through as-is
      uploadBuffer = Buffer.from(arrayBuffer);
      ext = "svg";
      contentType = "image/svg+xml";
    } else {
      // Resize raster images with sharp, output as PNG for email compatibility
      uploadBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      ext = "png";
      contentType = "image/png";
    }

    // Delete old logo if one exists
    const { data: currentSetting } = await supabase
      .from("firm_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle();

    if (currentSetting?.value) {
      // Extract storage path from the public URL
      const oldUrl = currentSetting.value;
      const bucketSegment = `/storage/v1/object/public/${BUCKET}/`;
      const idx = oldUrl.indexOf(bucketSegment);
      if (idx !== -1) {
        const oldPath = oldUrl.substring(idx + bucketSegment.length);
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Upload new file
    const timestamp = Date.now();
    const filePath = `${LOGO_PREFIX}-${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, uploadBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return NextResponse.json(
        { ok: false, error: "Failed to upload logo" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    // Update firm_settings
    await supabase
      .from("firm_settings")
      .update({
        value: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      })
      .eq("key", "logo_url");

    // Invalidate cache
    invalidateFirmSettingsCache();

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        actor_id: session.user.id,
        event_type: "firm_logo_uploaded",
        entity_type: "firm_settings",
        entity_id: null,
        metadata: { file_path: filePath, public_url: publicUrl },
      });
    } catch {
      // don't block on audit failure
    }

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/logo — Remove the firm logo
 */
export async function DELETE() {
  try {
    // Auth: admin only
    const { session, profile } = await getSessionWithProfile();
    if (!session || !profile) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (profile.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Only admins can remove the firm logo" },
        { status: 403 }
      );
    }

    const supabase = supabaseAdmin();

    // Get current logo URL to delete from storage
    const { data: currentSetting } = await supabase
      .from("firm_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle();

    if (currentSetting?.value) {
      const oldUrl = currentSetting.value;
      const bucketSegment = `/storage/v1/object/public/${BUCKET}/`;
      const idx = oldUrl.indexOf(bucketSegment);
      if (idx !== -1) {
        const oldPath = oldUrl.substring(idx + bucketSegment.length);
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Set logo_url to null
    await supabase
      .from("firm_settings")
      .update({
        value: null,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      })
      .eq("key", "logo_url");

    // Invalidate cache
    invalidateFirmSettingsCache();

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        actor_id: session.user.id,
        event_type: "firm_logo_removed",
        entity_type: "firm_settings",
        entity_id: null,
        metadata: null,
      });
    } catch {
      // don't block on audit failure
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Logo delete error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to remove logo" },
      { status: 500 }
    );
  }
}
