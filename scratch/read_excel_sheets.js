const XLSX = require('xlsx');
const filename = process.argv[2];
if (!filename) {
    console.error('Please provide a filename');
    process.exit(1);
}
try {
    const workbook = XLSX.readFile(filename);
    console.log(JSON.stringify(workbook.SheetNames, null, 2));
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
