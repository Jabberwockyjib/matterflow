#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const client = createClient(supabaseUrl, supabaseAnonKey)

async function testProfileFetch() {
  console.log('🧪 Testing profile fetch after sign-in\n')

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
  console.log('   User ID:', signInData.user.id)
  console.log('   Email:', signInData.user.email)

  // Fetch profile
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('full_name, role, status, password_must_change')
    .eq('user_id', signInData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('\n❌ Profile fetch failed:', profileError.message)
    console.error('   Code:', profileError.code)
    console.error('   Details:', profileError.details)
    console.error('   Hint:', profileError.hint)
    return
  }

  if (!profile) {
    console.error('\n❌ Profile not found (maybeSingle returned null)')
    return
  }

  console.log('\n✅ Profile fetched successfully')
  console.log('   Full name:', profile.full_name)
  console.log('   Role:', profile.role)
  console.log('   Status:', profile.status)
  console.log('   Must change password:', profile.password_must_change)
}

testProfileFetch().catch(console.error)
