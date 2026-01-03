import { supabase } from '../lib/supabase';
import { Transaction, CategoryType } from '../../types';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

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

export interface MonthlySubscriptionEntry {
  id: string;
  description: string;
  monthlyAmount: number;
}

export interface CalendarTask {
  id: string;
  date: string;
  description: string;
  type: 'pago' | 'recordatorio' | 'otro';
  completed: boolean;
}

export interface SavingsProject {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  savedAmount: number;
  createdAt: string;
}

export interface SavingsProjectionEntry {
  monthKey: string;
  usadoNecesidades: number;
  usadoDeseos: number;
  restanteAhorro: number;
}

export interface ImportedFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf';
  importDate: string;
  transactionCount: number;
  transactionIds: string[];
}

export interface UserData {
  transactions: Transaction[];
  creditOperations: CreditOperation[];
  manualSubscriptions: MonthlySubscriptionEntry[];
  calendarTasks: CalendarTask[];
  savingsProjects: SavingsProject[];
  savingsProjection: SavingsProjectionEntry[];
  importedFiles: ImportedFile[];
  userName: string;
}

const DEFAULT_USER_DATA: UserData = {
  transactions: [],
  creditOperations: [],
  manualSubscriptions: [],
  calendarTasks: [],
  savingsProjects: [],
  savingsProjection: [],
  importedFiles: [],
  userName: ''
};

// =====================================================
// SUPABASE DATA OPERATIONS
// =====================================================

/**
 * Load user data from Supabase
 * Falls back to localStorage if Supabase fails
 */
export async function loadUserData(userId: string): Promise<UserData> {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no row exists, return default data
      if (error.code === 'PGRST116') {
        console.log('No cloud data found, checking localStorage...');
        return loadFromLocalStorage(userId);
      }
      throw error;
    }

    console.log('✅ Loaded data from Supabase cloud');
    return data.data as UserData;
  } catch (error) {
    console.warn('Failed to load from Supabase, falling back to localStorage:', error);
    return loadFromLocalStorage(userId);
  }
}

/**
 * Save user data to Supabase
 * Also saves to localStorage as backup
 */
export async function saveUserData(userId: string, userData: UserData): Promise<boolean> {
  // Always save to localStorage as backup
  saveToLocalStorage(userId, userData);

  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data: userData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }

    console.log('✅ Saved data to Supabase cloud');
    return true;
  } catch (error) {
    console.warn('Failed to save to Supabase (saved to localStorage):', error);
    return false;
  }
}

/**
 * Migrate data from localStorage to Supabase
 * Called on first sync when user has local data but no cloud data
 */
export async function migrateFromLocalStorage(userId: string): Promise<UserData | null> {
  const localData = loadFromLocalStorage(userId);
  
  // Check if local data has any content
  const hasLocalData = 
    localData.transactions.length > 0 ||
    localData.creditOperations.length > 0 ||
    localData.manualSubscriptions.length > 0 ||
    localData.calendarTasks.length > 0 ||
    localData.savingsProjects.length > 0 ||
    localData.userName !== '';

  if (hasLocalData) {
    console.log('📤 Migrating localStorage data to cloud...');
    const success = await saveUserData(userId, localData);
    if (success) {
      console.log('✅ Migration complete!');
      return localData;
    }
  }

  return null;
}

// =====================================================
// LOCALSTORAGE HELPERS (Fallback & Backup)
// =====================================================

function getStorageKey(userId: string, key: string): string {
  return `financeai_${userId}_${key}`;
}

function loadFromLocalStorage(userId: string): UserData {
  try {
    const transactions = JSON.parse(localStorage.getItem(getStorageKey(userId, 'transactions')) || '[]');
    const creditOperations = JSON.parse(localStorage.getItem(getStorageKey(userId, 'credits')) || '[]');
    const manualSubscriptions = JSON.parse(localStorage.getItem(getStorageKey(userId, 'subscriptions')) || '[]');
    const calendarTasks = JSON.parse(localStorage.getItem(getStorageKey(userId, 'calendar_tasks')) || '[]');
    const savingsProjects = JSON.parse(localStorage.getItem(getStorageKey(userId, 'savings_projects')) || '[]');
    const savingsProjection = JSON.parse(localStorage.getItem(getStorageKey(userId, 'savings_projection')) || '[]');
    const importedFiles = JSON.parse(localStorage.getItem(getStorageKey(userId, 'imported_files')) || '[]');
    const userName = JSON.parse(localStorage.getItem(getStorageKey(userId, 'username')) || '""');

    return {
      transactions,
      creditOperations,
      manualSubscriptions,
      calendarTasks,
      savingsProjects,
      savingsProjection,
      importedFiles,
      userName
    };
  } catch (error) {
    console.warn('Error loading from localStorage:', error);
    return DEFAULT_USER_DATA;
  }
}

function saveToLocalStorage(userId: string, data: UserData): void {
  try {
    localStorage.setItem(getStorageKey(userId, 'transactions'), JSON.stringify(data.transactions));
    localStorage.setItem(getStorageKey(userId, 'credits'), JSON.stringify(data.creditOperations));
    localStorage.setItem(getStorageKey(userId, 'subscriptions'), JSON.stringify(data.manualSubscriptions));
    localStorage.setItem(getStorageKey(userId, 'calendar_tasks'), JSON.stringify(data.calendarTasks));
    localStorage.setItem(getStorageKey(userId, 'savings_projects'), JSON.stringify(data.savingsProjects));
    localStorage.setItem(getStorageKey(userId, 'savings_projection'), JSON.stringify(data.savingsProjection));
    localStorage.setItem(getStorageKey(userId, 'imported_files'), JSON.stringify(data.importedFiles));
    localStorage.setItem(getStorageKey(userId, 'username'), JSON.stringify(data.userName));
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
  }
}

// =====================================================
// SYNC STATUS HELPERS
// =====================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function isOnline(): boolean {
  return navigator.onLine;
}
