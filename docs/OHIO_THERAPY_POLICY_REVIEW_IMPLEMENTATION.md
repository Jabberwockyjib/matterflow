# Ohio Therapy Policy Review - MatterFlow Implementation

## Overview

This document describes how to integrate the `ohio-therapy-policy-review` skill into the MatterFlow application to provide automated compliance checking and review report generation for Ohio therapy practice policies.

**Skill Location:** `/skills/ohio-therapy-policy-review/`

**Key Benefit:** The skill identified **4x more compliance issues** than a general review, with specific Ohio legal citations (ORC, OAC) that provide legal credibility to the review.

---

## Current State

MatterFlow already has infrastructure that supports policy review:

| Feature | Status | Location |
|---------|--------|----------|
| "Policy Review" matter type | ✅ Exists | `src/lib/intake/templates.ts` |
| Policy Review intake form | ✅ Exists | Lines 360-458 |
| Document upload to Google Drive | ✅ Exists | `src/lib/google-drive/` |
| Admin intake review dashboard | ✅ Exists | `/admin/intake` |
| Email notifications | ✅ Exists | `src/lib/email/` |
| Document template system | ✅ Exists | `src/lib/document-templates/` |

**What's Missing:** Automated compliance checking against Ohio requirements and structured review report generation.

---

## Implementation Phases

### Phase 1: Enhanced Intake Form (Quick Win)

Update the existing Policy Review intake form to collect Ohio-specific information.

**File:** `src/lib/intake/templates.ts`

**Changes to `policy-review-v1` template:**

```typescript
// Add to Practice Information section
{
  id: 'practice_state',
  type: 'select',
  label: 'Practice State',
  required: true,
  options: [
    { value: 'ohio', label: 'Ohio' },
    { value: 'michigan', label: 'Michigan' },
    { value: 'other', label: 'Other' }
  ]
},
{
  id: 'license_type',
  type: 'select',
  label: 'License Type',
  required: true,
  conditionalDisplay: { field: 'practice_state', value: 'ohio' },
  options: [
    { value: 'lpcc', label: 'LPCC - Licensed Professional Clinical Counselor' },
    { value: 'lpc', label: 'LPC - Licensed Professional Counselor' },
    { value: 'lisw', label: 'LISW - Licensed Independent Social Worker' },
    { value: 'lsw', label: 'LSW - Licensed Social Worker' },
    { value: 'lmft', label: 'LMFT - Licensed Marriage and Family Therapist' },
    { value: 'psychologist', label: 'Psychologist' },
    { value: 'other', label: 'Other' }
  ]
},
{
  id: 'sees_minors',
  type: 'select',
  label: 'Does the practice see minor clients (under 18)?',
  required: true,
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ]
},
{
  id: 'sees_couples',
  type: 'select',
  label: 'Does the practice provide couples or family therapy?',
  required: true,
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ]
},
{
  id: 'uses_ai',
  type: 'select',
  label: 'Does the practice use AI tools (note-taking, scheduling, etc.)?',
  required: true,
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'planning', label: 'Planning to implement' }
  ]
},
{
  id: 'offers_telehealth',
  type: 'select',
  label: 'Does the practice offer telehealth services?',
  required: true,
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ]
}
```

---

### Phase 2: Policy Review Checklist Database

Create database tables to store the compliance checklist and review results.

**File:** `supabase/migrations/YYYYMMDD_policy_review_checklist.sql`

```sql
-- Policy review checklist items (from SKILL.md)
CREATE TABLE policy_review_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- e.g., 'professional_disclosure', 'confidentiality_limits'
  item_key TEXT NOT NULL,  -- e.g., 'license_number', 'duty_to_warn'
  item_label TEXT NOT NULL,
  description TEXT,
  ohio_citation TEXT,      -- e.g., 'ORC 4757.12', 'OAC 4757-5-02'
  required_when JSONB,     -- Conditional requirements (e.g., {"sees_minors": "yes"})
  suggested_language TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, item_key)
);

-- Policy review results per matter
CREATE TABLE policy_review_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES policy_review_checklist_items(id),
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'partial', 'not_applicable', 'pending')),
  notes TEXT,
  document_reference TEXT,  -- Which document, page, section
  current_language TEXT,    -- What the document currently says
  reviewed_by UUID REFERENCES profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id, checklist_item_id)
);

-- Policy review summary per matter
CREATE TABLE policy_review_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE UNIQUE,
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  partial_items INTEGER DEFAULT 0,
  not_applicable_items INTEGER DEFAULT 0,
  pending_items INTEGER DEFAULT 0,
  report_generated_at TIMESTAMPTZ,
  report_drive_file_id TEXT,  -- Google Drive ID for generated report
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE policy_review_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_review_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_review_summaries ENABLE ROW LEVEL SECURITY;

-- Checklist items readable by all authenticated users
CREATE POLICY "Checklist items are viewable by authenticated users"
  ON policy_review_checklist_items FOR SELECT
  TO authenticated
  USING (true);

-- Results viewable by staff/admin or matter owner
CREATE POLICY "Review results viewable by staff or matter participants"
  ON policy_review_results FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
    OR EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_id
      AND (m.owner_id = auth.uid() OR m.client_id = auth.uid())
    )
  );

-- Staff/admin can manage results
CREATE POLICY "Staff can manage review results"
  ON policy_review_results FOR ALL
  TO authenticated
  USING (current_user_role() IN ('admin', 'staff'))
  WITH CHECK (current_user_role() IN ('admin', 'staff'));

-- Similar policies for summaries
CREATE POLICY "Review summaries viewable by staff or matter participants"
  ON policy_review_summaries FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
    OR EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_id
      AND (m.owner_id = auth.uid() OR m.client_id = auth.uid())
    )
  );

CREATE POLICY "Staff can manage review summaries"
  ON policy_review_summaries FOR ALL
  TO authenticated
  USING (current_user_role() IN ('admin', 'staff'))
  WITH CHECK (current_user_role() IN ('admin', 'staff'));

-- Index for performance
CREATE INDEX idx_policy_review_results_matter ON policy_review_results(matter_id);
CREATE INDEX idx_policy_review_summaries_matter ON policy_review_summaries(matter_id);
```

