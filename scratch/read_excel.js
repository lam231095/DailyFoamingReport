const xlsx = require('xlsx');
const fs = require('fs');
const buf = fs.readFileSync('Foaming Plan.xlsx');
const wb = xlsx.read(buf, {type:'buffer'});
console.log('SHEETS:' + JSON.stringify(wb.SheetNames));
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(ws, {header:1, defval:''});
  console.log('SHEET:' + name + '|ROWS:' + data.length);
  if (data[0]) console.log('HDR:' + JSON.stringify(data[0]));
  if (data[1]) console.log('R1:' + JSON.stringify(data[1]));
  if (data[2]) console.log('R2:' + JSON.stringify(data[2]));
});
