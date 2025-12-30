#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdminUser() {
  console.log('🔐 Creating admin user...\n')

  const adminUserId = '00000000-0000-0000-0000-000000000001'
  const adminEmail = 'admin@matterflow.local'
  const adminPassword = 'password123'

  try {
    // Create auth user
    const { data, error } = await adminClient.auth.admin.createUser({
      id: adminUserId,
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Dev Admin' }
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Admin user already exists, updating password...')

        // Update password instead
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          adminUserId,
          { password: adminPassword }
        )

        if (updateError) {
          console.error('❌ Error updating password:', updateError.message)
          process.exit(1)
        }

        console.log('✅ Admin password updated successfully!')
      } else {
        console.error('❌ Error:', error.message)
        process.exit(1)
      }
    } else {
      console.log('✅ Admin user created successfully!')
    }

    console.log('\n📧 Email: admin@matterflow.local')
    console.log('🔑 Password: password123\n')
    console.log('You can now sign in at http://localhost:3000/auth/sign-in')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

createAdminUser()
