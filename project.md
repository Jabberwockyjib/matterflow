Perfect. Below is a developer-ready PRD + functional specification you can hand directly to a team and confidently say: “If you build this as written, we will have a usable, launch-ready product that solves a real legal pain point and can later become a commercial SaaS.”

I’m intentionally opinionated and explicit. Ambiguity is what kills projects like this.

⸻

📘 Product Requirements Document (PRD)

Working Title: MatterFlow™

A workflow-first legal practice system for solo & small-firm lawyers

⸻

1. Executive Summary

Problem Statement

Solo and small-practice lawyers—especially those serving therapists and professional practices—are forced to juggle email (Gmail), case management (CaseFox), and payments (Square). This leads to:
	•	Duplicate invoicing
	•	Lost time entries
	•	Poor visibility into “what’s stuck”
	•	Manual document handling
	•	Administrative drag that steals billable hours

Solution

Build a workflow-centric, AI-assisted matter management platform that:
	•	Has one billing system of record
	•	Syncs to Square automatically
	•	Makes time tracking effortless
	•	Supports flat-fee packages natively
	•	Organizes documents automatically in Google Drive
	•	Shows exactly who owes the next action—lawyer or client

This is not a generic Clio competitor. It is a focused, opinionated system for small practices doing repeatable work.

⸻

2. Product Goals & Success Metrics

Primary Goals
	1.	Eliminate double invoicing (CaseFox + Square)
	2.	Reduce administrative time per matter
	3.	Improve visibility of matter status and responsibility
	4.	Create a clean foundation for future SaaS launch

Success Metrics (MVP)
	•	Lawyer creates one invoice only per matter
	•	< 2 clicks to start/stop time tracking
	•	100% of uploaded documents routed to correct Drive folders
	•	Every matter has exactly one “Next Action”
	•	Zero lost invoices or untracked time after 30 days

⸻

3. Target Users

Personas

Lawyer (Admin)
	•	Owns matters, pricing, approvals, billing
	•	Final authority on AI outputs

Staff / Paralegal
	•	Intake handling
	•	Document prep
	•	Task management

Client (Therapist / Practice Owner)
	•	Uploads documents
	•	Reviews deliverables
	•	Pays invoices
	•	Responds to tasks

⸻

4. Core Concepts (Non-Negotiable)

A. Matter Pipeline (Central Organizing Model)

Every case is a Matter that moves through defined stages.

Stages (fixed order):
	1.	Lead Created
	2.	Intake Sent
	3.	Intake Received
	4.	Conflict Check
	5.	Under Review
	6.	Waiting on Client
	7.	Draft Ready
	8.	Sent to Client
	9.	Billing Pending
	10.	Completed
	11.	Archived

Each Matter must have:
	•	Assigned Owner
	•	Matter Type
	•	Billing Model
	•	One and only one “Next Action”
	•	Responsible Party (Lawyer or Client)

⸻

B. Single Source of Truth for Billing

Invoices are created in MatterFlow only.
Square is a payment processor, not a billing UI.

⸻

5. Functional Requirements (By Module)

⸻

5.1 Authentication & Roles

Requirements
	•	Supabase Auth
	•	Role-based access control (RLS enforced)
	•	Roles:
	•	Admin (Lawyer)
	•	Staff
	•	Client

Acceptance Criteria
	•	Clients can only see their matters
	•	Staff cannot approve invoices
	•	All permission changes logged

⸻

5.2 Matter Management

Create Matter

Required fields:
	•	Client (individual or org)
	•	Matter Type (Will, Contract Review, Policy Review)
	•	Billing Model (Hourly / Flat / Hybrid)
	•	Assigned Owner

Matter View Must Show:
	•	Stage
	•	Next Action
	•	Responsible Party
	•	Task List
	•	Documents
	•	Time Entries
	•	Invoices
	•	Communications Timeline

Acceptance Criteria
	•	No matter can exist without an owner
	•	Matter stage changes are logged

⸻

5.3 Intake & Conflict Checking

Intake Forms
	•	Dynamic per Matter Type
	•	Stored as structured JSON
	•	File uploads supported

Conflict Check AI Agent
	•	Scans:
	•	Client name
	•	Organization
	•	Extracted party names from documents
	•	Produces:
	•	Match list
	•	Confidence score
	•	Rationale

Rules
	•	Conflict check must be approved manually
	•	Matter cannot progress until resolved

⸻

5.4 Document Management (Google Drive)

Folder Structure (Auto-created)

