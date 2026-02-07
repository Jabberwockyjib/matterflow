import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'

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

  if (error || !invitation) {
    notFound()
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

  // Check if invitation is already completed
  if (invitation.status === 'completed') {
    // If there's a linked matter, redirect to it
    if (invitation.matter_id) {
      redirect(`/intake/${invitation.matter_id}?code=${code}`)
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Already Completed
          </h1>
          <p className="text-slate-600 mb-6">
            This intake form has already been submitted. Your lawyer will be in touch soon.
          </p>
          <p className="text-sm text-slate-500">
            If you need to make changes, please contact your lawyer directly.
          </p>
        </div>
      </div>
    )
  }

  // If the invitation has a linked matter (auto-created in inviteClient), redirect directly
  if (invitation.matter_id) {
    redirect(`/intake/${invitation.matter_id}?code=${code}`)
  }

  // Legacy invitation without auto-created matter — create one now
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

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  const { data: matter, error: matterError } = await supabase
    .from('matters')
    .insert({
      title: `${invitation.matter_type || 'General'} for ${invitation.client_name}`,
      matter_type: invitation.matter_type || 'General',
      stage: 'Intake Sent',
      responsible_party: 'client',
      next_action: 'Complete intake form',
      next_action_due_date: dueDate.toISOString().split('T')[0],
      billing_model: 'hourly',
      owner_id: ownerId,
      client_name: invitation.client_name,
      client_email: invitation.client_email,
      invitation_id: invitation.id,
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
        </div>
      </div>
    )
  }

  // Link matter back to invitation
  await supabase
    .from('client_invitations')
    .update({ matter_id: matter.id })
    .eq('id', invitation.id)

  redirect(`/intake/${matter.id}?code=${code}`)
}
