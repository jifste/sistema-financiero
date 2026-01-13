const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const file = fs.readFileSync('./CuentaCorriente_22DIC25_2247.xls');
const workbook = XLSX.read(file);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Get raw data
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Find header row
let headerRowIndex = -1;
let headers = [];

for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (row && Array.isArray(row)) {
        const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
        if (rowStr.includes('fecha') && (rowStr.includes('movimiento') || rowStr.includes('cargo') || rowStr.includes('descripcion'))) {
            headerRowIndex = i;
            headers = row.map(c => String(c || '').trim());
            break;
        }
    }
}

console.log('📁 Excel Import Debug:');
console.log('  Headers found:', headers);
console.log('  Header row index:', headerRowIndex);

// Map columns
const findCol = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
const fechaCol = findCol(['fecha', 'date']);
const descCol = findCol(['movimiento', 'descripcion', 'concepto', 'detalle']);
const cargoCol = findCol(['cargo', 'debito', 'egreso', 'gasto']);
const abonoCol = findCol(['abono', 'credito', 'ingreso', 'deposito']);

console.log('  Column mapping:', { fechaCol, descCol, cargoCol, abonoCol });
console.log('  Total data rows:', rawData.length - headerRowIndex - 1);

// Parse function for Chilean amounts
const parseChileanAmount = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const strVal = String(value);
    let cleaned = strVal.replace(/[$\s]/g, '');
    if (cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        cleaned = cleaned.replace(/\./g, '');
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
};

console.log('\n--- First 10 data rows ---');
let parsedCount = 0;
for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 11, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row) || row.length < 3) {
        console.log('Row', i, ': SKIPPED (invalid row)');
        continue;
    }

    const desc = descCol >= 0 ? String(row[descCol] || '').trim() : '';
    if (!desc || desc.length < 2) {
        console.log('Row', i, ': SKIPPED (no description)');
        continue;
    }

    const cargoRaw = cargoCol >= 0 ? row[cargoCol] : null;
    const abonoRaw = abonoCol >= 0 ? row[abonoCol] : null;
    const cargoVal = parseChileanAmount(cargoRaw);
    const abonoVal = parseChileanAmount(abonoRaw);

    const amount = cargoVal > 0 ? cargoVal : abonoVal;
    const isIncome = abonoVal > 0 && cargoVal === 0;

    console.log('Row', i, ':', {
        fecha: row[fechaCol],
        desc: desc.substring(0, 25),
        cargoRaw,
        cargoVal,
        abonoRaw,
        abonoVal,
        finalAmount: amount,
        isIncome,
        willImport: amount > 0
    });

    if (amount > 0) parsedCount++;
}

console.log('\n✅ Valid transactions from first 10 rows:', parsedCount);
