
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { financeAILogo, financeAIIcon } from './src/logo-data';
import {
  LayoutDashboard,
  CreditCard,
  PieChart as PieChartIcon,
  TrendingUp,
  Repeat,
  Clock,
  ChevronRight,
  Search,
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  Trash2,
  Upload,
  Wallet,
  Target,
  History,
  FileSpreadsheet,
  FileText,
  Settings,
  Tag,
  ShoppingCart,
  Heart,
  Car,
  Plane,
  Smartphone,
  Shirt,
  Home,
  GraduationCap,
  Utensils,
  Gift,
  Sparkles,
  Package,
  MoreHorizontal,
  Check,
  Calendar,
  ChevronLeft,
  ChevronDown,
  Plus,
  X,
  Download,
  PiggyBank,
  LogOut,
  Menu
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

import { MOCK_TRANSACTIONS } from './constants';
import { CategoryType, Transaction } from './types';
import {
  calculateFinancialHealth,
  detectSubscriptions,
  getDebtTimeline,
  getCashFlowProjection
} from './services/financeLogic';

import { BentoCard } from './components/BentoCard';
import { FinancialHealthGauge } from './components/FinancialHealthGauge';
import { SnowballSimulator } from './components/SnowballSimulator';
import { AIChat } from './components/AIChat';
import { useAuth } from './src/contexts/AuthContext';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const INCOME = 6137000;

type TabType = 'resumen' | 'movimientos' | 'cuentas' | 'presupuesto' | 'creditos' | 'calendario' | 'proyectos' | 'historial' | 'ahorro' | 'proyeccion';

// Expense categories for transaction classification
const EXPENSE_CATEGORIES = [
  { id: 'alimentacion', name: 'Alimentación', icon: ShoppingCart, color: 'bg-green-500' },
  { id: 'salud', name: 'Salud', icon: Heart, color: 'bg-red-500' },
  { id: 'entretencion', name: 'Entretención', icon: Sparkles, color: 'bg-purple-500' },
  { id: 'transporte', name: 'Transporte', icon: Car, color: 'bg-blue-500' },
  { id: 'viajes', name: 'Viajes', icon: Plane, color: 'bg-cyan-500' },
  { id: 'tecnologia', name: 'Tecnología', icon: Smartphone, color: 'bg-indigo-500' },
  { id: 'ropa', name: 'Ropa', icon: Shirt, color: 'bg-pink-500' },
  { id: 'calzado', name: 'Calzado', icon: Package, color: 'bg-orange-500' },
  { id: 'aseo', name: 'Artículos de Aseo', icon: Sparkles, color: 'bg-teal-500' },
  { id: 'hogar', name: 'Hogar', icon: Home, color: 'bg-amber-500' },
  { id: 'educacion', name: 'Educación', icon: GraduationCap, color: 'bg-violet-500' },
  { id: 'restaurantes', name: 'Restaurantes', icon: Utensils, color: 'bg-rose-500' },
  { id: 'regalos', name: 'Regalos', icon: Gift, color: 'bg-fuchsia-500' },
  { id: 'otros', name: 'Otros', icon: MoreHorizontal, color: 'bg-slate-500' },
] as const;

// Credit operation interface
interface CreditOperation {
  id: string;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  monthlyInstallment: number;
  paidInstallments: number;
  remainingInstallments: number;
  pendingBalance: number;
}

// Interface for imported files tracking
interface ImportedFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf';
  importDate: string;
  transactionCount: number;
  transactionIds: string[];
}

// Interface for calendar tasks
interface CalendarTask {
  id: string;
  date: string; // ISO date string
  description: string;
  type: 'pago' | 'recordatorio' | 'otro';
  completed: boolean;
}

// Interface for savings projects
interface SavingsProject {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // ISO date string
  savedAmount: number;
  createdAt: string;
}

// Interface for savings projection entries
interface SavingsProjectionEntry {
  monthKey: string; // YYYY-MM format
  usadoNecesidades: number;
  usadoDeseos: number;
  restanteAhorro: number;
}

