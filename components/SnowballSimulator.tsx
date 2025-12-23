
import React, { useState, useMemo } from 'react';
import { TrendingDown, Calculator } from 'lucide-react';

interface Props {
  totalDebt: number;
  monthlyInstallments: number;
}

export const SnowballSimulator: React.FC<Props> = ({ totalDebt, monthlyInstallments }) => {
  const [extraPayment, setExtraPayment] = useState(50000);

  const stats = useMemo(() => {
    const originalMonths = Math.ceil(totalDebt / monthlyInstallments);
    const acceleratedMonths = Math.ceil(totalDebt / (monthlyInstallments + extraPayment));
    const savedMonths = originalMonths - acceleratedMonths;
    const savedMoney = savedMonths * monthlyInstallments; // Simple approximation

    return { originalMonths, acceleratedMonths, savedMonths, savedMoney };
  }, [totalDebt, monthlyInstallments, extraPayment]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Pago Extra Mensual</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="500000"
            step="10000"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="flex-grow accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-bold text-indigo-600 w-24 text-right">
            ${extraPayment.toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-[10px] text-green-600 font-bold uppercase">Tiempo Ahorrado</p>
          <p className="text-xl font-bold text-green-700">{stats.savedMonths} <span className="text-xs font-normal">meses</span></p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-[10px] text-indigo-600 font-bold uppercase">Deuda Libre en</p>
          <p className="text-xl font-bold text-indigo-700">{stats.acceleratedMonths} <span className="text-xs font-normal">meses</span></p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
        <Calculator size={14} />
        <span>Ahorrarías aprox. <strong>${stats.savedMoney.toLocaleString('es-CL')}</strong> en cuotas futuras.</span>
      </div>
    </div>
  );
};