/Client Name/
  /Matter Name/
    00 Intake
    01 Source Docs
    02 Work Product
    03 Client Deliverables
    04 Billing & Engagement
    99 Archive

Document Rules
	•	All uploads stored in Drive
	•	Metadata stored in Supabase
	•	Versioning required
	•	AI classification on upload

Acceptance Criteria
	•	Upload → folder placement < 60 seconds
	•	Lawyer can view AI summary inline
	•	No duplicate files on retry

⸻

5.5 Time Tracking

Modes
	•	Timer-based
	•	Manual entry
	•	AI-suggested assignment (optional)

Requirements
	•	Timer starts from Matter page
	•	Entries must be approved before billing
	•	Time entries link to:
	•	Matter
	•	Task (optional)
	•	Billing period

Acceptance Criteria
	•	User can approve all time entries for a matter in one action
	•	Time cannot be edited after invoice is finalized

⸻

5.6 Packages & Pricing

Package Templates

Examples:
	•	“Standard Will Package – $750”
	•	“Policy Review – $500”
	•	“Practice Owner Bundle – 10 hrs”

Package Rules
	•	Flat fee (no time tracking required)
	•	Hybrid (X hours included, overage billed)

Acceptance Criteria
	•	Package selection auto-generates tasks
	•	Package pricing flows directly to invoice

⸻

5.7 Invoicing & Payments (Critical)

Invoice Creation
	•	Generated from:
	•	Approved time entries
	•	Package pricing
	•	Editable before approval
	•	Locked after approval

Square Integration
	•	On approval:
	•	Invoice auto-syncs to Square
	•	Payment link generated
	•	Payment status syncs back

Statuses
	•	Draft
	•	Sent
	•	Paid
	•	Partial
	•	Overdue

Acceptance Criteria
	•	No duplicate invoices
	•	Lawyer never logs into Square to create invoices
	•	Failed sync is visible and retryable

⸻

5.8 Tasks & Responsibility Tracking

Task Attributes
	•	Title
	•	Matter
	•	Due Date
	•	Responsible Party (Client/Lawyer)
	•	Status

Rules
	•	Every matter must have ≥1 open task unless Completed
	•	Overdue tasks flagged on dashboard

⸻

5.9 Automation & Follow-Ups

Default Automations
	•	Intake reminder after 24h
	•	Client reminder after 3 days idle
	•	Invoice reminder after X days unpaid
	•	Internal reminder after 7 days no activity

Requirements
	•	All automations logged
	•	Automations can be paused per matter

⸻

5.10 Dashboards & Reporting

Daily Dashboard
	•	Tasks due today
	•	Waiting on Client
	•	Waiting on Lawyer
	•	Unpaid invoices
	•	New leads aging

Reports (MVP)
	•	Billable vs non-billable time
	•	Revenue by matter type
	•	Invoice aging

⸻

6. AI Agents (Bounded & Auditable)

Agent	Function	Output
Intake Classifier	Doc type + summary	JSON + confidence
Conflict Triage	Potential conflicts	Match list
Review Pack Generator	Contract/policy analysis	Structured report
Matter Copilot	Next step suggestions	Suggestions only

Rules
	•	No AI action auto-executes without human approval
	•	All AI inputs/outputs logged

⸻

7. Technical Stack (Mandated)

Frontend
	•	Next.js (latest App Router)
	•	shadcn/ui
	•	Tailwind CSS

Backend
	•	Supabase (Postgres + RLS)
	•	Edge Functions for integrations
	•	Background jobs for AI + Drive sync

Integrations
	•	Google Drive & Docs (personal accounts)
	•	Gmail API (attachments + drafts)
	•	Square API (payments only)

⸻

8. Security & Compliance

Requirements
	•	Encryption at rest & in transit
	•	Row-level security enforced
	•	Audit log for:
	•	Document access
	•	Invoice changes
	•	AI actions
	•	Data export per client/matter

⸻

9. Definition of Done (MVP)

The MVP is complete when:
	•	A matter can go from lead → intake → review → invoice → paid without leaving the system
	•	Billing happens once and syncs to Square
	•	Time tracking is effortless and reliable
	•	Documents are always where users expect them
	•	Dashboard clearly shows what is stuck and why

⸻

10. Launch Positioning (Future SaaS)

Target market:
	•	Solo & small-practice lawyers
	•	Flat-fee or hybrid billing
	•	High document repetition
	•	Healthcare / therapist adjacent practices

Core differentiator:

“Know exactly what’s happening in your practice—without managing five tools.”

