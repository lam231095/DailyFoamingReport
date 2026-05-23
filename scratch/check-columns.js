const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('foaming_separate_reports')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching separate report:', error);
  } else {
    console.log('Record structure (first record keys):');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
      console.log(data[0]);
    } else {
      console.log('No records found, trying to fetch columns by description or inserting custom payload...');
      // Let's try inserting a dummy record with a note, to see if it fails or succeeds
      // Wait, we can also check if a select query for a non-existent column fails.
      const { data: colData, error: colError } = await supabase
        .from('foaming_separate_reports')
        .select('note')
        .limit(1);
      if (colError) {
        console.log('Column "note" does NOT exist or error querying it:', colError.message);
      } else {
        console.log('Column "note" exists!');
      }
    }
  }
}

check();
