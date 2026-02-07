/**
 * Utility Functions
 * Common helper functions used across the application
 */

/**
 * Format currency in Chilean Peso format
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));
};

/**
 * Format date for display
 */
export const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

/**
 * Format month label from YYYY-MM format
 */
export const formatMonthLabel = (monthKey: string): string => {
    try {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    } catch {
        return monthKey;
    }
};

/**
 * Get current month key in YYYY-MM format
 */
export const getCurrentMonthKey = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Parse Chilean date format (DD/MM/YYYY or DD-MM-YYYY) to ISO
 */
export const parseChileanDateToISO = (dateStr: string): string => {
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
};
