/**
 * useSubscriptions Hook
 * Encapsulates all subscription state and logic
 */

import { useState, useCallback } from 'react';
import { MonthlySubscription, NewSubscriptionForm } from '../types/subscription';

export interface UseSubscriptionsReturn {
    subscriptions: MonthlySubscription[];
    setSubscriptions: React.Dispatch<React.SetStateAction<MonthlySubscription[]>>;
    newSubscription: NewSubscriptionForm;
    setNewSubscription: React.Dispatch<React.SetStateAction<NewSubscriptionForm>>;
    addSubscription: () => void;
    deleteSubscription: (id: string) => void;
}

const initialNewSubscription: NewSubscriptionForm = {
    description: '',
    monthlyAmount: ''
};

export function useSubscriptions(initialSubs: MonthlySubscription[] = []): UseSubscriptionsReturn {
    const [subscriptions, setSubscriptions] = useState<MonthlySubscription[]>(initialSubs);
    const [newSubscription, setNewSubscription] = useState<NewSubscriptionForm>(initialNewSubscription);

    const addSubscription = useCallback(() => {
        const amount = parseFloat(newSubscription.monthlyAmount) || 0;
        if (!newSubscription.description || amount <= 0) return;

        const sub: MonthlySubscription = {
            id: `sub-${Date.now()}`,
            description: newSubscription.description,
            monthlyAmount: amount
        };

        setSubscriptions(prev => [...prev, sub]);
        setNewSubscription(initialNewSubscription);
    }, [newSubscription]);

    const deleteSubscription = useCallback((id: string) => {
        setSubscriptions(prev => prev.filter(s => s.id !== id));
    }, []);

    return {
        subscriptions,
        setSubscriptions,
        newSubscription,
        setNewSubscription,
        addSubscription,
        deleteSubscription
    };
}
