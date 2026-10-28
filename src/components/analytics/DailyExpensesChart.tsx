import React, { useState } from 'react';
import type { Currency } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface DailyExpenseData {
  day: number;
  dateStr: string;
  amount: number;
  count: number;
}

interface DailyExpensesChartProps {
  data: DailyExpenseData[];
  currency: Currency;
  daysInMonth: number;
  currentDay?: number;
}

export const DailyExpensesChart: React.FC<DailyExpensesChartProps> = ({
  data,
  currency,
  daysInMonth,
  currentDay,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DailyExpenseData | null>(null);

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const totalAmount = data.reduce((acc, d) => acc + d.amount, 0);
  const activeDaysCount = data.filter((d) => d.amount > 0).length;
  const dailyAverage = activeDaysCount > 0 ? totalAmount / (currentDay || daysInMonth) : 0;

  // Chart dimensions
  const height = 180;
  const paddingBottom = 26;
  const paddingTop = 20;
  const chartHeight = height - paddingBottom - paddingTop;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Rythme des Dépenses Journalières
          </h3>
          <p className="text-xs text-slate-400">
            Évolution jour par jour sur le mois
          </p>
        </div>

        {/* Hover info or average */}
        <div className="text-right">
          {hoveredDay ? (
            <div>
              <span className="text-[11px] font-semibold text-slate-500">
                Jour {hoveredDay.day} :
              </span>{' '}
              <span className="text-xs font-black text-rose-600 tabular-nums">
                {formatMoney(hoveredDay.amount, currency)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                ({hoveredDay.count} op.)
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[11px] font-medium text-slate-400">Moyenne :</span>{' '}
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                {formatMoney(dailyAverage, currency)} / jour
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Responsive Bar Chart */}
      <div className="relative w-full overflow-x-auto no-scrollbar pt-2">
        <svg
          viewBox={`0 0 ${Math.max(480, daysInMonth * 16)} ${height}`}
          className="w-full h-44 min-w-[480px] overflow-visible"
        >
          {/* Average horizontal dashed line */}
          {dailyAverage > 0 && (
            <g>
              <line
                x1={0}
                y1={paddingTop + chartHeight - (dailyAverage / maxAmount) * chartHeight}
                x2={daysInMonth * 16}
                y2={paddingTop + chartHeight - (dailyAverage / maxAmount) * chartHeight}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={4}
                y={paddingTop + chartHeight - (dailyAverage / maxAmount) * chartHeight - 4}
                fill="#94a3b8"
                fontSize={9}
                fontWeight={600}
              >
                Moyenne: {formatMoney(dailyAverage, currency)}
              </text>
            </g>
          )}

          {/* Daily Bars */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayData = data.find((d) => d.day === day) || {
              day,
              dateStr: '',
              amount: 0,
              count: 0,
            };

            const barHeight =
              dayData.amount > 0 ? Math.max(6, (dayData.amount / maxAmount) * chartHeight) : 2;
            const x = (day - 1) * 16 + 2;
            const y = paddingTop + chartHeight - barHeight;
            const isToday = currentDay === day;
            const isHovered = hoveredDay?.day === day;

            return (
              <g
                key={day}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredDay(dayData)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setHoveredDay(dayData)}
              >
                {/* Invisible wider touch hitbox */}
                <rect
                  x={(day - 1) * 16}
                  y={0}
                  width={16}
                  height={height}
                  fill="transparent"
                />

                {/* Visible bar */}
                <rect
                  x={x}
                  y={y}
                  width={11}
                  height={barHeight}
                  rx={3}
                  className={`transition-colors duration-150 ${
                    dayData.amount > 0
                      ? isHovered
                        ? 'fill-rose-600'
                        : isToday
                        ? 'fill-emerald-600'
                        : 'fill-emerald-700/80 hover:fill-emerald-600'
                      : 'fill-slate-100 hover:fill-slate-200'
                  }`}
                />

                {/* Day label below (every 3 days or if 1, 15, last) */}
                {(day === 1 || day % 5 === 0 || day === daysInMonth || isToday) && (
                  <text
                    x={x + 5.5}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={isToday ? 800 : 500}
                    fill={isToday ? '#059669' : '#94a3b8'}
                  >
                    {day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700" />
            <span>Dépense du jour</span>
          </div>
          {currentDay && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 ring-2 ring-emerald-300" />
              <span>Aujourd'hui (J{currentDay})</span>
            </div>
          )}
        </div>
        <span>{activeDaysCount} jours avec dépenses</span>
      </div>
    </div>
  );
};