const App: React.FC = () => {
  // Auth hook for logout functionality
  const { user, logout } = useAuth();

  // Helper to get user-specific storage key
  const getStorageKey = useCallback((key: string): string => {
    const userId = user?.id || 'guest';
    return `financeai_${userId}_${key}`;
  }, [user?.id]);

  // Load saved data from localStorage with user-specific key
  const loadFromStorage = useCallback(<T,>(key: string, defaultValue: T): T => {
    try {
      const storageKey = getStorageKey(key);
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [getStorageKey]);

  // State declarations - will be reloaded when user changes
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSavingsMonth, setSelectedSavingsMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Credit operations state
  const [creditOperations, setCreditOperations] = useState<CreditOperation[]>([]);
  const [newCredit, setNewCredit] = useState({
    description: '',
    totalAmount: '',
    totalInstallments: '',
    paidInstallments: ''
  });

  // Monthly subscriptions state
  interface MonthlySubscriptionEntry {
    id: string;
    description: string;
    monthlyAmount: number;
  }
  const [manualSubscriptions, setManualSubscriptions] = useState<MonthlySubscriptionEntry[]>([]);
  const [newSubscription, setNewSubscription] = useState({
    description: '',
    monthlyAmount: ''
  });

  // Calendar tasks state
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);

  // Savings projection state
  const [savingsProjection, setSavingsProjection] = useState<SavingsProjectionEntry[]>([]);
  const [newProjection, setNewProjection] = useState({
    monthKey: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    usadoNecesidades: '',
    usadoDeseos: '',
    restanteAhorro: ''
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    description: '',
    type: 'pago' as 'pago' | 'recordatorio' | 'otro'
  });

  // Savings projects state
  const [savingsProjects, setSavingsProjects] = useState<SavingsProject[]>([]);
  const [newProject, setNewProject] = useState({
    name: '',
    targetAmount: '',
    targetDate: ''
  });

  // Imported files state
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);

  // User name state
  const [userName, setUserName] = useState<string>('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Load all user data when user changes (login/logout)
  useEffect(() => {
    if (user?.id) {
      // Load user-specific data from localStorage
      setTransactions(loadFromStorage('transactions', []));
      setCreditOperations(loadFromStorage('credits', []));
      setManualSubscriptions(loadFromStorage('subscriptions', []));
      setCalendarTasks(loadFromStorage('calendar_tasks', []));
      setSavingsProjects(loadFromStorage('savings_projects', []));
      setSavingsProjection(loadFromStorage('savings_projection', []));
      setImportedFiles(loadFromStorage('imported_files', []));
      setUserName(loadFromStorage('username', ''));
    } else {
      // User logged out - clear all state
      setTransactions([]);
      setCreditOperations([]);
      setManualSubscriptions([]);
      setCalendarTasks([]);
      setSavingsProjects([]);
      setSavingsProjection([]);
      setImportedFiles([]);
      setUserName('');
    }
  }, [user?.id, loadFromStorage]);

  // Save to localStorage when data changes (only if user is logged in)
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
    }
  }, [transactions, user?.id, getStorageKey]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('credits'), JSON.stringify(creditOperations));
    }
  }, [creditOperations, user?.id, getStorageKey]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('subscriptions'), JSON.stringify(manualSubscriptions));
    }
  }, [manualSubscriptions, user?.id, getStorageKey]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('calendar_tasks'), JSON.stringify(calendarTasks));
    }
  }, [calendarTasks, user?.id, getStorageKey]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('savings_projects'), JSON.stringify(savingsProjects));
    }
  }, [savingsProjects, user?.id, getStorageKey]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('savings_projection'), JSON.stringify(savingsProjection));
    }
  }, [savingsProjection, user?.id, getStorageKey]);

  // Save imported files to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey('imported_files'), JSON.stringify(importedFiles));
    }
  }, [importedFiles, user?.id, getStorageKey]);

  // Show welcome modal if no username is set
  useEffect(() => {
    if (user?.id && !userName) {
      setShowWelcomeModal(true);
    }
  }, [user?.id, userName]);

  // Save username to localStorage
  useEffect(() => {
    if (user?.id && userName) {
      localStorage.setItem(getStorageKey('username'), JSON.stringify(userName));
    }
  }, [userName, user?.id, getStorageKey]);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setShowWelcomeModal(false);
      setShowEditName(false);
      setTempName('');
    }
  };

  // Convert row data to Transaction
  const rowToTransaction = (row: any, index: number): Transaction => ({
    id: `imported-${Date.now()}-${index}`,
    description: row.descripcion || row.description || row.Descripcion || row.concepto || row.Concepto || row.Movimientos || row.movimientos || 'Sin descripción',
    amount: Math.abs(parseFloat(String(row.monto || row.amount || row.Monto || row.valor || row.Valor || row.Cargos || row.cargos || row.Abonos || row.abonos || '0').replace(/[^0-9.-]/g, ''))),
    date: row.fecha || row.date || row.Fecha || new Date().toISOString(),
    category: undefined,  // Sin categorizar por defecto
    subCategory: row.categoria || row.category || row.Categoria || 'Otros',
    isInstallment: false
  });

  // Convert Excel serial date to JS Date
  const excelDateToJSDate = (serial: number): string => {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split('T')[0];
  };

  // Excel Import Handler - supports Chilean bank statements
  const handleExcelImport = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw data with headers as first row array
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find the header row (look for rows containing "Fecha", "Movimientos", "Cargos", etc)
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
        if (rowStr.includes('fecha') && (rowStr.includes('movimiento') || rowStr.includes('cargo') || rowStr.includes('descripcion'))) {
          headerRowIndex = i;
          headers = row.map(c => String(c || '').trim());
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: use first row as header
      headerRowIndex = 0;
      headers = rawData[0]?.map((c: any) => String(c || '').trim()) || [];
    }

    // Map columns
    const findCol = (names: string[]) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
    const fechaCol = findCol(['fecha', 'date']);
    const descCol = findCol(['movimiento', 'descripcion', 'concepto', 'detalle']);
    const cargoCol = findCol(['cargo', 'debito', 'egreso', 'gasto']);
    const abonoCol = findCol(['abono', 'credito', 'ingreso', 'deposito']);

    const importedTransactions: Transaction[] = [];

    // Parse data rows (skip header)
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row) || row.length < 3) continue;

      // Get date
      let dateStr = '';
      if (fechaCol >= 0 && row[fechaCol] !== undefined) {
        const dateVal = row[fechaCol];
        if (typeof dateVal === 'number' && dateVal > 40000 && dateVal < 50000) {
          dateStr = excelDateToJSDate(dateVal);
        } else {
          dateStr = String(dateVal);
        }
      }

      // Get description
      const desc = descCol >= 0 ? String(row[descCol] || '').trim() : '';
      if (!desc || desc.length < 2) continue;

      // Get amount and determine if income (abono) or expense (cargo)
      let amount = 0;
      let isIncome = false;

      // Check cargo first (expense)
      if (cargoCol >= 0 && row[cargoCol] && row[cargoCol] !== '') {
        const cargoVal = parseFloat(String(row[cargoCol]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(cargoVal) && cargoVal > 0) {
          amount = Math.abs(cargoVal);
          isIncome = false;
        }
      }

      // Check abono (income)
      if (amount === 0 && abonoCol >= 0 && row[abonoCol] && row[abonoCol] !== '') {
        const abonoVal = parseFloat(String(row[abonoCol]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(abonoVal) && abonoVal > 0) {
          amount = Math.abs(abonoVal);
          isIncome = true;
        }
      }

      if (amount > 0) {
        const txId = `excel-${Date.now()}-${i}`;
        importedTransactions.push({
          id: txId,
          description: desc,
          amount: amount,
          date: dateStr || new Date().toISOString(),
          category: undefined,  // Sin categorizar
          subCategory: isIncome ? 'Ingreso' : 'Gasto',
          isInstallment: false,
          isIncome: isIncome
        });
      }
    }

    setTransactions(prev => [...importedTransactions, ...prev]);
    return {
      count: importedTransactions.length,
      ids: importedTransactions.map(t => t.id)
    };
  };

  // PDF Import Handler (extracts text and tries to parse transactions)
  const handlePDFImport = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // Simple pattern matching for common bank statement formats
    const lines = fullText.split('\n').filter(line => line.trim());
    const amountPattern = /\$?\s*[\d,.]+/g;
    const datePattern = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g;

    const importedTransactions: Transaction[] = [];

    lines.forEach((line, index) => {
      const amounts = line.match(amountPattern);
      const dates = line.match(datePattern);

      if (amounts && amounts.length > 0) {
        const amount = parseFloat(amounts[amounts.length - 1].replace(/[$,\s]/g, ''));
        if (amount > 0 && amount < 100000000) {
          importedTransactions.push({
            id: `pdf-${Date.now()}-${index}`,
            description: line.substring(0, 50).replace(/[\d$,.-]/g, '').trim() || 'Transacción PDF',
            amount: Math.abs(amount),
            date: dates?.[0] || new Date().toISOString(),
            category: undefined,  // Sin categorizar
            subCategory: 'Importado PDF',
            isInstallment: false
          });
        }
      }
    });

    setTransactions(prev => [...importedTransactions, ...prev]);
    return {
      count: importedTransactions.length,
      ids: importedTransactions.map(t => t.id)
    };
  };

  // Main File Import Handler
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('📥 Procesando archivo...');

    // Save current month data before importing new transactions
    if (transactions.length > 0) {
      const savedMonth = saveCurrentMonthData();
      if (savedMonth) {
        setImportStatus(`💾 Guardando datos de ${savedMonth}...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to show message
        setImportStatus('📥 Procesando archivo...');
      }
    }

    try {
      let result = { count: 0, ids: [] as string[] };
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        result = await handleExcelImport(file);
        setImportStatus(`✅ ${result.count} transacciones importadas desde Excel`);

        // Register imported file
        if (result.count > 0) {
          const importedFile: ImportedFile = {
            id: `file-${Date.now()}`,
            name: file.name,
            type: 'excel',
            importDate: new Date().toISOString(),
            transactionCount: result.count,
            transactionIds: result.ids
          };
          setImportedFiles(prev => [...prev, importedFile]);
        }
      } else if (extension === 'pdf') {
        result = await handlePDFImport(file);
        setImportStatus(`✅ ${result.count} transacciones extraídas del PDF`);

        // Register imported file
        if (result.count > 0) {
          const importedFile: ImportedFile = {
            id: `file-${Date.now()}`,
            name: file.name,
            type: 'pdf',
            importDate: new Date().toISOString(),
            transactionCount: result.count,
            transactionIds: result.ids
          };
          setImportedFiles(prev => [...prev, importedFile]);
        }
      } else {
        setImportStatus('❌ Formato no soportado. Use Excel (.xlsx) o PDF');
      }
    } catch (error: any) {
      setImportStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportStatus(null), 4000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to update a transaction's category
  const updateTransactionCategory = (id: string, newCategory: CategoryType) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, category: newCategory } : t
    ));
  };

  // Function to update a transaction's expense category (for classification)
  const updateTransactionExpenseCategory = (id: string, expenseCategory: string) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, subCategory: expenseCategory } : t
    ));
  };

  // Function to add a new credit operation
  const addCreditOperation = () => {
    const total = parseFloat(newCredit.totalAmount) || 0;
    const installments = parseInt(newCredit.totalInstallments) || 1;
    const paid = parseInt(newCredit.paidInstallments) || 0;

    if (!newCredit.description || total <= 0 || installments <= 0) return;

    const monthlyValue = total / installments;
    const remaining = installments - paid;
    const pendingBalance = monthlyValue * remaining;

    const operation: CreditOperation = {
      id: `credit-${Date.now()}`,
      description: newCredit.description,
      totalAmount: total,
      totalInstallments: installments,
      monthlyInstallment: monthlyValue,
      paidInstallments: paid,
      remainingInstallments: remaining,
      pendingBalance: pendingBalance
    };

    setCreditOperations(prev => [...prev, operation]);
    setNewCredit({ description: '', totalAmount: '', totalInstallments: '', paidInstallments: '' });
  };

  // Function to delete a credit operation
  const deleteCreditOperation = (id: string) => {
    setCreditOperations(prev => prev.filter(c => c.id !== id));
  };

  // Function to update paid installments and recalculate balance
  const updateCreditInstallments = (id: string, change: number) => {
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
  };

  // Function to add a new subscription
  const addSubscription = () => {
    const amount = parseFloat(newSubscription.monthlyAmount) || 0;
    if (!newSubscription.description || amount <= 0) return;

    const sub: MonthlySubscriptionEntry = {
      id: `sub-${Date.now()}`,
      description: newSubscription.description,
      monthlyAmount: amount
    };

    setManualSubscriptions(prev => [...prev, sub]);
    setNewSubscription({ description: '', monthlyAmount: '' });
  };

  // Function to delete a subscription
  const deleteSubscription = (id: string) => {
    setManualSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  // Function to delete an imported file and its transactions
  const deleteImportedFile = (fileId: string) => {
    const file = importedFiles.find(f => f.id === fileId);
    if (file) {
      // Remove all transactions associated with this file
      setTransactions(prev => prev.filter(t => !file.transactionIds.includes(t.id)));
      // Remove the file from tracking
      setImportedFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  // Function to clear all transactions (for orphaned data cleanup)
  const clearAllTransactions = () => {
    setTransactions([]);
    setImportedFiles([]);
  };

  // Function to add a calendar task
  const addCalendarTask = () => {
    if (!selectedDate || !newTask.description.trim()) return;

    const task: CalendarTask = {
      id: `task-${Date.now()}`,
      date: selectedDate,
      description: newTask.description.trim(),
      type: newTask.type,
      completed: false
    };

    setCalendarTasks(prev => [...prev, task]);
    setNewTask({ description: '', type: 'pago' });
    setSelectedDate(null);
  };

  // Function to delete a calendar task
  const deleteCalendarTask = (id: string) => {
    setCalendarTasks(prev => prev.filter(t => t.id !== id));
  };

  // Function to toggle task completion status
  const toggleTaskCompleted = (id: string) => {
    setCalendarTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  // Function to export calendar tasks to ICS format for Google Calendar
  const exportToGoogleCalendar = () => {
    if (calendarTasks.length === 0) {
      alert('No hay tareas para exportar');
      return;
    }

    // Build ICS content using array to avoid whitespace issues
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//FinanceAI Pro//ES');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');

    calendarTasks.forEach(task => {
      const dateStr = task.date.replace(/-/g, '');
      const uid = task.id + '@financeai.local';
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const cleanDesc = task.description.replace(/[,;]/g, ' ');
      const typeLabel = task.type === 'pago' ? 'PAGO' : task.type === 'recordatorio' ? 'RECORDATORIO' : 'TAREA';

      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + uid);
      lines.push('DTSTAMP:' + now);
      lines.push('DTSTART;VALUE=DATE:' + dateStr);
      lines.push('SUMMARY:' + typeLabel + ' - ' + cleanDesc);
      lines.push('DESCRIPTION:' + cleanDesc);
      lines.push('STATUS:CONFIRMED');
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P1D');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Recordatorio');
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeai_pagos.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Function to generate Google Calendar URL for a single task
  const generateGoogleCalendarUrl = (task: CalendarTask): string => {
    const dateStr = task.date.replace(/-/g, '');
    const typeLabel = task.type === 'pago' ? '💳 PAGO' : task.type === 'recordatorio' ? '🔔 RECORDATORIO' : '📌 TAREA';
    const title = encodeURIComponent(`${typeLabel}: ${task.description}`);
    const details = encodeURIComponent(`Creado desde FinanceAI Pro\nTipo: ${task.type}\nDescripción: ${task.description}`);

    // Google Calendar URL format for all-day event
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
  };

  // Function to open Google Calendar with a task
  const addToGoogleCalendar = (task: CalendarTask) => {
    const url = generateGoogleCalendarUrl(task);
    window.open(url, '_blank');
  };

  // Function to add a savings project
  const addSavingsProject = () => {
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
    setNewProject({ name: '', targetAmount: '', targetDate: '' });
  };

  // Function to delete a savings project
  const deleteSavingsProject = (id: string) => {
    setSavingsProjects(prev => prev.filter(p => p.id !== id));
  };

  // Function to add a contribution to a project
  const addProjectContribution = (id: string, amount: number) => {
    if (amount <= 0) return;
    setSavingsProjects(prev => prev.map(p =>
      p.id === id ? { ...p, savedAmount: p.savedAmount + amount } : p
    ));
  };

  // Function to generate monthly PDF report - RETRO 80s FORMAL STYLE
  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    const today = new Date();
    const monthName = today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

    // === APP COLOR PALETTE (matching FinanceAI Pro UI) ===
    const colors = {
      // Background - matches app bg-[#F8FAFC]
      background: [248, 250, 252] as const,         // Slate-50
      // Content area - white cards
      contentBg: [255, 255, 255] as const,          // White
      // Primary accent - Indigo-600
      primaryIndigo: [79, 70, 229] as const,        // Indigo-600
      // Primary light - Indigo-50
      indigoLight: [238, 242, 255] as const,        // Indigo-50
      // Text colors
      textDark: [30, 41, 59] as const,              // Slate-800
      textMuted: [100, 116, 139] as const,          // Slate-500
      textLight: [148, 163, 184] as const,          // Slate-400
      // Lines and borders
      lineColor: [226, 232, 240] as const,          // Slate-200
      // Success/positive - Green
      greenSuccess: [34, 197, 94] as const,         // Green-500
      greenDark: [22, 163, 74] as const,            // Green-600
      // Error/negative - Red
      redError: [239, 68, 68] as const,             // Red-500
      redDark: [220, 38, 38] as const,              // Red-600
      // Orange warning
      orangeWarning: [234, 88, 12] as const,        // Orange-600
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === LIGHT BACKGROUND (matches app) ===
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // === WHITE CONTENT CARD ===
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, margin, contentWidth, contentHeight, 5, 5, 'F');
    // Subtle border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, margin, contentWidth, contentHeight, 5, 5, 'S');

    // === HEADER SECTION ===
    const headerY = 25;

    // Add the FinanceAI Pro logo image
    // The logo is approximately 184x164 pixels, we scale it to fit nicely
    const logoWidth = 45; // mm width for the logo
    const logoHeight = 12; // mm height to maintain aspect ratio
    doc.addImage(financeAILogo, 'PNG', 25, headerY, logoWidth, logoHeight);

    // Report info on the right side
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Reporte N°:', pageWidth - 70, headerY);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, pageWidth - 40, headerY);

    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Fecha:', pageWidth - 70, headerY + 8);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(today.toLocaleDateString('es-CL'), pageWidth - 40, headerY + 8);

    // === HORIZONTAL DIVIDER LINE ===
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(25, 60, pageWidth - 25, 60);

    // === REPORT TITLE ===
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.setFont('courier', 'bold');
    doc.text('REPORTE MENSUAL', 30, 72);
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), 30, 80);

    // === FINANCIAL SUMMARY SECTION ===
    const summaryY = 95;
    const balance = totalIncome - totalExpenses;

    // Section header
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Resumen Financiero', 30, summaryY);

    // Divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(30, summaryY + 3, 100, summaryY + 3);

    // Financial data in two columns
    const dataY = summaryY + 15;
    const labelX = 35;
    const valueX = pageWidth - 50;

    // Ingresos
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Ingresos del mes', labelX, dataY);
    doc.setTextColor(34, 197, 94); // Green-500
    doc.setFont('courier', 'bold');
    doc.text(`$${totalIncome.toLocaleString('es-CL')}`, valueX, dataY, { align: 'right' });

    // Gastos
    doc.setFont('courier', 'normal');
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Gastos del mes', labelX, dataY + 10);
    doc.setTextColor(239, 68, 68); // Red-500
    doc.setFont('courier', 'bold');
    doc.text(`$${totalExpenses.toLocaleString('es-CL')}`, valueX, dataY + 10, { align: 'right' });

    // Balance line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(labelX, dataY + 16, valueX, dataY + 16);

    // Balance
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Balance', labelX, dataY + 25);
    // Green for positive, Red for negative
    if (balance >= 0) {
      doc.setTextColor(34, 197, 94); // Green-500
    } else {
      doc.setTextColor(239, 68, 68); // Red-500
    }
    doc.text(`$${balance.toLocaleString('es-CL')}`, valueX, dataY + 25, { align: 'right' });

    // === FIXED EXPENSES SECTION ===
    const fixedY = dataY + 45;
    const creditTotal = creditOperations.reduce((s, c) => s + c.monthlyInstallment, 0);
    const subsTotal = manualSubscriptions.reduce((s, c) => s + c.monthlyAmount, 0);
    const fixedTotal = creditTotal + subsTotal;

    // Section header
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Gastos Fijos Mensuales', 30, fixedY);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(30, fixedY + 3, 110, fixedY + 3);

    // Table using autoTable with app styling
    autoTable(doc, {
      startY: fixedY + 8,
      head: [['Descripción', 'Monto']],
      body: [
        [`Cuotas de créditos (${creditOperations.length})`, `$${creditTotal.toLocaleString('es-CL')}`],
        [`Suscripciones (${manualSubscriptions.length})`, `$${subsTotal.toLocaleString('es-CL')}`],
      ],
      foot: [['Total gastos fijos', `$${fixedTotal.toLocaleString('es-CL')}`]],
      theme: 'plain',
      styles: {
        fillColor: [255, 255, 255], // White
        textColor: [30, 41, 59], // Slate-800
        fontSize: 10,
        cellPadding: 5,
        lineColor: [226, 232, 240], // Slate-200
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [238, 242, 255], // Indigo-50
        textColor: [79, 70, 229], // Indigo-600
        fontStyle: 'bold',
        fontSize: 9,
      },
      footStyles: {
        fillColor: [238, 242, 255], // Indigo-50
        textColor: [79, 70, 229], // Indigo-600
        fontStyle: 'bold',
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' },
      },
      margin: { left: 30, right: 30 },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // === SAVINGS PROJECTS SECTION ===
    if (savingsProjects.length > 0) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('Proyectos de Ahorro', 30, currentY);
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(30, currentY + 3, 105, currentY + 3);
      currentY += 12;

      savingsProjects.forEach((project, idx) => {
        const progress = (project.savedAmount / project.targetAmount) * 100;

        // Project name and amounts
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(`${idx + 1}. ${project.name}`, 35, currentY);

        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.setFontSize(9);
        const amountText = `$${project.savedAmount.toLocaleString('es-CL')} / $${project.targetAmount.toLocaleString('es-CL')} (${progress.toFixed(1)}%)`;
        doc.text(amountText, pageWidth - 40, currentY, { align: 'right' });

        currentY += 8;
      });
      currentY += 5;
    }

    // === UPCOMING PAYMENTS SECTION ===
    const upcomingTasks = calendarTasks.filter(t => {
      if (t.completed) return false;
      const taskDate = new Date(t.date + 'T12:00:00');
      const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return taskDate >= today && taskDate <= sevenDays;
    });

    if (upcomingTasks.length > 0 && currentY < pageHeight - 60) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(234, 88, 12); // Orange-600 (warning)
      doc.text('Pagos Próximos (7 días)', 30, currentY);
      doc.setDrawColor(234, 88, 12); // Orange-600
      doc.line(30, currentY + 3, 105, currentY + 3);
      currentY += 12;

      upcomingTasks.forEach(task => {
        const taskDate = new Date(task.date + 'T12:00:00');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(`• ${task.description}`, 35, currentY);
        doc.setTextColor(234, 88, 12); // Orange-600
        doc.text(taskDate.toLocaleDateString('es-CL'), pageWidth - 40, currentY, { align: 'right' });
        currentY += 7;
      });
    }

    // === FOOTER ===
    const footerY = pageHeight - 25;

    // Left side - contact info style
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('FinanceIA Pro', 30, footerY);
    doc.text('www.financeai.pro', 30, footerY + 5);

    // Center - timestamp
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Generado: ${today.toLocaleDateString('es-CL')}`, pageWidth / 2, footerY, { align: 'center' });

    // Right side - icon logo
    const iconSize = 10; // mm
    doc.addImage(financeAIIcon, 'PNG', pageWidth - 30, footerY - 2, iconSize, iconSize);

    // Save PDF
    doc.save(`reporte_financiero_${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}.pdf`);
  };

  // Derived Financial Data
  // Calculate income (abonos) and expenses (cargos) from imported transactions
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.isIncome === true)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter(t => t.isIncome === false || t.isIncome === undefined)
      .reduce((sum, t) => sum + (t.isInstallment ? (t.installmentValue || 0) : t.amount), 0);
  }, [transactions]);

  const health = useMemo(() => calculateFinancialHealth(transactions, totalIncome || 1), [transactions, totalIncome]);
  const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);
  const debts = useMemo(() => getDebtTimeline(transactions), [transactions]);
  const projection = useMemo(() => getCashFlowProjection(transactions), [transactions]);

  // Function to save current month data to savingsProjection
  const saveCurrentMonthData = useCallback(() => {
    // Get current month from transactions
    const monthsInTransactions = transactions
      .filter(t => t.date)
      .map(t => {
        const date = new Date(t.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })
      .filter((v, i, a) => a.indexOf(v) === i);

    if (monthsInTransactions.length === 0) return null;

    // Use the most common month in transactions
    const monthKey = monthsInTransactions[0];

    // Check if we already have data for this month
    const existingEntry = savingsProjection.find(p => p.monthKey === monthKey);
    if (existingEntry) return monthKey; // Already saved

    // Calculate current month data using same logic as budget tab
    const presupuestoAhorro = totalIncome * 0.20;

    const gastadoNecesidades = transactions
      .filter(t => t.category === CategoryType.NEED && !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const gastadoDeseos = transactions
      .filter(t => t.category === CategoryType.WANT && !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const ahorradoActual = transactions
      .filter(t => t.category === CategoryType.SAVINGS && !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const restanteAhorro = Math.max(0, presupuestoAhorro - ahorradoActual);

    const entry: SavingsProjectionEntry = {
      monthKey,
      usadoNecesidades: gastadoNecesidades,
      usadoDeseos: gastadoDeseos,
      restanteAhorro
    };

    setSavingsProjection(prev => [...prev, entry]);
    return monthKey;
  }, [transactions, totalIncome, savingsProjection]);

  const totalMonthlyExpenses = totalExpenses;

  const totalDebtBalance = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.remainingBalance, 0);
  }, [debts]);

  // Calculate total monthly fixed expenses (credit installments + subscriptions)
  const totalMonthlyFixedExpenses = useMemo(() => {
    const creditInstallments = creditOperations.reduce((sum, c) => sum + c.monthlyInstallment, 0);
    const subscriptions = manualSubscriptions.reduce((sum, s) => sum + s.monthlyAmount, 0);
    return creditInstallments + subscriptions;
  }, [creditOperations, manualSubscriptions]);

  // Available months for savings calculation (based on transactions)
  const availableSavingsMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const date = new Date(t.date);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    // Add current month
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Calculate savings data for a given month
  const calculateSavingsForMonth = useCallback((monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);

    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    let ingresos = 0;
    let necesidades = 0;
    let deseos = 0;
    let ahorroDirecto = 0;

    monthTransactions.forEach(t => {
      const amount = t.isInstallment ? (t.installmentValue || 0) : t.amount;
      if (t.isIncome) {
        ingresos += amount;
      } else if (t.category === CategoryType.NEED) {
        necesidades += amount;
      } else if (t.category === CategoryType.WANT) {
        deseos += amount;
      } else if (t.category === CategoryType.SAVINGS) {
        ahorroDirecto += amount;
      }
    });

    const ahorroReal = ingresos - necesidades - deseos;
    const tasaAhorro = ingresos > 0 ? (ahorroReal / ingresos) * 100 : 0;

    return { ingresos, necesidades, deseos, ahorroDirecto, ahorroReal, tasaAhorro, transactionCount: monthTransactions.length };
  }, [transactions]);

  // Calculate debt paydown projection (how debt decreases over time)
  const debtPaydownProjection = useMemo(() => {
    const months = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();

    // Get total pending balance from all credit operations
    let currentDebt = creditOperations.reduce((sum, c) => sum + c.pendingBalance, 0);
    const monthlyPayment = creditOperations.reduce((sum, c) => sum + c.monthlyInstallment, 0);

    // Project for 12 months or until debt is paid off
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = monthNames[monthDate.getMonth()];
      const year = monthDate.getFullYear().toString().slice(-2);

      months.push({
        month: `${monthName} '${year}`,
        amount: Math.max(0, currentDebt)
      });

      currentDebt -= monthlyPayment;
      if (currentDebt <= 0) break;
    }

    return months;
  }, [creditOperations]);

  // Calculate upcoming payments (next 7 days)
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return calendarTasks
      .filter(task => {
        if (task.completed) return false;
        const taskDate = new Date(task.date + 'T12:00:00');
        return taskDate >= today && taskDate <= sevenDaysFromNow;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [calendarTasks]);

  // Calculate cash flow projection for next 6 months
  const cashFlowProjection = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const months = [];

    // Monthly subscriptions (these are constant)
    const monthlySubscriptions = manualSubscriptions.reduce((s, c) => s + c.monthlyAmount, 0);

    // Monthly savings for projects
    const monthlySavings = savingsProjects
      .filter(p => p.savedAmount < p.targetAmount)
      .reduce((sum, p) => {
        const targetDate = new Date(p.targetDate);
        const monthsRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const remaining = p.targetAmount - p.savedAmount;
        return sum + (remaining / monthsRemaining);
      }, 0);

    // Estimate monthly income and variable expenses from transactions
    const avgMonthlyIncome = totalIncome > 0 ? totalIncome : 0;
    const avgMonthlyExpenses = totalExpenses > 0 ? totalExpenses : 0;

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = monthNames[monthDate.getMonth()];
      const year = monthDate.getFullYear().toString().slice(-2);

      // Calculate credit payments for this specific month
      // Only include credits that still have remaining installments after 'i' months
      const creditPaymentsForMonth = creditOperations.reduce((sum, credit) => {
        // If credit has more remaining installments than months passed, include it
        if (credit.remainingInstallments > i) {
          return sum + credit.monthlyInstallment;
        }
        return sum; // Credit will be paid off before this month
      }, 0);

      const totalGastos = avgMonthlyExpenses + creditPaymentsForMonth + monthlySubscriptions + monthlySavings;

      months.push({
        month: `${monthName} '${year}`,
        ingresos: Math.round(avgMonthlyIncome),
        gastos: Math.round(totalGastos),
        balance: Math.round(avgMonthlyIncome - totalGastos)
      });
    }

    return months;
  }, [creditOperations, manualSubscriptions, savingsProjects, totalIncome, totalExpenses]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory ? t.subCategory === filterCategory : true;
      const matchesType = filterType === 'todos' ? true : filterType === 'ingresos' ? t.isIncome === true : t.isIncome !== true;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, filterCategory, filterType]);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      map[t.subCategory] = (map[t.subCategory] || 0) + (t.isInstallment ? (t.installmentValue || 0) : t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <>
      {/* Welcome Modal for new users */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">¡Bienvenido a FinanceAI Pro!</h2>
              <p className="text-slate-500 mt-2">Ingresa tu nombre para personalizar tu experiencia</p>
            </div>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              disabled={!tempName.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comenzar
            </button>
          </div>
        </div>
      )}

      {/* Edit Name Popup */}
      {showEditName && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Cambiar nombre</h3>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder={userName}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditName(false); setTempName(''); }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveName}
                disabled={!tempName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F8FAFC] flex">
        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`w-72 bg-white border-r border-slate-100 p-8 flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <TrendingUp size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">FinanceAI<span className="text-indigo-600">Pro</span></span>
          </div>

          <nav className="space-y-2 flex-grow">
            {[
              { icon: LayoutDashboard, label: 'Resumen', tab: 'resumen' as TabType },
              { icon: Tag, label: 'Movimientos', tab: 'movimientos' as TabType },
              { icon: CreditCard, label: 'Presupuesto', tab: 'cuentas' as TabType },
              { icon: PieChartIcon, label: 'Análisis', tab: 'presupuesto' as TabType },
              { icon: Wallet, label: 'Créditos', tab: 'creditos' as TabType },
              { icon: Calendar, label: 'Calendario', tab: 'calendario' as TabType },
              { icon: Target, label: 'Proyectos', tab: 'proyectos' as TabType },
              { icon: Clock, label: 'Historial', tab: 'historial' as TabType },
              { icon: PiggyBank, label: 'Ahorro', tab: 'ahorro' as TabType },
              { icon: TrendingUp, label: 'Proyección', tab: 'proyeccion' as TabType },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveTab(item.tab);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.tab ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <item.icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.tab === 'calendario' && upcomingPayments.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {upcomingPayments.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <p className="text-xs opacity-60 mb-1">Plan Pro</p>
              <p className="text-sm font-semibold mb-3">Tu salud financiera está al 84%</p>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[84%]"></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow lg:ml-72 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {/* Header Section */}
          <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 lg:mb-10">
            <div className="flex items-start gap-3 w-full sm:w-auto">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex-shrink-0"
                aria-label="Abrir menú"
              >
                <Menu size={24} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || userName || 'Usuario'} 👋</h1>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setTempName(userName); setShowEditName(true); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                      title="Cambiar nombre"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                      title="Cerrar sesión"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 text-sm lg:text-base">Aquí tienes el análisis de tus finanzas para {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}.</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto">
              {importStatus && (
                <span className="text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 rounded-lg truncate max-w-[150px] sm:max-w-none">
                  {importStatus}
                </span>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-sm sm:text-base whitespace-nowrap ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">Importar Excel/PDF</span>
                <span className="sm:hidden">Importar</span>
              </button>
            </div>
          </header>

          {/* Tab Content */}
          {activeTab === 'resumen' && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
              <div className="p-6 bg-indigo-50 rounded-full mb-6">
                <FileSpreadsheet size={48} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Bienvenido a FinanceAI Pro!</h2>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                Importa tu archivo Excel del banco para comenzar a analizar tus finanzas.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
              >
                <FileSpreadsheet size={20} />
                Importar Excel/PDF
              </button>
            </div>
          )}

          {activeTab === 'resumen' && transactions.length > 0 && (
            <>
              {/* Top KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <ArrowDownCircle size={24} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Abonos</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Ingresos Estimados</p>
                  <h2 className="text-2xl font-bold text-slate-900">${totalIncome.toLocaleString('es-CL')}</h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <ArrowUpCircle size={24} />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Cargos</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Gastos Totales</p>
                  <h2 className="text-2xl font-bold text-slate-900">${totalExpenses.toLocaleString('es-CL')}</h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                      <CreditCard size={24} />
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">Mensual</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Gastos Fijos Mensuales</p>
                  <h2 className="text-2xl font-bold text-slate-900">${totalMonthlyFixedExpenses.toLocaleString('es-CL')}</h2>
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Cuotas créditos ({creditOperations.length})</span>
                      <span className="font-medium text-slate-700">${creditOperations.reduce((s, c) => s + c.monthlyInstallment, 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Suscripciones ({manualSubscriptions.length})</span>
                      <span className="font-medium text-slate-700">${manualSubscriptions.reduce((s, c) => s + c.monthlyAmount, 0).toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Payments Alert */}
              {upcomingPayments.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-6 border border-orange-200 shadow-sm mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl animate-pulse">
                        <Clock size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-800 text-lg">⚠️ Pagos Próximos</h3>
                        <p className="text-sm text-orange-600">{upcomingPayments.length} pago{upcomingPayments.length !== 1 ? 's' : ''} en los próximos 7 días</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('calendario')}
                      className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-all text-sm font-medium"
                    >
                      Ver Calendario
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcomingPayments.slice(0, 3).map(task => {
                      const taskDate = new Date(task.date + 'T12:00:00');
                      const daysUntil = Math.ceil((taskDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={task.id} className="bg-white/80 rounded-xl p-4 flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${task.type === 'pago' ? 'bg-red-100' : task.type === 'recordatorio' ? 'bg-amber-100' : 'bg-blue-100'
                            }`}>
                            {task.type === 'pago' ? '💳' : task.type === 'recordatorio' ? '🔔' : '📌'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 text-sm">{task.description}</p>
                            <p className="text-xs text-orange-600 font-medium">
                              {daysUntil === 0 ? '¡Hoy!' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cash Flow Projection Chart + Export Button */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Flujo de Caja Proyectado</h3>
                        <p className="text-xs text-slate-500">Próximos 6 meses</p>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={cashFlowProjection}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, '']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Area type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" name="Ingresos" />
                      <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" name="Gastos" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-xs text-slate-600">Ingresos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-600">Gastos Proyectados</span>
                    </div>
                  </div>
                </div>

                {/* Export Report Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
                      <FileText size={28} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Reporte Mensual</h3>
                    <p className="text-indigo-100 text-sm mb-4">
                      Descarga un PDF con el resumen completo de tus finanzas del mes, incluyendo gastos, créditos y proyectos.
                    </p>
                  </div>
                  <button
                    onClick={generateMonthlyReport}
                    className="w-full py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Exportar PDF
                  </button>
                </div>
              </div>

              {/* Imported Files Management */}
              {(importedFiles.length > 0 || transactions.length > 0) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Gestión de Datos</h3>
                        <p className="text-xs text-slate-500">
                          {importedFiles.length > 0
                            ? `${importedFiles.length} archivo${importedFiles.length !== 1 ? 's' : ''} • ${transactions.length} transacciones`
                            : `${transactions.length} transacciones cargadas`
                          }
                        </p>
                      </div>
                    </div>
                    {/* Clear all button */}
                    <button
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de que deseas eliminar TODAS las transacciones? Esta acción no se puede deshacer.')) {
                          clearAllTransactions();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Limpiar Todo
                    </button>
                  </div>

                  {/* Warning for orphaned transactions */}
                  {importedFiles.length === 0 && transactions.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-700">
                        ⚠️ Hay transacciones sin cartola asociada. Usa "Limpiar Todo" para reiniciar o importa nuevas cartolas.
                      </p>
                    </div>
                  )}

                  {/* File list */}
                  {importedFiles.length > 0 && (
                    <div className="space-y-3">
                      {importedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${file.type === 'excel' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {file.type === 'excel' ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{file.name}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>{file.transactionCount} transacciones</span>
                                <span>•</span>
                                <span>{new Date(file.importDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteImportedFile(file.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Eliminar cartola y sus transacciones"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 auto-rows-auto">

                {/* Health Gauge - Col 1 */}
                <BentoCard title="Salud Financiera" subtitle="Basado en regla 50/30/20" className="md:col-span-1">
                  <FinancialHealthGauge score={health.score} />
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Necesidades (Meta 50%)</span>
                      <span className={health.needPct > 50 ? "text-red-500" : "text-green-600"}>{health.needPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, health.needPct)}%` }}></div>
                    </div>
                  </div>
                </BentoCard>

                {/* Projection Area Chart - Col 2-3 */}
                <BentoCard title="Proyección de Deuda" subtitle="Reducción del saldo pendiente con pagos mensuales" className="md:col-span-2">
                  {creditOperations.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <TrendingUp size={40} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No hay operaciones a crédito</p>
                        <p className="text-xs mt-1">Agrégalas en la pestaña Créditos</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={debtPaydownProjection}>
                          <defs>
                            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Saldo Pendiente']}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDebt)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </BentoCard>

                {/* Subscriptions Widget - Col 1 */}
                <BentoCard title="Suscripciones Activas" subtitle="Pagos mensuales registrados" icon={<Repeat size={18} className="text-indigo-600" />}>
                  <div className="space-y-4">
                    {manualSubscriptions.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">
                        <Repeat size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay suscripciones registradas</p>
                        <p className="text-xs mt-1">Agrégalas en la pestaña Créditos</p>
                      </div>
                    ) : (
                      manualSubscriptions.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 group hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 text-xs font-bold text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100">
                              {sub.description.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{sub.description}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">MENSUAL</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-900">${sub.monthlyAmount.toLocaleString('es-CL')}</p>
                        </div>
                      ))
                    )}
                    {manualSubscriptions.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Total mensual</span>
                          <span className="text-sm font-bold text-indigo-600">
                            ${manualSubscriptions.reduce((sum, s) => sum + s.monthlyAmount, 0).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </BentoCard>

                {/* Category Distribution - Col 2 */}
                <BentoCard title="Gastos por Categoría" subtitle="Haz click para filtrar" className="md:col-span-1">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categorySpending} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11, fontWeight: 500 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} onClick={(data) => setFilterCategory(data.name === filterCategory ? null : data.name)}>
                          {categorySpending.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={filterCategory === entry.name ? '#4f46e5' : '#e2e8f0'} className="cursor-pointer hover:fill-indigo-400 transition-colors" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </BentoCard>

                {/* Pagos del Mes - Col 3 */}
                <BentoCard title="Pagos del Mes" subtitle="Tareas programadas del mes" icon={<Calendar size={18} className="text-indigo-600" />}>
                  <div className="space-y-4">
                    {/* Month Selector */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={16} className="text-slate-500" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 capitalize">
                        {currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors rotate-180"
                      >
                        <ChevronLeft size={16} className="text-slate-500" />
                      </button>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {calendarTasks
                        .filter(t => {
                          const taskDate = new Date(t.date + 'T12:00:00');
                          return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
                        })
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .length === 0 ? (
                        <div className="text-center py-4 text-slate-400">
                          <Calendar size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Sin pagos programados</p>
                        </div>
                      ) : (
                        calendarTasks
                          .filter(t => {
                            const taskDate = new Date(t.date + 'T12:00:00');
                            return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
                          })
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                              <div className="text-center min-w-[36px]">
                                <p className="text-lg font-bold text-indigo-600">
                                  {new Date(task.date + 'T12:00:00').getDate()}
                                </p>
                              </div>
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${task.type === 'pago' ? 'bg-red-100' :
                                task.type === 'recordatorio' ? 'bg-amber-100' : 'bg-blue-100'
                                }`}>
                                {task.type === 'pago' ? '💳' : task.type === 'recordatorio' ? '🔔' : '📌'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">{task.description}</p>
                                <p className="text-[10px] text-slate-400 capitalize">{task.type}</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Summary */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Total programados:</span>
                        <span className="font-semibold text-indigo-600">
                          {calendarTasks.filter(t => {
                            const taskDate = new Date(t.date + 'T12:00:00');
                            return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
                          }).length} pagos
                        </span>
                      </div>
                    </div>
                  </div>
                </BentoCard>

                {/* Debt Timeline - Full Width Row */}
                <BentoCard title="Operaciones a Crédito" subtitle="Calendario proyectado de fin de pagos" className="md:col-span-3">
                  {creditOperations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <CreditCard size={40} className="mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No hay operaciones a crédito registradas</p>
                      <p className="text-xs mt-1">Agrégalas en la pestaña Créditos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {creditOperations.map((credit) => {
                        // Calculate end date based on remaining installments
                        const endDate = new Date();
                        endDate.setMonth(endDate.getMonth() + credit.remainingInstallments);
                        const endDateStr = endDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
                        const progress = (credit.paidInstallments / credit.totalInstallments) * 100;

                        return (
                          <div key={credit.id} className="relative p-5 rounded-2xl border border-slate-100 bg-white overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-slate-800">{credit.description}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                CUOTA {credit.paidInstallments}/{credit.totalInstallments}
                              </span>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Saldo Pendiente</span>
                                <span className="font-semibold text-slate-800">${credit.pendingBalance.toLocaleString('es-CL')}</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <Clock size={12} />
                              <span>Finaliza en: <strong className="text-slate-800">{endDateStr}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </BentoCard>
              </div>

              {/* Dynamic Transaction List */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-xl text-slate-900">Movimientos Recientes</h3>
                    {filterCategory && (
                      <button
                        onClick={() => setFilterCategory(null)}
                        className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100"
                      >
                        {filterCategory} <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Filtros por tipo */}
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setFilterType('todos')}
                        className={`px-3 py-2 text-xs font-medium transition-all ${filterType === 'todos' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFilterType('ingresos')}
                        className={`px-3 py-2 text-xs font-medium border-l border-slate-200 transition-all ${filterType === 'ingresos' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        💰 Ingresos
                      </button>
                      <button
                        onClick={() => setFilterType('gastos')}
                        className={`px-3 py-2 text-xs font-medium border-l border-slate-200 transition-all ${filterType === 'gastos' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        💸 Gastos
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar transacción..."
                        className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 font-semibold text-slate-500 text-sm">Concepto</th>
                        <th className="pb-4 font-semibold text-slate-500 text-sm">Categoría</th>
                        <th className="pb-4 font-semibold text-slate-500 text-sm">Tipo</th>
                        <th className="pb-4 font-semibold text-slate-500 text-sm">Fecha</th>
                        <th className="pb-4 font-semibold text-slate-500 text-sm text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-medium text-slate-800">{t.description}</td>
                          <td className="py-4">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{t.subCategory}</span>
                          </td>
                          <td className="py-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${t.isInstallment ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}>
                              {t.isInstallment ? 'Cuotas' : 'Débito'}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-slate-500">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                          <td className="py-4 text-right font-bold text-slate-900">
                            ${(t.isInstallment ? t.installmentValue : t.amount)?.toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'movimientos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Clasificar Movimientos</h2>
                  <p className="text-slate-500 text-sm mt-1">Asigna una categoría a cada transacción</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar movimiento..."
                      className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Category Legend */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-3 font-medium">CATEGORÍAS DISPONIBLES</p>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <div key={cat.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg">
                      <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`}></div>
                      <span className="text-xs font-medium text-slate-600">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions List */}
              {transactions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
                  <Tag size={48} className="mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No hay movimientos</h3>
                  <p className="text-slate-500 text-sm">Importa una cartola para comenzar a clasificar</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    {filteredTransactions
                      .filter(t => !t.isIncome) // Only show expenses
                      .map((t) => {
                        const currentCategory = EXPENSE_CATEGORIES.find(c => c.name === t.subCategory);

                        return (
                          <div key={t.id} className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            {/* Transaction Info */}
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentCategory ? currentCategory.color : 'bg-slate-200'}`}>
                                  {currentCategory ? (
                                    <currentCategory.icon size={20} className="text-white" />
                                  ) : (
                                    <Tag size={20} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 truncate">{t.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{new Date(t.date).toLocaleDateString('es-CL')}</span>
                                    <span>•</span>
                                    <span className="font-semibold text-slate-700">${t.amount.toLocaleString('es-CL')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Category Selector */}
                            <div className="flex items-center gap-2">
                              <select
                                value={currentCategory?.name || ''}
                                onChange={(e) => updateTransactionExpenseCategory(t.id, e.target.value)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${currentCategory
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}
                              >
                                <option value="">Sin categoría</option>
                                {EXPENSE_CATEGORIES.map(cat => (
                                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                              </select>
                              {currentCategory && (
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                  <Check size={14} className="text-green-600" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {transactions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Total Movimientos</p>
                    <p className="text-xl font-bold text-slate-900">{transactions.filter(t => !t.isIncome).length}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Clasificados</p>
                    <p className="text-xl font-bold text-green-600">
                      {transactions.filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory)).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Sin Clasificar</p>
                    <p className="text-xl font-bold text-amber-600">
                      {transactions.filter(t => !t.isIncome && !EXPENSE_CATEGORIES.some(c => c.name === t.subCategory)).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Progreso</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {transactions.filter(t => !t.isIncome).length > 0
                        ? Math.round((transactions.filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory)).length / transactions.filter(t => !t.isIncome).length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              )}

              {/* Pie Chart - Category Distribution */}
              {transactions.filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory)).length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Distribución por Categoría</h3>
                  <p className="text-sm text-slate-500 mb-6">Gastos clasificados por tipo</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              const categoryTotals: Record<string, number> = {};
                              transactions
                                .filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory))
                                .forEach(t => {
                                  categoryTotals[t.subCategory] = (categoryTotals[t.subCategory] || 0) + t.amount;
                                });
                              return Object.entries(categoryTotals).map(([name, value]) => ({
                                name,
                                value,
                                color: EXPENSE_CATEGORIES.find(c => c.name === name)?.color.replace('bg-', '#').replace('-500', '') || '#64748b'
                              }));
                            })()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {(() => {
                              const categoryTotals: Record<string, number> = {};
                              transactions
                                .filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory))
                                .forEach(t => {
                                  categoryTotals[t.subCategory] = (categoryTotals[t.subCategory] || 0) + t.amount;
                                });
                              const COLORS = ['#22c55e', '#ef4444', '#a855f7', '#3b82f6', '#06b6d4', '#6366f1', '#ec4899', '#f97316', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#d946ef', '#64748b'];
                              return Object.keys(categoryTotals).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ));
                            })()}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Monto']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend with amounts */}
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 font-medium mb-3">DETALLE POR CATEGORÍA</p>
                      {(() => {
                        const categoryTotals: Record<string, number> = {};
                        transactions
                          .filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory))
                          .forEach(t => {
                            categoryTotals[t.subCategory] = (categoryTotals[t.subCategory] || 0) + t.amount;
                          });
                        const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
                        const COLORS = ['#22c55e', '#ef4444', '#a855f7', '#3b82f6', '#06b6d4', '#6366f1', '#ec4899', '#f97316', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#d946ef', '#64748b'];

                        return Object.entries(categoryTotals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([name, value], index) => (
                            <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="text-sm font-medium text-slate-700">{name}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">${value.toLocaleString('es-CL')}</p>
                                <p className="text-xs text-slate-500">{((value / total) * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          ));
                      })()}

                      {/* Total */}
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-4">
                        <span className="text-sm font-bold text-indigo-700">Total Clasificado</span>
                        <span className="text-lg font-bold text-indigo-700">
                          ${transactions
                            .filter(t => !t.isIncome && EXPENSE_CATEGORIES.some(c => c.name === t.subCategory))
                            .reduce((sum, t) => sum + t.amount, 0)
                            .toLocaleString('es-CL')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cuentas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Categorizar Gastos</h2>
                <div className="flex gap-4">
                  <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                    <span className="text-xs text-blue-600">Necesidades: </span>
                    <span className="font-bold text-blue-700">${health.totals[CategoryType.NEED].toLocaleString('es-CL')}</span>
                  </div>
                  <div className="bg-purple-50 px-3 py-1.5 rounded-lg">
                    <span className="text-xs text-purple-600">Deseos: </span>
                    <span className="font-bold text-purple-700">${health.totals[CategoryType.WANT].toLocaleString('es-CL')}</span>
                  </div>
                  <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                    <span className="text-xs text-green-600">Ahorro: </span>
                    <span className="font-bold text-green-700">${health.totals[CategoryType.SAVINGS].toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              {/* Presupuesto disponible */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Necesidades (50%)</p>
                    <p className="text-sm font-bold text-blue-600">${(totalIncome * 0.50).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                    {(() => {
                      const presupuesto = totalIncome * 0.50;
                      const gastado = health.totals[CategoryType.NEED] || 0;
                      const disponible = presupuesto - gastado;
                      return (
                        <>
                          <p className="text-xs mt-1 text-orange-600">
                            Usado: ${gastado.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs ${disponible >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {disponible >= 0
                              ? `Disponible: $${disponible.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                              : `Excedido: $${Math.abs(disponible).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                            }
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Deseos (30%)</p>
                    <p className="text-sm font-bold text-purple-600">${(totalIncome * 0.30).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                    {(() => {
                      const presupuesto = totalIncome * 0.30;
                      const gastado = health.totals[CategoryType.WANT] || 0;
                      const disponible = presupuesto - gastado;
                      return (
                        <>
                          <p className="text-xs mt-1 text-orange-600">
                            Usado: ${gastado.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs ${disponible >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {disponible >= 0
                              ? `Disponible: $${disponible.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                              : `Excedido: $${Math.abs(disponible).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                            }
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ahorro (20%)</p>
                    <p className="text-sm font-bold text-green-600">${(totalIncome * 0.20).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                    {(() => {
                      const presupuestoAhorro = totalIncome * 0.20;
                      const gastadoDeAhorros = health.totals[CategoryType.SAVINGS] || 0;
                      const ahorroRestante = presupuestoAhorro - gastadoDeAhorros;
                      return (
                        <>
                          <p className="text-xs mt-1 text-orange-600">
                            Usado: ${gastadoDeAhorros.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs ${ahorroRestante >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ahorroRestante >= 0
                              ? `Restante: $${ahorroRestante.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                              : `Excedido: $${Math.abs(ahorroRestante).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                            }
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Tabla de gastos para categorizar */}
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase">
                    <div className="col-span-1">Fecha</div>
                    <div className="col-span-4">Concepto</div>
                    <div className="col-span-2 text-right">Monto</div>
                    <div className="col-span-5 text-center">Categoría 50/30/20</div>
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {transactions.filter(t => !t.isIncome).length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p>No hay gastos para categorizar.</p>
                      <p className="text-sm mt-2">Importa un archivo Excel para comenzar.</p>
                    </div>
                  ) : (
                    transactions
                      .filter(t => !t.isIncome)
                      .map(t => (
                        <div key={t.id} className={`grid grid-cols-12 gap-4 items-center p-4 border-b border-slate-50 ${!t.category ? 'bg-yellow-50' : 'hover:bg-slate-25'}`}>
                          <div className="col-span-1 text-xs text-slate-500">
                            {typeof t.date === 'string' && t.date.includes('-')
                              ? new Date(t.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                              : t.date}
                          </div>
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="font-bold text-slate-900">${t.amount.toLocaleString('es-CL')}</span>
                          </div>
                          <div className="col-span-5 flex justify-center gap-2">
                            <button
                              onClick={() => updateTransactionCategory(t.id, CategoryType.NEED)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.category === CategoryType.NEED
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                            >
                              50% Necesidad
                            </button>
                            <button
                              onClick={() => updateTransactionCategory(t.id, CategoryType.WANT)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.category === CategoryType.WANT
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                }`}
                            >
                              30% Deseo
                            </button>
                            <button
                              onClick={() => updateTransactionCategory(t.id, CategoryType.SAVINGS)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.category === CategoryType.SAVINGS
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                            >
                              20% Ahorro
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presupuesto' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Presupuesto 50/30/20</h2>
                <div className="bg-green-50 px-4 py-2 rounded-xl">
                  <span className="text-sm text-green-600 font-medium">Ingresos: </span>
                  <span className="text-lg font-bold text-green-700">${totalIncome.toLocaleString('es-CL')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Necesidades - 50% */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Target size={24} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Necesidades</p>
                      <p className="text-xs text-slate-400">Meta: 50%</p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-blue-600 mb-2">${(totalIncome * 0.50).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</h3>
                  <div className="w-full bg-slate-100 h-2 rounded-full">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '50%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Arriendo, servicios, alimentación básica</p>
                </div>

                {/* Deseos - 30% */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                      <Target size={24} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Deseos</p>
                      <p className="text-xs text-slate-400">Meta: 30%</p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-purple-600 mb-2">${(totalIncome * 0.30).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</h3>
                  <div className="w-full bg-slate-100 h-2 rounded-full">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: '30%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Entretenimiento, salidas, compras</p>
                </div>

                {/* Ahorro - 20% */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <Target size={24} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Ahorro</p>
                      <p className="text-xs text-slate-400">Meta: 20%</p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">${(totalIncome * 0.20).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</h3>
                  <div className="w-full bg-slate-100 h-2 rounded-full">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Fondo de emergencia, inversiones</p>
                </div>
              </div>

              {/* Resumen vs Gastos Reales - Regla 50/30/20 */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Comparación: Presupuesto vs Gastos Reales</h3>
                <p className="text-sm text-slate-500 mb-4">Basado en la regla 50/30/20</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {/* Necesidades - Meta 50% - AZUL (igual que Presupuesto) */}
                    <div className={`p-3 rounded-xl ${health.needPct <= 50 ? 'bg-blue-50' : 'bg-red-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                          <Target size={14} />
                        </div>
                        <span className="text-slate-700 font-medium">Necesidades (Meta 50%)</span>
                        <span className={`ml-auto text-sm font-bold ${health.needPct <= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                          {health.needPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Real: ${(health.totals[CategoryType.NEED] || 0).toLocaleString('es-CL')}</span>
                        <span className="text-slate-500">Límite: ${(totalIncome * 0.50).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${health.needPct <= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, (health.needPct / 50) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Deseos - Meta 30% - MORADO (igual que Presupuesto) */}
                    <div className={`p-3 rounded-xl ${health.wantPct <= 30 ? 'bg-purple-50' : 'bg-orange-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                          <Target size={14} />
                        </div>
                        <span className="text-slate-700 font-medium">Deseos (Meta 30%)</span>
                        <span className={`ml-auto text-sm font-bold ${health.wantPct <= 30 ? 'text-purple-600' : 'text-orange-600'}`}>
                          {health.wantPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Real: ${(health.totals[CategoryType.WANT] || 0).toLocaleString('es-CL')}</span>
                        <span className="text-slate-500">Límite: ${(totalIncome * 0.30).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${health.wantPct <= 30 ? 'bg-purple-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(100, (health.wantPct / 30) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Ahorro - Meta 20% - VERDE (igual que Presupuesto) */}
                    {(() => {
                      const savingsAmount = health.totals[CategoryType.SAVINGS] || 0;
                      const savingsPct = (savingsAmount / (totalIncome || 1)) * 100;
                      return (
                        <div className={`p-3 rounded-xl ${savingsPct >= 20 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                              <Target size={14} />
                            </div>
                            <span className="text-slate-700 font-medium">Ahorro (Meta 20%)</span>
                            <span className={`ml-auto text-sm font-bold ${savingsPct >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                              {savingsPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Real: ${savingsAmount.toLocaleString('es-CL')}</span>
                            <span className="text-slate-500">Meta: ${(totalIncome * 0.20).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                            <div
                              className={`h-full rounded-full transition-all ${savingsPct >= 20 ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${Math.min(100, (savingsAmount / (totalIncome * 0.20 || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { name: 'Necesidades', real: health.totals[CategoryType.NEED] || 0, meta: totalIncome * 0.50 },
                        { name: 'Deseos', real: health.totals[CategoryType.WANT] || 0, meta: totalIncome * 0.30 },
                        { name: 'Ahorro', real: health.totals[CategoryType.SAVINGS] || 0, meta: totalIncome * 0.20 },
                      ]} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={85} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, '']} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="real" name="Gasto Real" radius={[0, 4, 4, 0]}>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                          <Cell fill="#22c55e" />
                        </Bar>
                        <Bar dataKey="meta" name="Meta 50/30/20" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Distribución actual de gastos */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Distribución de Gastos por Categoría</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorySpending.slice(0, 8)} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={150} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Gasto']} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Créditos Tab */}
          {activeTab === 'creditos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Operaciones a Crédito</h2>

              {/* Form to add new credit */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Agregar Nueva Operación</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Descripción de la Compra</label>
                    <input
                      type="text"
                      value={newCredit.description}
                      onChange={(e) => setNewCredit(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ej: iPhone 15 Pro"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto Total</label>
                    <input
                      type="number"
                      value={newCredit.totalAmount}
                      onChange={(e) => setNewCredit(prev => ({ ...prev, totalAmount: e.target.value }))}
                      placeholder="$1.000.000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">N° de Cuotas</label>
                    <input
                      type="number"
                      value={newCredit.totalInstallments}
                      onChange={(e) => setNewCredit(prev => ({ ...prev, totalInstallments: e.target.value }))}
                      placeholder="12"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Cuotas Pagadas</label>
                    <input
                      type="number"
                      value={newCredit.paidInstallments}
                      onChange={(e) => setNewCredit(prev => ({ ...prev, paidInstallments: e.target.value }))}
                      placeholder="3"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addCreditOperation}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <PlusCircle size={18} />
                  Agregar Crédito
                </button>
              </div>

              {/* Credit operations table */}
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-yellow-50">
                  <div className="grid grid-cols-8 gap-2 text-xs font-semibold text-slate-700">
                    <div className="col-span-2">Descripción de la Compra</div>
                    <div className="text-right">Monto Total</div>
                    <div className="text-center">N° Cuotas</div>
                    <div className="text-right">Valor Cuota</div>
                    <div className="text-center">Pagadas</div>
                    <div className="text-center">Restantes</div>
                    <div className="text-right">Saldo Pendiente</div>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {creditOperations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p>No hay créditos registrados.</p>
                      <p className="text-sm mt-2">Agrega tus compras a cuotas usando el formulario.</p>
                    </div>
                  ) : (
                    creditOperations.map(c => (
                      <div key={c.id} className="grid grid-cols-8 gap-2 items-center p-4 border-b border-slate-50 hover:bg-slate-25 group">
                        <div className="col-span-2 flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{c.description}</p>
                          <button
                            onClick={() => deleteCreditOperation(c.id)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">${c.totalAmount.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-slate-600">{c.totalInstallments}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-indigo-600">${c.monthlyInstallment.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="text-center flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateCreditInstallments(c.id, -1)}
                            disabled={c.paidInstallments <= 0}
                            className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all"
                          >
                            −
                          </button>
                          <span className="text-green-600 font-medium w-8">{c.paidInstallments}</span>
                          <button
                            onClick={() => updateCreditInstallments(c.id, 1)}
                            disabled={c.paidInstallments >= c.totalInstallments}
                            className="w-6 h-6 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-center">
                          <span className="text-orange-600 font-medium">{c.remainingInstallments}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-red-600">${c.pendingBalance.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {creditOperations.length > 0 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-8 gap-2 text-sm">
                      <div className="col-span-2 font-bold text-slate-700">TOTALES</div>
                      <div className="text-right font-bold text-slate-900">
                        ${creditOperations.reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString('es-CL')}
                      </div>
                      <div></div>
                      <div className="text-right font-bold text-indigo-600">
                        ${creditOperations.reduce((sum, c) => sum + c.monthlyInstallment, 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </div>
                      <div></div>
                      <div></div>
                      <div className="text-right font-bold text-red-600">
                        ${creditOperations.reduce((sum, c) => sum + c.pendingBalance, 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suscripciones Activas Mensuales */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 mt-6">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Suscripciones Activas Mensuales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Descripción del Servicio</label>
                    <input
                      type="text"
                      value={newSubscription.description}
                      onChange={(e) => setNewSubscription(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ej: Netflix, Spotify, Gimnasio"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto Mensual</label>
                    <input
                      type="number"
                      value={newSubscription.monthlyAmount}
                      onChange={(e) => setNewSubscription(prev => ({ ...prev, monthlyAmount: e.target.value }))}
                      placeholder="$9.990"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addSubscription}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <PlusCircle size={18} />
                  Agregar Suscripción
                </button>
              </div>

              {/* Subscriptions table */}
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-purple-50">
                  <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
                    <div className="col-span-2">Servicio / Suscripción</div>
                    <div className="text-right">Monto Mensual</div>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {manualSubscriptions.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <p>No hay suscripciones registradas.</p>
                      <p className="text-sm mt-2">Agrega tus servicios mensuales usando el formulario.</p>
                    </div>
                  ) : (
                    manualSubscriptions.map(s => (
                      <div key={s.id} className="grid grid-cols-3 gap-4 items-center p-4 border-b border-slate-50 hover:bg-slate-25 group">
                        <div className="col-span-2 flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800">{s.description}</p>
                          <button
                            onClick={() => deleteSubscription(s.id)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-purple-600">${s.monthlyAmount.toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {manualSubscriptions.length > 0 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="col-span-2 font-bold text-slate-700">TOTAL MENSUAL</div>
                      <div className="text-right font-bold text-purple-600">
                        ${manualSubscriptions.reduce((sum, s) => sum + s.monthlyAmount, 0).toLocaleString('es-CL')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Calendario de Pagos</h2>
                  <p className="text-slate-500 text-sm mt-1">Programa tus pagos y recordatorios</p>
                </div>
                <button
                  onClick={exportToGoogleCalendar}
                  disabled={calendarTasks.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Exportar a Google Calendar
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <ChevronLeft size={20} className="text-slate-600" />
                    </button>
                    <h3 className="text-lg font-bold text-slate-800 capitalize">
                      {currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors rotate-180"
                    >
                      <ChevronLeft size={20} className="text-slate-600" />
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const startPadding = (firstDay.getDay() + 6) % 7; // Adjust for Monday start
                      const days = [];

                      // Empty cells for padding
                      for (let i = 0; i < startPadding; i++) {
                        days.push(<div key={`pad-${i}`} className="h-12"></div>);
                      }

                      // Actual days
                      for (let day = 1; day <= lastDay.getDate(); day++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const tasksForDay = calendarTasks.filter(t => t.date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isSelected = selectedDate === dateStr;

                        days.push(
                          <button
                            key={day}
                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                            className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all relative ${isSelected
                              ? 'bg-indigo-600 text-white'
                              : isToday
                                ? 'bg-indigo-50 text-indigo-600 font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                              }`}
                          >
                            <span className="text-sm font-medium">{day}</span>
                            {tasksForDay.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {tasksForDay.slice(0, 3).map((t, i) => (
                                  <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full ${t.type === 'pago' ? 'bg-red-500' : t.type === 'recordatorio' ? 'bg-amber-500' : 'bg-blue-500'
                                      } ${isSelected ? 'opacity-80' : ''}`}
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      }

                      return days;
                    })()}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-600">Pago</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-xs text-slate-600">Recordatorio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-slate-600">Otro</span>
                    </div>
                  </div>
                </div>

                {/* Add Task Panel */}
                <div className="space-y-6">
                  {/* Add Task Form */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-4">
                      {selectedDate
                        ? `Agregar tarea - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
                        : 'Selecciona un día'
                      }
                    </h3>

                    {selectedDate ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Ej: Pago tarjeta de crédito"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        />
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newTask.type}
                          onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value as 'pago' | 'recordatorio' | 'otro' }))}
                        >
                          <option value="pago">💳 Pago</option>
                          <option value="recordatorio">🔔 Recordatorio</option>
                          <option value="otro">📌 Otro</option>
                        </select>
                        <button
                          onClick={addCalendarTask}
                          disabled={!newTask.description.trim()}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Plus size={18} />
                          Agregar Tarea
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Calendar size={40} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Haz clic en un día del calendario para agregar una tarea</p>
                      </div>
                    )}
                  </div>

                  {/* Tasks for selected date */}
                  {selectedDate && calendarTasks.filter(t => t.date === selectedDate).length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4">Tareas del día</h3>
                      <div className="space-y-2">
                        {calendarTasks
                          .filter(t => t.date === selectedDate)
                          .map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${task.type === 'pago' ? 'bg-red-100 text-red-600' :
                                  task.type === 'recordatorio' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                  {task.type === 'pago' ? '💳' : task.type === 'recordatorio' ? '🔔' : '📌'}
                                </div>
                                <span className="text-sm font-medium text-slate-700">{task.description}</span>
                              </div>
                              <button
                                onClick={() => deleteCalendarTask(task.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* All Tasks List */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Tareas del Mes</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                </p>

                {calendarTasks.filter(t => {
                  const taskDate = new Date(t.date);
                  return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
                }).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No hay tareas programadas para este mes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calendarTasks
                      .filter(t => {
                        const taskDate = new Date(t.date);
                        return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
                      })
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(task => (
                        <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl group hover:bg-slate-100 transition-colors ${task.completed ? 'bg-green-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-4">
                            {/* Completion Checkbox */}
                            <button
                              onClick={() => toggleTaskCompleted(task.id)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-slate-300 hover:border-indigo-400'
                                }`}
                            >
                              {task.completed && <Check size={14} />}
                            </button>
                            <div className="text-center min-w-[50px]">
                              <p className={`text-2xl font-bold ${task.completed ? 'text-green-600' : 'text-indigo-600'}`}>
                                {new Date(task.date + 'T12:00:00').getDate()}
                              </p>
                              <p className="text-xs text-slate-500 capitalize">
                                {new Date(task.date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short' })}
                              </p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.completed ? 'bg-green-100 opacity-60' :
                              task.type === 'pago' ? 'bg-red-100' :
                                task.type === 'recordatorio' ? 'bg-amber-100' : 'bg-blue-100'
                              }`}>
                              {task.completed ? '✅' : task.type === 'pago' ? '💳' : task.type === 'recordatorio' ? '🔔' : '📌'}
                            </div>
                            <div>
                              <p className={`font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.description}</p>
                              <p className="text-xs text-slate-500 capitalize">
                                {task.completed ? '✓ Completado' : task.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!task.completed && (
                              <button
                                onClick={() => addToGoogleCalendar(task)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                title="Agregar a Google Calendar"
                              >
                                <Calendar size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteCalendarTask(task.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Proyectos de Ahorro Tab */}
          {activeTab === 'proyectos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">🎯 Proyectos de Ahorro</h2>
              </div>

              {/* Form to add new project */}
              <BentoCard>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Nuevo Proyecto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">Nombre del Proyecto</label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Ej: Viaje a Italia"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">Monto Objetivo ($)</label>
                    <input
                      type="number"
                      value={newProject.targetAmount}
                      onChange={(e) => setNewProject({ ...newProject, targetAmount: e.target.value })}
                      placeholder="2000000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">Fecha Objetivo</label>
                    <input
                      type="date"
                      value={newProject.targetDate}
                      onChange={(e) => setNewProject({ ...newProject, targetDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addSavingsProject}
                  disabled={!newProject.name || !newProject.targetAmount || !newProject.targetDate}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  Crear Proyecto de Ahorro
                </button>
              </BentoCard>

              {/* Projects List */}
              {savingsProjects.length === 0 ? (
                <BentoCard>
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg mb-2">No tienes proyectos de ahorro</p>
                    <p className="text-slate-400 text-sm">Crea tu primer proyecto para empezar a ahorrar</p>
                  </div>
                </BentoCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savingsProjects.map((project) => {
                    const today = new Date();
                    const targetDate = new Date(project.targetDate);
                    const createdDate = new Date(project.createdAt);
                    const monthsRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    const totalMonths = Math.max(1, Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    const remainingToSave = Math.max(0, project.targetAmount - project.savedAmount);
                    const monthlySuggestion = remainingToSave / monthsRemaining;
                    const progress = (project.savedAmount / project.targetAmount) * 100;
                    const isCompleted = project.savedAmount >= project.targetAmount;

                    return (
                      <BentoCard key={project.id}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-slate-900 text-lg">{project.name}</h4>
                            <p className="text-sm text-slate-500">
                              Meta: {targetDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteSavingsProject(project.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600">Ahorrado: <span className="font-semibold text-green-600">${project.savedAmount.toLocaleString('es-CL')}</span></span>
                            <span className="text-slate-600">Meta: <span className="font-semibold">${project.targetAmount.toLocaleString('es-CL')}</span></span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <p className="text-sm text-slate-500 mt-1 text-right">{progress.toFixed(1)}% completado</p>
                        </div>

                        {/* Savings Plan */}
                        {!isCompleted ? (
                          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                            <p className="text-sm text-indigo-700 mb-1">📊 Plan de Ahorro</p>
                            <p className="text-2xl font-bold text-indigo-600">
                              ${Math.round(monthlySuggestion).toLocaleString('es-CL')}
                              <span className="text-sm font-normal text-indigo-500">/mes</span>
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">
                              {monthsRemaining} {monthsRemaining === 1 ? 'mes' : 'meses'} restantes • Faltan ${remainingToSave.toLocaleString('es-CL')}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 rounded-xl p-4 mb-4 text-center">
                            <p className="text-2xl">🎉</p>
                            <p className="text-green-700 font-semibold">¡Meta alcanzada!</p>
                          </div>
                        )}

                        {/* Add Contribution */}
                        {!isCompleted && (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              id={`contribution-${project.id}`}
                              placeholder="Monto aporte"
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`contribution-${project.id}`) as HTMLInputElement;
                                const amount = parseFloat(input.value) || 0;
                                if (amount > 0) {
                                  addProjectContribution(project.id, amount);
                                  input.value = '';
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                            >
                              + Aporte
                            </button>
                          </div>
                        )}
                      </BentoCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Historial de Transacciones</h2>
              <div className="bg-white rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar en el historial..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${t.isInstallment ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>
                          {t.isInstallment ? <CreditCard size={20} /> : <ArrowUpCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{t.description}</p>
                          <p className="text-xs text-slate-500">{t.subCategory} • {new Date(t.date).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">${(t.isInstallment ? t.installmentValue : t.amount)?.toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ahorro' && (() => {
            // Usar funciones definidas a nivel de componente
            const currentData = calculateSavingsForMonth(selectedSavingsMonth);

            // Datos históricos para el gráfico (solo mes actual y anterior)
            // Usando los mismos valores globales que el widget principal
            const presupuestoNecesidadesGlobal = totalIncome * 0.50;
            const presupuestoDeseosGlobal = totalIncome * 0.30;
            const presupuestoAhorroGlobal = totalIncome * 0.20;
            const gastadoNecesidadesGlobal = health.totals[CategoryType.NEED] || 0;
            const gastadoDeseosGlobal = health.totals[CategoryType.WANT] || 0;
            const ahorradoGlobal = health.totals[CategoryType.SAVINGS] || 0;

            const disponibleNecesidadesGlobal = Math.max(0, presupuestoNecesidadesGlobal - gastadoNecesidadesGlobal);
            const disponibleDeseosGlobal = Math.max(0, presupuestoDeseosGlobal - gastadoDeseosGlobal);
            const faltaAhorroGlobal = Math.max(0, presupuestoAhorroGlobal - ahorradoGlobal);
            const totalAhorroGlobal = faltaAhorroGlobal + disponibleNecesidadesGlobal + disponibleDeseosGlobal;

            // Get current month key
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Combine savingsProjection data with current month calculated in real-time
            const historicalData = (() => {
              const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

              // Get saved months from savingsProjection
              const savedMonths = savingsProjection.map(entry => ({
                month: `${monthNames[parseInt(entry.monthKey.split('-')[1]) - 1]} ${entry.monthKey.split('-')[0].slice(-2)}`,
                monthKey: entry.monthKey,
                ahorro: entry.restanteAhorro,
                positivo: entry.restanteAhorro >= 0
              }));

              // Add current month (calculated in real-time) if not already saved
              const currentMonthSaved = savingsProjection.some(p => p.monthKey === currentMonthKey);
              const currentMonthData = {
                month: `${monthNames[now.getMonth()]} ${now.getFullYear().toString().slice(-2)}`,
                monthKey: currentMonthKey,
                ahorro: totalAhorroGlobal,
                positivo: totalAhorroGlobal >= 0
              };

              const combined = currentMonthSaved ? savedMonths : [...savedMonths, currentMonthData];

              // Sort by monthKey and return last 6 months
              return combined
                .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
                .slice(-6);
            })();

            const formatMonthLabel = (monthKey: string) => {
              const [year, month] = monthKey.split('-').map(Number);
              const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              return `${monthNames[month - 1]} ${year}`;
            };

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Monitoreo de Ahorro</h2>

                  {/* Selector de Mes */}
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-400" />
                    <select
                      value={selectedSavingsMonth}
                      onChange={(e) => setSelectedSavingsMonth(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableSavingsMonths.map(m => (
                        <option key={m} value={m}>{formatMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid de indicadores (mismos valores que Resumen/Presupuesto) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <p className="text-slate-500 text-sm mb-1">💰 Ingresos</p>
                    <p className="text-2xl font-bold text-green-600">+${totalIncome.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <p className="text-slate-500 text-sm mb-1">🏠 Necesidades</p>
                    <p className="text-2xl font-bold text-blue-600">-${(health.totals[CategoryType.NEED] || 0).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <p className="text-slate-500 text-sm mb-1">🎉 Deseos</p>
                    <p className="text-2xl font-bold text-purple-600">-${(health.totals[CategoryType.WANT] || 0).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <p className="text-slate-500 text-sm mb-1">📊 Transacciones</p>
                    <p className="text-2xl font-bold text-slate-700">{transactions.length}</p>
                  </div>
                </div>

                {/* Resumen de Ahorro del Mes - Regla 50/30/20 */}
                {(() => {
                  // Usar los mismos valores que la pestaña Presupuesto
                  const presupuestoNecesidades = totalIncome * 0.50;
                  const presupuestoDeseos = totalIncome * 0.30;
                  const presupuestoAhorro = totalIncome * 0.20;

                  // Valores gastados (desde health.totals - igual que Presupuesto)
                  const gastadoNecesidades = health.totals[CategoryType.NEED] || 0;
                  const gastadoDeseos = health.totals[CategoryType.WANT] || 0;
                  const ahorradoActual = health.totals[CategoryType.SAVINGS] || 0;

                  // Disponible de Necesidades y Deseos (igual que la glosa "Disponible" en Presupuesto)
                  const disponibleNecesidades = Math.max(0, presupuestoNecesidades - gastadoNecesidades);
                  const disponibleDeseos = Math.max(0, presupuestoDeseos - gastadoDeseos);

                  // Falta para Ahorro (igual que la glosa "Falta" en Presupuesto)
                  const faltaAhorro = Math.max(0, presupuestoAhorro - ahorradoActual);

                  // Si ya alcanzaste la meta de ahorro, usar lo ya ahorrado
                  const ahorroContabilizado = ahorradoActual >= presupuestoAhorro ? presupuestoAhorro : faltaAhorro;
                  const metaAlcanzada = ahorradoActual >= presupuestoAhorro;

                  // Total ahorro = Restante Ahorro (20%) + Disponible Necesidades + Disponible Deseos
                  const totalAhorro = faltaAhorro + disponibleNecesidades + disponibleDeseos;

                  return (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-6 border border-green-100">
                      <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                        <PiggyBank size={20} className="text-green-600" />
                        Tu Ahorro del Mes (Regla 50/30/20)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Columna izquierda: Desglose */}
                        <div className="space-y-3">
                          {/* Ahorro 20% - Restante */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-green-100">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <div>
                                <span className="text-slate-700 text-sm font-medium">Ahorro 20% (Restante)</span>
                                <p className="text-xs text-slate-400">
                                  Meta: ${presupuestoAhorro.toLocaleString('es-CL', { maximumFractionDigits: 0 })} | Usado: ${ahorradoActual.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold text-lg ${faltaAhorro > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                              {faltaAhorro > 0 ? `+$${faltaAhorro.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : 'Agotado'}
                            </span>
                          </div>

                          {/* Disponible Necesidades */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <div>
                                <span className="text-slate-700 text-sm font-medium">Disponible Necesidades (50%)</span>
                                <p className="text-xs text-slate-400">
                                  ${presupuestoNecesidades.toLocaleString('es-CL', { maximumFractionDigits: 0 })} - ${gastadoNecesidades.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold text-lg ${disponibleNecesidades > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                              {disponibleNecesidades > 0 ? `+$${disponibleNecesidades.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : 'Excedido'}
                            </span>
                          </div>

                          {/* Disponible Deseos */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                              <div>
                                <span className="text-slate-700 text-sm font-medium">Disponible Deseos (30%)</span>
                                <p className="text-xs text-slate-400">
                                  ${presupuestoDeseos.toLocaleString('es-CL', { maximumFractionDigits: 0 })} - ${gastadoDeseos.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold text-lg ${disponibleDeseos > 0 ? 'text-purple-600' : 'text-red-500'}`}>
                              {disponibleDeseos > 0 ? `+$${disponibleDeseos.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : 'Excedido'}
                            </span>
                          </div>
                        </div>

                        {/* Columna derecha: Total con desglose */}
                        <div className={`flex flex-col justify-center p-6 rounded-2xl ${totalAhorro > 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'} text-white shadow-lg`}>
                          <div className="text-center mb-4">
                            <p className="text-white/80 text-sm mb-1">💰 TOTAL AHORRO DEL MES</p>
                            <p className="text-4xl font-bold">
                              ${totalAhorro.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          {/* Desglose del cálculo */}
                          <div className="bg-white/10 rounded-xl p-4 space-y-2">
                            <p className="text-white/60 text-xs font-semibold mb-2">📊 Cómo se calcula:</p>

                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">Restante Ahorro (20%)</span>
                              <span className="font-bold">${faltaAhorro.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">+ Disponible Necesidades</span>
                              <span className="font-bold">${disponibleNecesidades.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">+ Disponible Deseos</span>
                              <span className="font-bold">${disponibleDeseos.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="border-t border-white/20 pt-2 mt-2 flex justify-between text-sm font-bold">
                              <span>= Total</span>
                              <span>${totalAhorro.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Gráfico de Evolución Histórica */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Evolución del Ahorro Mensual</h3>
                      <p className="text-xs text-slate-500">Historial basado en tus transacciones categorizadas</p>
                    </div>
                  </div>
                  {historicalData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={historicalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                          <Tooltip
                            formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Ahorro']}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                          />
                          <Bar
                            dataKey="ahorro"
                            radius={[8, 8, 0, 0]}
                            onClick={(data) => setSelectedSavingsMonth(data.monthKey)}
                            className="cursor-pointer"
                          >
                            {historicalData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.monthKey === selectedSavingsMonth ? (entry.positivo ? '#16a34a' : '#dc2626') : (entry.positivo ? '#22c55e' : '#ef4444')}
                                stroke={entry.monthKey === selectedSavingsMonth ? '#000' : 'none'}
                                strokeWidth={entry.monthKey === selectedSavingsMonth ? 2 : 0}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs text-slate-600">Ahorro Positivo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-xs text-slate-600">Déficit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded border-2 border-slate-400"></div>
                          <span className="text-xs text-slate-600">Mes Seleccionado</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <PiggyBank size={48} className="mx-auto mb-4 text-slate-300" />
                      <p>No hay datos históricos disponibles</p>
                      <p className="text-sm">Importa tu cartola para ver la evolución</p>
                    </div>
                  )}
                </div>

                {/* Nota informativa */}
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                  <div className="flex gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg h-fit">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-indigo-900 mb-1">💡 Cómo funciona</h4>
                      <p className="text-sm text-indigo-700">
                        El <strong>Ahorro Efectivo</strong> se calcula con tus transacciones reales de la cartola:
                        Ingresos - Necesidades - Deseos. Clasifica tus gastos en <strong>Movimientos</strong>
                        para ver datos precisos. Haz clic en las barras del gráfico para ver el detalle de cada mes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tab: Proyección de Ahorro */}
          {activeTab === 'proyeccion' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                  <TrendingUp className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Proyección de Ahorro</h1>
                  <p className="text-slate-500">Registra tus datos mensuales y visualiza la evolución de tu ahorro</p>
                </div>
              </div>

              {/* Widget 1: Ingreso de Datos Mensuales */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" />
                  Ingresar Datos del Mes
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Mes</label>
                    <input
                      type="month"
                      value={newProjection.monthKey}
                      onChange={(e) => setNewProjection(prev => ({ ...prev, monthKey: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Usado Necesidades</label>
                    <input
                      type="number"
                      placeholder="$0"
                      value={newProjection.usadoNecesidades}
                      onChange={(e) => setNewProjection(prev => ({ ...prev, usadoNecesidades: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Usado Deseos</label>
                    <input
                      type="number"
                      placeholder="$0"
                      value={newProjection.usadoDeseos}
                      onChange={(e) => setNewProjection(prev => ({ ...prev, usadoDeseos: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Restante Ahorro</label>
                    <input
                      type="number"
                      placeholder="$0"
                      value={newProjection.restanteAhorro}
                      onChange={(e) => setNewProjection(prev => ({ ...prev, restanteAhorro: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (newProjection.monthKey && newProjection.restanteAhorro) {
                      const entry: SavingsProjectionEntry = {
                        monthKey: newProjection.monthKey,
                        usadoNecesidades: parseFloat(newProjection.usadoNecesidades) || 0,
                        usadoDeseos: parseFloat(newProjection.usadoDeseos) || 0,
                        restanteAhorro: parseFloat(newProjection.restanteAhorro) || 0
                      };
                      // Update or add entry
                      setSavingsProjection(prev => {
                        const existing = prev.findIndex(p => p.monthKey === entry.monthKey);
                        if (existing >= 0) {
                          const updated = [...prev];
                          updated[existing] = entry;
                          return updated;
                        }
                        return [...prev, entry];
                      });
                      setNewProjection({
                        monthKey: newProjection.monthKey,
                        usadoNecesidades: '',
                        usadoDeseos: '',
                        restanteAhorro: ''
                      });
                    }
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Guardar Mes
                </button>

                {/* Lista de meses ingresados */}
                {savingsProjection.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Meses Registrados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {savingsProjection
                        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
                        .map(entry => {
                          const [year, month] = entry.monthKey.split('-');
                          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                          const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
                          return (
                            <div key={entry.monthKey} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <span className="font-semibold text-slate-700">{monthLabel}</span>
                                <div className="text-xs text-slate-500 mt-1">
                                  <span className="text-blue-600">Nec: ${entry.usadoNecesidades.toLocaleString('es-CL')}</span>
                                  {' | '}
                                  <span className="text-purple-600">Des: ${entry.usadoDeseos.toLocaleString('es-CL')}</span>
                                  {' | '}
                                  <span className="text-green-600">Ahorro: ${entry.restanteAhorro.toLocaleString('es-CL')}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setSavingsProjection(prev => prev.filter(p => p.monthKey !== entry.monthKey))}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Widget 2: Gráfico de Evolución del Ahorro */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-600" />
                  Evolución del Ahorro Restante
                </h2>

                {savingsProjection.length === 0 ? (
                  <div className="text-center py-12">
                    <PiggyBank size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-400">No hay datos de proyección.</p>
                    <p className="text-sm text-slate-400 mt-1">Ingresa los datos de al menos un mes para ver el gráfico.</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={savingsProjection
                          .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
                          .map(entry => {
                            const [year, month] = entry.monthKey.split('-');
                            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                            return {
                              month: `${monthNames[parseInt(month) - 1]} ${year.slice(-2)}`,
                              ahorro: entry.restanteAhorro,
                              necesidades: entry.usadoNecesidades,
                              deseos: entry.usadoDeseos
                            };
                          })}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorAhorro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          formatter={(value: number, name: string) => [
                            `$${value.toLocaleString('es-CL')}`,
                            name === 'ahorro' ? 'Restante Ahorro' : name === 'necesidades' ? 'Usado Necesidades' : 'Usado Deseos'
                          ]}
                        />
                        <Legend
                          formatter={(value) => value === 'ahorro' ? 'Restante Ahorro' : value === 'necesidades' ? 'Usado Necesidades' : 'Usado Deseos'}
                        />
                        <Area
                          type="monotone"
                          dataKey="ahorro"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorAhorro)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Chat Assistant */}
      <AIChat
        financialContext={{
          totalIncome,
          totalExpenses,
          transactions: transactions.slice(0, 20).map(t => ({
            description: t.description,
            amount: t.amount,
            date: t.date,
            isIncome: t.isIncome || false,
            expenseCategory: t.expenseCategory
          })),
          creditOperations: creditOperations.map(c => ({
            description: c.description,
            totalAmount: c.totalAmount,
            monthlyInstallment: c.monthlyInstallment,
            pendingBalance: c.pendingBalance,
            remainingInstallments: c.remainingInstallments
          })),
          subscriptions: manualSubscriptions.map(s => ({
            description: s.description,
            monthlyAmount: s.monthlyAmount
          })),
          calendarTasks: calendarTasks.map(t => ({
            date: t.date,
            description: t.description,
            type: t.type,
            completed: t.completed
          }))
        }}
      />
    </>
  );
};

export default App;
