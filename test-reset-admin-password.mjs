#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetAdminPassword() {
  console.log('Finding admin user...')

  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError)
    process.exit(1)
  }

  const adminUser = users.users.find(u => u.email === 'admin@matterflow.local')

  if (adminUser) {
    console.log(`Found existing admin: ${adminUser.email} (${adminUser.id})`)
    console.log('Updating password to "Password123"...')

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: 'Password123' }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      process.exit(1)
    }

    console.log('✅ Password updated successfully!')
    console.log('   Email: admin@matterflow.local')
    console.log('   Password: Password123')
  } else {
    console.log('Admin user not found, creating new one...')

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@matterflow.local',
      password: 'Password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Dev Admin'
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      process.exit(1)
    }

    // Update the profile to use the correct user_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ user_id: newUser.user.id })
      .eq('user_id', '00000000-0000-0000-0000-000000000001')

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    console.log('✅ Admin user created successfully!')
    console.log('   Email: admin@matterflow.local')
    console.log('   Password: Password123')
  }
}

resetAdminPassword()
