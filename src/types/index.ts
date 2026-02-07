/**
 * Types Index
 * Barrel export for all application types
 * 
 * This module re-exports all types from individual files
 * to maintain backward compatibility with existing imports.
 */

// Core transaction types (original)
export { CategoryType, Transaction, Subscription, DebtSummary, ProjectionData } from '../../types';

// Credit types
export { CreditOperation, NewCreditForm } from './credit';

// Calendar types
export { CalendarTask, CalendarTaskType, NewTaskForm } from './calendar';

// Savings types
export { SavingsProject, SavingsProjectionEntry, NewProjectForm, NewProjectionForm } from './savings';

// Import types
export { ImportedFile, ImportFileType } from './import';

// Subscription types  
export { MonthlySubscription, NewSubscriptionForm } from './subscription';

// Tab type for navigation
export type TabType =
    | 'resumen'
    | 'movimientos'
    | 'cuentas'
    | 'presupuesto'
    | 'creditos'
    | 'calendario'
    | 'proyectos'
    | 'historial'
    | 'ahorro'
    | 'proyeccion'
    | 'sugerencias'
    | 'mis_datos';
