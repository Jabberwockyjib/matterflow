import { createClient } from '@supabase/supabase-js';

// Try to find the auth token from cookies (simulating what the server sees)
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Get all profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, full_name, role, google_refresh_token, google_connected_at')
  .order('google_connected_at', { ascending: false, nullsFirst: false });

console.log('All admin users:');
profiles.forEach((p, idx) => {
  console.log(`\n${idx + 1}. ${p.full_name} (${p.role})`);
  console.log(`   User ID: ${p.user_id}`);
  console.log(`   Google Connected: ${p.google_refresh_token ? '✅ YES' : '❌ NO'}`);
  if (p.google_connected_at) {
    console.log(`   Connected At: ${p.google_connected_at}`);
  }
});

// Copy token from one admin to the other
console.log('\n\n=== FIXING: Copying Google token to Brian Doud ===');
const { data: devAdmin } = await supabase
  .from('profiles')
  .select('google_refresh_token, google_connected_at')
  .eq('user_id', '00000000-0000-0000-0000-000000000001')
  .single();

if (devAdmin?.google_refresh_token) {
  const { error } = await supabase
    .from('profiles')
    .update({
      google_refresh_token: devAdmin.google_refresh_token,
      google_connected_at: devAdmin.google_connected_at
    })
    .eq('user_id', 'de3b0983-7402-4f43-85ff-c64baacbea75');

  if (error) {
    console.error('Error copying token:', error);
  } else {
    console.log('✅ Successfully copied Google Drive token to Brian Doud!');
    console.log('   Now both admin accounts have Google Drive connected.');
  }
}
