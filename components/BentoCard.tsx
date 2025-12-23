
import React from 'react';

interface BentoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}

export const BentoCard: React.FC<BentoCardProps> = ({ title, icon, children, className = "", subtitle }) => {
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
};
