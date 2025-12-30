#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password...\n')

  const adminUserId = '00000000-0000-0000-0000-000000000001'
  const newPassword = 'password123'

  try {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      adminUserId,
      { password: newPassword }
    )

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log('✅ Admin password reset successfully!')
    console.log('📧 Email: admin@matterflow.local')
    console.log('🔑 Password: password123')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

resetAdminPassword()
