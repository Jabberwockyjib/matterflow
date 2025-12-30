import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Get all profiles
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('user_id, full_name, role')
  .order('role');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('=== All Users in Database ===\n');

const byRole = {};
profiles.forEach((p) => {
  if (!byRole[p.role]) byRole[p.role] = [];
  byRole[p.role].push(p);
});

Object.keys(byRole).forEach((role) => {
  console.log(`${role.toUpperCase()} (${byRole[role].length}):`);
  byRole[role].forEach((p) => {
    console.log(`  - ${p.full_name}`);
    console.log(`    ID: ${p.user_id}`);
  });
  console.log('');
});

console.log(`Total users: ${profiles.length}`);
