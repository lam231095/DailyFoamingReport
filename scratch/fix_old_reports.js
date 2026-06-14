const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Read environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase Url or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getCorrectReportDate(createdAtStr, shift) {
  const d = new Date(createdAtStr);
  // Add 7 hours to get ICT time
  const ictTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const hours = ictTime.getUTCHours();
  
  let subtract = false;
  if (shift === 'Ca 3') {
    subtract = hours < 22;
  } else if (shift === 'Ca 2') {
    subtract = hours < 14;
  } else if (shift === 'Ca 1') {
    subtract = hours < 6;
  } else if (shift === 'Ca HC') {
    subtract = hours < 8;
  } else {
    subtract = hours < 6;
  }
  
  if (subtract) {
    ictTime.setUTCDate(ictTime.getUTCDate() - 1);
  }
  
  const y = ictTime.getUTCFullYear();
  const m = String(ictTime.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(ictTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

async function fixTable(tableName) {
  console.log(`\n=== Processing table ${tableName} ===`);
  let count = 0;
  let mismatches = [];

  // Fetch all records
  let { data: records, error } = await supabase
    .from(tableName)
    .select('id, created_at, shift, report_date');

  if (error) {
    console.error(`Error fetching from ${tableName}:`, error.message);
    return;
  }

  console.log(`Fetched ${records.length} records.`);

  for (const record of records) {
    if (!record.created_at) continue;
    const computed = getCorrectReportDate(record.created_at, record.shift);
    // report_date is stored as 'YYYY-MM-DD'
    if (record.report_date !== computed) {
      mismatches.push({
        id: record.id,
        created_at: record.created_at,
        shift: record.shift,
        old_report_date: record.report_date,
        new_report_date: computed
      });
    }
  }

  console.log(`Found ${mismatches.length} mismatched records.`);

  if (mismatches.length > 0) {
    console.log('Sample mismatches (up to 5):');
    console.log(mismatches.slice(0, 5));

    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) {
      console.log('Dry run: Skipping updates.');
    } else {
      console.log('Updating mismatched records...');
      for (const item of mismatches) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ report_date: item.new_report_date })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Failed to update ID ${item.id}:`, updateError.message);
        } else {
          count++;
        }
      }
      console.log(`Successfully updated ${count} records in ${tableName}.`);
    }
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Running script. Mode: ${isDryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  await fixTable('foaming_pour_reports');
  await fixTable('foaming_separate_reports');
}

main().catch(console.error);
