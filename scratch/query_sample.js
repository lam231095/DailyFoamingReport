const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('production_plan')
    .select('*')
    .eq('firm_plan', 'RPRO-260528-0001');

  if (error) {
    console.error('Error querying:', error);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

main();