---

### Phase 3: Seed Checklist Data

Create a seed script to populate the checklist items from the skill.

**File:** `src/lib/policy-review/seed-checklist.ts`

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin';

export const OHIO_POLICY_REVIEW_CHECKLIST = [
  // Category 1: Professional Disclosure Statement (ORC 4757.12)
  {
    category: 'professional_disclosure',
    item_key: 'license_type',
    item_label: 'License Type',
    description: 'License type clearly stated (LSW, LISW, LPC, LPCC, LMFT, etc.)',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    sort_order: 1
  },
  {
    category: 'professional_disclosure',
    item_key: 'license_number',
    item_label: 'License Number',
    description: 'License number present and complete',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    sort_order: 2
  },
  {
    category: 'professional_disclosure',
    item_key: 'areas_of_competence',
    item_label: 'Areas of Competence',
    description: 'Areas of competence listed',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    sort_order: 3
  },
  {
    category: 'professional_disclosure',
    item_key: 'formal_education',
    item_label: 'Formal Education',
    description: 'Degrees, institution, and year listed',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    sort_order: 4
  },
  {
    category: 'professional_disclosure',
    item_key: 'board_disclosure_footer',
    item_label: 'Board Disclosure Footer',
    description: '"This information is required by the counselor, social worker, and marriage and family therapist board..." mandatory language',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    suggested_language: 'This information is required by the Counselor, Social Worker, and Marriage and Family Therapist Board, which regulates the practices of professional counseling, social work, and marriage and family therapy in this state.',
    sort_order: 5
  },
  {
    category: 'professional_disclosure',
    item_key: 'board_contact_info',
    item_label: 'Board Contact Information',
    description: 'Ohio CSWMFT Board full address and phone: 77 S. High St 24th Fl, Columbus OH 43215, 614-466-0912',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    suggested_language: 'Ohio Counselor, Social Worker and Marriage and Family Therapist Board\n77 South High Street, 24th Floor\nColumbus, Ohio 43215\nPhone: 614-466-0912\nWebsite: https://cswmft.ohio.gov',
    sort_order: 6
  },

  // Category 2: Informed Consent - General (OAC 4757-5-02)
  {
    category: 'informed_consent_general',
    item_key: 'nature_of_therapy',
    item_label: 'Nature of Therapy',
    description: 'Description of the therapeutic process',
    ohio_citation: 'OAC 4757-5-02',
    required_when: null,
    sort_order: 10
  },
  {
    category: 'informed_consent_general',
    item_key: 'risks_and_benefits',
    item_label: 'Risks and Benefits',
    description: 'Risks and benefits of therapy disclosed',
    ohio_citation: 'OAC 4757-5-02',
    required_when: null,
    sort_order: 11
  },
  {
    category: 'informed_consent_general',
    item_key: 'right_to_refuse',
    item_label: 'Right to Refuse/Withdraw',
    description: 'Client autonomy and right to end therapy stated',
    ohio_citation: 'OAC 4757-5-02',
    required_when: null,
    sort_order: 12
  },
  {
    category: 'informed_consent_general',
    item_key: 'complaint_process',
    item_label: 'Complaint Process',
    description: 'Ohio Board complaint process disclosed (not just HHS)',
    ohio_citation: 'OAC 4757-5-02',
    required_when: null,
    sort_order: 13
  },

  // Category 3: Confidentiality Limits
  {
    category: 'confidentiality_limits',
    item_key: 'suicide_self_harm',
    item_label: 'Suicide/Self-Harm',
    description: 'Disclosure when substantial risk of self-harm',
    ohio_citation: 'OAC 4757-5-02',
    required_when: null,
    sort_order: 20
  },
  {
    category: 'confidentiality_limits',
    item_key: 'duty_to_warn',
    item_label: 'Duty to Warn (Ohio Standard)',
    description: 'Ohio standard: explicit threat + imminent serious physical harm + clearly identifiable victim(s) + intent and ability',
    ohio_citation: 'ORC 2305.51',
    required_when: null,
    suggested_language: 'If a client communicates an explicit threat of imminent serious physical harm or death to one or more clearly identifiable potential victims, and the client has the apparent intent and ability to carry out the threat.',
    sort_order: 21
  },
  {
    category: 'confidentiality_limits',
    item_key: 'child_abuse',
    item_label: 'Child Abuse/Neglect',
    description: 'Mandatory reporting disclosed',
    ohio_citation: 'ORC 2151.421',
    required_when: null,
    sort_order: 22
  },
  {
    category: 'confidentiality_limits',
    item_key: 'elder_abuse',
    item_label: 'Elder Abuse/Neglect',
    description: 'Mandatory reporting disclosed (expanded Jan 2025)',
    ohio_citation: 'ORC 5101.61',
    required_when: null,
    sort_order: 23
  },
  {
    category: 'confidentiality_limits',
    item_key: 'companion_animal',
    item_label: 'Companion Animal Abuse',
    description: 'Mandatory reporting disclosed',
    ohio_citation: 'OAC 4757-5-10',
    required_when: null,
    suggested_language: 'If the therapist has reasonable cause to suspect abuse or neglect of a companion animal, disclosure may occur as required by Ohio law.',
    sort_order: 24
  },
  {
    category: 'confidentiality_limits',
    item_key: 'court_orders',
    item_label: 'Court Orders/Subpoenas',
    description: 'Disclosure requirement explained',
    ohio_citation: 'ORC 2317.02',
    required_when: null,
    sort_order: 25
  },

  // Category 4: Minor Client Consent
  {
    category: 'minor_consent',
    item_key: 'ohio_14_plus_law',
    item_label: 'Ohio 14+ Consent Law',
    description: 'Minors 14+ may consent to 6 sessions or 30 days without parental consent',
    ohio_citation: 'ORC 5122.04',
    required_when: { sees_minors: 'yes' },
    sort_order: 30
  },
  {
    category: 'minor_consent',
    item_key: 'identified_client',
    item_label: 'Identified Client',
    description: 'Child is the client, not parent',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { sees_minors: 'yes' },
    sort_order: 31
  },
  {
    category: 'minor_consent',
    item_key: 'custody_documentation',
    item_label: 'Custody Documentation',
    description: 'Required before treatment',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { sees_minors: 'yes' },
    sort_order: 32
  },

  // Category 5: Couples/Family Therapy Consent
  {
    category: 'couples_consent',
    item_key: 'confidentiality_agreement',
    item_label: 'Confidentiality Agreement',
    description: 'Agreement sought among all parties',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { sees_couples: 'yes' },
    sort_order: 40
  },
  {
    category: 'couples_consent',
    item_key: 'no_secrets_policy',
    item_label: 'No Secrets Policy',
    description: 'Clearly stated (or alternative policy)',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { sees_couples: 'yes' },
    sort_order: 41
  },
  {
    category: 'couples_consent',
    item_key: 'records_release',
    item_label: 'Records Release',
    description: 'Requires consent of all parties',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { sees_couples: 'yes' },
    sort_order: 42
  },

  // Category 6: Fee Structure
  {
    category: 'fee_structure',
    item_key: 'fee_schedule',
    item_label: 'Fee Schedule',
    description: 'Listed by service type',
    ohio_citation: 'ORC 4757.12',
    required_when: null,
    sort_order: 50
  },
  {
    category: 'fee_structure',
    item_key: 'good_faith_estimate',
    item_label: 'Good Faith Estimate',
    description: 'Referenced or provided',
    ohio_citation: 'Federal - No Surprises Act',
    required_when: null,
    sort_order: 51
  },
  {
    category: 'fee_structure',
    item_key: 'no_surprises_act',
    item_label: 'No Surprises Act Notice',
    description: 'Notice provided or referenced',
    ohio_citation: 'Federal - No Surprises Act',
    required_when: null,
    sort_order: 52
  },

  // Category 7: Telehealth
  {
    category: 'telehealth',
    item_key: 'state_licensure_limits',
    item_label: 'State Licensure Limits',
    description: 'Services only when client in state where therapist licensed',
    ohio_citation: 'OAC 4757-5-13',
    required_when: { offers_telehealth: 'yes' },
    sort_order: 60
  },
  {
    category: 'telehealth',
    item_key: 'crisis_hotline',
    item_label: 'Local Crisis Hotline',
    description: 'Phone number provided',
    ohio_citation: 'OAC 4757-5-13',
    required_when: { offers_telehealth: 'yes' },
    sort_order: 61
  },
  {
    category: 'telehealth',
    item_key: 'contingency_plan',
    item_label: 'Technology Contingency Plan',
    description: 'What happens if connection fails',
    ohio_citation: 'OAC 4757-5-13',
    required_when: { offers_telehealth: 'yes' },
    sort_order: 62
  },
  {
    category: 'telehealth',
    item_key: 'location_confirmation',
    item_label: 'Location Confirmation',
    description: 'Client confirms location at start of session',
    ohio_citation: 'OAC 4757-5-13',
    required_when: { offers_telehealth: 'yes' },
    sort_order: 63
  },

  // Category 8: HIPAA/Privacy
  {
    category: 'hipaa_privacy',
    item_key: 'notice_of_privacy_practices',
    item_label: 'Notice of Privacy Practices',
    description: 'Complete HIPAA notice',
    ohio_citation: 'HIPAA',
    required_when: null,
    sort_order: 70
  },
  {
    category: 'hipaa_privacy',
    item_key: 'record_retention',
    item_label: 'Record Retention',
    description: '7 years per Ohio law',
    ohio_citation: 'OAC 4757-5-09',
    required_when: null,
    suggested_language: 'In accordance with Ohio Administrative Code 4757-5-09, [Practice Name] maintains your records for seven (7) years following the last date of service.',
    sort_order: 71
  },

  // Category 9: AI/Technology Consent
  {
    category: 'ai_consent',
    item_key: 'ai_tools_listed',
    item_label: 'AI Tools Used Listed',
    description: 'Note-taking, scheduling, billing, etc.',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { uses_ai: 'yes' },
    sort_order: 80
  },
  {
    category: 'ai_consent',
    item_key: 'ai_tools_not_used_for',
    item_label: 'AI Tools NOT Used For',
    description: 'Clinical decisions, direct communication, emotion detection',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { uses_ai: 'yes' },
    sort_order: 81
  },
  {
    category: 'ai_consent',
    item_key: 'session_transcription_opt_in',
    item_label: 'Session Transcription Opt-In',
    description: 'Separate opt-in if recording/transcribing',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { uses_ai: 'yes' },
    sort_order: 82
  },
  {
    category: 'ai_consent',
    item_key: 'right_to_revoke',
    item_label: 'Right to Revoke',
    description: 'Can withdraw AI consent without affecting care',
    ohio_citation: 'OAC 4757-5-02',
    required_when: { uses_ai: 'yes' },
    sort_order: 83
  }
];

