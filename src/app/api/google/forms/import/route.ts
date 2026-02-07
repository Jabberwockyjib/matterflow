import { NextResponse } from "next/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { parseGoogleFormIdAsync, fetchGoogleForm } from "@/lib/google-forms/client";
import { convertGoogleFormToTemplate } from "@/lib/google-forms/converter";

/**
 * POST /api/google/forms/import
 * Import a Google Form structure and convert to IntakeFormTemplate
 * Admin only - returns the converted template for preview before saving
 */
export async function POST(request: Request) {
  try {
    const { profile } = await getSessionWithProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { formUrl } = body;

    if (!formUrl || typeof formUrl !== "string") {
      return NextResponse.json(
        { error: "Please provide a Google Form URL or ID" },
        { status: 400 }
      );
    }

    const formId = await parseGoogleFormIdAsync(formUrl);

    if (!formId) {
      return NextResponse.json(
        { error: "Could not parse a valid Google Form ID from the provided URL" },
        { status: 400 }
      );
    }

    // Fetch form structure from Google
    const { data: googleForm, error: fetchError } = await fetchGoogleForm(formId);

    if (fetchError || !googleForm) {
      return NextResponse.json(
        { error: fetchError || "Failed to fetch Google Form" },
        { status: 400 }
      );
    }

    // Convert to MatterFlow template format
    const template = convertGoogleFormToTemplate(googleForm);

    return NextResponse.json({
      template,
      sourceFormId: googleForm.formId,
      originalTitle: googleForm.info.title,
      fieldCount: template.sections.reduce((sum, s) => sum + s.fields.length, 0),
      sectionCount: template.sections.length,
    });
  } catch (error) {
    console.error("Google Form import error:", error);
    return NextResponse.json(
      { error: "Failed to import Google Form" },
      { status: 500 }
    );
  }
}
