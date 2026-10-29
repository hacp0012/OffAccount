import React, { useState } from 'react';
import type { Account } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { AccountCard } from './AccountCard';
import { AccountFormModal } from './AccountFormModal';
import { TransferModal } from './TransferModal';
import { ConfirmModal } from '../ConfirmModal';
import { useAppCurrency } from '../../context/CurrencyContext';
import { db } from '../../db/database';
import {
  ArrowLeft,
  Plus,
  ArrowLeftRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccountsManagementViewProps {
  accounts: Account[];
}

export const AccountsManagementView: React.FC<AccountsManagementViewProps> = ({
  accounts,
}) => {
  const navigate = useNavigate();
  const { currency, currencyInfo } = useAppCurrency();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Calculate total balance across all accounts in the global currency
  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await db.accounts.delete(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-20">
      {/* Top Header & Navigation Back Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/expenses')}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
            aria-label="Retour aux dépenses"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Gestion des Comptes
              </h1>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {accounts.length}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              Banques, Mobile Money et espèces.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Virement</span>
          </button>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Net Balance Recap Strip */}
      <div className="bg-emerald-900 dark:bg-slate-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wide block mb-0.5">
            Solde Total Global ({currencyInfo.name})
          </span>
          <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">
            {formatMoney(totalBalance, currency)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-emerald-200 block font-medium">
            Devise active
          </span>
          <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-lg tabular-nums">
            {currency} ({currencyInfo.symbol})
          </span>
        </div>
      </div>

      {/* Dedicated Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={(acc) => {
              setAccountToEdit(acc);
              setIsAccountModalOpen(true);
            }}
            onDelete={(acc) => setAccountToDelete(acc)}
          />
        ))}

        {/* Add account trigger card */}
        <button
          onClick={() => {
            setAccountToEdit(null);
            setIsAccountModalOpen(true);
          }}
          className="min-h-[110px] sm:min-h-[140px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 p-3 sm:p-4 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 flex items-center justify-center transition">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
            Ajouter un nouveau compte
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center max-w-[200px]">
            Mobile Money, Banque ou Espèces
          </span>
        </button>
      </div>

      {/* Modals for Account Management */}
      <AccountFormModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        accountToEdit={accountToEdit}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
      />

      {/* Safe In-App Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={accountToDelete !== null}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Supprimer ce compte ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement le compte "${accountToDelete?.name}" ? Le solde de ${formatMoney(accountToDelete?.balance || 0, currency)} ne sera plus comptabilisé.`}
        confirmLabel="Supprimer le compte"
      />
    </div>
  );
};
