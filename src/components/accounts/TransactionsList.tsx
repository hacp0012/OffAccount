import React, { useState } from 'react';
import type { Transaction, Account } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import { db } from '../../db/database';
import {
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Search,
  Trash2,
  Filter,
} from 'lucide-react';

interface TransactionsListProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedAccountId?: string | null;
  onClearAccountFilter?: () => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  accounts,
  selectedAccountId,
  onClearAccountFilter,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [activeAccountId, setActiveAccountId] = useState<string>(selectedAccountId || 'all');

  // Sync if selectedAccountId prop changes
  React.useEffect(() => {
    if (selectedAccountId) {
      setActiveAccountId(selectedAccountId);
    }
  }, [selectedAccountId]);

  const filteredTransactions = transactions.filter((tx) => {
    // Account filter
    if (activeAccountId !== 'all' && tx.accountId !== activeAccountId && tx.toAccountId !== activeAccountId) {
      return false;
    }
    // Type filter
    if (filterType !== 'all' && tx.type !== filterType) {
      return false;
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchLabel = tx.label?.toLowerCase().includes(q);
      const matchCat = tx.category?.toLowerCase().includes(q);
      if (!matchLabel && !matchCat) return false;
    }
    return true;
  });

  const handleDelete = async (tx: Transaction) => {
    const confirmDelete = window.confirm(`Supprimer l'opération "${tx.label}" ? Le solde du compte sera réajusté.`);
    if (!confirmDelete) return;

    try {
      await db.transaction('rw', [db.accounts, db.transactions], async () => {
        await db.transactions.delete(tx.id);

        const targetAccount = accounts.find((a) => a.id === tx.accountId);
        if (targetAccount) {
          let adjustedBalance = targetAccount.balance;
          if (tx.type === 'expense') {
            adjustedBalance += tx.amount; // give money back
          } else if (tx.type === 'income') {
            adjustedBalance -= tx.amount; // take money back
          } else if (tx.type === 'transfer') {
            adjustedBalance += tx.amount;
          }
          await db.accounts.update(targetAccount.id, {
            balance: adjustedBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Compte inconnu';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Historique des Opérations</h2>
          <p className="text-xs text-slate-500">
            {filteredTransactions.length} opération{filteredTransactions.length > 1 ? 's' : ''} enregistrée{filteredTransactions.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par libellé ou catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {/* Type pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'Toutes' },
              { id: 'expense', label: 'Dépenses' },
              { id: 'income', label: 'Revenus' },
              { id: 'transfer', label: 'Virements' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterType === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Account Selector filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={activeAccountId}
            onChange={(e) => {
              setActiveAccountId(e.target.value);
              if (e.target.value === 'all' && onClearAccountFilter) {
                onClearAccountFilter();
              }
            }}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tous les comptes</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List Feed */}
      <div className="mt-4 divide-y divide-slate-100">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">Aucune opération trouvée</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Essayez un autre mot-clé' : 'Enregistrez votre première dépense ou recette.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';

            return (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors group"
              >
                {/* Left: Icon & Description */}
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
                      <ArrowLeftRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {tx.label}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <span>{getAccountName(tx.accountId)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(tx.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Delete Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight ${
                        isExpense
                          ? 'text-rose-600'
                          : isIncome
                          ? 'text-emerald-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {formatMoney(tx.amount, tx.currency)}
                    </div>
                    {tx.shoppingListId && (
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        via Courses
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(tx)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Supprimer cette opération"
                    aria-label="Supprimer"
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
  );
};
