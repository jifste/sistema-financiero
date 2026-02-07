/**
 * useSavings Hook
 * Encapsulates all savings projects and projection state and logic
 */

import { useState, useCallback } from 'react';
import {
    SavingsProject,
    SavingsProjectionEntry,
    NewProjectForm,
    NewProjectionForm
} from '../types/savings';

export interface UseSavingsReturn {
    // Projects
    savingsProjects: SavingsProject[];
    setSavingsProjects: React.Dispatch<React.SetStateAction<SavingsProject[]>>;
    newProject: NewProjectForm & { targetAmount: string };
    setNewProject: React.Dispatch<React.SetStateAction<NewProjectForm & { targetAmount: string }>>;
    addSavingsProject: () => void;
    deleteSavingsProject: (id: string) => void;
    addProjectContribution: (id: string, amount: number) => void;

    // Projection
    savingsProjection: SavingsProjectionEntry[];
    setSavingsProjection: React.Dispatch<React.SetStateAction<SavingsProjectionEntry[]>>;
    selectedSavingsMonth: string;
    setSelectedSavingsMonth: React.Dispatch<React.SetStateAction<string>>;
    newProjection: NewProjectionForm;
    setNewProjection: React.Dispatch<React.SetStateAction<NewProjectionForm>>;
}

const getInitialNewProject = (): NewProjectForm & { targetAmount: string } => ({
    name: '',
    targetDate: '',
    targetAmount: ''
});

const getInitialNewProjection = (): NewProjectionForm => {
    const now = new Date();
    return {
        monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        usadoNecesidades: '',
        usadoDeseos: '',
        restanteAhorro: ''
    };
};

const getInitialSavingsMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function useSavings(
    initialProjects: SavingsProject[] = [],
    initialProjection: SavingsProjectionEntry[] = []
): UseSavingsReturn {
    // Projects state
    const [savingsProjects, setSavingsProjects] = useState<SavingsProject[]>(initialProjects);
    const [newProject, setNewProject] = useState(getInitialNewProject);

    // Projection state
    const [savingsProjection, setSavingsProjection] = useState<SavingsProjectionEntry[]>(initialProjection);
    const [selectedSavingsMonth, setSelectedSavingsMonth] = useState<string>(getInitialSavingsMonth);
    const [newProjection, setNewProjection] = useState<NewProjectionForm>(getInitialNewProjection);

    // Project actions
    const addSavingsProject = useCallback(() => {
        const amount = parseFloat(newProject.targetAmount) || 0;
        if (!newProject.name.trim() || amount <= 0 || !newProject.targetDate) return;

        const project: SavingsProject = {
            id: `project-${Date.now()}`,
            name: newProject.name.trim(),
            targetAmount: amount,
            targetDate: newProject.targetDate,
            savedAmount: 0,
            createdAt: new Date().toISOString()
        };

        setSavingsProjects(prev => [...prev, project]);
        setNewProject(getInitialNewProject());
    }, [newProject]);

    const deleteSavingsProject = useCallback((id: string) => {
        setSavingsProjects(prev => prev.filter(p => p.id !== id));
    }, []);

    const addProjectContribution = useCallback((id: string, amount: number) => {
        if (amount <= 0) return;
        setSavingsProjects(prev => prev.map(p =>
            p.id === id ? { ...p, savedAmount: p.savedAmount + amount } : p
        ));
    }, []);

    return {
        // Projects
        savingsProjects,
        setSavingsProjects,
        newProject,
        setNewProject,
        addSavingsProject,
        deleteSavingsProject,
        addProjectContribution,

        // Projection
        savingsProjection,
        setSavingsProjection,
        selectedSavingsMonth,
        setSelectedSavingsMonth,
        newProjection,
        setNewProjection
    };
}
