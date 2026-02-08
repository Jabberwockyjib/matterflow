import { google } from 'googleapis'
import { render } from '@react-email/render'
import { createOAuth2Client } from '@/lib/google-drive/client'

/**
 * Gmail API client for sending emails via OAuth
 * Uses the same Google OAuth credentials as Google Drive integration
 */

/**
 * Get OAuth2 client with refresh token
 */
function getOAuth2Client(refreshToken: string) {
  const client = createOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })
  return client
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

/**
 * Gmail email metadata from fetched messages
 */
export interface GmailEmail {
  id: string
  threadId?: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  internalDate: string
}

/**
 * Fetch emails matching a query
 */
export async function fetchGmailEmails({
  refreshToken,
  query,
  maxResults = 50,
}: {
  refreshToken: string
  query: string
  maxResults?: number
}): Promise<{
  ok: boolean
  emails?: GmailEmail[]
  error?: string
}> {
  try {
    const oauth2Client = getOAuth2Client(refreshToken)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Search for messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    })

    if (!listResponse.data.messages) {
      return { ok: true, emails: [] }
    }

    // Fetch full message details
    const emails: GmailEmail[] = []
    for (const msg of listResponse.data.messages) {
      if (!msg.id) continue

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })

      const headers = msgResponse.data.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

      emails.push({
        id: msg.id,
        threadId: msgResponse.data.threadId || undefined,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: msgResponse.data.snippet || '',
        internalDate: msgResponse.data.internalDate || '',
      })
    }

    return { ok: true, emails }
  } catch (error) {
    console.error('Gmail fetch error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch emails',
    }
  }
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
export function extractEmailAddress(fullAddress: string): string {
  const match = fullAddress.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : fullAddress.toLowerCase().trim()
}
