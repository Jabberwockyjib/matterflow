import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Get a matter that has a client
const { data: matters, error } = await supabase
  .from('matters')
  .select(`
    id,
    title,
    client_id,
    client:profiles!matters_client_id_fkey(full_name)
  `)
  .not('client_id', 'is', null)
  .limit(1);

if (error || !matters || matters.length === 0) {
  console.log('No matters with clients found');
  process.exit(1);
}

const matter = matters[0];
console.log('\n=== Matter Details ===');
console.log('ID:', matter.id);
console.log('Title:', matter.title);
console.log('Client:', matter.client?.full_name);

// Check if folders already initialized
const { data: existingFolders } = await supabase
  .from('matter_folders')
  .select('*')
  .eq('matter_id', matter.id)
  .maybeSingle();

if (existingFolders) {
  console.log('\n✅ Folders already initialized for this matter');
  console.log('Client Folder ID:', existingFolders.client_folder_id);
  console.log('Matter Folder ID:', existingFolders.matter_folder_id);
  console.log('Subfolders:', Object.keys(existingFolders.folder_structure || {}));
} else {
  console.log('\n❌ Folders NOT initialized yet');
  console.log('\nTo initialize, call the initializeMatterFolders action from the UI');
  console.log('Or use the browser to navigate to a matter and click "Initialize Folders"');
}

// Check practice settings has Google token
const { data: settings } = await supabase
  .from('practice_settings')
  .select('google_refresh_token, google_connected_at')
  .limit(1)
  .single();

console.log('\n=== Google Drive Connection ===');
console.log('Connected:', settings?.google_refresh_token ? '✅ YES' : '❌ NO');
if (settings?.google_connected_at) {
  console.log('Connected at:', settings.google_connected_at);
}

console.log('\n=== Test Using Browser ===');
console.log('1. Go to: http://localhost:3000/matters/' + matter.id);
console.log('2. Look for "Initialize Folders" or "Documents" section');
console.log('3. Click to initialize Google Drive folders');
console.log('4. Check your Google Drive for folder structure');
