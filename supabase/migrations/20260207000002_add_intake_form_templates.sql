-- Create intake_form_templates table for admin-editable form templates
CREATE TABLE IF NOT EXISTS intake_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  matter_type text,
  description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'custom',
  source_form_id text
);

-- Index for matter_type lookups
CREATE INDEX idx_intake_form_templates_matter_type ON intake_form_templates(matter_type) WHERE is_active = true;

-- RLS policies
ALTER TABLE intake_form_templates ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_full_access_intake_templates" ON intake_form_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff can read active templates
CREATE POLICY "staff_read_intake_templates" ON intake_form_templates
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

-- Clients can read active templates (needed for intake form rendering)
CREATE POLICY "client_read_intake_templates" ON intake_form_templates
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'client'
    )
  );

-- Seed existing hardcoded templates (same content as src/lib/intake/templates.ts)
INSERT INTO intake_form_templates (name, matter_type, description, sections, version, is_default, source) VALUES
(
  'Contract Review Intake',
  'Contract Review',
  'Intake form for contract review and negotiation services',
  '[{"id":"client-info","title":"Client Information","description":"Basic information about you and your organization","fields":[{"id":"client_name","type":"text","label":"Full Name or Organization Name","required":true,"placeholder":"Jane Doe or Acme Therapy Practice"},{"id":"client_email","type":"email","label":"Email Address","required":true,"placeholder":"jane@example.com"},{"id":"client_phone","type":"phone","label":"Phone Number","required":true,"placeholder":"(555) 123-4567"},{"id":"business_type","type":"select","label":"Business Type","required":true,"options":[{"value":"sole_proprietor","label":"Sole Proprietor"},{"value":"llc","label":"LLC"},{"value":"corporation","label":"Corporation"},{"value":"partnership","label":"Partnership"},{"value":"nonprofit","label":"Nonprofit"}]}]},{"id":"contract-details","title":"Contract Details","description":"Information about the contract you need reviewed","fields":[{"id":"contract_type","type":"select","label":"Type of Contract","required":true,"options":[{"value":"employment","label":"Employment Agreement"},{"value":"vendor","label":"Vendor/Service Agreement"},{"value":"lease","label":"Lease Agreement"},{"value":"partnership","label":"Partnership Agreement"},{"value":"nda","label":"Non-Disclosure Agreement"},{"value":"other","label":"Other"}]},{"id":"contract_type_other","type":"text","label":"Please specify","required":true,"conditionalDisplay":{"field":"contract_type","value":"other"}},{"id":"other_party","type":"text","label":"Other Party Name","description":"Name of the person or organization on the other side","required":true},{"id":"contract_value","type":"number","label":"Estimated Contract Value ($)","description":"Total dollar amount involved","placeholder":"50000"},{"id":"deadline","type":"date","label":"Response Deadline","description":"When do you need this reviewed by?","required":true},{"id":"contract_file","type":"file","label":"Upload Contract","description":"Upload the contract document(s) for review","required":true,"fileConfig":{"maxSize":10485760,"acceptedTypes":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],"maxFiles":5}}]},{"id":"review-scope","title":"Review Scope","description":"What specific areas should we focus on?","fields":[{"id":"review_areas","type":"multiselect","label":"Focus Areas","description":"Select all that apply","required":true,"options":[{"value":"liability","label":"Liability and Risk"},{"value":"payment_terms","label":"Payment Terms"},{"value":"termination","label":"Termination Clauses"},{"value":"ip_rights","label":"Intellectual Property Rights"},{"value":"confidentiality","label":"Confidentiality"},{"value":"indemnification","label":"Indemnification"},{"value":"general_review","label":"General Review"}]},{"id":"specific_concerns","type":"textarea","label":"Specific Concerns or Questions","description":"What are your main concerns about this contract?","placeholder":"I am concerned about the non-compete clause...","validation":{"maxLength":1000}},{"id":"negotiation_assistance","type":"radio","label":"Do you need negotiation assistance?","required":true,"options":[{"value":"review_only","label":"Review only - I will handle negotiation"},{"value":"review_and_negotiate","label":"Review and help negotiate terms"}]}]},{"id":"additional-info","title":"Additional Information","fields":[{"id":"additional_documents","type":"file","label":"Additional Documents (Optional)","description":"Any supporting documents, prior agreements, etc.","fileConfig":{"maxSize":10485760,"acceptedTypes":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/*"],"maxFiles":10}},{"id":"additional_notes","type":"textarea","label":"Additional Notes","placeholder":"Anything else we should know?","validation":{"maxLength":500}}]}]'::jsonb,
  1, true, 'seed'
),
(
  'Employment Agreement Intake',
  'Employment Agreement',
  'Intake form for drafting or reviewing employment agreements',
  '[{"id":"client-info","title":"Practice Information","fields":[{"id":"practice_name","type":"text","label":"Practice or Organization Name","required":true},{"id":"contact_name","type":"text","label":"Contact Person Name","required":true},{"id":"contact_email","type":"email","label":"Email Address","required":true},{"id":"contact_phone","type":"phone","label":"Phone Number","required":true}]},{"id":"position-details","title":"Position Details","fields":[{"id":"position_title","type":"text","label":"Position Title","required":true,"placeholder":"Licensed Clinical Social Worker"},{"id":"employee_type","type":"select","label":"Employment Type","required":true,"options":[{"value":"full_time","label":"Full-Time Employee"},{"value":"part_time","label":"Part-Time Employee"},{"value":"contractor","label":"Independent Contractor"}]},{"id":"compensation_type","type":"select","label":"Compensation Structure","required":true,"options":[{"value":"salary","label":"Salary"},{"value":"hourly","label":"Hourly"},{"value":"commission","label":"Commission-Based"},{"value":"hybrid","label":"Hybrid (Base + Commission)"}]},{"id":"compensation_amount","type":"number","label":"Compensation Amount","required":true,"placeholder":"65000"},{"id":"start_date","type":"date","label":"Anticipated Start Date","required":true}]},{"id":"agreement-provisions","title":"Agreement Provisions","description":"Which provisions should be included?","fields":[{"id":"provisions","type":"multiselect","label":"Required Provisions","required":true,"options":[{"value":"confidentiality","label":"Confidentiality Agreement"},{"value":"non_compete","label":"Non-Compete Clause"},{"value":"non_solicitation","label":"Non-Solicitation Clause"},{"value":"ip_assignment","label":"Intellectual Property Assignment"},{"value":"benefits","label":"Benefits Package"},{"value":"termination","label":"Termination Terms"},{"value":"dispute_resolution","label":"Dispute Resolution/Arbitration"}]},{"id":"non_compete_duration","type":"number","label":"Non-Compete Duration (months)","description":"How many months should the non-compete last?","conditionalDisplay":{"field":"provisions","value":["non_compete"]}},{"id":"non_compete_radius","type":"number","label":"Non-Compete Radius (miles)","description":"Geographic restriction radius","conditionalDisplay":{"field":"provisions","value":["non_compete"]}}]},{"id":"additional-info","title":"Additional Information","fields":[{"id":"existing_agreement","type":"file","label":"Existing Agreement (if reviewing)","description":"Upload current agreement if this is a review/revision","fileConfig":{"maxSize":10485760,"acceptedTypes":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],"maxFiles":1}},{"id":"special_requirements","type":"textarea","label":"Special Requirements or Provisions","placeholder":"Any specific clauses or requirements?","validation":{"maxLength":1000}}]}]'::jsonb,
  1, true, 'seed'
),
(
  'Policy Review Intake',
  'Policy Review',
  'Intake form for practice policy and procedure reviews',
  '[{"id":"practice-info","title":"Practice Information","fields":[{"id":"practice_name","type":"text","label":"Practice Name","required":true},{"id":"practice_type","type":"select","label":"Practice Type","required":true,"options":[{"value":"mental_health","label":"Mental Health Practice"},{"value":"medical","label":"Medical Practice"},{"value":"dental","label":"Dental Practice"},{"value":"wellness","label":"Wellness Practice"},{"value":"other","label":"Other"}]},{"id":"contact_name","type":"text","label":"Contact Person","required":true},{"id":"contact_email","type":"email","label":"Email","required":true}]},{"id":"policy-scope","title":"Policies to Review","fields":[{"id":"policies_to_review","type":"multiselect","label":"Which policies need review?","required":true,"options":[{"value":"privacy_hipaa","label":"Privacy/HIPAA Policies"},{"value":"client_consent","label":"Client Consent Forms"},{"value":"employee_handbook","label":"Employee Handbook"},{"value":"telehealth","label":"Telehealth Policies"},{"value":"billing","label":"Billing Policies"},{"value":"records_retention","label":"Records Retention"},{"value":"social_media","label":"Social Media Policy"},{"value":"crisis_procedures","label":"Crisis Procedures"}]},{"id":"last_review_date","type":"date","label":"When were these last reviewed?","description":"Approximate date of last policy review"},{"id":"compliance_concerns","type":"textarea","label":"Specific Compliance Concerns","description":"Are there specific regulations or issues you are concerned about?","placeholder":"We recently expanded to telehealth and need to ensure compliance..."}]},{"id":"documentation","title":"Current Policies","fields":[{"id":"current_policies","type":"file","label":"Upload Current Policies","description":"Upload all existing policy documents","required":true,"fileConfig":{"maxSize":26214400,"acceptedTypes":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],"maxFiles":20}}]}]'::jsonb,
  1, true, 'seed'
),
(
  'General Intake',
  'General',
  'General intake form for new matters',
  '[{"id":"client-info","title":"Client Information","description":"Basic information about you","fields":[{"id":"full_name","type":"text","label":"Full Name","required":true,"placeholder":"Jane Doe"},{"id":"email","type":"email","label":"Email Address","required":true,"placeholder":"jane@example.com"},{"id":"phone","type":"phone","label":"Phone Number","required":true,"placeholder":"(555) 123-4567"},{"id":"preferred_contact","type":"select","label":"Preferred Contact Method","required":true,"options":[{"value":"email","label":"Email"},{"value":"phone","label":"Phone"},{"value":"either","label":"Either"}]}]},{"id":"matter-details","title":"Matter Details","description":"Tell us about your legal matter","fields":[{"id":"matter_description","type":"textarea","label":"Please describe your legal matter","description":"Provide as much detail as you can about your situation","required":true,"placeholder":"Describe your legal matter here...","validation":{"minLength":50}},{"id":"urgency","type":"select","label":"How urgent is this matter?","required":true,"options":[{"value":"not_urgent","label":"Not Urgent - No deadline"},{"value":"somewhat_urgent","label":"Somewhat Urgent - Within a month"},{"value":"urgent","label":"Urgent - Within a week"},{"value":"very_urgent","label":"Very Urgent - Immediate attention needed"}]},{"id":"deadline","type":"date","label":"Is there a specific deadline?","required":false,"description":"If applicable, when does this need to be resolved by?"},{"id":"prior_legal_help","type":"radio","label":"Have you worked with an attorney on this matter before?","required":true,"options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]},{"id":"prior_attorney_details","type":"textarea","label":"Please provide details about your prior legal assistance","required":false,"conditionalDisplay":{"field":"prior_legal_help","value":"yes"}}]},{"id":"documents","title":"Supporting Documents","description":"Upload any relevant documents","fields":[{"id":"supporting_documents","type":"file","label":"Upload Supporting Documents","description":"Upload any documents that may be relevant to your matter","required":false,"fileConfig":{"maxSize":26214400,"acceptedTypes":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png"],"maxFiles":10}}]},{"id":"additional-info","title":"Additional Information","description":"Anything else we should know","fields":[{"id":"additional_notes","type":"textarea","label":"Additional Notes","description":"Is there anything else you would like us to know?","required":false,"placeholder":"Any additional information..."},{"id":"how_found_us","type":"select","label":"How did you hear about us?","required":false,"options":[{"value":"referral","label":"Referral from a friend or colleague"},{"value":"search","label":"Online search"},{"value":"social_media","label":"Social media"},{"value":"advertisement","label":"Advertisement"},{"value":"other","label":"Other"}]}]}]'::jsonb,
  1, true, 'seed'
);
