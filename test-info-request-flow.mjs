#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54331'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const client = createClient(supabaseUrl, supabaseAnonKey)
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function setupTestData() {
  console.log('🧪 Setting up test data for Phase 2: Info Requests\n')

  // 1. Sign in as admin
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'admin@matterflow.local',
    password: 'password123'
  })

  if (signInError) {
    console.error('❌ Sign-in failed:', signInError.message)
    return
  }

  console.log('✅ Signed in as admin\n')

  // 2. Create a test client user
  const clientEmail = `testclient-${Date.now()}@example.com`
  const { data: clientAuth, error: clientAuthError } = await adminClient.auth.admin.createUser({
    email: clientEmail,
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Client'
    }
  })

  if (clientAuthError) {
    console.error('❌ Failed to create client user:', clientAuthError.message)
    return
  }

  console.log('✅ Created test client user:', clientEmail)

  // 3. Create client profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      user_id: clientAuth.user.id,
      full_name: 'Test Client',
      role: 'client'
    })

  if (profileError) {
    console.error('❌ Failed to create client profile:', profileError.message)
    return
  }

  console.log('✅ Created client profile\n')

  // 4. Get admin user ID for owner_id
  const { data: { user: adminUser } } = await client.auth.getUser()

  // 5. Create a test matter
  const { data: matter, error: matterError } = await adminClient
    .from('matters')
    .insert({
      title: 'Contract Review for Test Client',
      client_id: clientAuth.user.id,
      owner_id: adminUser.id,
      matter_type: 'Contract Review',
      stage: 'Intake Received',
      responsible_party: 'lawyer',
      next_action: 'Review intake form',
      next_action_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      billing_model: 'hourly'
    })
    .select()
    .single()

  if (matterError) {
    console.error('❌ Failed to create matter:', matterError.message)
    return
  }

  console.log('✅ Created test matter:', matter.title)
  console.log('   Matter ID:', matter.id, '\n')

  // 6. Create an intake response
  const { data: intakeResponse, error: intakeError } = await adminClient
    .from('intake_responses')
    .insert({
      matter_id: matter.id,
      form_type: 'Contract Review',
      responses: {
        company_name: 'Acme Corp',
        contract_type: 'Employment Agreement',
        deadline: '2025-01-15',
        special_concerns: 'Need to review non-compete clause'
      },
      status: 'submitted',
      review_status: 'pending'
    })
    .select()
    .single()

  if (intakeError) {
    console.error('❌ Failed to create intake response:', intakeError.message)
    return
  }

  console.log('✅ Created intake response')
  console.log('   Intake Response ID:', intakeResponse.id, '\n')

  // 7. Create an info request with structured questions

  const { data: infoRequest, error: infoRequestError } = await adminClient
    .from('info_requests')
    .insert({
      intake_response_id: intakeResponse.id,
      requested_by: adminUser.id,
      questions: [
        {
          id: 'q1',
          type: 'short_text',
          questionText: 'What is your current salary?',
          helpText: 'This helps us evaluate if the compensation is competitive',
          required: true
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          questionText: 'Have you signed a non-compete before?',
          options: ['Yes', 'No', 'Not Sure'],
          required: true
        },
        {
          id: 'q3',
          type: 'date',
          questionText: 'When do you need this review completed?',
          required: false
        },
        {
          id: 'q4',
          type: 'long_text',
          questionText: 'Are there any specific clauses you\'re concerned about?',
          helpText: 'Please list any sections that worry you',
          required: false
        }
      ],
      message: 'I need a bit more information to provide a thorough review of your employment contract. Please answer the questions below at your earliest convenience.',
      response_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (infoRequestError) {
    console.error('❌ Failed to create info request:', infoRequestError.message)
    return
  }

  console.log('✅ Created info request with 4 questions')
  console.log('   Info Request ID:', infoRequest.id, '\n')

  // 8. Display testing URLs
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎯 TEST URLS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 Admin View (Intake Review):')
  console.log(`   http://localhost:3000/admin/intake/${intakeResponse.id}\n`)

  console.log('📝 Client Response Form:')
  console.log(`   http://localhost:3000/info-response/${infoRequest.id}\n`)

  console.log('📧 Email Preview:')
  console.log('   Run: pnpm email')
  console.log('   Then navigate to: http://localhost:3001\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TEST CREDENTIALS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('Admin Login:')
  console.log('   Email: admin@matterflow.local')
  console.log('   Password: password123\n')

  console.log('Client Login:')
  console.log(`   Email: ${clientEmail}`)
  console.log('   Password: password123\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📚 TEST SCENARIOS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Test Client Response Form:')
  console.log('   - Visit the client response form URL above')
  console.log('   - See lawyer\'s personal message')
  console.log('   - Answer all 4 questions (2 required, 2 optional)')
  console.log('   - Submit the form\n')

  console.log('2. Test Admin Review:')
  console.log('   - Sign in as admin')
  console.log('   - Visit admin intake review URL')
  console.log('   - See submitted responses')
  console.log('   - Test "Request More Info" button (creates another info request)\n')

  console.log('3. Test Email Templates:')
  console.log('   - Run: pnpm email')
  console.log('   - Navigate to InfoRequestEmail template')
  console.log('   - Navigate to InfoResponseReceivedEmail template\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📚 FULL WORKFLOW TEST SCENARIOS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Test Approve Workflow:')
  console.log('   - Visit admin intake review URL')
  console.log('   - Click "Approve Intake" button')
  console.log('   - Verify matter stage advances to "Under Review"')
  console.log('   - Verify status shows "Approved"\n')

  console.log('2. Test Request More Info Workflow:')
  console.log('   - Click "Request More Info" button')
  console.log('   - Add 2-3 structured questions')
  console.log('   - Add personal message')
  console.log('   - Set deadline')
  console.log('   - Submit and verify info request appears in history\n')

  console.log('3. Test Schedule Call Workflow:')
  console.log('   - Click "Schedule Call" button')
  console.log('   - Select date/time, duration, meeting type')
  console.log('   - Submit and verify task created in database\n')

  console.log('4. Test Decline Workflow:')
  console.log('   - Click "Decline" button')
  console.log('   - Select reason and add notes')
  console.log('   - Confirm and verify matter stage = "Declined"\n')

  console.log('5. Test Internal Notes Auto-save:')
  console.log('   - Type notes in Internal Notes section')
  console.log('   - Wait 1 second')
  console.log('   - Verify "Saved" indicator appears')
  console.log('   - Refresh page and verify notes persisted\n')

  console.log('6. Test Info Request History:')
  console.log('   - Verify all info requests appear')
  console.log('   - Expand accordion items')
  console.log('   - Verify questions and responses displayed correctly\n')
}

setupTestData().catch(console.error)
