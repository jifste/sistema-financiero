
export enum CategoryType {
  NEED = 'Necesidad',
  WANT = 'Deseo',
  SAVINGS = 'Ahorro'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: CategoryType;  // undefined = sin categorizar
  subCategory: string;
  isInstallment: boolean;
  isIncome?: boolean;  // true = abono (income), false = cargo (expense)
  installmentCurrent?: number;
  installmentTotal?: number;
  installmentValue?: number;
}

export interface Subscription {
  description: string;
  amount: number;
  frequency: 'Monthly';
  count: number;
}

export interface DebtSummary {
  description: string;
  currentInstallment: number;
  totalInstallments: number;
  monthlyValue: number;
  remainingBalance: number;
  endDate: string;
}

export interface ProjectionData {
  month: string;
  amount: number;
}
