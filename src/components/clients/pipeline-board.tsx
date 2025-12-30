'use client'

import { Mail, FileCheck, Clock } from 'lucide-react'
import { PipelineCard } from './pipeline-card'
import type { ClientInvitation, IntakeReview } from '@/lib/data/queries'

interface PipelineBoardProps {
  invitations: {
    pending: ClientInvitation[]
    completed: ClientInvitation[]
    expired: ClientInvitation[]
    source: 'supabase' | 'mock'
  }
  intakes: {
    pending: IntakeReview[]
    underReview: IntakeReview[]
    source: 'supabase' | 'mock'
  }
}

export function PipelineBoard({ invitations, intakes }: PipelineBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Column 1: Invited */}
      <PipelineColumn
        title="Invited"
        icon={<Mail className="h-5 w-5" />}
        count={invitations.pending.length}
        emptyMessage="No pending invitations"
      >
        {invitations.pending.map((invitation) => (
          <PipelineCard
            key={invitation.id}
            type="invitation"
            data={invitation}
          />
        ))}
      </PipelineColumn>

      {/* Column 2: Intake Submitted */}
      <PipelineColumn
        title="Intake Submitted"
        icon={<FileCheck className="h-5 w-5" />}
        count={intakes.pending.length}
        emptyMessage="No submissions awaiting review"
      >
        {intakes.pending.map((intake) => (
          <PipelineCard key={intake.id} type="intake-submitted" data={intake} />
        ))}
      </PipelineColumn>

      {/* Column 3: Under Review */}
      <PipelineColumn
        title="Under Review"
        icon={<Clock className="h-5 w-5" />}
        count={intakes.underReview.length}
        emptyMessage="No intakes under review"
      >
        {intakes.underReview.map((intake) => (
          <PipelineCard key={intake.id} type="under-review" data={intake} />
        ))}
      </PipelineColumn>
    </div>
  )
}

function PipelineColumn({
  title,
  icon,
  count,
  emptyMessage,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  emptyMessage: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-slate-600">{icon}</div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-sm font-medium">
          {count}
        </div>
      </div>

      {/* Cards Container */}
      <div className="space-y-3">
        {count === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
