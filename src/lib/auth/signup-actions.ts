"use server";

import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/schemas";

type ValidateInviteResult = {
  valid: boolean;
  error?: string;
  invitation?: {
    id: string;
    clientName: string;
    clientEmail: string;
    matterType: string | null;
  };
};

type SignUpResult = {
  success: boolean;
  error?: string;
  userId?: string;
};

/**
 * Validates an invite code and returns the invitation details if valid.
 * This is used for real-time validation on the sign-up form.
 */
export async function validateInviteCode(code: string): Promise<ValidateInviteResult> {
  if (!supabaseEnvReady()) {
    return { valid: false, error: "Service unavailable" };
  }

  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Invite code is required" };
  }

  const supabase = supabaseAdmin();

  const { data: invitation, error } = await supabase
    .from("client_invitations")
    .select("id, client_name, client_email, matter_type, status, expires_at")
    .eq("invite_code", code.trim())
    .single();

  if (error || !invitation) {
    return { valid: false, error: "Invalid invite code" };
  }

  // Check if already used
  if (invitation.status === "completed") {
    return { valid: false, error: "This invite code has already been used" };
  }

  // Check if cancelled
  if (invitation.status === "cancelled") {
    return { valid: false, error: "This invite code has been cancelled" };
  }

  // Check if expired
  if (invitation.expires_at && new Date() > new Date(invitation.expires_at)) {
    return { valid: false, error: "This invite code has expired" };
  }

  // Check if status is pending
  if (invitation.status !== "pending") {
    return { valid: false, error: "This invite code is not valid" };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      clientName: invitation.client_name,
      clientEmail: invitation.client_email,
      matterType: invitation.matter_type,
    },
  };
}

/**
 * Signs up a new user with an invite code.
 * Creates the auth user and profile, then marks the invitation as completed.
 */
export async function signUpWithInviteCode(data: {
  inviteCode: string;
  email: string;
  password: string;
  fullName: string;
}): Promise<SignUpResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  // Validate the form data
  const validation = signUpSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid form data" };
  }

  const supabase = supabaseAdmin();

  // Validate the invite code
  const inviteResult = await validateInviteCode(data.inviteCode);
  if (!inviteResult.valid || !inviteResult.invitation) {
    return { success: false, error: inviteResult.error || "Invalid invite code" };
  }

  // Create the auth user with invite metadata
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // Auto-confirm since they have a valid invite
    user_metadata: {
      full_name: data.fullName,
      invite_code: data.inviteCode,
      invitation_id: inviteResult.invitation.id,
    },
  });

  if (authError) {
    console.error("[Sign-up] Auth error:", authError);
    // Handle specific errors
    if (authError.message.includes("already been registered")) {
      return { success: false, error: "An account with this email already exists" };
    }
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: "Failed to create account" };
  }

  // The handle_new_user trigger will create the profile
  // Now mark the invitation as completed
  const { error: updateError } = await supabase
    .from("client_invitations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", inviteResult.invitation.id);

  if (updateError) {
    console.error("[Sign-up] Failed to update invitation:", updateError);
    // Don't fail the signup for this, just log it
  }

  return { success: true, userId: authData.user.id };
}

/**
 * Links an existing user (from OAuth) to an invitation.
 * Called after Google OAuth to mark the invitation as used and update user metadata.
 */
export async function linkUserToInvitation(
  userId: string,
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();

  // Get the invitation details
  const { data: invitation, error: inviteError } = await supabase
    .from("client_invitations")
    .select("id, client_name, status")
    .eq("id", invitationId)
    .single();

  if (inviteError || !invitation) {
    return { success: false, error: "Invitation not found" };
  }

  // Make sure it's not already used
  if (invitation.status === "completed") {
    return { success: false, error: "Invitation already used" };
  }

  // Update the user's metadata to include invitation_id
  const { error: userUpdateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      invitation_id: invitationId,
    },
  });

  if (userUpdateError) {
    console.error("[linkUserToInvitation] Failed to update user metadata:", userUpdateError);
    // Continue anyway - this is not critical
  }

  // Update the profile with the full name from the invitation
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: invitation.client_name,
    })
    .eq("user_id", userId);

  if (profileError) {
    console.error("[linkUserToInvitation] Failed to update profile:", profileError);
    // Continue anyway
  }

  // Mark the invitation as completed
  const { error: updateError } = await supabase
    .from("client_invitations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) {
    console.error("[linkUserToInvitation] Failed to update invitation:", updateError);
    return { success: false, error: "Failed to mark invitation as used" };
  }

  return { success: true };
}
