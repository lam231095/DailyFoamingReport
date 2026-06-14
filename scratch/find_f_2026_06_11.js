const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function search() {
  const searchTerm = 'F-2026-06-11';
  
  console.log('--- Searching production_plan ---');
  const { data: plans, error: planError } = await supabase
    .from('production_plan')
    .select('*')
    .or(`firm_plan.ilike.%${searchTerm}%,bun_code.ilike.%${searchTerm}%,pu_code.ilike.%${searchTerm}%`);

  if (planError) {
    console.error('Plan Error:', planError);
  } else {
    console.log(`Found ${plans.length} plans:`);
    console.log(JSON.stringify(plans, null, 2));
  }

  console.log('\n--- Searching foaming_pour_reports ---');
  const { data: pourReports, error: pourError } = await supabase
    .from('foaming_pour_reports')
    .select('*, production_plan(*)')
    .or(`firm_plan.ilike.%${searchTerm}%`);

  if (pourError) {
    console.error('Pour Report Error:', pourError);
  } else {
    console.log(`Found ${pourReports.length} pour reports:`);
    console.log(JSON.stringify(pourReports, null, 2));
  }
}

search();
