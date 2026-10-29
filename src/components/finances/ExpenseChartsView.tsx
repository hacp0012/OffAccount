import React, { useState, useMemo } from 'react';
import type { Transaction, Account } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { useAppCurrency } from '../../context/CurrencyContext';
import { CategoriesManagerModal } from './CategoriesManagerModal';
import { DailyExpensesChart } from '../analytics/DailyExpensesChart';
import { CategoryBreakdownChart, type CategoryExpense } from '../analytics/CategoryBreakdownChart';
import { MonthlyComparisonChart, type MonthSummary } from '../analytics/MonthlyComparisonChart';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  CalendarDays,
  Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExpenseChartsViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const ExpenseChartsView: React.FC<ExpenseChartsViewProps> = ({
  transactions,
  accounts,
}) => {
  const navigate = useNavigate();
  const { currency, currencyInfo } = useAppCurrency();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  const [selectedYear, selectedMonthNum] = selectedMonthKey.split('-').map(Number);

  const handlePrevMonth = () => {
    const d = new Date(selectedYear, selectedMonthNum - 2, 1);
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthKey(newKey);
    setSelectedCategory(null);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedYear, selectedMonthNum, 1);
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthKey(newKey);
    setSelectedCategory(null);
  };

  const handleJumpToCurrent = () => {
    setSelectedMonthKey(currentMonthKey);
    setSelectedCategory(null);
  };

  const monthDate = new Date(selectedYear, selectedMonthNum - 1, 1);
  const monthName = monthDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const isCurrentMonth = selectedMonthKey === currentMonthKey;

  const daysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
  const currentDay = isCurrentMonth ? now.getDate() : undefined;

  // Filter transactions for this month across all accounts
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      return tx.date.startsWith(selectedMonthKey);
    });
  }, [transactions, selectedMonthKey]);

  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    monthTransactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      if (tx.type === 'expense') exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp,
    };
  }, [monthTransactions]);

  // Daily pace data
  const dailyData = useMemo(() => {
    const map = new Map<number, { amount: number; count: number }>();
    monthTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const day = parseInt(tx.date.split('-')[2], 10);
        const existing = map.get(day) || { amount: 0, count: 0 };
        map.set(day, {
          amount: existing.amount + tx.amount,
          count: existing.count + 1,
        });
      });

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const d = map.get(day) || { amount: 0, count: 0 };
      return {
        day,
        dateStr: `${selectedMonthKey}-${String(day).padStart(2, '0')}`,
        amount: d.amount,
        count: d.count,
      };
    });
  }, [monthTransactions, daysInMonth, selectedMonthKey]);

  // Categories breakdown
  const categoriesData: CategoryExpense[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    const expenses = monthTransactions.filter((tx) => tx.type === 'expense');
    expenses.forEach((tx) => {
      const cat = tx.category || 'Non catégorisé';
      const existing = map.get(cat) || { amount: 0, count: 0 };
      map.set(cat, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1,
      });
    });

    const result: CategoryExpense[] = [];
    const colors = [
      '#059669', '#0284c7', '#f59e0b', '#8b5cf6', '#ef4444', '#0d9488', '#ec4899', '#64748b', '#84cc16'
    ];
    let idx = 0;
    map.forEach((val, cat) => {
      result.push({
        category: cat,
        amount: val.amount,
        count: val.count,
        percentage: totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0,
        color: colors[idx % colors.length],
      });
      idx++;
    });

    return result.sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, totalExpense]);

  // 6-Month historical comparison
  const monthlyComparisonData: MonthSummary[] = useMemo(() => {
    const months: MonthSummary[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(selectedYear, selectedMonthNum - 1 - i, 1);
      const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const label = targetDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        if (tx.date?.startsWith(key)) {
          if (tx.type === 'income') inc += tx.amount;
          if (tx.type === 'expense') exp += tx.amount;
        }
      });

      months.push({
        monthKey: key,
        monthLabel: label,
        income: inc,
        expense: exp,
        savings: inc - exp,
      });
    }
    return months;
  }, [transactions, selectedYear, selectedMonthNum]);

  // Key stats
  const topExpenseCategory = categoriesData[0];
  const maxSingleExpense = useMemo(() => {
    const expenses = monthTransactions.filter((tx) => tx.type === 'expense');
    if (expenses.length === 0) return null;
    return expenses.reduce((max, tx) => (tx.amount > max.amount ? tx : max), expenses[0]);
  }, [monthTransactions]);

  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const avgPerDay = daysElapsed > 0 ? totalExpense / daysElapsed : 0;

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-24">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => navigate('/expenses')}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
            aria-label="Retour aux dépenses"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Diagrammes & Analyse des Dépenses
              </h1>
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {capitalizedMonth}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Visualisation graphique et répartition ({currencyInfo.name}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCatManagerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Ajouter ou modifier des catégories"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Gérer les catégories</span>
          </button>

          {/* Global Active Currency Badge */}
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 sm:px-3 py-1.5 rounded-xl">
            <span className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-medium">Devise :</span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-950 dark:text-emerald-200">
              {currencyInfo.name} ({currency})
            </span>
          </div>
        </div>
      </div>

      {/* Month Navigator Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {capitalizedMonth}
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
            {isCurrentMonth ? 'Mois courant' : 'Mois sélectionné'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              onClick={handleJumpToCurrent}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition cursor-pointer"
            >
              Mois courant
            </button>
          )}
          <button
            onClick={handleNextMonth}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 4 Essential Analytical Insights Strip in Global Currency */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Total Dépenses</span>
          <div className="text-sm sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {formatMoney(totalExpense, currency)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">sur {capitalizedMonth}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Moyenne par jour</span>
          <div className="text-sm sm:text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
            {formatMoney(avgPerDay, currency)}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">sur {daysElapsed} jours</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Top Catégorie</span>
          <div className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
            {topExpenseCategory ? topExpenseCategory.category : 'Aucune'}
          </div>
          <span className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
            {topExpenseCategory ? `${topExpenseCategory.percentage.toFixed(0)}% du total` : '-'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Plus Grosse Dépense</span>
          <div className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums truncate mt-0.5">
            {maxSingleExpense ? formatMoney(maxSingleExpense.amount, currency) : '-'}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 truncate block mt-0.5">
            {maxSingleExpense ? maxSingleExpense.label : '-'}
          </span>
        </div>
      </div>

      {/* Main Charts: Daily Pace + Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Expenses Pace */}
        <DailyExpensesChart
          data={dailyData}
          currency={currency}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
        />

        {/* Category Breakdown Donut */}
        <CategoryBreakdownChart
          categories={categoriesData}
          totalExpense={totalExpense}
          currency={currency}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>

      {/* 6-Month Comparison */}
      <MonthlyComparisonChart
        data={monthlyComparisonData}
        currency={currency}
        selectedMonthKey={selectedMonthKey}
        onSelectMonth={(k) => setSelectedMonthKey(k)}
      />

      {/* Categories Manager Modal */}
      <CategoriesManagerModal
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
      />
    </div>
  );
};
