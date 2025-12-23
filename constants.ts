
import { CategoryType, Transaction } from './types';

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-11-01', description: 'Supermercado Jumbo', amount: 85000, category: CategoryType.NEED, subCategory: 'Alimentación', isInstallment: false },
  { id: '2', date: '2023-11-02', description: 'Netflix', amount: 9500, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '3', date: '2023-11-02', description: 'Spotify', amount: 5990, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '4', date: '2023-11-05', description: 'iPhone 15 Pro', amount: 1200000, category: CategoryType.WANT, subCategory: 'Tecnología', isInstallment: true, installmentCurrent: 3, installmentTotal: 12, installmentValue: 100000 },
  { id: '5', date: '2023-11-10', description: 'Gimnasio SmartFit', amount: 24900, category: CategoryType.WANT, subCategory: 'Salud', isInstallment: false },
  { id: '6', date: '2023-11-12', description: 'Arriendo Depto', amount: 650000, category: CategoryType.NEED, subCategory: 'Vivienda', isInstallment: false },
  { id: '7', date: '2023-11-15', description: 'Uber', amount: 4500, category: CategoryType.WANT, subCategory: 'Transporte', isInstallment: false },
  { id: '8', date: '2023-11-20', description: 'Crédito Consumo Santander', amount: 5000000, category: CategoryType.NEED, subCategory: 'Finanzas', isInstallment: true, installmentCurrent: 12, installmentTotal: 48, installmentValue: 155000 },
  { id: '9', date: '2023-10-02', description: 'Netflix', amount: 9500, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '10', date: '2023-09-02', description: 'Netflix', amount: 9500, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '11', date: '2023-10-02', description: 'Spotify', amount: 5990, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '12', date: '2023-09-02', description: 'Spotify', amount: 5990, category: CategoryType.WANT, subCategory: 'Entretenimiento', isInstallment: false },
  { id: '13', date: '2023-11-25', description: 'Seguro Automotriz', amount: 35000, category: CategoryType.NEED, subCategory: 'Transporte', isInstallment: true, installmentCurrent: 5, installmentTotal: 12, installmentValue: 35000 },
];

export const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
