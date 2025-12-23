
import React, { useState, useMemo } from 'react';
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
  Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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

const INCOME = 6137000;

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Derived Financial Data
  const health = useMemo(() => calculateFinancialHealth(transactions, INCOME), [transactions]);
  const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);
  const debts = useMemo(() => getDebtTimeline(transactions), [transactions]);
  const projection = useMemo(() => getCashFlowProjection(transactions), [transactions]);

  const totalMonthlyExpenses = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.isInstallment ? (t.installmentValue || 0) : t.amount), 0);
  }, [transactions]);

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
            { icon: LayoutDashboard, label: 'Resumen', active: true },
            { icon: CreditCard, label: 'Mis Cuentas', active: false },
            { icon: PieChartIcon, label: 'Presupuesto', active: false },
            { icon: Clock, label: 'Historial', active: false },
          ].map((item) => (
            <button 
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.active ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
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
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              <PlusCircle size={18} />
              Importar CSV
            </button>
          </div>
        </header>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                <ArrowDownCircle size={24} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+12% vs last month</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Ingresos Estimados</p>
            <h2 className="text-2xl font-bold text-slate-900">${INCOME.toLocaleString('es-CL')}</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ArrowUpCircle size={24} />
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">Fijo Mensual</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Gastos Totales</p>
            <h2 className="text-2xl font-bold text-slate-900">${totalMonthlyExpenses.toLocaleString('es-CL')}</h2>
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
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `$${v/1000}k`} />
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
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 11, fontWeight: 500}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
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
      </main>
    </div>
  );
};

export default App;
