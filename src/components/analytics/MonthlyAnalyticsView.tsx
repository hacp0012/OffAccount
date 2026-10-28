import React, { useState, useMemo } from 'react';
import type { Transaction, Account, Currency } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import { DailyExpensesChart } from './DailyExpensesChart';
import { CategoryBreakdownChart, type CategoryExpense } from './CategoryBreakdownChart';
import { MonthlyComparisonChart, type MonthSummary } from './MonthlyComparisonChart';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Plus,
  Trash2,
  CheckCircle,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { db } from '../../db/database';

interface MonthlyAnalyticsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onOpenNewTransaction: () => void;
}

export const MonthlyAnalyticsView: React.FC<MonthlyAnalyticsViewProps> = ({
  transactions,
  accounts,
  onOpenNewTransaction,
}) => {
  // Current month default: "2026-10"
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('FRw');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Month navigation helpers
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

  const handleJumpToCurrentMonth = () => {
    setSelectedMonthKey(currentMonthKey);
    setSelectedCategory(null);
  };

  // Month formatted title
  const monthDate = new Date(selectedYear, selectedMonthNum - 1, 1);
  const monthName = monthDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const isCurrentMonth = selectedMonthKey === currentMonthKey;

  // Days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
  const currentDay = isCurrentMonth ? now.getDate() : undefined;

  // Filter transactions for this month and currency
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txMonth = tx.date.substring(0, 7);
      return txMonth === selectedMonthKey && tx.currency === selectedCurrency;
    });
  }, [transactions, selectedMonthKey, selectedCurrency]);

  // Aggregate monthly figures
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

  // Daily breakdown data for the month
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

  // Category breakdown for expenses
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
        if (tx.currency === selectedCurrency && tx.date?.startsWith(key)) {
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
  }, [transactions, selectedYear, selectedMonthNum, selectedCurrency]);

  // Filtered transactions for the monthly history feed
  const historyTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (selectedCategory && tx.category !== selectedCategory) return false;
      return true;
    });
  }, [monthTransactions, typeFilter, selectedCategory]);

  const handleDelete = async (tx: Transaction) => {
    const confirm = window.confirm(`Supprimer l'opération "${tx.label}" ?`);
    if (!confirm) return;

    try {
      await db.transaction('rw', [db.accounts, db.transactions], async () => {
        await db.transactions.delete(tx.id);
        const targetAccount = accounts.find((a) => a.id === tx.accountId);
        if (targetAccount) {
          const adj = tx.type === 'expense' ? targetAccount.balance + tx.amount : targetAccount.balance - tx.amount;
          await db.accounts.update(targetAccount.id, {
            balance: adj,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || 'Compte';
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Month Navigator Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous / Current / Next controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-slate-700"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {capitalizedMonthName}
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {isCurrentMonth ? 'Mois en cours' : 'Archives mensuelles'}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-slate-700"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isCurrentMonth && (
            <button
              onClick={handleJumpToCurrentMonth}
              className="ml-2 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
            >
              Mois courant
            </button>
          )}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto justify-center">
          {(['FRw', 'FC', 'USD'] as Currency[]).map((cur) => (
            <button
              key={cur}
              onClick={() => {
                setSelectedCurrency(cur);
                setSelectedCategory(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                selectedCurrency === cur
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Financial Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Expenses */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Dépenses Mensuelles
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums tracking-tight mt-1">
              {formatMoney(totalExpense, selectedCurrency)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {monthTransactions.filter((t) => t.type === 'expense').length} débits enregistrés
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Revenus Mensuels
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums tracking-tight mt-1">
              {formatMoney(totalIncome, selectedCurrency)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {monthTransactions.filter((t) => t.type === 'income').length} crédits enregistrés
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Solde Net du Mois
            </span>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1 ${
                netSavings >= 0 ? 'text-emerald-800' : 'text-rose-600'
              }`}
            >
              {netSavings >= 0 ? '+' : ''}
              {formatMoney(netSavings, selectedCurrency)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {netSavings >= 0 ? 'Épargne positive' : 'Dépenses supérieures aux revenus'}
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              netSavings >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Graphs Grid: Daily Pace + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Expenses Chart */}
        <DailyExpensesChart
          data={dailyData}
          currency={selectedCurrency}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
        />

        {/* Category Breakdown Donut */}
        <CategoryBreakdownChart
          categories={categoriesData}
          totalExpense={totalExpense}
          currency={selectedCurrency}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>

      {/* 6-Month Comparison */}
      <MonthlyComparisonChart
        data={monthlyComparisonData}
        currency={selectedCurrency}
        selectedMonthKey={selectedMonthKey}
        onSelectMonth={(k) => setSelectedMonthKey(k)}
      />

      {/* Dedicated Monthly History Feed (Priorité absolue !) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Historique Mensuel : {capitalizedMonthName}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                {selectedCurrency}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {historyTransactions.length} opération{historyTransactions.length > 1 ? 's' : ''} sur la période
              {selectedCategory && ` (filtré sur : "${selectedCategory}")`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Dépenses
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'income' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Revenus
              </button>
            </div>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Category active filter badge */}
        {selectedCategory && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-emerald-900 font-semibold">
              Filtre actif : <strong className="font-bold">{selectedCategory}</strong>
            </span>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Effacer le filtre
            </button>
          </div>
        )}

        {/* List of transactions */}
        <div className="divide-y divide-slate-100">
          {historyTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Aucune opération trouvée pour {capitalizedMonthName} en {selectedCurrency}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Enregistrez vos dépenses pour voir apparaître les statistiques et l'historique complet.
              </p>
            </div>
          ) : (
            historyTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isExpense ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : isIncome ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {tx.label}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">{getAccountName(tx.accountId)}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          onClick={() => setSelectedCategory(tx.category)}
                          className="hover:text-emerald-700 cursor-pointer underline decoration-dotted"
                        >
                          {tx.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight ${
                        isExpense ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatMoney(tx.amount, tx.currency)}
                    </div>

                    <button
                      onClick={() => handleDelete(tx)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Supprimer cette opération"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
