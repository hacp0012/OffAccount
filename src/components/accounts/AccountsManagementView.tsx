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
  Wallet,
  ShieldCheck,
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
    <div className="space-y-5 pb-24">
      {/* Top Header & Navigation Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/expenses')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            aria-label="Retour aux dépenses"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Gestion des Comptes
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                {accounts.length} portefeuille{accounts.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gérez vos comptes bancaires, Mobile Money et poches d'espèces.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-700" />
            <span>Virement</span>
          </button>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAccountModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau compte</span>
          </button>
        </div>
      </div>

      {/* Net Balance Recap Strip in Active Global Currency */}
      <div className="bg-gradient-to-br from-emerald-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide block mb-1">
            Solde Total Global ({currencyInfo.name})
          </span>
          <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">
            {formatMoney(totalBalance, currency)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-emerald-200 block font-medium">
            Devise active
          </span>
          <span className="text-sm font-bold bg-white/20 px-2.5 py-1 rounded-xl tabular-nums">
            {currency} ({currencyInfo.symbol})
          </span>
        </div>
      </div>

      {/* Dedicated Accounts Grid (ONLY accounts, completely operational) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          className="min-h-[160px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-700 transition cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition">
            <Plus className="w-6 h-6 text-slate-500 group-hover:text-emerald-700" />
          </div>
          <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
            Ajouter un nouveau compte
          </span>
          <span className="text-[11px] text-slate-400 text-center max-w-[200px]">
            Mobile Money (MTN, Airtel, M-Pesa), Banque ou Espèces
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

      {/* Safe In-App Delete Confirmation Modal (Guarantees working deletion) */}
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
