#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54331'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function setupAdmin() {
  console.log('Creating admin user...\n')

  // Create admin user
  const { data: adminAuth, error: adminAuthError } = await adminClient.auth.admin.createUser({
    email: 'admin@matterflow.local',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin User'
    }
  })

  if (adminAuthError) {
    if (adminAuthError.message.includes('already registered')) {
      console.log('✅ Admin user already exists\n')
      return
    }
    console.error('❌ Failed to create admin user:', adminAuthError.message)
    return
  }

  console.log('✅ Created admin user:', adminAuth.user.email)

  // Create admin profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      user_id: adminAuth.user.id,
      full_name: 'Admin User',
      role: 'admin'
    })

  if (profileError) {
    console.error('❌ Failed to create admin profile:', profileError.message)
    return
  }

  console.log('✅ Created admin profile\n')
}

setupAdmin().catch(console.error)
