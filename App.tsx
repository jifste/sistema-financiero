
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
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
  FileText
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

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

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const INCOME = 6137000;

type TabType = 'resumen' | 'cuentas' | 'presupuesto' | 'creditos' | 'historial';

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

const App: React.FC = () => {
  // Load saved data from localStorage on init
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage('financeai_transactions', [])
  );
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Credit operations state - loaded from localStorage
  const [creditOperations, setCreditOperations] = useState<CreditOperation[]>(() =>
    loadFromStorage('financeai_credits', [])
  );
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
  const [manualSubscriptions, setManualSubscriptions] = useState<MonthlySubscriptionEntry[]>(() =>
    loadFromStorage('financeai_subscriptions', [])
  );
  const [newSubscription, setNewSubscription] = useState({
    description: '',
    monthlyAmount: ''
  });

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('financeai_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('financeai_credits', JSON.stringify(creditOperations));
  }, [creditOperations]);

  useEffect(() => {
    localStorage.setItem('financeai_subscriptions', JSON.stringify(manualSubscriptions));
  }, [manualSubscriptions]);

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
        importedTransactions.push({
          id: `excel-${Date.now()}-${i}`,
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
    return importedTransactions.length;
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
    return importedTransactions.length;
  };

  // Main File Import Handler
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('📥 Procesando archivo...');

    try {
      let count = 0;
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        count = await handleExcelImport(file);
        setImportStatus(`✅ ${count} transacciones importadas desde Excel`);
      } else if (extension === 'pdf') {
        count = await handlePDFImport(file);
        setImportStatus(`✅ ${count} transacciones extraídas del PDF`);
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

  const totalMonthlyExpenses = totalExpenses;

  const totalDebtBalance = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.remainingBalance, 0);
  }, [debts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory ? t.subCategory === filterCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, filterCategory]);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      map[t.subCategory] = (map[t.subCategory] || 0) + (t.isInstallment ? (t.installmentValue || 0) : t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col fixed h-full z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
            <TrendingUp size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">FinanceAI<span className="text-indigo-600">Pro</span></span>
        </div>

        <nav className="space-y-2 flex-grow">
          {[
            { icon: LayoutDashboard, label: 'Resumen', tab: 'resumen' as TabType },
            { icon: CreditCard, label: 'Categorizar', tab: 'cuentas' as TabType },
            { icon: PieChartIcon, label: 'Presupuesto', tab: 'presupuesto' as TabType },
            { icon: Wallet, label: 'Créditos', tab: 'creditos' as TabType },
            { icon: Clock, label: 'Historial', tab: 'historial' as TabType },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.tab ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <item.icon size={20} />
              {item.label}
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
      <main className="flex-grow ml-72 p-10 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Hola, Felipe 👋</h1>
            <p className="text-slate-500">Aquí tienes el análisis de tus finanzas para Noviembre 2023.</p>
          </div>
          <div className="flex gap-3 items-center">
            {importStatus && (
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
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
              className={`px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FileSpreadsheet size={18} />
              Importar Excel/PDF
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
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">Activos</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Deuda Total Pendiente</p>
                <h2 className="text-2xl font-bold text-slate-900">${totalDebtBalance.toLocaleString('es-CL')}</h2>
              </div>
            </div>

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
              <BentoCard title="Proyección de Flujo de Caja" subtitle="Próximos 6 meses de cuotas obligatorias" className="md:col-span-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Compromiso']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </BentoCard>

              {/* Subscriptions Widget - Col 1 */}
              <BentoCard title="Suscripciones Detectadas" subtitle="Pagos recurrentes inteligentes" icon={<Repeat size={18} className="text-indigo-600" />}>
                <div className="space-y-4">
                  {subscriptions.map(sub => (
                    <div key={sub.description} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 group hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 text-xs font-bold text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100">
                          {sub.description.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{sub.description}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">{sub.frequency}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900">${sub.amount.toLocaleString('es-CL')}</p>
                    </div>
                  ))}
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

              {/* Snowball Simulator - Col 3 */}
              <BentoCard title="Simulador Snowball" subtitle="Acelera el pago de tus deudas" icon={<TrendingUp size={18} className="text-green-600" />}>
                <SnowballSimulator
                  totalDebt={totalDebtBalance}
                  monthlyInstallments={debts.reduce((acc, d) => acc + d.monthlyValue, 0)}
                />
              </BentoCard>

              {/* Debt Timeline - Full Width Row */}
              <BentoCard title="Línea de Tiempo de Deudas" subtitle="Calendario proyectado de fin de pagos" className="md:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {debts.map((debt, i) => (
                    <div key={i} className="relative p-5 rounded-2xl border border-slate-100 bg-white overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-800">{debt.description}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">CUOTA {debt.currentInstallment}/{debt.totalInstallments}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Saldo Pendiente</span>
                          <span className="font-semibold text-slate-800">${debt.remainingBalance.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(debt.currentInstallment / debt.totalInstallments) * 100}%` }}></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <Clock size={12} />
                        <span>Finaliza en: <strong className="text-slate-800">{debt.endDate}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <p className={`text-xs mt-1 ${health.totals[CategoryType.NEED] <= totalIncome * 0.50 ? 'text-green-600' : 'text-red-600'}`}>
                    {health.totals[CategoryType.NEED] <= totalIncome * 0.50 ?
                      `Disponible: $${(totalIncome * 0.50 - health.totals[CategoryType.NEED]).toLocaleString('es-CL', { maximumFractionDigits: 0 })}` :
                      `Excedido: $${(health.totals[CategoryType.NEED] - totalIncome * 0.50).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Deseos (30%)</p>
                  <p className="text-sm font-bold text-purple-600">${(totalIncome * 0.30).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                  <p className={`text-xs mt-1 ${health.totals[CategoryType.WANT] <= totalIncome * 0.30 ? 'text-green-600' : 'text-red-600'}`}>
                    {health.totals[CategoryType.WANT] <= totalIncome * 0.30 ?
                      `Disponible: $${(totalIncome * 0.30 - health.totals[CategoryType.WANT]).toLocaleString('es-CL', { maximumFractionDigits: 0 })}` :
                      `Excedido: $${(health.totals[CategoryType.WANT] - totalIncome * 0.30).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ahorro (20%)</p>
                  <p className="text-sm font-bold text-green-600">${(totalIncome * 0.20).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                  <p className={`text-xs mt-1 ${health.totals[CategoryType.SAVINGS] >= totalIncome * 0.20 ? 'text-green-600' : 'text-orange-600'}`}>
                    {health.totals[CategoryType.SAVINGS] >= totalIncome * 0.20 ?
                      `✓ Meta alcanzada` :
                      `Falta: $${(totalIncome * 0.20 - health.totals[CategoryType.SAVINGS]).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                    }
                  </p>
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

            {/* Resumen vs Gastos Reales */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Comparación: Presupuesto vs Gastos Reales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">Tus Gastos Totales</span>
                    <span className="text-lg font-bold text-slate-900">${totalExpenses.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-600 font-medium">Presupuesto Máximo (80%)</span>
                    <span className="text-lg font-bold text-slate-900">${(totalIncome * 0.80).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl ${totalExpenses <= totalIncome * 0.80 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`font-medium ${totalExpenses <= totalIncome * 0.80 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalExpenses <= totalIncome * 0.80 ? '✅ Dentro del presupuesto' : '⚠️ Excediste el presupuesto'}
                    </span>
                    <span className={`text-lg font-bold ${totalExpenses <= totalIncome * 0.80 ? 'text-green-700' : 'text-red-700'}`}>
                      ${Math.abs((totalIncome * 0.80) - totalExpenses).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={[
                      { name: 'Gastos', value: totalExpenses, fill: '#6366f1' },
                      { name: 'Límite 80%', value: totalIncome * 0.80, fill: '#10b981' }
                    ]} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Monto']} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {[0, 1].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#10b981'} />
                        ))}
                      </Bar>
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
                      <div className="text-center">
                        <span className="text-green-600 font-medium">{c.paidInstallments}</span>
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
      </main>
    </div>
  );
};

export default App;
