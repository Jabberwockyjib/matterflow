import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSessionWithProfile } from '@/lib/auth/server'

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function InviteRedemptionPage({ params }: PageProps) {
  const { code } = await params

  const supabase = supabaseAdmin()

  // Look up the invitation by code
  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('invite_code', code)
    .single()

  // If invitation doesn't exist, show 404
  if (error || !invitation) {
    notFound()
  }

  // Check if user is authenticated
  const { session } = await getSessionWithProfile()

  // If not authenticated, redirect to sign-up with the invite code
  // Include redirect back to this page so after signup they continue the intake flow
  if (!session) {
    redirect(`/auth/sign-up?code=${code}&redirect=/intake/invite/${code}`)
  }

  // Check if invitation is expired
  const now = new Date()
  if (invitation.expires_at && now > new Date(invitation.expires_at)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Invitation Expired
          </h1>
          <p className="text-slate-600 mb-6">
            This invitation link has expired. Please contact your lawyer for a new invitation.
          </p>
          <p className="text-sm text-slate-500">
            Invitation code: <code className="bg-slate-100 px-2 py-1 rounded">{code}</code>
          </p>
        </div>
      </div>
    )
  }

  // Check if invitation is already completed
  if (invitation.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Already Completed
          </h1>
          <p className="text-slate-600 mb-6">
            You've already completed this intake form. Your lawyer will be in touch soon.
          </p>
          <p className="text-sm text-slate-500">
            If you need to make changes, please contact your lawyer directly.
          </p>
        </div>
      </div>
    )
  }

  // Check if invitation is cancelled
  if (invitation.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Invitation Cancelled
          </h1>
          <p className="text-slate-600 mb-6">
            This invitation has been cancelled. Please contact your lawyer if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  // Check if a matter already exists for this invitation
  const { data: existingMatters } = await supabase
    .from('matters')
    .select('id')
    .eq('client_email', invitation.client_email)
    .eq('title', `${invitation.matter_type || 'General'} for ${invitation.client_name}`)
    .limit(1)

  if (existingMatters && existingMatters.length > 0) {
    // Matter exists, redirect to intake form
    redirect(`/intake/${existingMatters[0].id}`)
  }

  // Create a new matter for this invitation
  // Get the owner from the invitation's invited_by, or use the first admin as fallback
  let ownerId = invitation.invited_by
  if (!ownerId) {
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single()
    ownerId = adminUser?.user_id || ''
  }

  const { data: matter, error: matterError } = await supabase
    .from('matters')
    .insert({
      title: `${invitation.matter_type || 'General'} for ${invitation.client_name}`,
      matter_type: invitation.matter_type || 'General',
      stage: 'Intake Sent',
      responsible_party: 'client',
      next_action: 'Complete intake form',
      next_action_due_date: invitation.expires_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      billing_model: 'hourly',
      owner_id: ownerId,
    })
    .select('id')
    .single()

  if (matterError || !matter) {
    console.error('Failed to create matter:', matterError)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Error
          </h1>
          <p className="text-slate-600 mb-6">
            We encountered an error setting up your intake form. Please contact your lawyer.
          </p>
          <p className="text-sm text-slate-500 font-mono">
            Error: {matterError?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  // Redirect to the intake form
  redirect(`/intake/${matter.id}`)
}
