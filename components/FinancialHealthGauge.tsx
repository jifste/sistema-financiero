
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Text } from 'recharts';

interface Props {
  score: number;
}

export const FinancialHealthGauge: React.FC<Props> = ({ score }) => {
  const data = [
    { value: score },
    { value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s > 80) return '#22c55e'; // Green
    if (s > 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getLabel = (s: number) => {
    if (s > 80) return 'Excelente';
    if (s > 50) return 'Regular';
    return 'En Riesgo';
  };

  return (
    <div className="h-48 w-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 text-center">
        <span className="text-3xl font-bold block" style={{ color: getColor(score) }}>{Math.round(score)}</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{getLabel(score)}</span>
      </div>
    </div>
  );
};
