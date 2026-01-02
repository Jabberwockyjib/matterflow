#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const client = createClient(supabaseUrl, supabaseAnonKey)

async function createTestInvitation() {
  console.log('🧪 Creating test invitation\n')

  // Sign in as admin
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: 'admin@matterflow.local',
    password: 'password123'
  })

  if (signInError) {
    console.error('❌ Sign-in failed:', signInError.message)
    return
  }

  console.log('✅ Signed in as admin')

  // Create invitation via server action
  const formData = new FormData()
  formData.append('clientName', 'Test Client')
  formData.append('clientEmail', 'testclient@example.com')
  formData.append('matterType', 'Contract Review')
  formData.append('notes', 'This is a test invitation')

  // Call the invite endpoint
  const response = await fetch('http://localhost:3000/api/invite-client', {
    method: 'POST',
    headers: {
      'Cookie': client.auth.session.access_token,
    },
    body: formData,
  })

  if (!response.ok) {
    console.error('❌ Failed to create invitation:', response.statusText)
    return
  }

  const result = await response.json()

  console.log('\n✅ Invitation created!')
  console.log('   Invite Code:', result.inviteCode)
  console.log('   Invite Link:', result.inviteLink)
  console.log('\n📋 Test the link by visiting:')
  console.log('   ' + result.inviteLink)
}

createTestInvitation().catch(console.error)
