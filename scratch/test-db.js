const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const searchTerm = 'F-2026-05-13';
  const { data, error } = await supabase
    .from('production_plan')
    .select('*')
    .or(`firm_plan.ilike.%${searchTerm}%,no_order.ilike.%${searchTerm}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} plans:`);
  data.forEach((p, i) => {
    console.log(`${i + 1}. ID: ${p.id}, Firm Plan: ${p.firm_plan}, No Order: ${p.no_order}, Product: ${p.ten_san_pham}, Sheets: ${p.sl_sheet}, Buns: ${p.sl_bun_can_do}`);
  });
}

test();
