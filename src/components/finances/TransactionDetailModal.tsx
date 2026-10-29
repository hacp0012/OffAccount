import React from 'react';
import type { Transaction, Account } from '../../types';
import { Modal } from '../Modal';
import { formatMoney, formatDate } from '../../utils/formatters';
import {
  TrendingDown,
  TrendingUp,
  ArrowDownLeft,
  Calendar,
  Wallet,
  Tag,
  Trash2,
  ShoppingCart,
  Users,
  CheckCircle,
} from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  currency: string;
  onDeleteRequest: (tx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  accounts,
  currency,
  onDeleteRequest,
}) => {
  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';

  const account = accounts.find((a) => a.id === transaction.accountId);
  const accountName = account?.name || 'Compte introuvable';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de l'opération"
      description="Consultez les informations complètes de cette écriture comptable."
    >
      <div className="space-y-4">
        {/* Header Amount & Type Card */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            isExpense
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60'
              : isIncome
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60'
              : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60'
          }`}
        >
          <div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                isExpense
                  ? 'text-rose-700 dark:text-rose-400'
                  : isIncome
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-blue-700 dark:text-blue-400'
              }`}
            >
              {isExpense ? 'Dépense effectuée' : isIncome ? 'Revenu encaissé' : 'Virement de compte'}
            </span>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 ${
                isExpense
                  ? 'text-rose-700 dark:text-rose-300'
                  : isIncome
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}
            >
              {isExpense ? '-' : '+'}
              {formatMoney(transaction.amount, currency)}
            </div>
          </div>

          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isExpense
                ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300'
                : isIncome
                ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300'
                : 'bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300'
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
        </div>

        {/* Full Non-truncated Description */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">
            Libellé / Motif
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 break-words">
            {transaction.label}
          </p>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Account */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Compte</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {accountName}
            </div>
          </div>

          {/* Category */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Catégorie</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {transaction.category || 'Non catégorisé'}
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Date d'enregistrement</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {formatDate(transaction.date)}
              </span>
            </div>
          </div>
          {transaction.time && (
            <span className="text-xs text-slate-400 font-mono">{transaction.time}</span>
          )}
        </div>

        {/* Linked context if from shopping or debt */}
        {transaction.shoppingListId && (
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShoppingCart className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Écriture générée automatiquement suite au règlement d'une liste de courses.</span>
          </div>
        )}

        {transaction.debtId && (
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Users className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Écriture générée lors du paiement d'une créance ou dette.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDeleteRequest(transaction);
            }}
            className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Supprimer cette opération</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
