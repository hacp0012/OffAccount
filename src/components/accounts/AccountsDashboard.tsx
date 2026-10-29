import React, { useState } from 'react';
import type { Account, Transaction, Currency } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { AccountCard } from './AccountCard';
import { AccountFormModal } from './AccountFormModal';
import { TransactionFormModal } from './TransactionFormModal';
import { TransferModal } from './TransferModal';
import { TransactionsList } from './TransactionsList';
import { db } from '../../db/database';
import {
  Plus,
  ArrowLeftRight,
  PlusCircle,
  Wallet,
  TrendingDown,
  TrendingUp,
  Landmark,
  BarChart3,
  Calendar,
  ChevronRight,
} from 'lucide-react';

interface AccountsDashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  onOpenNewTransaction: () => void;
  onOpenTransfer: () => void;
  onNavigateToMonthly?: () => void;
  isNewTxOpen: boolean;
  setIsNewTxOpen: (open: boolean) => void;
  isTransferOpen: boolean;
  setIsTransferOpen: (open: boolean) => void;
}

export const AccountsDashboard: React.FC<AccountsDashboardProps> = ({
  accounts,
  transactions,
  onOpenNewTransaction,
  onOpenTransfer,
  onNavigateToMonthly,
  isNewTxOpen,
  setIsNewTxOpen,
  isTransferOpen,
  setIsTransferOpen,
}) => {
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  // Filter accounts by currency tab
  const displayedAccounts = accounts.filter((a) => {
    if (currencyFilter !== 'all' && a.currency !== currencyFilter) return false;
    return true;
  });

  // Calculate net balances per currency
  const netBalances: Record<Currency, number> = {
    FRw: 0,
    FC: 0,
    USD: 0,
  };

  accounts.forEach((acc) => {
    netBalances[acc.currency] = (netBalances[acc.currency] || 0) + acc.balance;
  });

  // Calculate current month expenses
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const currentMonthExpenses: Record<Currency, number> = {
    FRw: 0,
    FC: 0,
    USD: 0,
  };

  transactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.date?.startsWith(currentMonthKey)) {
      currentMonthExpenses[tx.currency] = (currentMonthExpenses[tx.currency] || 0) + tx.amount;
    }
  });

  const handleDeleteAccount = async (account: Account) => {
    const confirm = window.confirm(
      `Supprimer le compte "${account.name}" ? Ses transactions passées seront conservées dans l'historique.`
    );
    if (!confirm) return;

    try {
      await db.accounts.delete(account.id);
      if (selectedAccountId === account.id) {
        setSelectedAccountId(null);
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Net Wealth Multi-Currency Hero Card */}
      <div className="relative overflow-hidden bg-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-300">
                Patrimoine Net Global
              </span>
              <span className="text-[10px] bg-emerald-700/60 text-emerald-100 font-semibold px-2 py-0.5 rounded-full">
                {accounts.length} comptes
              </span>
            </div>
            
            {/* Display the 3 distinct currencies cleanly */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
                <span className="text-[11px] text-emerald-200 block font-medium">Franc Rwandais</span>
                <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight mt-0.5">
                  {formatMoney(netBalances.FRw, 'FRw')}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
                <span className="text-[11px] text-emerald-200 block font-medium">Franc Congolais</span>
                <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight mt-0.5">
                  {formatMoney(netBalances.FC, 'FC')}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
                <span className="text-[11px] text-emerald-200 block font-medium">Dollar US</span>
                <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight mt-0.5">
                  {formatMoney(netBalances.USD, 'USD')}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Pill Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={onOpenNewTransaction}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-sm hover:bg-emerald-50 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>+ Mouvement</span>
            </button>
            <button
              onClick={onOpenTransfer}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-200" />
              <span>Virement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Month Expenses Focus Banner */}
      <div
        onClick={onNavigateToMonthly}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-emerald-500/50 hover:bg-slate-50/60 transition-all cursor-pointer shadow-xs group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Dépenses du Mois : {capitalizedMonth}
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Suivi Prioritaire
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3 mt-1">
                {(['FRw', 'FC', 'USD'] as Currency[]).map((cur) => (
                  <span key={cur} className="text-xs font-medium text-slate-500">
                    {cur} :{' '}
                    <strong className="text-slate-900 font-extrabold tabular-nums">
                      {formatMoney(currentMonthExpenses[cur], cur)}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform self-end sm:self-auto">
            <span>Historique & Graphiques</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Accounts Section Header & Currency Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Mes Comptes</h2>
            <span className="text-xs text-slate-400 font-medium">({accounts.length})</span>
          </div>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
            className="sm:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau compte</span>
          </button>
        </div>

        {/* Currency filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setCurrencyFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              currencyFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes les devises
          </button>
          {(['FRw', 'FC', 'USD'] as Currency[]).map((cur) => (
            <button
              key={cur}
              onClick={() => setCurrencyFilter(cur)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                currencyFilter === cur ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {displayedAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isSelected={selectedAccountId === account.id}
            onSelect={(acc) => {
              // Toggle selection to filter transactions
              setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id);
            }}
            onEdit={(acc) => {
              setAccountToEdit(acc);
              setIsAccountModalOpen(true);
            }}
            onDelete={handleDeleteAccount}
          />
        ))}

        {/* Create new account card */}
        <button
          onClick={() => {
            setAccountToEdit(null);
            setIsAccountModalOpen(true);
          }}
          className="min-h-[140px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-700 transition cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">Ajouter un nouveau compte</span>
        </button>
      </div>

      {/* Selected Account Filter Banner */}
      {selectedAccountId && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
            <span>Filtré sur le compte :</span>
            <span className="font-bold underline">
              {accounts.find((a) => a.id === selectedAccountId)?.name}
            </span>
          </div>
          <button
            onClick={() => setSelectedAccountId(null)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            Afficher tous les comptes
          </button>
        </div>
      )}

      {/* Transactions List */}
      <TransactionsList
        transactions={transactions}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onClearAccountFilter={() => setSelectedAccountId(null)}
      />

      {/* Modals */}
      <AccountFormModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        accountToEdit={accountToEdit}
      />

      <TransactionFormModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        accounts={accounts}
        preselectedAccountId={selectedAccountId || undefined}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        initialFromAccountId={selectedAccountId || undefined}
      />
    </div>
  );
};