export async function seedPolicyReviewChecklist() {
  const { error } = await supabaseAdmin()
    .from('policy_review_checklist_items')
    .upsert(OHIO_POLICY_REVIEW_CHECKLIST, {
      onConflict: 'category,item_key'
    });

  if (error) throw error;
  return { success: true, count: OHIO_POLICY_REVIEW_CHECKLIST.length };
}
```

---

### Phase 4: Policy Review UI Components

#### 4.1 Review Checklist Component

**File:** `src/components/policy-review/review-checklist.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CheckCircle, XCircle, AlertCircle, MinusCircle, Clock } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: string;
  item_key: string;
  item_label: string;
  description: string;
  ohio_citation: string | null;
  suggested_language: string | null;
}

interface ReviewResult {
  checklist_item_id: string;
  status: 'pass' | 'fail' | 'partial' | 'not_applicable' | 'pending';
  notes: string;
  document_reference: string;
  current_language: string;
}

const STATUS_ICONS = {
  pass: <CheckCircle className="h-5 w-5 text-green-500" />,
  fail: <XCircle className="h-5 w-5 text-red-500" />,
  partial: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  not_applicable: <MinusCircle className="h-5 w-5 text-gray-400" />,
  pending: <Clock className="h-5 w-5 text-gray-400" />
};

