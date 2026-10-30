import React, { useState } from 'react';
import type { Debt } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import {
  Calendar,
  Phone,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface DebtCardProps {
  debt: Debt;
  onRecordPayment: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onRecordPayment,
  onEdit,
  onDelete,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const isReceivable = debt.direction === 'they_owe_me';
  const isSettled = debt.status === 'settled' || debt.remainingAmount <= 0;
  const repaidAmount = Math.max(0, debt.totalAmount - debt.remainingAmount);
  const percentRepaid = debt.totalAmount > 0 ? (repaidAmount / debt.totalAmount) * 100 : 0;

  // Check if past due date
  const isOverdue = !isSettled && debt.dueDate && new Date(debt.dueDate) < new Date(new Date().toDateString());

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-3 sm:p-3.5 shadow-xs ${
      isSettled
        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40'
        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    }`}>
      {/* Top Header: Person Info & Direction tag */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
              {debt.personName}
            </h3>
            <span
              className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1 ${
                isReceivable
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              {isReceivable ? (
                <>
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>On me doit</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Je dois</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
            {debt.phone && (
              <a
                href={`tel:${debt.phone}`}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
              >
                <Phone className="w-3 h-3" />
                <span>{debt.phone}</span>
              </a>
            )}
            {debt.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400 dark:text-slate-400'}`}>
                <Calendar className="w-3 h-3" />
                <span>Échéance: {formatDate(debt.dueDate)}</span>
                {isOverdue && <span className="text-[10px] uppercase font-bold">(Échue)</span>}
              </div>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(debt)}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
            title="Modifier"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(debt)}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Amounts and Progress */}
      <div className="mt-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">Reste à payer</span>
            <div
              className={`text-base sm:text-lg font-black tabular-nums tracking-tight ${
                isSettled ? 'text-slate-400 dark:text-slate-500' : isReceivable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isSettled ? '0 ' + debt.currency : formatMoney(debt.remainingAmount, debt.currency)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">Montant initial</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
              {formatMoney(debt.totalAmount, debt.currency)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200/70 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isSettled ? 'bg-emerald-600' : isReceivable ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
            style={{ width: `${Math.min(100, percentRepaid)}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-400">
          <span>Déjà remboursé : {formatMoney(repaidAmount, debt.currency)}</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">{Math.round(percentRepaid)}%</span>
        </div>
      </div>

      {debt.notes && (
        <p className="mt-1.5 line-clamp-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 italic px-1">
          "{debt.notes}"
        </p>
      )}

      {/* Footer: Repayment button & History toggle */}
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {/* Toggle partial payments history */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1"
        >
          <span>Historique ({debt.payments?.length || 0})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Record payment CTA */}
        {!isSettled ? (
          <button
            onClick={() => onRecordPayment(debt)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Enregistrer un versement</span>
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>Soldé</span>
          </span>
        )}
      </div>

      {/* Partial Payment History Drawer */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 sm:space-y-2 animate-in fade-in duration-150">
          {!debt.payments || debt.payments.length === 0 ? (
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 italic py-1">
              Aucun versement enregistré pour l'instant.
            </p>
          ) : (
            debt.payments.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between text-[11px] sm:text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    +{formatMoney(p.amount, debt.currency)}
                  </span>
                  {p.notes && <span className="text-slate-400 dark:text-slate-400 ml-1.5">({p.notes})</span>}
                </div>
                <span className="text-slate-400 dark:text-slate-400 font-medium">{formatDate(p.date)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
