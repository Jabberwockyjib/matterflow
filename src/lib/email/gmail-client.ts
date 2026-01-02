import { google } from 'googleapis'
import { render } from '@react-email/render'

/**
 * Gmail API client for sending emails via OAuth
 * Uses the same Google OAuth credentials as Google Drive integration
 */

/**
 * Get OAuth2 client with refresh token
 */
function getOAuth2Client(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  return oauth2Client
}

/**
 * Create RFC 2822 formatted email message
 */
function createMessage({
  to,
  from,
  subject,
  html,
}: {
  to: string
  from: string
  subject: string
  html: string
}): string {
  const messageParts = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ]

  const message = messageParts.join('\n')

  // Encode the message in base64url format
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return encodedMessage
}

/**
 * Send email via Gmail API
 */
export async function sendGmailEmail({
  to,
  subject,
  html,
  refreshToken,
  fromEmail,
  fromName,
}: {
  to: string
  subject: string
  html: string
  refreshToken: string
  fromEmail: string
  fromName?: string
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  try {
    const oauth2Client = getOAuth2Client(refreshToken)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

    const encodedMessage = createMessage({
      to,
      from,
      subject,
      html,
    })

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })

    return {
      ok: true,
      messageId: response.data.id ?? undefined,
    }
  } catch (error) {
    console.error('Gmail API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      ok: false,
      error: message,
    }
  }
}

/**
 * Send invitation email to client
 */
export interface SendInvitationEmailParams {
  to: string
  clientName: string
  inviteCode: string
  inviteLink: string
  lawyerName: string
  message?: string
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams,
  refreshToken: string,
  fromEmail: string
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  // Validate required parameters
  if (!params.to?.trim()) {
    return { ok: false, error: 'Recipient email is required' }
  }

  if (!params.clientName?.trim()) {
    return { ok: false, error: 'Client name is required' }
  }

  if (!params.inviteCode?.trim()) {
    return { ok: false, error: 'Invite code is required' }
  }

  if (!params.inviteLink?.trim()) {
    return { ok: false, error: 'Invite link is required' }
  }

  if (!params.lawyerName?.trim()) {
    return { ok: false, error: 'Lawyer name is required' }
  }

  if (!refreshToken) {
    return { ok: false, error: 'Google OAuth refresh token is required' }
  }

  if (!fromEmail) {
    return { ok: false, error: 'From email address is required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(params.to)) {
    return { ok: false, error: 'Invalid email address format' }
  }

  // Validate URL format
  if (
    !params.inviteLink.startsWith('http://') &&
    !params.inviteLink.startsWith('https://')
  ) {
    return { ok: false, error: 'Invite link must be a valid URL' }
  }

  // Dynamic import to avoid bundling email template in client-side code
  const { default: InvitationEmail } = await import(
    './templates/invitation-email'
  )

  // Render the React email template to HTML
  const html = await render(InvitationEmail(params))

  return sendGmailEmail({
    to: params.to,
    subject: 'Complete Your Intake Form for MatterFlow',
    html,
    refreshToken,
    fromEmail,
    fromName: params.lawyerName,
  })
}

/**
 * Check if Gmail is configured
 */
export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  )
}
