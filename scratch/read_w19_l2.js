const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'ke_hoach_san_xuat.xlsx');
const SHEET_NAME = 'W19-2026 - L2';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('All sheets:', JSON.stringify(workbook.SheetNames));
  
  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    console.error(`Sheet "${SHEET_NAME}" not found!`);
    console.log('Available sheets:', workbook.SheetNames);
    process.exit(1);
  }
  
  const sheet = workbook.Sheets[SHEET_NAME];
  
  // Get raw data with headers
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Print first 10 rows to understand structure
  console.log('\n=== First 10 rows (raw) ===');
  rawData.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
  });
  
  // Also try with auto header detection
  const dataWithHeaders = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log('\n=== First 3 rows with auto headers ===');
  dataWithHeaders.slice(0, 3).forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
  });
  
  console.log('\nTotal rows:', dataWithHeaders.length);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
