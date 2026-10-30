import React, { useState, useMemo } from "react";
import type { Transaction, Account } from "../../types";
import { formatMoney, formatDate } from "../../utils/formatters";
import { db } from "../../db/database";
import { useAppCurrency } from "../../context/CurrencyContext";
import { ConfirmModal } from "../ConfirmModal";
import { CategoriesManagerModal } from "./CategoriesManagerModal";
import { TransactionDetailModal } from "./TransactionDetailModal";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  BarChart3,
  Wallet,
  CalendarDays,
  Search,
  Filter,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MonthlyExpensesViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onOpenNewTransaction: () => void;
}

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({ transactions, accounts, onOpenNewTransaction }) => {
  const navigate = useNavigate();
  const { currency, currencyInfo } = useAppCurrency();

  // Current month default: "2026-10"
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  // Month navigation helpers
  const [selectedYear, selectedMonthNum] = selectedMonthKey.split("-").map(Number);

  const handlePrevMonth = () => {
    const d = new Date(selectedYear, selectedMonthNum - 2, 1);
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonthKey(newKey);
    setSelectedCategory(null);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedYear, selectedMonthNum, 1);
    const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonthKey(newKey);
    setSelectedCategory(null);
  };

  const handleJumpToCurrent = () => {
    setSelectedMonthKey(currentMonthKey);
    setSelectedCategory(null);
  };

  const monthDate = new Date(selectedYear, selectedMonthNum - 1, 1);
  const monthName = monthDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const isCurrentMonth = selectedMonthKey === currentMonthKey;

  // Filter transactions for this month across all accounts
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      return tx.date.startsWith(selectedMonthKey);
    });
  }, [transactions, selectedMonthKey]);

  // Aggregate monthly figures in global currency
  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    monthTransactions.forEach((tx) => {
      if (tx.type === "income") inc += tx.amount;
      if (tx.type === "expense") exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp,
    };
  }, [monthTransactions]);

  const totalAvailableBalance = useMemo(
    () => accounts.reduce((total, account) => total + (account.balance || 0), 0),
    [accounts],
  );

  // Unique categories in this month for filter chips
  const monthCategories = useMemo(() => {
    const set = new Set<string>();
    monthTransactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [monthTransactions]);

  // Filtered transactions for the feed
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (selectedCategory && tx.category !== selectedCategory) return false;
      if (selectedAccountId !== "all" && tx.accountId !== selectedAccountId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchLabel = tx.label?.toLowerCase().includes(q);
        const matchCat = tx.category?.toLowerCase().includes(q);
        if (!matchLabel && !matchCat) return false;
      }
      return true;
    });
  }, [monthTransactions, typeFilter, selectedCategory, selectedAccountId, search]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

    sortedTransactions.forEach((tx) => {
      const group = groups.get(tx.date);
      if (group) {
        group.push(tx);
      } else {
        groups.set(tx.date, [tx]);
      }
    });

    return Array.from(groups, ([date, dayTransactions]) => ({
      date,
      transactions: dayTransactions,
    }));
  }, [filteredTransactions]);

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      await db.transaction("rw", [db.accounts, db.transactions], async () => {
        await db.transactions.delete(txToDelete.id);
        const targetAccount = accounts.find((a) => a.id === txToDelete.accountId);
        if (targetAccount) {
          const adj =
            txToDelete.type === "expense"
              ? targetAccount.balance + txToDelete.amount
              : targetAccount.balance - txToDelete.amount;
          await db.accounts.update(targetAccount.id, {
            balance: adj,
            updatedAt: new Date().toISOString(),
          });
        }
      });
      setTxToDelete(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || "Compte";
  };

  return (
    <div className="space-y-2.5 sm:space-y-4 pb-20">
      {/* Top Action Header with compact mobile buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dépenses & Flux Mensuels
            </h1>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {isCurrentMonth ? "En cours" : "Archive"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi des dépenses et trésorerie ({currencyInfo.name}).
          </p>
        </div>

        {/* Compact action buttons: 3 columns on mobile, flex row on tablet/desktop */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Button to Categories Management */}
          <button
            onClick={() => setIsCatManagerOpen(true)}
            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 transition active:scale-95 cursor-pointer shadow-2xs"
            title="Ajouter, modifier ou supprimer des catégories"
            aria-label="Gérer les catégories"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
          </button>

          {/* Button to Accounts Management Page */}
          <button
            onClick={() => navigate("/accounts")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Gérer exclusivement vos comptes"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Comptes</span>
          </button>

          {/* Button to Expense Charts Page */}
          <button
            onClick={() => navigate("/expenses/charts")}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Consulter les diagrammes et graphiques"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Graphiques</span>
          </button>

          {/* New Transaction Button - Hidden on mobile because FAB is shown */}
          <button
            onClick={onOpenNewTransaction}
            className="hidden sm:flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Opération</span>
          </button>
        </div>
      </div>

      {/* Month Stepper - Compact & clear */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handlePrevMonth}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-300"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-left px-1">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                {capitalizedMonth}
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight">
              {isCurrentMonth ? "Mois en cours" : "Mois archivé"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              onClick={handleJumpToCurrent}
              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
            >
              Mois courant
            </button>
          )}

          <button
            onClick={handleNextMonth}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-300"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Financial Summary KPIs - Dense & space-saving */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-400 truncate">Dépenses</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight mt-1 truncate">
            {formatMoney(totalExpense, currency)}
          </div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate block">
            {monthTransactions.filter((t) => t.type === "expense").length} débit
            {monthTransactions.filter((t) => t.type === "expense").length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-400 truncate">Revenus</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight mt-1 truncate">
            {formatMoney(totalIncome, currency)}
          </div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate block">
            Disponible dans les comptes : {formatMoney(totalAvailableBalance, currency)}
          </span>
          <span className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate block">
            {monthTransactions.filter((t) => t.type === "income").length} crédit
            {monthTransactions.filter((t) => t.type === "income").length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Net Savings */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-400 truncate">
              Solde Net
            </span>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                netSavings >= 0
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300"
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-sm sm:text-xl font-black tabular-nums tracking-tight mt-1 truncate ${
              netSavings >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {netSavings >= 0 ? "+" : ""}
            {formatMoney(netSavings, currency)}
          </div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate block">
            {netSavings >= 0 ? "Excédent" : "Déficit"}
          </span>
        </div>
      </div>

      {/* Main Core: Historique des Dépenses Mensuelles */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Historique des Opérations
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              {filteredTransactions.length} opération{filteredTransactions.length > 1 ? "s" : ""} sur {capitalizedMonth}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setTypeFilter("expense")}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  typeFilter === "expense"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Dépenses
              </button>
              <button
                onClick={() => setTypeFilter("income")}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  typeFilter === "income"
                    ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Revenus
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        {monthCategories.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Rayon :</span>
            </span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-[11px] px-2 py-0.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                selectedCategory === null
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Tous
            </button>
            {monthCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`text-[11px] px-2 py-0.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-emerald-700 dark:bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setIsCatManagerOpen(true)}
              className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer whitespace-nowrap flex items-center gap-1 font-semibold shrink-0"
              title="Ajouter ou modifier des catégories"
            >
              <Plus className="w-3 h-3" />
              <span>Gérer catégories</span>
            </button>
          </div>
        )}

        {/* Transactions Feed - Compact, clear, without overlap */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-1.5" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Aucune dépense trouvée pour {capitalizedMonth}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {search || selectedCategory
                  ? "Modifiez vos filtres de recherche."
                  : 'Cliquez sur "Opération" pour enregistrer votre premier achat.'}
              </p>
            </div>
          ) : (
            groupedTransactions.map((group) => (
              <section key={group.date}>
                <h3 className="flex items-center gap-1.5 py-2 text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  {formatDate(group.date)}
                  <span className="font-medium text-slate-400 dark:text-slate-500">
                    · {group.transactions.length} opération{group.transactions.length > 1 ? "s" : ""}
                  </span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {group.transactions.map((tx) => {
                    const isExpense = tx.type === "expense";
                    const isIncome = tx.type === "income";

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="py-2.5 px-1 sm:px-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isExpense
                                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                                : isIncome
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
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

                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{tx.label}</p>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[90px] sm:max-w-none">
                                {getAccountName(tx.accountId)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategory(tx.category);
                                }}
                                className="hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer underline decoration-dotted truncate max-w-[80px] sm:max-w-none"
                              >
                                {tx.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-xs sm:text-sm font-extrabold tabular-nums tracking-tight ${
                                isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {isExpense ? "-" : "+"}
                              {formatMoney(tx.amount, currency)}
                            </div>
                            {tx.shoppingListId && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                via Courses
                              </span>
                            )}
                          </div>

                          {/* Delete button: accessible on mobile without needing hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTxToDelete(tx);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Supprimer cette opération"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Safe In-App Delete Confirmation Modal for Transaction */}
      <ConfirmModal
        isOpen={txToDelete !== null}
        onClose={() => setTxToDelete(null)}
        onConfirm={confirmDeleteTransaction}
        title="Supprimer cette opération ?"
        message={`Êtes-vous sûr de vouloir supprimer "${txToDelete?.label}" d'un montant de ${formatMoney(txToDelete?.amount || 0, currency)} ? Le solde du compte associé sera recalculé.`}
        confirmLabel="Supprimer"
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={selectedTxForDetail !== null}
        onClose={() => setSelectedTxForDetail(null)}
        transaction={selectedTxForDetail}
        accounts={accounts}
        currency={currency}
        onDeleteRequest={(tx) => {
          setSelectedTxForDetail(null);
          setTxToDelete(tx);
        }}
      />

      {/* Categories Manager Modal */}
      <CategoriesManagerModal isOpen={isCatManagerOpen} onClose={() => setIsCatManagerOpen(false)} />

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={onOpenNewTransaction}
        className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-950/40 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
        aria-label="Nouvelle opération"
        title="Ajouter une opération"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
