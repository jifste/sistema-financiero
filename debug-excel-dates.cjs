const XLSX = require('xlsx');
const wb = XLSX.readFile('CuentaCorriente_22DIC25_2247.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

console.log('=== Filas de datos ===');
let foundHeader = false;
let count = 0;

for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;

    if (row[0] && String(row[0]).includes('Fecha')) {
        console.log('Header:', row.slice(0, 5));
        foundHeader = true;
        continue;
    }

    if (foundHeader && row[0] && typeof row[0] === 'number') {
        const serial = row[0];
        // Excel epoch is Dec 30, 1899
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const msPerDay = 86400 * 1000;
        const corrected = new Date(excelEpoch.getTime() + serial * msPerDay);
        const y = corrected.getUTCFullYear();
        const m = String(corrected.getUTCMonth() + 1).padStart(2, '0');
        const d = String(corrected.getUTCDate()).padStart(2, '0');

        console.log('Serial ' + serial + ' -> ' + y + '-' + m + '-' + d + ' | ' + String(row[2] || '').substring(0, 30));
        count++;
        if (count >= 10) break;
    }
}
