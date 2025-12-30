#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const client = createClient(supabaseUrl, supabaseAnonKey)

async function testInvitationsFetch() {
  console.log('🧪 Testing client invitations fetch\n')

  // Sign in as admin
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: 'admin@matterflow.local',
    password: 'password123'
  })

  if (signInError) {
    console.error('❌ Sign-in failed:', signInError.message)
    return
  }

  console.log('✅ Sign-in successful')

  // Fetch client invitations
  const { data: invitations, error: invitationsError } = await client
    .from('client_invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (invitationsError) {
    console.error('\n❌ Invitations fetch failed:', invitationsError.message)
    console.error('   Code:', invitationsError.code)
    console.error('   Details:', invitationsError.details)
    return
  }

  console.log('\n✅ Invitations fetched successfully')
  console.log(`   Found ${invitations.length} invitation(s)`)

  if (invitations.length > 0) {
    invitations.forEach((inv, i) => {
      console.log(`\n   Invitation ${i + 1}:`)
      console.log(`     Name: ${inv.client_name}`)
      console.log(`     Email: ${inv.client_email}`)
      console.log(`     Status: ${inv.status}`)
      console.log(`     Code: ${inv.invite_code}`)
    })
  }
}

testInvitationsFetch().catch(console.error)
