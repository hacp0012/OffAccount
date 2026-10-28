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
    <div className={`bg-white rounded-3xl border transition-all p-4 sm:p-5 shadow-xs ${
      isSettled ? 'border-slate-200/60 bg-slate-50/40' : 'border-slate-200/90 hover:border-slate-300'
    }`}>
      {/* Top Header: Person Info & Direction tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 truncate">
              {debt.personName}
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                isReceivable
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {isReceivable ? (
                <>
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                  <span>On me doit</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                  <span>Je dois</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            {debt.phone && (
              <a
                href={`tel:${debt.phone}`}
                className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition"
              >
                <Phone className="w-3 h-3" />
                <span>{debt.phone}</span>
              </a>
            )}
            {debt.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
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
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Modifier"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(debt)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Amounts and Progress */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Reste à payer</span>
            <div
              className={`text-lg sm:text-xl font-black tabular-nums tracking-tight ${
                isSettled ? 'text-slate-400' : isReceivable ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isSettled ? '0 ' + debt.currency : formatMoney(debt.remainingAmount, debt.currency)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Montant initial</span>
            <span className="text-sm font-bold text-slate-600 tabular-nums">
              {formatMoney(debt.totalAmount, debt.currency)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isSettled ? 'bg-emerald-600' : isReceivable ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
            style={{ width: `${Math.min(100, percentRepaid)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Déjà remboursé : {formatMoney(repaidAmount, debt.currency)}</span>
          <span className="font-semibold text-slate-600">{Math.round(percentRepaid)}%</span>
        </div>
      </div>

      {debt.notes && (
        <p className="mt-2 text-xs text-slate-500 italic px-1">
          "{debt.notes}"
        </p>
      )}

      {/* Footer: Repayment button & History toggle */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Toggle partial payments history */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer p-1"
        >
          <span>Historique ({debt.payments?.length || 0})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Record payment CTA */}
        {!isSettled ? (
          <button
            onClick={() => onRecordPayment(debt)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Enregistrer un versement</span>
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            <span>Soldé</span>
          </span>
        )}
      </div>

      {/* Partial Payment History Drawer */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
          {!debt.payments || debt.payments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">
              Aucun versement enregistré pour l'instant.
            </p>
          ) : (
            debt.payments.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    +{formatMoney(p.amount, debt.currency)}
                  </span>
                  {p.notes && <span className="text-slate-400 ml-1.5">({p.notes})</span>}
                </div>
                <span className="text-slate-400 font-medium">{formatDate(p.date)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
