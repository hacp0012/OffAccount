import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import type { Account, AccountType, Currency } from '../../types';
import { db } from '../../db/database';
import { useAppCurrency } from '../../context/CurrencyContext';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

const COLOR_OPTIONS = [
  { label: 'Vert Émeraude', value: '#059669' },
  { label: 'Jaune MTN', value: '#eab308' },
  { label: 'Rouge Airtel', value: '#ef4444' },
  { label: 'Bleu Banque', value: '#0284c7' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Ardoise Sombre', value: '#475569' },
];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
}) => {
  const { currency, currencyInfo } = useAppCurrency();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('mobile_money');
  const [balance, setBalance] = useState<string>('0');
  const [color, setColor] = useState('#059669');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setBalance(accountToEdit.balance.toString());
      setColor(accountToEdit.color || '#059669');
      setNotes(accountToEdit.notes || '');
    } else {
      setName('');
      setType('mobile_money');
      setBalance('0');
      setColor('#059669');
      setNotes('');
    }
  }, [accountToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const numBalance = parseFloat(balance) || 0;
      const now = new Date().toISOString();

      if (accountToEdit) {
        await db.accounts.update(accountToEdit.id, {
          name: name.trim(),
          type,
          currency,
          balance: numBalance,
          color,
          notes: notes.trim(),
          updatedAt: now,
        });
      } else {
        const newAccount: Account = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          type,
          currency,
          balance: numBalance,
          color,
          icon: type === 'mobile_money' ? 'smartphone' : type === 'bank' ? 'landmark' : 'wallet',
          notes: notes.trim(),
          createdAt: now,
          updatedAt: now,
        };
        await db.accounts.add(newAccount);
      }
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? 'Modifier le compte' : 'Créer un nouveau compte'}
      description="Ajoutez un portefeuille Mobile Money, compte bancaire ou poche d'espèces."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Account Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nom du compte *
          </label>
          <input
            type="text"
            required
            placeholder="ex: MTN MoMo, Airtel Money, Espèces..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Account Type & Global Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Type de compte
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="mobile_money" className="dark:bg-slate-800">Mobile Money</option>
              <option value="bank" className="dark:bg-slate-800">Compte Bancaire</option>
              <option value="cash" className="dark:bg-slate-800">Espèces (Cash)</option>
              <option value="savings" className="dark:bg-slate-800">Épargne / Coffre</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Devise (Définie dans Paramètres)
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>{currencyInfo.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">{currency}</span>
            </div>
          </div>
        </div>

        {/* Balance Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Solde {accountToEdit ? 'actuel' : 'initial'} ({currency})
          </label>
          <input
            type="number"
            step="any"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Couleur d'identification
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                  color === c.value ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-slate-900 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Remarques (optionnel)
          </label>
          <input
            type="text"
            placeholder="ex: Numéro SIM ou agence"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
          >
            {isSaving ? 'Enregistrement...' : accountToEdit ? 'Mettre à jour' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
