import { google, drive_v3 } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * Google Drive API client for MatterFlow
 * Handles authentication and file operations
 */

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

// Scopes required for Drive and Gmail operations
export const GOOGLE_SCOPES = [
  // Drive scopes
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  // Gmail scopes
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

// Legacy alias for backwards compatibility
export const GOOGLE_DRIVE_SCOPES = GOOGLE_SCOPES;

/**
 * Check if Google Drive is configured
 */
export const isGoogleDriveConfigured = () => {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
};

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Google OAuth credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local"
    );
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth consent screen URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_DRIVE_SCOPES,
    state: state,
    prompt: "consent", // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create Drive client with access token
 */
export function createDriveClient(accessToken: string): drive_v3.Drive {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Create Drive client with refresh token
 */
export function createDriveClientWithRefresh(refreshToken: string): drive_v3.Drive {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return credentials.access_token;
}

/**
 * Get the email of the authenticated Google user
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch Google user info:", response.status);
      return null;
    }

    const data = await response.json();
    return data.email || null;
  } catch (error) {
    console.error("Error fetching Google user email:", error);
    return null;
  }
}

/**
 * Test the Google Drive connection by listing files
 * Returns success status and any error message
 */
export async function testDriveConnection(refreshToken: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Refresh to get access token and verify credentials are valid
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
      return { success: false, error: "Failed to refresh access token" };
    }

    // Get user email
    const email = await getGoogleUserEmail(credentials.access_token);

    // Try to list files to verify Drive access
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    await drive.files.list({
      pageSize: 1,
      fields: "files(id, name)",
    });

    return { success: true, email: email || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    return { success: false, error: message };
  }
}
