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

async function run() {
  console.log('Querying foaming_separate_reports...');
  const { data, error } = await supabase
    .from('foaming_separate_reports')
    .select('*, production_plan(ten_san_pham)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total reports fetched: ${data.length}`);

  // We want to analyze reports that lead to bun thickness < 136mm.
  // First, let's group by product line or look at individual reports.
  // Wait, let's look at reports where:
  // actual_bun_separated > 0 AND sheet_thickness_mm > 0 AND (actual_sheet_received * sheet_thickness_mm / actual_bun_separated) < 136
  const lowBunReports = data.filter(r => {
    const bunSep = r.actual_bun_separated || 0;
    const sheetThick = r.sheet_thickness_mm || 0;
    const sheets = r.actual_sheet_received || 0;
    if (bunSep <= 0 || sheetThick <= 0) return false;
    const calculatedBunThickness = (sheets * sheetThick) / bunSep;
    return calculatedBunThickness < 136;
  });

  console.log(`Number of records with calculated bun thickness < 136mm: ${lowBunReports.length}`);

  // Let's print out the details of these records
  const result = lowBunReports.map(r => {
    const bunSep = r.actual_bun_separated || 0;
    const sheetThick = r.sheet_thickness_mm || 0;
    const sheets = r.actual_sheet_received || 0;
    const calculatedBunThickness = (sheets * sheetThick) / bunSep;
    return {
      id: r.id,
      report_date: r.report_date,
      shift: r.shift,
      firm_plan: r.firm_plan,
      product_name: r.production_plan?.ten_san_pham || 'Không rõ',
      bun_thickness_mm: r.bun_thickness_mm, // chuẩn
      sheet_thickness_mm: r.sheet_thickness_mm, // độ dày sheet
      actual_bun_separated: r.actual_bun_separated, // bun tách
      actual_sheet_received: r.actual_sheet_received, // sheet thu được
      calculated_bun_thickness: calculatedBunThickness.toFixed(1),
      ng_qty: r.ng_qty,
      ng_bun_qty: r.ng_bun_qty,
      error_type: r.error_type,
      note: r.note,
    };
  });

  console.log('--- DETAILS ---');
  console.log(JSON.stringify(result, null, 2));

  // Let's also write the result to a json file for easier reference
  fs.writeFileSync(path.join(__dirname, 'low_bun_analysis.json'), JSON.stringify(result, null, 2), 'utf8');
}

run();
