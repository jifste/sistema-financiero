/**
 * Subscription Types
 * Types related to recurring subscriptions
 */

export interface MonthlySubscription {
    id: string;
    description: string;
    monthlyAmount: number;
}

export interface NewSubscriptionForm {
    description: string;
    monthlyAmount: string;
}
