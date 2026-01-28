'use client'

import Link from 'next/link'
import { Mail, Copy, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClientInvitation, IntakeReview } from '@/lib/data/queries'

type PipelineCardProps =
  | {
      type: 'invitation'
      data: ClientInvitation
    }
  | {
      type: 'intake-submitted' | 'under-review'
      data: IntakeReview
    }

export function PipelineCard({ type, data }: PipelineCardProps) {
  if (type === 'invitation') {
    const invitation = data
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="font-semibold text-slate-900">
              {invitation.clientName}
            </div>
            <div className="text-sm text-slate-600">{invitation.clientEmail}</div>
          </div>
          <Mail className="h-4 w-4 text-slate-400" />
        </div>

        {invitation.matterType && (
          <Badge variant="outline" className="mb-2">
            {invitation.matterType}
          </Badge>
        )}

        <div className="text-xs text-slate-500">
          Invited {invitation.daysAgo} day{invitation.daysAgo !== 1 ? 's' : ''} ago
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="ghost" className="flex-1" disabled>
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button size="sm" variant="ghost" disabled aria-label="Copy invitation code">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  const intake = data
  const isNew = intake.isNew

  // Prefer client email from auth, fallback to form response
  const displayEmail = intake.clientEmail || intake.responses.email || 'No email provided'
  const displayName = intake.clientName || intake.responses.full_name || 'Unknown'

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            {displayName}
            {isNew && (
              <Badge variant="danger" className="text-xs">
                NEW
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-600">
            {displayEmail}
          </div>
        </div>
      </div>

      <Badge variant="outline" className="mb-2">
        {intake.formType}
      </Badge>

      <div className="text-xs text-slate-500 mb-3">
        {type === 'under-review' && 'Waiting on client response'}
      </div>

      <Link href={`/admin/intake/${intake.id}`}>
        <Button size="sm" className="w-full">
          Review Intake
        </Button>
      </Link>
    </div>
  )
}
