import type { SessionWithProfile } from "@/lib/auth/server";

/**
 * Standard mock sessions for security tests
 */
export const MOCK_ADMIN_SESSION: SessionWithProfile = {
  session: { user: { id: "admin-user-id", email: "admin@test.com" } },
  profile: { full_name: "Admin User", role: "admin", status: "active", password_must_change: false },
};

export const MOCK_STAFF_SESSION: SessionWithProfile = {
  session: { user: { id: "staff-user-id", email: "staff@test.com" } },
  profile: { full_name: "Staff User", role: "staff", status: "active", password_must_change: false },
};

export const MOCK_CLIENT_SESSION: SessionWithProfile = {
  session: { user: { id: "client-user-id", email: "client@test.com" } },
  profile: { full_name: "Client User", role: "client", status: "active", password_must_change: false },
};

export const MOCK_NO_SESSION: SessionWithProfile = {
  session: null,
  profile: null,
};

/**
 * Create a mock File object
 */
export function createMockFile(name = "test.pdf", type = "application/pdf", size = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}
