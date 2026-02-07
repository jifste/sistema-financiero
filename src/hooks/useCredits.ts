/**
 * useCredits Hook
 * Encapsulates all credit operations state and logic
 */

import { useState, useCallback } from 'react';
import { CreditOperation, NewCreditForm } from '../types/credit';

export interface UseCreditsReturn {
    creditOperations: CreditOperation[];
    setCreditOperations: React.Dispatch<React.SetStateAction<CreditOperation[]>>;
    newCredit: NewCreditForm;
    setNewCredit: React.Dispatch<React.SetStateAction<NewCreditForm>>;
    addCreditOperation: () => void;
    deleteCreditOperation: (id: string) => void;
    updateCreditInstallments: (id: string, change: number) => void;
}

const initialNewCredit: NewCreditForm = {
    description: '',
    totalAmount: '',
    totalInstallments: '',
    paidInstallments: ''
};

export function useCredits(initialCredits: CreditOperation[] = []): UseCreditsReturn {
    const [creditOperations, setCreditOperations] = useState<CreditOperation[]>(initialCredits);
    const [newCredit, setNewCredit] = useState<NewCreditForm>(initialNewCredit);

    const addCreditOperation = useCallback(() => {
        const total = parseFloat(newCredit.totalAmount) || 0;
        const installments = parseInt(newCredit.totalInstallments) || 1;
        const paid = parseInt(newCredit.paidInstallments) || 0;

        if (!newCredit.description || total <= 0 || installments <= 0) return;

        const monthlyInstallment = Math.round(total / installments);
        const remaining = installments - paid;
        const pending = monthlyInstallment * remaining;

        const operation: CreditOperation = {
            id: `credit-${Date.now()}`,
            description: newCredit.description,
            totalAmount: total,
            totalInstallments: installments,
            monthlyInstallment,
            paidInstallments: paid,
            remainingInstallments: remaining,
            pendingBalance: pending
        };

        setCreditOperations(prev => [...prev, operation]);
        setNewCredit(initialNewCredit);
    }, [newCredit]);

    const deleteCreditOperation = useCallback((id: string) => {
        setCreditOperations(prev => prev.filter(c => c.id !== id));
    }, []);

    const updateCreditInstallments = useCallback((id: string, change: number) => {
        setCreditOperations(prev => prev.map(c => {
            if (c.id !== id) return c;

            const newPaid = Math.max(0, Math.min(c.totalInstallments, c.paidInstallments + change));
            const newRemaining = c.totalInstallments - newPaid;
            const newPending = c.monthlyInstallment * newRemaining;

            return {
                ...c,
                paidInstallments: newPaid,
                remainingInstallments: newRemaining,
                pendingBalance: newPending
            };
        }));
    }, []);

    return {
        creditOperations,
        setCreditOperations,
        newCredit,
        setNewCredit,
        addCreditOperation,
        deleteCreditOperation,
        updateCreditInstallments
    };
}