const STATUS_LABELS = {
  pass: 'Pass',
  fail: 'Needs Attention',
  partial: 'Partial',
  not_applicable: 'N/A',
  pending: 'Pending'
};

export function ReviewChecklist({
  items,
  results,
  onUpdateResult,
  matterId
}: {
  items: ChecklistItem[];
  results: Record<string, ReviewResult>;
  onUpdateResult: (itemId: string, result: Partial<ReviewResult>) => void;
  matterId: string;
}) {
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="space-y-8">
      {categories.map(category => (
        <div key={category} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 capitalize">
            {category.replace(/_/g, ' ')}
          </h3>
          <div className="space-y-4">
            {items
              .filter(i => i.category === category)
              .map(item => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  result={results[item.id]}
                  onUpdate={(result) => onUpdateResult(item.id, result)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChecklistItemRow({
  item,
  result,
  onUpdate
}: {
  item: ChecklistItem;
  result?: ReviewResult;
  onUpdate: (result: Partial<ReviewResult>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = result?.status || 'pending';

  return (
    <div className="border-l-4 border-l-gray-200 pl-4 py-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {STATUS_ICONS[status]}
            <span className="font-medium">{item.item_label}</span>
            {item.ohio_citation && (
              <Badge variant="outline" className="text-xs">
                {item.ohio_citation}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => onUpdate({ status: value as ReviewResult['status'] })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 bg-muted/50 p-4 rounded">
          <div>
            <label className="text-sm font-medium">Document Reference</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              placeholder="e.g., Informed Consent, Page 1, Section 3"
              value={result?.document_reference || ''}
              onChange={(e) => onUpdate({ document_reference: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Current Language</label>
            <Textarea
              placeholder="Quote the current text from the document..."
              value={result?.current_language || ''}
              onChange={(e) => onUpdate({ current_language: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Additional notes or observations..."
              value={result?.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>

          {item.suggested_language && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <label className="text-sm font-medium text-green-800">
                Suggested Language
              </label>
              <p className="text-sm text-green-700 mt-1 whitespace-pre-wrap">
                {item.suggested_language}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 4.2 Policy Review Page

**File:** `src/app/matters/[id]/policy-review/page.tsx`

```typescript
import { getMatter } from '@/lib/data/queries';
import { getPolicyReviewChecklist, getPolicyReviewResults } from '@/lib/policy-review/queries';
import { ReviewChecklist } from '@/components/policy-review/review-checklist';
import { ReviewSummary } from '@/components/policy-review/review-summary';
import { GenerateReportButton } from '@/components/policy-review/generate-report-button';

export default async function PolicyReviewPage({
  params
}: {
  params: { id: string }
}) {
  const matter = await getMatter(params.id);
  const checklistItems = await getPolicyReviewChecklist(matter.intake_responses);
  const reviewResults = await getPolicyReviewResults(params.id);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Policy Review</h1>
          <p className="text-muted-foreground">
            {matter.title} - Ohio Compliance Checklist
          </p>
        </div>
        <GenerateReportButton matterId={params.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <ReviewChecklist
            items={checklistItems}
            results={reviewResults}
            matterId={params.id}
          />
        </div>
        <div className="lg:col-span-1">
          <ReviewSummary
            matterId={params.id}
            items={checklistItems}
            results={reviewResults}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 5: Report Generation

#### 5.1 Report Generation Action

**File:** `src/lib/policy-review/actions.ts`

```typescript
'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureStaffOrAdmin } from '@/lib/auth/ensure-role';
import { revalidatePath } from 'next/cache';
import { uploadFileToGoogleDrive } from '@/lib/google-drive/actions';

export async function generatePolicyReviewReport(matterId: string) {
  await ensureStaffOrAdmin();

  // Fetch all data
  const { data: matter } = await supabaseAdmin()
    .from('matters')
    .select('*, client:profiles!client_id(*)')
    .eq('id', matterId)
    .single();

  const { data: results } = await supabaseAdmin()
    .from('policy_review_results')
    .select('*, checklist_item:policy_review_checklist_items(*)')
    .eq('matter_id', matterId);

  // Generate markdown report
  const report = generateReportMarkdown(matter, results);

  // Upload to Google Drive
  const driveResult = await uploadFileToGoogleDrive({
    matterId,
    fileName: `Policy-Review-Report-${new Date().toISOString().split('T')[0]}.md`,
    content: report,
    folderPath: '02 Work Product'
  });

  // Update summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const notApplicable = results.filter(r => r.status === 'not_applicable').length;
  const pending = results.filter(r => r.status === 'pending').length;

  await supabaseAdmin()
    .from('policy_review_summaries')
    .upsert({
      matter_id: matterId,
      total_items: results.length,
      passed_items: passed,
      failed_items: failed,
      partial_items: partial,
      not_applicable_items: notApplicable,
      pending_items: pending,
      report_generated_at: new Date().toISOString(),
      report_drive_file_id: driveResult.fileId,
      status: 'completed',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'matter_id'
    });

  revalidatePath(`/matters/${matterId}`);

  return {
    success: true,
    reportUrl: driveResult.webViewLink,
    summary: { passed, failed, partial, pending, total: results.length }
  };
}

function generateReportMarkdown(matter: any, results: any[]): string {
  const passed = results.filter(r => r.status === 'pass');
  const failed = results.filter(r => r.status === 'fail');
  const partial = results.filter(r => r.status === 'partial');

  return `# Ohio Therapy Policy Review Report

**Practice:** ${matter.client?.full_name || matter.title}
**Date:** ${new Date().toLocaleDateString()}
**Matter:** ${matter.title}

---

## Summary

| Metric | Count |
|--------|-------|
| Items Checked | ${results.length} |
| Passed | ${passed.length} |
| Needs Attention | ${failed.length} |
| Partial | ${partial.length} |

---

## Items Needing Attention

${failed.map(r => `
### ${r.checklist_item.item_label}

**Status:** Needs Attention
**Ohio Citation:** ${r.checklist_item.ohio_citation || 'N/A'}
**Location:** ${r.document_reference || 'Not specified'}

**Issue:** ${r.checklist_item.description}

${r.current_language ? `**Current Language:**
> ${r.current_language}` : ''}

${r.checklist_item.suggested_language ? `**Suggested Language:**
> ${r.checklist_item.suggested_language}` : ''}

${r.notes ? `**Notes:** ${r.notes}` : ''}

---
`).join('\n')}

## Partial Compliance Items

${partial.map(r => `
### ${r.checklist_item.item_label}

**Status:** Partial
**Ohio Citation:** ${r.checklist_item.ohio_citation || 'N/A'}
**Location:** ${r.document_reference || 'Not specified'}

${r.notes ? `**Notes:** ${r.notes}` : ''}

---
`).join('\n')}

## Passed Items

${passed.map(r => `- ${r.checklist_item.item_label} (${r.checklist_item.ohio_citation || 'N/A'})`).join('\n')}

---

*Report generated by MatterFlow Policy Review System*
*Ohio compliance checklist based on ORC Title 47, OAC Chapter 4757*
`;
}
```

---

### Phase 6: Email Notification

Add email notification when review is complete.

**File:** `src/lib/email/templates/policy-review-complete.tsx`

```typescript
import { BaseLayout } from './base-layout';
import { Button, Text, Section } from '@react-email/components';

interface PolicyReviewCompleteEmailProps {
  clientName: string;
  matterTitle: string;
  passedCount: number;
  failedCount: number;
  reportUrl: string;
  settings: FirmSettings;
}

export function PolicyReviewCompleteEmail({
  clientName,
  matterTitle,
  passedCount,
  failedCount,
  reportUrl,
  settings
}: PolicyReviewCompleteEmailProps) {
  return (
    <BaseLayout settings={settings}>
      <Section>
        <Text>Dear {clientName},</Text>

        <Text>
          Your Ohio therapy practice policy review for "{matterTitle}" has been completed.
        </Text>

        <Text>
          <strong>Summary:</strong><br />
          Items Passed: {passedCount}<br />
          Items Needing Attention: {failedCount}
        </Text>

        {failedCount > 0 ? (
          <Text>
            We've identified {failedCount} items that need attention to ensure
            compliance with Ohio CSWMFT Board requirements. Please review the
            detailed report for specific recommendations.
          </Text>
        ) : (
          <Text>
            Great news! Your policies appear to be compliant with Ohio requirements.
            Please review the full report for details.
          </Text>
        )}

        <Button href={reportUrl}>
          View Full Report
        </Button>

        <Text>
          If you have any questions about the findings or need assistance
          implementing the recommended changes, please don't hesitate to reach out.
        </Text>
      </Section>
    </BaseLayout>
  );
}
```

---

## Integration Points

### Navigation

Add to matter detail page sidebar:

```typescript
// src/components/matter-sidebar.tsx
{matter.matter_type === 'Policy Review' && (
  <Link href={`/matters/${matter.id}/policy-review`}>
    <Button variant="outline" className="w-full justify-start">
      <ClipboardCheck className="mr-2 h-4 w-4" />
      Ohio Compliance Review
    </Button>
  </Link>
)}
```

### Matter Type Detection

Auto-enable policy review for appropriate matter types:

```typescript
// src/lib/policy-review/utils.ts
export function isPolicyReviewMatter(matterType: string): boolean {
  const policyReviewTypes = [
    'Policy Review',
    'Compliance Audit',
    'Practice Setup',
    'Annual Review'
  ];
  return policyReviewTypes.some(t =>
    matterType.toLowerCase().includes(t.toLowerCase())
  );
}
```

---

## File Structure Summary

```
src/
├── app/
│   └── matters/
│       └── [id]/
│           └── policy-review/
│               └── page.tsx           # Review checklist page
├── components/
│   └── policy-review/
│       ├── review-checklist.tsx       # Main checklist component
│       ├── review-summary.tsx         # Summary sidebar
│       ├── generate-report-button.tsx # Report generation
│       └── checklist-item-row.tsx     # Individual item row
├── lib/
│   └── policy-review/
│       ├── actions.ts                 # Server actions
│       ├── queries.ts                 # Data queries
│       ├── seed-checklist.ts          # Checklist seed data
│       └── utils.ts                   # Helper functions
└── types/
    └── policy-review.ts               # TypeScript types

supabase/
└── migrations/
    └── YYYYMMDD_policy_review_checklist.sql

skills/
└── ohio-therapy-policy-review/
    ├── SKILL.md                       # Reference skill
    └── reference-templates/           # Template documents
```

---

## Development Sequence

1. **Week 1:** Database schema + seed checklist data
2. **Week 2:** Basic review UI (checklist display + status updates)
3. **Week 3:** Report generation + Google Drive upload
4. **Week 4:** Email notifications + polish

---

## Future Enhancements

1. **AI-Assisted Review:** Use Claude to auto-analyze uploaded documents against checklist
2. **Template Generation:** Auto-generate corrected policy documents
3. **Multi-State Support:** Add Michigan, other state checklists
4. **Recurring Reviews:** Annual review reminders
5. **Compliance Dashboard:** Firm-wide compliance tracking across all clients

---

## Phase 7: PII Redaction Service

**Critical for privacy:** Redact personally identifiable information before sending documents to LLM for automated analysis.

### Redaction Service

**File:** `src/lib/policy-review/redaction.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface RedactionResult {
  redactedText: string;
  redactionMap: Map<string, string>; // placeholder -> original (for restoration if needed)
  redactionCount: number;
  redactionTypes: Record<string, number>; // counts by type
}

export interface RedactionOptions {
  preserveCredentials?: boolean; // Keep "LPCC", "LISW" etc. when adjacent to names
  useNER?: boolean; // Use NER for names (requires API call)
  redactDates?: boolean; // Some dates may be relevant to policy effective dates
}

// Regex patterns for PII detection
const PATTERNS = {
  phone: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  email: /[\w.-]+@[\w.-]+\.\w+/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  date: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  address: /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Boulevard|Blvd|Suite|Ste|Floor|Fl|Unit|Apt|#)\.?(?:\s*(?:#|Unit|Apt|Suite|Ste)?\s*\d+)?/gi,
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  bankAccount: /\b\d{8,17}\b/g, // Very broad - use with caution
};

// Patterns to PRESERVE (don't redact these)
const PRESERVE_PATTERNS = [
  /Ohio\s+(?:Counselor|CSWMFT|Board)/gi,
  /ORC\s+\d+\.\d+/gi,
  /OAC\s+\d+-\d+-\d+/gi,
  /614-466-0912/g, // Ohio Board phone
  /77\s+(?:South\s+)?High\s+Street/gi, // Ohio Board address
  /\d{3}-\d{3}-8255/g, // Crisis hotlines (988 format varies)
  /988/g, // Suicide hotline
  /911/g, // Emergency
];

/**
 * Pattern-based redaction (fast, no API calls)
 */
export function redactPatterns(
  text: string,
  options: RedactionOptions = {}
): RedactionResult {
  const redactionMap = new Map<string, string>();
  const redactionTypes: Record<string, number> = {};
  let redactedText = text;
  let count = 0;

  // First, mark text to preserve
  const preserveMarkers: { start: number; end: number }[] = [];
  for (const pattern of PRESERVE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      preserveMarkers.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  const shouldPreserve = (index: number, length: number): boolean => {
    return preserveMarkers.some(
      m => index >= m.start && index + length <= m.end
    );
  };

  // Redact each pattern type
  const redactPattern = (
    pattern: RegExp,
    type: string,
    placeholder: string
  ) => {
    redactedText = redactedText.replace(pattern, (match, offset) => {
      // Check if this match is in a preserve zone
      if (shouldPreserve(offset, match.length)) {
        return match;
      }

      const key = `${placeholder}_${++count}`;
      redactionMap.set(key, match);
      redactionTypes[type] = (redactionTypes[type] || 0) + 1;
      return `[${key}]`;
    });
  };

  // Apply redactions in order of specificity
  redactPattern(PATTERNS.ssn, 'ssn', 'SSN');
  redactPattern(PATTERNS.creditCard, 'credit_card', 'CARD');
  redactPattern(PATTERNS.email, 'email', 'EMAIL');
  redactPattern(PATTERNS.phone, 'phone', 'PHONE');
  redactPattern(PATTERNS.address, 'address', 'ADDRESS');

  if (options.redactDates !== false) {
    redactPattern(PATTERNS.date, 'date', 'DATE');
  }

  return {
    redactedText,
    redactionMap,
    redactionCount: count,
    redactionTypes
  };
}

/**
 * NER-based redaction using Claude Haiku (for names and organizations)
 * Use after pattern-based redaction for best results
 */
export async function redactWithNER(
  text: string,
  options: RedactionOptions = {}
): Promise<RedactionResult> {
  // First do pattern-based redaction
  const patternResult = redactPatterns(text, options);

  // Use Claude Haiku for NER (fast and cheap)
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 8192,
    system: `You are a PII redaction assistant. Your task is to identify and replace personal information in therapy practice policy documents.

REPLACE these with placeholders:
- Person names (therapists, clients, staff) → [PERSON_NAME_1], [PERSON_NAME_2], etc.
- Practice/clinic names → [PRACTICE_NAME]
- Specific license numbers → [LICENSE_NUMBER]

DO NOT REPLACE:
- Generic role references ("the therapist", "the client", "your therapist")
- Ohio CSWMFT Board or any government agency names
- Legal citations (ORC, OAC, HIPAA references)
- Crisis hotline numbers
- Credential abbreviations alone (LPCC, LISW, LMFT)
- Template placeholders that are already bracketed

${options.preserveCredentials ? 'When you see a name followed by credentials like "Jane Smith, LPCC", replace only the name: "[PERSON_NAME], LPCC"' : ''}

Return ONLY the redacted text. Do not include any explanation or commentary.`,
    messages: [{
      role: 'user',
      content: patternResult.redactedText
    }]
  });

  const nerRedactedText = response.content[0].type === 'text'
    ? response.content[0].text
    : patternResult.redactedText;

  // Count NER redactions
  const nerMatches = nerRedactedText.match(/\[(PERSON_NAME|PRACTICE_NAME|LICENSE_NUMBER)_?\d*\]/g) || [];

  return {
    redactedText: nerRedactedText,
    redactionMap: patternResult.redactionMap,
    redactionCount: patternResult.redactionCount + nerMatches.length,
    redactionTypes: {
      ...patternResult.redactionTypes,
      person_name: (nerRedactedText.match(/\[PERSON_NAME_?\d*\]/g) || []).length,
      practice_name: (nerRedactedText.match(/\[PRACTICE_NAME\]/g) || []).length,
      license_number: (nerRedactedText.match(/\[LICENSE_NUMBER\]/g) || []).length
    }
  };
}

/**
 * Full redaction pipeline for policy review documents
 */
export async function redactDocument(
  text: string,
  options: RedactionOptions = { preserveCredentials: true, useNER: true }
): Promise<RedactionResult> {
  if (options.useNER) {
    return redactWithNER(text, options);
  }
  return redactPatterns(text, options);
}

/**
 * Restore original values from redacted text (for final report delivery)
 */
export function restoreRedactions(
  redactedText: string,
  redactionMap: Map<string, string>
): string {
  let restoredText = redactedText;

  for (const [placeholder, original] of redactionMap) {
    restoredText = restoredText.replace(`[${placeholder}]`, original);
  }

  return restoredText;
}
```

### Integration with Review Workflow

**File:** `src/lib/policy-review/actions.ts` (add to existing)

```typescript
import { redactDocument, RedactionResult } from './redaction';
import { extractTextFromDocument } from '@/lib/document-processing';

export async function analyzeDocumentWithLLM(
  matterId: string,
  documentId: string
): Promise<{
  analysis: string;
  redactionStats: RedactionResult['redactionTypes'];
}> {
  await ensureStaffOrAdmin();

  // 1. Get document from Google Drive
  const document = await getDocument(documentId);
  const rawText = await extractTextFromDocument(document.drive_file_id);

  // 2. Redact PII before sending to LLM
  const redactionResult = await redactDocument(rawText, {
    preserveCredentials: true,
    useNER: true,
    redactDates: false // Keep dates - relevant for policy effective dates
  });

  // 3. Log redaction stats (not the content)
  await logAuditEvent({
    action: 'document_redacted_for_analysis',
    matter_id: matterId,
    metadata: {
      document_id: documentId,
      redaction_count: redactionResult.redactionCount,
      redaction_types: redactionResult.redactionTypes
    }
  });

  // 4. Send redacted text to Claude for analysis
  const anthropic = new Anthropic();
  const analysisResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are reviewing Ohio therapy practice policies for compliance.
Use the ohio-therapy-policy-review checklist to analyze this document.
Note: Personal information has been redacted with placeholders like [PERSON_NAME], [PHONE], etc.
Focus on policy content and compliance, not the specific names/numbers.`,
    messages: [{
      role: 'user',
      content: `Analyze this therapy policy document for Ohio compliance:\n\n${redactionResult.redactedText}`
    }]
  });

  const analysis = analysisResponse.content[0].type === 'text'
    ? analysisResponse.content[0].text
    : 'Analysis failed';

  return {
    analysis,
    redactionStats: redactionResult.redactionTypes
  };
}
```

### Database: Track Redaction Stats

Add to migration:

```sql
-- Add redaction tracking to policy_review_summaries
ALTER TABLE policy_review_summaries
ADD COLUMN redaction_stats JSONB DEFAULT '{}';

-- Example stored value:
-- {
--   "phone": 3,
--   "email": 2,
--   "address": 1,
--   "person_name": 5,
--   "practice_name": 1
-- }
```

### UI: Show Redaction Status

**File:** `src/components/policy-review/redaction-badge.tsx`

```typescript
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface RedactionBadgeProps {
  stats: Record<string, number>;
}

export function RedactionBadge({ stats }: RedactionBadgeProps) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          {total} items redacted
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium mb-1">PII Redacted Before Analysis:</p>
          <ul className="text-xs space-y-1">
            {Object.entries(stats).map(([type, count]) => (
              <li key={type}>
                {type.replace(/_/g, ' ')}: {count}
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Estimated Effort

| Task | Time |
|------|------|
| Pattern-based redaction | 1 day |
| NER integration with Haiku | 1 day |
| Integration with review workflow | 1 day |
| Testing & edge cases | 1 day |
| **Total** | **4 days** |

### Cost Estimate (LLM)

- Claude Haiku for NER: ~$0.001 per document (very cheap)
- Claude Sonnet for analysis: ~$0.01-0.05 per document
- Total per policy review: **< $0.10**

---

## Testing

### Unit Tests
- Checklist item filtering based on intake responses
- Report markdown generation
- Status calculations

### Integration Tests
- Full review workflow (create → review → generate report)
- Email sending on completion
- Google Drive upload

### Manual Testing
- Upload sample policies (use test-review folder)
- Complete full checklist
- Generate and verify report
