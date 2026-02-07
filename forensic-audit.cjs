/**
 * AUDITORÍA FORENSE: Cruce de Valores Ciego por Frecuencia
 * 
 * Compara transacciones del Banco (Excel) vs App (JSON export)
 * 
 * Uso: node forensic-audit.cjs [cartola.xls]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ============================================
// PASO 1: EXTRACCIÓN Y LIMPIEZA
// ============================================

function extractBankAmounts(excelPath) {
    console.log(`\n📊 Extrayendo montos del Banco: ${path.basename(excelPath)}`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const amounts = [];

    // Buscar columnas de Cargo y Abono
    let cargoCol = -1, abonoCol = -1;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        // Buscar headers
        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase();
            if (cell.includes('cargo')) cargoCol = j;
            if (cell.includes('abono')) abonoCol = j;
        }

        // Si encontramos las columnas, extraer datos
        if (cargoCol >= 0 || abonoCol >= 0) {
            for (let k = i + 1; k < data.length; k++) {
                const dataRow = data[k];
                if (!dataRow) continue;

                // Extraer cargo (negativo)
                if (cargoCol >= 0 && dataRow[cargoCol]) {
                    const amount = parseAmount(dataRow[cargoCol]);
                    if (amount !== 0) amounts.push(-Math.abs(amount));
                }

                // Extraer abono (positivo)
                if (abonoCol >= 0 && dataRow[abonoCol]) {
                    const amount = parseAmount(dataRow[abonoCol]);
                    if (amount !== 0) amounts.push(Math.abs(amount));
                }
            }
            break;
        }
    }

    console.log(`   ✓ ${amounts.length} movimientos extraídos`);
    console.log(`   ✓ Suma total: $${formatNumber(amounts.reduce((a, b) => a + b, 0))}`);

    return amounts;
}

function parseAmount(value) {
    if (typeof value === 'number') return Math.round(value);

    const str = String(value)
        .replace(/\$/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .trim();

    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num);
}

function formatNumber(num) {
    return num.toLocaleString('es-CL');
}

// ============================================
// PASO 2: TABLA DE FRECUENCIA
// ============================================

function buildFrequencyTable(bankAmounts, appAmounts) {
    console.log('\n📈 Construyendo tabla de frecuencia...');

    const allAmounts = new Set([...bankAmounts, ...appAmounts]);
    const table = [];

    for (const amount of allAmounts) {
        const bankFreq = bankAmounts.filter(a => a === amount).length;
        const appFreq = appAmounts.filter(a => a === amount).length;
        const diff = appFreq - bankFreq;

        table.push({
            amount,
            bankFreq,
            appFreq,
            diff,
            anomaly: diff !== 0
        });
    }

    // Ordenar por diferencia (anomalías primero)
    table.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return table;
}

// ============================================
// PASO 3: IDENTIFICACIÓN DE DUPLICADOS
// ============================================

function identifyDuplicates(table) {
    console.log('\n🔍 Identificando duplicados...');

    const duplicates = table.filter(row => row.diff > 0);
    const missing = table.filter(row => row.diff < 0);

    console.log(`   ✓ ${duplicates.length} tipos de monto con posibles duplicados`);
    console.log(`   ✓ ${missing.length} tipos de monto faltantes en App`);

    return { duplicates, missing };
}

// ============================================
// PASO 4: VALIDACIÓN MATEMÁTICA
// ============================================

function validateMath(bankAmounts, appAmounts, duplicates) {
    console.log('\n🧮 Validación matemática...');

    const bankSum = bankAmounts.reduce((a, b) => a + b, 0);
    const appSum = appAmounts.reduce((a, b) => a + b, 0);
    const difference = appSum - bankSum;

    // Suma de duplicados
    const duplicateSum = duplicates.reduce((sum, dup) => {
        return sum + (dup.amount * dup.diff);
    }, 0);

    console.log(`   Suma Banco:     $${formatNumber(bankSum)}`);
    console.log(`   Suma App:       $${formatNumber(appSum)}`);
    console.log(`   Diferencia:     $${formatNumber(difference)}`);
    console.log(`   Suma Duplicados: $${formatNumber(duplicateSum)}`);

    const matches = Math.abs(difference - duplicateSum) < 1;

    return {
        bankSum,
        appSum,
        difference,
        duplicateSum,
        matches
    };
}

// ============================================
// PASO 5: INFORME FINAL
// ============================================

function generateReport(table, analysis, validation) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 INFORME FORENSE DE CONCILIACIÓN');
    console.log('='.repeat(60));

    // Tabla de anomalías
    const anomalies = table.filter(r => r.anomaly);

    if (anomalies.length > 0) {
        console.log('\n📊 TABLA DE FRECUENCIA DE ANOMALÍAS:');
        console.log('-'.repeat(60));
        console.log('| Monto        | Banco | App | Diferencia |');
        console.log('|--------------|-------|-----|------------|');

        for (const row of anomalies) {
            const sign = row.amount < 0 ? '-' : '+';
            const label = row.diff > 0 ? `+${row.diff} (DUPLICADO)` : `${row.diff} (FALTA)`;
            console.log(`| ${sign}$${formatNumber(Math.abs(row.amount)).padStart(10)} | ${row.bankFreq.toString().padStart(5)} | ${row.appFreq.toString().padStart(3)} | ${label.padStart(10)} |`);
        }
    }

    // Duplicados confirmados
    if (analysis.duplicates.length > 0) {
        console.log('\n🔴 DUPLICADOS CONFIRMADOS EN APP:');
        for (const dup of analysis.duplicates) {
            const sign = dup.amount < 0 ? 'CARGO' : 'ABONO';
            console.log(`   • $${formatNumber(Math.abs(dup.amount))} (${sign}) - Sobra ${dup.diff}x en la App`);
        }
    }

    // Faltantes
    if (analysis.missing.length > 0) {
        console.log('\n🟡 MOVIMIENTOS FALTANTES EN APP:');
        for (const miss of analysis.missing) {
            const sign = miss.amount < 0 ? 'CARGO' : 'ABONO';
            console.log(`   • $${formatNumber(Math.abs(miss.amount))} (${sign}) - Falta ${Math.abs(miss.diff)}x en la App`);
        }
    }

    // Conclusión
    console.log('\n' + '='.repeat(60));
    console.log('🏛️ CONCLUSIÓN FORENSE:');
    console.log('='.repeat(60));

    if (validation.matches) {
        console.log('\n✅ CONFIRMADO: El dinero está seguro.');
        console.log(`   La diferencia de $${formatNumber(validation.difference)} se debe`);
        console.log(`   exclusivamente a ${analysis.duplicates.length} tipo(s) de registro duplicado.`);
    } else if (validation.difference === 0) {
        console.log('\n✅ PERFECTO: Los saldos coinciden exactamente.');
        console.log('   No hay diferencias entre Banco y App.');
    } else {
        console.log('\n⚠️ ALERTA: Hay una inconsistencia no explicada por duplicados.');
        console.log(`   Diferencia: $${formatNumber(validation.difference)}`);
        console.log(`   Explicable por duplicados: $${formatNumber(validation.duplicateSum)}`);
        console.log(`   Diferencia sin explicar: $${formatNumber(validation.difference - validation.duplicateSum)}`);
    }

    console.log('\n');
}

// ============================================
// MAIN
// ============================================

async function main() {
    const args = process.argv.slice(2);

    // Determinar archivo Excel
    let excelPath = args[0];
    if (!excelPath) {
        // Buscar el más reciente
        const files = fs.readdirSync('.').filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
        if (files.length === 0) {
            console.error('❌ No se encontró ningún archivo Excel');
            process.exit(1);
        }
        excelPath = files.sort().pop();
        console.log(`📁 Usando archivo más reciente: ${excelPath}`);
    }

    // Extraer montos del banco
    const bankAmounts = extractBankAmounts(excelPath);

    // Para la App, necesitamos los datos exportados
    // Por ahora, simularemos con entrada manual o un archivo JSON
    console.log('\n💡 NOTA: Para completar la auditoría, necesito los montos de la App.');
    console.log('   Exporta los datos desde la App (botón "Exportar JSON" en Mis Datos)');
    console.log('   y guárdalos como "app_transactions.json"');

    // Verificar si existe archivo de app
    const appFile = 'app_transactions.json';
    let appAmounts = [];

    if (fs.existsSync(appFile)) {
        console.log(`\n📱 Cargando datos de la App desde ${appFile}...`);
        const appData = JSON.parse(fs.readFileSync(appFile, 'utf-8'));

        if (appData.transactions) {
            appAmounts = appData.transactions.map(t => Math.round(t.amount));
            console.log(`   ✓ ${appAmounts.length} transacciones cargadas`);
        }
    } else {
        console.log('\n📱 Archivo de App no encontrado. Ejecutando análisis solo del banco...');
        console.log('\n📊 RESUMEN DE LA CARTOLA BANCARIA:');
        console.log(`   Total movimientos: ${bankAmounts.length}`);
        console.log(`   Cargos (negativos): ${bankAmounts.filter(a => a < 0).length}`);
        console.log(`   Abonos (positivos): ${bankAmounts.filter(a => a > 0).length}`);
        console.log(`   Suma total: $${formatNumber(bankAmounts.reduce((a, b) => a + b, 0))}`);

        // Mostrar frecuencia de montos del banco
        console.log('\n📈 FRECUENCIA DE MONTOS EN BANCO:');
        const freq = {};
        bankAmounts.forEach(a => freq[a] = (freq[a] || 0) + 1);
        Object.entries(freq)
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([amount, count]) => {
                const sign = parseInt(amount) < 0 ? '-' : '+';
                console.log(`   ${sign}$${formatNumber(Math.abs(parseInt(amount)))}: ${count} veces`);
            });

        return;
    }

    // Ejecutar auditoría completa
    const table = buildFrequencyTable(bankAmounts, appAmounts);
    const analysis = identifyDuplicates(table);
    const validation = validateMath(bankAmounts, appAmounts, analysis.duplicates);

    generateReport(table, analysis, validation);
}

main().catch(console.error);
