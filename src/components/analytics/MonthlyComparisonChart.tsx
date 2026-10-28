import React from 'react';
import type { Currency } from '../../types';
import { formatMoney } from '../../utils/formatters';

export interface MonthSummary {
  monthKey: string; // '2026-10'
  monthLabel: string; // 'Oct 2026'
  income: number;
  expense: number;
  savings: number;
}

interface MonthlyComparisonChartProps {
  data: MonthSummary[];
  currency: Currency;
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

export const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({
  data,
  currency,
  selectedMonthKey,
  onSelectMonth,
}) => {
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.income, d.expense]),
    1
  );

  const height = 150;
  const paddingBottom = 26;
  const chartHeight = height - paddingBottom;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Comparatif des 6 Derniers Mois
          </h3>
          <p className="text-xs text-slate-400">Revenus vs Dépenses par mois</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            <span className="text-slate-600 font-medium">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-600 font-medium">Dépenses</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 pt-2 items-end h-40">
        {data.map((m) => {
          const isSelected = m.monthKey === selectedMonthKey;
          const incomeHeight = Math.max(4, (m.income / maxVal) * chartHeight);
          const expenseHeight = Math.max(4, (m.expense / maxVal) * chartHeight);

          return (
            <div
              key={m.monthKey}
              onClick={() => onSelectMonth(m.monthKey)}
              className={`flex flex-col items-center justify-end h-full p-1.5 rounded-2xl transition cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/80 ring-1 ring-emerald-300'
                  : 'hover:bg-slate-50'
              }`}
            >
              {/* Bars side by side */}
              <div className="flex items-end gap-1 w-full justify-center h-28">
                {/* Income Bar */}
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-emerald-600 transition-all hover:bg-emerald-500"
                  style={{ height: `${incomeHeight}px` }}
                  title={`Revenus ${m.monthLabel}: ${formatMoney(m.income, currency)}`}
                />
                {/* Expense Bar */}
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-rose-500 transition-all hover:bg-rose-400"
                  style={{ height: `${expenseHeight}px` }}
                  title={`Dépenses ${m.monthLabel}: ${formatMoney(m.expense, currency)}`}
                />
              </div>

              {/* Month label */}
              <span
                className={`text-[10px] sm:text-xs mt-2 truncate font-bold ${
                  isSelected ? 'text-emerald-800 font-extrabold' : 'text-slate-500'
                }`}
              >
                {m.monthLabel.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
