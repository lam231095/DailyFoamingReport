const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Querying foaming_separate_reports report_dates...');
  const { data: sepData, error: sepError } = await supabase
    .from('foaming_separate_reports')
    .select('id, report_date, created_at, shift')
    .order('created_at', { ascending: false })
    .limit(50);

  if (sepError) {
    console.error('Error separate:', sepError);
  } else {
    console.log('\nLast 50 separate reports:');
    sepData.forEach(r => {
      console.log(`ID: ${r.id} | report_date: ${r.report_date} | created_at: ${r.created_at} | shift: ${r.shift}`);
    });
  }
}

check();
