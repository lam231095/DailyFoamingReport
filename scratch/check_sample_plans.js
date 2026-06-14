const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://brdecledtyypykowjnjt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("No Supabase key found!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying sample plans...");
  const { data: samplePlans, error: err1 } = await supabase
    .from('production_plan')
    .select('firm_plan, week_label, sl_sheet, sl_bun_can_do, sl_bun_can_tach')
    .eq('week_label', 'Sample')
    .limit(10);

  if (err1) {
    console.error("Error sample:", err1);
  } else {
    console.log("Sample plans:", samplePlans);
  }

  console.log("Querying China plans...");
  const { data: chinaPlans, error: err2 } = await supabase
    .from('production_plan')
    .select('firm_plan, week_label, sl_sheet, sl_bun_can_do, sl_bun_can_tach')
    .eq('week_label', 'China CN')
    .limit(10);

  if (err2) {
    console.error("Error China:", err2);
  } else {
    console.log("China plans:", chinaPlans);
  }
}

run();
