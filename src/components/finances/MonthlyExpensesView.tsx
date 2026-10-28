import React, { useState, useMemo } from 'react';
import type { Transaction, Account } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import { db } from '../../db/database';
import { useAppCurrency } from '../../context/CurrencyContext';
import { ConfirmModal } from '../ConfirmModal';
import { CategoriesManagerModal } from './CategoriesManagerModal';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MonthlyExpensesViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onOpenNewTransaction: () => void;
}

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({
  transactions,
  accounts,
  onOpenNewTransaction,
}) => {
  const navigate = useNavigate();
  const { currency, currencyInfo } = useAppCurrency();

  // Current month default: "2026-10"
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

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
      if (tx.type === 'income') inc += tx.amount;
      if (tx.type === 'expense') exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp,
    };
  }, [monthTransactions]);

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
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (selectedCategory && tx.category !== selectedCategory) return false;
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchLabel = tx.label?.toLowerCase().includes(q);
        const matchCat = tx.category?.toLowerCase().includes(q);
        if (!matchLabel && !matchCat) return false;
      }
      return true;
    });
  }, [monthTransactions, typeFilter, selectedCategory, selectedAccountId, search]);

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      await db.transaction('rw', [db.accounts, db.transactions], async () => {
        await db.transactions.delete(txToDelete.id);
        const targetAccount = accounts.find((a) => a.id === txToDelete.accountId);
        if (targetAccount) {
          const adj =
            txToDelete.type === 'expense'
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
      console.error('Failed to delete transaction:', err);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || 'Compte';
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Top Action Header with buttons for Accounts & Charts */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Dépenses & Flux Mensuels
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              {isCurrentMonth ? 'Mois en cours' : 'Archive'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique complet, contrôle des dépenses et portefeuilles ({currencyInfo.name}).
          </p>
        </div>

        {/* The two essential requested buttons + Add transaction */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button to Accounts Management Page */}
          <button
            onClick={() => navigate('/accounts')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Gérer exclusivement vos comptes"
          >
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span>Gérer mes comptes ({accounts.length})</span>
          </button>

          {/* Button to Categories Management */}
          <button
            onClick={() => setIsCatManagerOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Ajouter, modifier ou supprimer des catégories de dépenses et revenus"
          >
            <Tag className="w-4 h-4 text-emerald-700" />
            <span>Gérer les catégories</span>
          </button>

          {/* Button to Expense Charts Page */}
          <button
            onClick={() => navigate('/expenses/charts')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Consulter les diagrammes et graphiques"
          >
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            <span>Diagrammes & Graphiques</span>
          </button>

          {/* New Transaction Button */}
          <button
            onClick={onOpenNewTransaction}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle opération</span>
          </button>
        </div>
      </div>

      {/* Month Stepper (Clean & single global currency) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-slate-700"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-left px-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {capitalizedMonth}
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {isCurrentMonth ? 'Mois en cours (Priorité)' : 'Mois sélectionné'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <button
              onClick={handleJumpToCurrent}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
            >
              Mois courant
            </button>
          )}

          <button
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-slate-700"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Monthly Financial Summary KPIs in Global Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Expenses */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              Dépenses du Mois ({capitalizedMonth})
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums tracking-tight mt-1">
              {formatMoney(totalExpense, currency)}
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
              Revenus du Mois ({capitalizedMonth})
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums tracking-tight mt-1">
              {formatMoney(totalIncome, currency)}
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
              Solde Net / Épargne ({capitalizedMonth})
            </span>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1 ${
                netSavings >= 0 ? 'text-emerald-800' : 'text-rose-600'
              }`}
            >
              {netSavings >= 0 ? '+' : ''}
              {formatMoney(netSavings, currency)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {netSavings >= 0 ? 'Budget excédentaire' : 'Déficit sur le mois'}
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

      {/* Main Core: Historique des Dépenses Mensuelles (Priority) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Historique des Dépenses & Opérations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredTransactions.length} opération{filteredTransactions.length > 1 ? 's' : ''} répertoriée{filteredTransactions.length > 1 ? 's' : ''} sur {capitalizedMonth}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par libellé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Dépenses
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  typeFilter === 'income' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Revenus
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        {monthCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Rayon :</span>
            </span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous
            </button>
            {monthCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setIsCatManagerOpen(true)}
              className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition cursor-pointer whitespace-nowrap flex items-center gap-1 font-semibold shrink-0"
              title="Ajouter ou modifier des catégories"
            >
              <Plus className="w-3 h-3" />
              <span>Gérer les catégories</span>
            </button>
          </div>
        )}

        {/* Transactions Feed */}
        <div className="divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Aucune dépense trouvée pour {capitalizedMonth}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {search || selectedCategory
                  ? 'Modifiez vos filtres de recherche.'
                  : 'Cliquez sur "Nouvelle opération" pour enregistrer votre premier achat.'}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isExpense ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : isIncome ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {tx.label}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-600">
                          {getAccountName(tx.accountId)}
                        </span>
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
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight ${
                          isExpense ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatMoney(tx.amount, currency)}
                      </div>
                      {tx.shoppingListId && (
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          via Courses
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setTxToDelete(tx)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Supprimer cette opération"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
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

      {/* Categories Manager Modal */}
      <CategoriesManagerModal
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
      />
    </div>
  );
};
