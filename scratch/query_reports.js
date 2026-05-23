const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://brdecledtyypykowjnjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('foaming_separate_reports')
    .select('id, error_type, ng_qty, created_at')
    .not('error_type', 'eq', '')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log('Fetched foaming_separate_reports:');
  console.log(JSON.stringify(data, null, 2));
}

run();
