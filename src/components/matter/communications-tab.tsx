'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Send, Inbox, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { syncGmailForMatter } from '@/lib/data/actions'
import type { MatterEmail } from '@/lib/data/queries'

interface CommunicationsTabProps {
  matterId: string
  emails: MatterEmail[]
}

export function CommunicationsTab({ matterId, emails: initialEmails }: CommunicationsTabProps) {
  const [emails, setEmails] = useState(initialEmails)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncGmailForMatter(matterId)
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        // Refresh the page to get updated emails
        window.location.reload()
      }
    } catch (err) {
      setError('Failed to sync emails')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email Communications</h3>
        <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Emails'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {emails.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-600">
            <Mail className="mx-auto mb-2 h-8 w-8" />
            <p>No emails synced yet.</p>
            <p className="text-sm">Click "Sync Emails" to import communications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card key={email.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {email.direction === 'received' ? (
                      <Inbox className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Send className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm text-slate-600">
                        {formatDistanceToNow(new Date(email.gmailDate), { addSuffix: true })}
                      </span>
                      <span className="text-sm text-slate-600">•</span>
                      <span className="text-sm text-slate-600 truncate">
                        {email.direction === 'received' ? `From: ${email.fromEmail}` : `To: ${email.toEmail}`}
                      </span>
                      {email.actionNeeded && (
                        <Badge variant="danger" className="ml-auto">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Action Needed
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium mb-1">{email.subject || '(No subject)'}</p>
                    <p className="text-sm text-slate-600">{email.aiSummary || email.snippet}</p>
                    {email.gmailLink && (
                      <a
                        href={email.gmailLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                      >
                        Open in Gmail
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
