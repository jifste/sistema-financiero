/**
 * Credit Types
 * Types related to credit operations and debt management
 */

export interface CreditOperation {
    id: string;
    description: string;
    totalAmount: number;
    totalInstallments: number;
    monthlyInstallment: number;
    paidInstallments: number;
    remainingInstallments: number;
    pendingBalance: number;
}

export interface NewCreditForm {
    description: string;
    totalAmount: string;
    totalInstallments: string;
    paidInstallments: string;
}
