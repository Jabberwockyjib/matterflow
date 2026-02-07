/**
 * Google Forms API client
 * Fetches form structure for import into MatterFlow intake templates
 */

import { google } from "googleapis";
import { createOAuth2Client } from "@/lib/google-drive/client";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: { paragraph?: boolean };
      choiceQuestion?: {
        type: "RADIO" | "CHECKBOX" | "DROP_DOWN";
        options: Array<{ value: string; isOther?: boolean }>;
      };
      scaleQuestion?: {
        low: number;
        high: number;
        lowLabel?: string;
        highLabel?: string;
      };
      dateQuestion?: {
        includeTime?: boolean;
        includeYear?: boolean;
      };
      timeQuestion?: { duration?: boolean };
      fileUploadQuestion?: {
        folderId: string;
        maxFiles?: number;
        maxFileSize?: string;
        types?: string[];
      };
      ratingQuestion?: {
        ratingScaleLevel: number;
        iconType?: string;
      };
    };
    image?: { sourceUri: string; altText?: string };
  };
  questionGroupItem?: {
    questions: Array<{
      questionId: string;
      required?: boolean;
      rowQuestion: { title: string };
    }>;
    grid?: {
      columns: {
        type: "RADIO" | "CHECKBOX";
        options: Array<{ value: string }>;
      };
    };
  };
  pageBreakItem?: {
    title?: string;
    description?: string;
  };
  textItem?: Record<string, never>;
  imageItem?: { image: { sourceUri: string; altText?: string } };
  videoItem?: { video: { youtubeUri: string } };
}

export interface GoogleForm {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  items: GoogleFormItem[];
}

/**
 * Extract form ID from a Google Forms URL or raw ID
 */
export function parseGoogleFormId(input: string): string | null {
  const trimmed = input.trim();

  // Direct form ID (UUID-like pattern)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // URL patterns
  // https://docs.google.com/forms/d/{formId}/edit
  // https://docs.google.com/forms/d/e/{formId}/viewform
  const urlMatch = trimmed.match(/\/forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
}

/**
 * Resolve a shortened URL (e.g. forms.gle) to its full destination
 */
async function resolveRedirect(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.url || null;
  } catch {
    // Try GET as fallback (some servers don't support HEAD)
    try {
      const response = await fetch(url, { redirect: "follow" });
      return response.url || null;
    } catch {
      return null;
    }
  }
}

/**
 * Parse form ID, resolving shortened URLs if needed
 */
export async function parseGoogleFormIdAsync(input: string): Promise<string | null> {
  // Try direct parse first
  const directId = parseGoogleFormId(input);
  if (directId) return directId;

  // Check if it looks like a shortened URL (forms.gle, bit.ly, etc.)
  const trimmed = input.trim();
  if (/^https?:\/\//.test(trimmed)) {
    const resolved = await resolveRedirect(trimmed);
    if (resolved) {
      return parseGoogleFormId(resolved);
    }
  }

  return null;
}

/**
 * Fetch a Google Form's structure using the Forms API
 * Uses the practice-wide Google OAuth token
 */
export async function fetchGoogleForm(formId: string): Promise<{ data?: GoogleForm; error?: string }> {
  try {
    // Get practice refresh token
    const supabase = supabaseAdmin();
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("google_refresh_token")
      .limit(1)
      .single();

    if (!settings?.google_refresh_token) {
      return { error: "Google is not connected. Please connect Google in Settings > Integrations first." };
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: settings.google_refresh_token,
    });

    const forms = google.forms({ version: "v1", auth: oauth2Client });

    const response = await forms.forms.get({ formId });

    if (!response.data) {
      return { error: "Failed to fetch form data" };
    }

    return {
      data: {
        formId: response.data.formId || formId,
        info: {
          title: response.data.info?.title || "Untitled Form",
          description: response.data.info?.description || undefined,
          documentTitle: response.data.info?.documentTitle || undefined,
        },
        items: (response.data.items || []) as GoogleFormItem[],
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching Google Form:", error);

    const errObj = error as { code?: number; status?: number; message?: string };
    if (errObj?.code === 404 || errObj?.status === 404) {
      return { error: "Google Form not found. Check the URL and make sure the form is accessible with your connected Google account." };
    }
    if (errObj?.code === 403 || errObj?.status === 403) {
      return { error: "Access denied. Make sure the form is owned by or shared with your connected Google account." };
    }

    return { error: errObj?.message || "Failed to fetch Google Form" };
  }
}
