const XLSX = require('xlsx');
const fs = require('fs');

const data = fs.readFileSync('CuentaCorriente_22DIC25_2247.xls');
const workbook = XLSX.read(data);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
// Range 10 uses row 10 (0-indexed) as header: Fecha, Documentos, Movimientos, Cargos, Abonos, Saldo
const rows = XLSX.utils.sheet_to_json(sheet, { range: 10 });

// Excel serial to date
const excelToDate = (serial) => {
    if (typeof serial === 'number') {
        const utcDays = Math.floor(serial - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    return String(serial);
};

// NEW HASH ALGORITHM (amount FIRST, last 20 chars of desc, 32 char hash)
const generateNewHash = (date, description, amount) => {
    const normalizedDate = (date || '').split('T')[0];
    const normalizedDesc = (description || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const descSuffix = normalizedDesc.slice(-20);
    const normalizedAmount = Math.abs(amount).toFixed(0);
    const combined = `${normalizedAmount}|${descSuffix}|${normalizedDate}`;
    return Buffer.from(combined).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

// OLD HASH ALGORITHM (date first, first 50 chars of desc, 24 char hash)
const generateOldHash = (date, description, amount) => {
    const normalizedDate = (date || '').split('T')[0];
    const normalizedDesc = (description || '').toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 50);
    const normalizedAmount = Math.abs(amount).toFixed(0);
    const combined = `${normalizedDate}|${normalizedDesc}|${normalizedAmount}`;
    return Buffer.from(combined).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
};

console.log('=== Comparing OLD vs NEW hash algorithm ===\n');

const oldHashes = new Map();
const newHashes = new Map();
let oldCollisions = 0;
let newCollisions = 0;
let validRows = 0;

rows.forEach((row) => {
    const desc = row.Movimientos;
    const cargos = parseFloat(row.Cargos) || 0;
    const abonos = parseFloat(row.Abonos) || 0;
    const amount = cargos || abonos;
    const dateSerial = row.Fecha;
    const dateStr = excelToDate(dateSerial);

    if (desc && amount !== 0 && !isNaN(amount)) {
        validRows++;

        const oldHash = generateOldHash(dateStr, desc, amount);
        const newHash = generateNewHash(dateStr, desc, amount);

        if (oldHashes.has(oldHash)) {
            oldCollisions++;
            console.log('❌ OLD COLLISION:');
            console.log('   Existing:', oldHashes.get(oldHash).desc, '$', oldHashes.get(oldHash).amount);
            console.log('   New:     ', desc, '$', amount);
            console.log('   Hash:', oldHash);
        }
        oldHashes.set(oldHash, { desc, amount, date: dateStr });

        if (newHashes.has(newHash)) {
            newCollisions++;
            console.log('❌ NEW COLLISION:');
            console.log('   Existing:', newHashes.get(newHash).desc, '$', newHashes.get(newHash).amount);
            console.log('   New:     ', desc, '$', amount);
        }
        newHashes.set(newHash, { desc, amount, date: dateStr });
    }
});

console.log('\n=== RESULTS ===');
console.log('Total valid transactions:', validRows);
console.log('OLD algorithm collisions:', oldCollisions, '(' + Math.round(oldCollisions / validRows * 100) + '%)');
console.log('NEW algorithm collisions:', newCollisions);
console.log('OLD unique hashes:', oldHashes.size);
console.log('NEW unique hashes:', newHashes.size);
