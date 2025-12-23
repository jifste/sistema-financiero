
import { Transaction, CategoryType, Subscription, DebtSummary, ProjectionData } from '../types';
import { MONTH_NAMES } from '../constants';

export const calculateFinancialHealth = (transactions: Transaction[], monthlyIncome: number) => {
  const totals = {
    [CategoryType.NEED]: 0,
    [CategoryType.WANT]: 0,
    [CategoryType.SAVINGS]: 0,
  };

  transactions.forEach(t => {
    // We only consider the current month's impact or installment value
    const value = t.isInstallment ? (t.installmentValue || 0) : t.amount;
    totals[t.category] += value;
  });

  const needPct = (totals[CategoryType.NEED] / monthlyIncome) * 100;
  const wantPct = (totals[CategoryType.WANT] / monthlyIncome) * 100;
  
  // Health score is a weighted average of how well you follow 50/30/20
  // Higher penalty for overspending on Needs and Wants
  const needDiff = Math.max(0, needPct - 50);
  const wantDiff = Math.max(0, wantPct - 30);
  
  const score = Math.max(0, 100 - (needDiff * 2) - (wantDiff * 1.5));
  return { score, totals, needPct, wantPct };
};

export const detectSubscriptions = (transactions: Transaction[]): Subscription[] => {
  const groups: Record<string, { count: number; amount: number }> = {};
  
  transactions.forEach(t => {
    const key = `${t.description.toLowerCase().trim()}_${t.amount}`;
    if (!groups[key]) {
      groups[key] = { count: 0, amount: t.amount };
    }
    groups[key].count++;
  });

  return Object.entries(groups)
    .filter(([_, data]) => data.count >= 2)
    .map(([key, data]) => ({
      description: key.split('_')[0].charAt(0).toUpperCase() + key.split('_')[0].slice(1),
      amount: data.amount,
      frequency: 'Monthly',
      count: data.count
    }));
};

export const getDebtTimeline = (transactions: Transaction[]): DebtSummary[] => {
  return transactions
    .filter(t => t.isInstallment)
    .map(t => {
      const remainingInstallments = (t.installmentTotal || 0) - (t.installmentCurrent || 0);
      const remainingBalance = remainingInstallments * (t.installmentValue || 0);
      
      const now = new Date();
      const endDate = new Date(now.setMonth(now.getMonth() + remainingInstallments));
      
      return {
        description: t.description,
        currentInstallment: t.installmentCurrent || 0,
        totalInstallments: t.installmentTotal || 0,
        monthlyValue: t.installmentValue || 0,
        remainingBalance,
        endDate: endDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      };
    });
};

export const getCashFlowProjection = (transactions: Transaction[], months: number = 6): ProjectionData[] => {
  const installments = transactions.filter(t => t.isInstallment);
  const projection: ProjectionData[] = [];
  const startMonth = new Date().getMonth();

  for (let i = 0; i < months; i++) {
    let monthlyTotal = 0;
    installments.forEach(t => {
      const current = (t.installmentCurrent || 0) + i;
      if (current <= (t.installmentTotal || 0)) {
        monthlyTotal += (t.installmentValue || 0);
      }
    });
    
    projection.push({
      month: MONTH_NAMES[(startMonth + i) % 12],
      amount: monthlyTotal
    });
  }

  return projection;
};
