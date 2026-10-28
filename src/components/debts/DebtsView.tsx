import React, { useState } from 'react';
import type { Debt, Account, DebtDirection } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { db } from '../../db/database';
import { DebtCard } from './DebtCard';
import { DebtFormModal } from './DebtFormModal';
import { DebtPaymentModal } from './DebtPaymentModal';
import { ConfirmModal } from '../ConfirmModal';
import { useAppCurrency } from '../../context/CurrencyContext';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface DebtsViewProps {
  debts: Debt[];
  accounts: Account[];
}

export const DebtsView: React.FC<DebtsViewProps> = ({ debts, accounts }) => {
  const { currency } = useAppCurrency();
  const [directionFilter, setDirectionFilter] = useState<DebtDirection>('they_owe_me');
  const [statusFilter, setStatusFilter] = useState<'active' | 'settled'>('active');
  const [search, setSearch] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [debtForPayment, setDebtForPayment] = useState<Debt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  // Filtered list
  const filteredDebts = debts.filter((d) => {
    if (d.direction !== directionFilter) return false;
    const isSettled = d.status === 'settled' || d.remainingAmount <= 0;
    if (statusFilter === 'active' && isSettled) return false;
    if (statusFilter === 'settled' && !isSettled) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = d.personName.toLowerCase().includes(q);
      const matchNotes = d.notes?.toLowerCase().includes(q);
      if (!matchName && !matchNotes) return false;
    }
    return true;
  });

  // Calculate totals for active debts/receivables in global currency
  const activeDirectionDebts = debts.filter(
    (d) => d.direction === directionFilter && d.status !== 'settled' && d.remainingAmount > 0
  );

  const totalAmountRemaining = activeDirectionDebts.reduce(
    (sum, d) => sum + d.remainingAmount,
    0
  );

  const confirmDeleteDebt = async () => {
    if (!debtToDelete) return;
    try {
      await db.debts.delete(debtToDelete.id);
      setDebtToDelete(null);
    } catch (err) {
      console.error('Failed to delete debt:', err);
    }
  };

  const isReceivable = directionFilter === 'they_owe_me';

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Dettes & Créances</h1>
          <p className="text-xs text-slate-500">
            Suivez qui vous doit de l'argent et ce que vous devez rembourser.
          </p>
        </div>

        <button
          onClick={() => {
            setDebtToEdit(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle fiche</span>
        </button>
      </div>

      {/* Main Direction Tabs: "On me doit" vs "Je dois" */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setDirectionFilter('they_owe_me')}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            isReceivable
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          <span>On me doit (Créances)</span>
        </button>

        <button
          onClick={() => setDirectionFilter('i_owe_them')}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            !isReceivable
              ? 'bg-white text-rose-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span>Je dois (Dettes)</span>
        </button>
      </div>

      {/* Dynamic Total KPI Banner */}
      <div
        className={`rounded-3xl p-4 sm:p-5 text-white shadow-sm transition-colors ${
          isReceivable
            ? 'bg-gradient-to-br from-emerald-800 to-emerald-950'
            : 'bg-gradient-to-br from-rose-900 to-slate-950'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-wide uppercase text-white/80">
            {isReceivable ? 'Total à Récupérer (Créances en cours)' : 'Total à Payer (Dettes en cours)'}
          </span>
          <span className="text-xs text-white/70">
            {activeDirectionDebts.length} dossier{activeDirectionDebts.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-white/10 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">
            {formatMoney(totalAmountRemaining, currency)}
          </span>
          <span className="text-xs text-white/70 font-semibold">au total</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status: Active vs Settled */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En cours</span>
          </button>
          <button
            onClick={() => setStatusFilter('settled')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === 'settled' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Soldées</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Debts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredDebts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-6">
            <Users className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Aucun dossier {isReceivable ? 'de créance' : 'de dette'}{' '}
              {statusFilter === 'active' ? 'en cours' : 'soldé'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Modifiez votre recherche' : 'Enregistrez vos prêts ou dettes pour ne rien oublier.'}
            </p>
          </div>
        ) : (
          filteredDebts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onRecordPayment={(d) => {
                setDebtForPayment(d);
                setIsPaymentModalOpen(true);
              }}
              onEdit={(d) => {
                setDebtToEdit(d);
                setIsFormModalOpen(true);
              }}
              onDelete={(d) => setDebtToDelete(d)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <DebtFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
        initialDirection={directionFilter}
      />

      {debtForPayment && (
        <DebtPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setDebtForPayment(null);
          }}
          debt={debtForPayment}
          accounts={accounts}
        />
      )}

      {/* Confirm Delete Debt Modal */}
      <ConfirmModal
        isOpen={debtToDelete !== null}
        onClose={() => setDebtToDelete(null)}
        onConfirm={confirmDeleteDebt}
        title="Supprimer cette fiche ?"
        message={`Voulez-vous vraiment supprimer définitivement le dossier de "${debtToDelete?.personName}" ? Tous les versements enregistrés seront également supprimés.`}
        confirmText="Supprimer"
        cancelText="Conserver"
        isDestructive={true}
      />
    </div>
  );
};
