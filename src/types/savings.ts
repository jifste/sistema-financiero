/**
 * Savings Types
 * Types related to savings projects and projections
 */

export interface SavingsProject {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string; // ISO date string
    savedAmount: number;
    createdAt: string;
}

export interface SavingsProjectionEntry {
    monthKey: string; // YYYY-MM format
    usadoNecesidades: number;
    usadoDeseos: number;
    restanteAhorro: number;
}

export interface NewProjectForm {
    name: string;
    targetDate: string;
}

export interface NewProjectionForm {
    monthKey: string;
    usadoNecesidades: string;
    usadoDeseos: string;
    restanteAhorro: string;
}
