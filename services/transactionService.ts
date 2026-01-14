/**
 * Transaction Service - Handles bank statement import logic
 * 
 * Features:
 * - SHA256 hash generation for deduplication
 * - Chilean date parsing (DD/MM/YYYY)
 * - Chronological sorting
 * - Incremental loading (delta filtering)
 */

import { Transaction } from '../types';

/**
 * Generate SHA256 hash for transaction deduplication
 * Composite key: Amount + Description (last 30 chars) + Date + Balance (if available)
 */
export async function generateTransactionHashSHA256(
    date: string,
    description: string,
    amount: number,
    balance?: number
): Promise<string> {
    const normalizedDate = (date || '').split('T')[0];
    const normalizedDesc = (description || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const descSuffix = normalizedDesc.slice(-30); // More chars for uniqueness
    const normalizedAmount = Math.abs(amount).toFixed(0);
    const normalizedBalance = balance !== undefined ? Math.abs(balance).toFixed(0) : '';

    // Composite key: amount|description_suffix|date|balance
    const combined = `${normalizedAmount}|${descSuffix}|${normalizedDate}|${normalizedBalance}`;

    // Use Web Crypto API for SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);

    try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 32); // First 32 chars of SHA256
    } catch {
        // Fallback for environments without crypto.subtle
        return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
}

/**
 * Synchronous hash generation (for compatibility with existing code)
 * Uses btoa but with improved composite key including balance
 */
export function generateTransactionHashSync(
    date: string,
    description: string,
    amount: number,
    balance?: number
): string {
    const normalizedDate = (date || '').split('T')[0];
    const normalizedDesc = (description || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const descSuffix = normalizedDesc.slice(-30);
    const normalizedAmount = Math.abs(amount).toFixed(0);
    const normalizedBalance = balance !== undefined ? Math.abs(balance).toFixed(0) : '';

    const combined = `${normalizedAmount}|${descSuffix}|${normalizedDate}|${normalizedBalance}`;

    try {
        return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    } catch {
        return combined.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
}

/**
 * Parse Chilean date format (DD/MM/YYYY) to ISO date string
 */
export function parseChileanDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    const str = String(dateStr).trim();

    // Handle Excel serial date
    const serial = parseFloat(str);
    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
        // Excel serial date: days since Jan 1, 1900
        // Use 25570 (not 25569) to correctly convert to Unix timestamp
        const utcDays = Math.floor(serial - 25570);
        const date = new Date(utcDays * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY format
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        return `${year}-${month}-${day}`;
    }

    // Handle YYYY-MM-DD (already ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.split('T')[0];
    }

    // Fallback: try native Date parsing
    try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    } catch {
        // ignore
    }

    return new Date().toISOString().split('T')[0];
}

/**
 * Parse a date string to timestamp for comparison
 * Handles multiple formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
function parseDateToTimestamp(dateStr: string): number {
    if (!dateStr) return 0;

    const str = String(dateStr).trim();

    // Handle Excel serial date
    const serial = parseFloat(str);
    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
        const utcDays = Math.floor(serial - 25570);
        return utcDays * 86400 * 1000;
    }

    // Handle DD-MM-YYYY or DD/MM/YYYY format (Chilean)
    const chileanMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (chileanMatch) {
        const day = parseInt(chileanMatch[1]);
        const month = parseInt(chileanMatch[2]) - 1; // JS months are 0-indexed
        const year = parseInt(chileanMatch[3]);
        return new Date(year, month, day).getTime();
    }

    // Handle YYYY-MM-DD (ISO format)
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        return new Date(year, month, day).getTime();
    }

    // Fallback: try native parsing
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sort transactions chronologically
 * @param transactions Array of transactions to sort
 * @param order 'asc' for oldest first, 'desc' for newest first
 */
export function sortTransactionsChronologically(
    transactions: Transaction[],
    order: 'asc' | 'desc' = 'desc'
): Transaction[] {
    return [...transactions].sort((a, b) => {
        const dateA = parseDateToTimestamp(a.date);
        const dateB = parseDateToTimestamp(b.date);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
}

/**
 * Get the latest transaction date from existing transactions
 */
export function getLatestTransactionDate(transactions: Transaction[]): Date | null {
    if (!transactions || transactions.length === 0) return null;

    const timestamps = transactions
        .map(t => parseDateToTimestamp(t.date))
        .filter(ts => ts > 0);

    if (timestamps.length === 0) return null;

    return new Date(Math.max(...timestamps));
}

/**
 * Filter incoming transactions to only include new ones (delta loading)
 * 
 * Strategy:
 * 1. If transaction date > latestDate: definitely new
 * 2. If transaction date === latestDate: check hash
 * 3. If transaction date < latestDate: skip (already processed)
 */
export function filterNewTransactions(
    incoming: Transaction[],
    existingHashes: Set<string>,
    latestDate: Date | null
): Transaction[] {
    if (!latestDate) {
        // No existing transactions, all are new (but still check hashes)
        return incoming.filter(t => !existingHashes.has(t.hash || ''));
    }

    const latestTimestamp = latestDate.getTime();

    return incoming.filter(t => {
        const txTimestamp = parseDateToTimestamp(t.date);

        // Always check hash to avoid duplicates
        if (existingHashes.has(t.hash || '')) {
            return false;
        }

        // Date comparison - allow all dates (hash already checked)
        return true;
    });
}

/**
 * Process and normalize imported transactions
 * - Parse dates
 * - Generate hashes
 * - Sort chronologically
 */
export async function processImportedTransactions(
    rawTransactions: Array<{
        date: string;
        description: string;
        amount: number;
        balance?: number;
        isIncome: boolean;
    }>
): Promise<Transaction[]> {
    const processed: Transaction[] = [];

    for (let i = 0; i < rawTransactions.length; i++) {
        const raw = rawTransactions[i];
        const normalizedDate = parseChileanDate(raw.date);
        const hash = generateTransactionHashSync(
            normalizedDate,
            raw.description,
            raw.amount,
            raw.balance
        );

        processed.push({
            id: `excel-${Date.now()}-${i}`,
            hash,
            date: normalizedDate,
            description: raw.description,
            amount: raw.amount,
            balance: raw.balance,
            category: undefined,
            subCategory: raw.isIncome ? 'Ingreso' : 'Gasto',
            isInstallment: false,
            isIncome: raw.isIncome
        });
    }

    // Sort chronologically (newest first for UI)
    return sortTransactionsChronologically(processed, 'desc');
}
