import React, { useState } from 'react';
import type { Currency } from '../../types';
import { formatMoney } from '../../utils/formatters';

export interface CategoryExpense {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  categories: CategoryExpense[];
  totalExpense: number;
  currency: Currency;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

const PALETTE = [
  '#059669', // Emerald
  '#0284c7', // Sky blue
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#0d9488', // Teal
  '#ec4899', // Pink
  '#64748b', // Slate
  '#84cc16', // Lime
];

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categories,
  totalExpense,
  currency,
  selectedCategory,
  onSelectCategory,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  if (categories.length === 0 || totalExpense <= 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center text-slate-400 py-12">
        <p className="text-sm font-semibold text-slate-600">Aucune dépense sur ce mois</p>
        <p className="text-xs text-slate-400 mt-1">Vos dépenses par catégorie s'afficheront ici.</p>
      </div>
    );
  }

  // Calculate SVG Donut Arcs
  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const currentHighlight = hoveredCategory || selectedCategory;
  const highlightedData = categories.find((c) => c.category === currentHighlight);

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Répartition par Catégorie
          </h3>
          <p className="text-xs text-slate-400">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} de dépenses
          </p>
        </div>

        {selectedCategory && onSelectCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Réinitialiser le filtre
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Donut Center */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Slices */}
            {categories.map((cat, idx) => {
              const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedAngle / 100) * circumference);
              accumulatedAngle += cat.percentage;
              const isSelected = currentHighlight === cat.category;
              const color = cat.color || PALETTE[idx % PALETTE.length];

              return (
                <circle
                  key={cat.category}
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-200 cursor-pointer"
                  style={{ opacity: currentHighlight && !isSelected ? 0.4 : 1 }}
                  onMouseEnter={() => setHoveredCategory(cat.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory && onSelectCategory(selectedCategory === cat.category ? null : cat.category)}
                />
              );
            })}
          </svg>

          {/* Center text inside donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {highlightedData ? (
              <>
                <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[100px]">
                  {highlightedData.category}
                </span>
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {Math.round(highlightedData.percentage)}%
                </span>
                <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                  {formatMoney(highlightedData.amount, currency)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Dépenses</span>
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {formatMoney(totalExpense, currency)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Progress bars list */}
        <div className="md:col-span-7 space-y-2.5">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat.category;
            const isHovered = hoveredCategory === cat.category;
            const color = cat.color || PALETTE[idx % PALETTE.length];

            return (
              <div
                key={cat.category}
                onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : cat.category)}
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 ring-1 ring-emerald-300'
                    : isHovered
                    ? 'bg-slate-50'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-slate-800 truncate">
                      {cat.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({cat.count} op.)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-slate-900 tabular-nums">
                      {formatMoney(cat.amount, currency)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 w-10 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
