#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSignIn() {
  console.log('🧪 Testing admin sign-in...\n')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@matterflow.local',
    password: 'password123',
  })

  if (error) {
    console.error('❌ Sign-in failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Sign-in successful!')
  console.log('📧 Email:', data.user.email)
  console.log('🆔 User ID:', data.user.id)
  console.log('🎫 Session:', data.session ? 'Valid' : 'None')
}

testSignIn()
