const XLSX = require('xlsx');

// Read with cellDates: true
const wb = XLSX.readFile('CuentaCorriente_22DIC25_2247.xls', { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

console.log('=== With cellDates: true and raw: true ===');
let foundHeader = false;
let count = 0;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    if (row[0] && String(row[0]).includes('Fecha')) {
        console.log('Header found at row', i);
        foundHeader = true;
        continue;
    }

    if (foundHeader && row[0]) {
        const dateVal = row[0];
        const desc = (row[2] || '').toString().substring(0, 25);
        const cargo = row[3];
        const isDate = dateVal instanceof Date;
        console.log('Date:', dateVal, '| isDate:', isDate, '| Cargo:', cargo);
        if (isDate) {
            console.log('  -> toISOString:', dateVal.toISOString());
            console.log('  -> getDate:', dateVal.getDate(), '/', dateVal.getMonth() + 1, '/', dateVal.getFullYear());
        }
        count++;
        if (count >= 3) break;
    }
}
