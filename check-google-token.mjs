import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

const { data, error } = await supabase
  .from('profiles')
  .select('user_id, full_name, role, google_refresh_token, google_connected_at')
  .eq('role', 'admin');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Admin profiles found:', data.length);
  data.forEach((profile, idx) => {
    console.log(`\nAdmin ${idx + 1}:`);
    console.log('- User ID:', profile.user_id);
    console.log('- Name:', profile.full_name);
    console.log('- Has Google Token:', profile.google_refresh_token ? 'YES' : 'NO');
    console.log('- Token length:', profile.google_refresh_token?.length || 0);
    console.log('- Connected at:', profile.google_connected_at);
  });
}
