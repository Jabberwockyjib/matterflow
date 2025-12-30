import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

console.log('Clearing Google Drive token from practice_settings...');

// First get the practice_settings row
const { data: settings } = await supabase
  .from('practice_settings')
  .select('id')
  .limit(1)
  .single();

if (!settings) {
  console.error('No practice_settings row found');
  process.exit(1);
}

const { error } = await supabase
  .from('practice_settings')
  .update({
    google_refresh_token: null,
    google_connected_at: null,
  })
  .eq('id', settings.id);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ Google Drive token cleared successfully!');
console.log('Now go to Settings → Integrations and reconnect Google Drive');
