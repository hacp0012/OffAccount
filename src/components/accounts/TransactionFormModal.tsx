import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../Modal';
import type { Account, TransactionType, Transaction, Category } from '../../types';
import { db, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../db/database';
import { formatMoney } from '../../utils/formatters';
import { TrendingDown, TrendingUp, Plus, Tag, Settings2, Check } from 'lucide-react';
import { useAppCurrency } from '../../context/CurrencyContext';
import { CategoriesManagerModal } from '../finances/CategoriesManagerModal';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  initialType?: TransactionType;
  preselectedAccountId?: string;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialType = 'expense',
  preselectedAccountId,
}) => {
  const { currency } = useAppCurrency();
  const [type, setType] = useState<TransactionType>(initialType);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick inline category addition state
  const [isQuickAddingCat, setIsQuickAddingCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  // Dynamic categories from IndexedDB
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const currentCategories = React.useMemo(() => {
    const filtered = dbCategories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
    if (filtered.length > 0) {
      return filtered.map((c) => c.name);
    }
    // Fallback to defaults
    return type === 'income'
      ? DEFAULT_INCOME_CATEGORIES.map((c) => c.name)
      : DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);
  }, [dbCategories, type]);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      const defaultAcc =
        preselectedAccountId && accounts.some((a) => a.id === preselectedAccountId)
          ? preselectedAccountId
          : accounts[0]?.id || '';
      setAccountId(defaultAcc);
      setAmount('');
      const defaultCats =
        initialType === 'income'
          ? DEFAULT_INCOME_CATEGORIES.map((c) => c.name)
          : DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);
      setCategory(currentCategories[0] || defaultCats[0]);
      setLabel('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsQuickAddingCat(false);
      setQuickCatName('');
    }
  }, [isOpen, initialType, preselectedAccountId, accounts, currentCategories]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!selectedAccount || !numAmount || numAmount <= 0 || !label.trim()) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const newTx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        accountId: selectedAccount.id,
        type,
        amount: numAmount,
        currency: currency,
        category: category.trim(),
        label: label.trim(),
        date: date || now.split('T')[0],
        createdAt: now,
      };

      // Atomic update
      await db.transaction('rw', [db.accounts, db.transactions], async () => {
        await db.transactions.add(newTx);
        const newBalance =
          type === 'income'
            ? selectedAccount.balance + numAmount
            : selectedAccount.balance - numAmount;

        await db.accounts.update(selectedAccount.id, {
          balance: newBalance,
          updatedAt: now,
        });
      });

      onClose();
    } catch (err) {
      console.error('Failed to create transaction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAddCategory = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    const catName = quickCatName.trim();
    try {
      const now = new Date().toISOString();
      await db.categories.add({
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: catName,
        type: type === 'income' ? 'income' : 'expense',
        color: type === 'income' ? '#059669' : '#e11d48',
        isDefault: false,
        createdAt: now,
      });
      setCategory(catName);
      setQuickCatName('');
      setIsQuickAddingCat(false);
    } catch (err) {
      console.error('Failed to quick add category:', err);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={type === 'income' ? 'Ajouter un Revenu' : 'Ajouter une Dépense'}
        description="Ce mouvement mettra automatiquement à jour le solde du compte sélectionné."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle: Expense / Income */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const firstExp = dbCategories.find((c) => c.type === 'expense')?.name || DEFAULT_EXPENSE_CATEGORIES[0].name;
                setCategory(firstExp);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Dépense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const firstInc = dbCategories.find((c) => c.type === 'income')?.name || DEFAULT_INCOME_CATEGORIES[0].name;
                setCategory(firstInc);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Revenu</span>
            </button>
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Compte concerné *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Solde: {formatMoney(acc.balance, currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Montant ({currency}) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {currency}
              </div>
            </div>
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Libellé / Motif *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Plein d'essence, Abonnement, Pain, Vente..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {/* Category selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Catégorie
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddingCat(!isQuickAddingCat)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nouvelle</span>
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setIsCatManagerOpen(true)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Gérer</span>
                </button>
              </div>
            </div>

            {/* Quick Add Inline Input */}
            {isQuickAddingCat && (
              <div className="mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Nom de la nouvelle catégorie..."
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddCategory(e);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleQuickAddCategory}
                  disabled={!quickCatName.trim()}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Créer</span>
                </button>
              </div>
            )}

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white mb-2"
            >
              {currentCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Quick Category Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {currentCategories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    category === c
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Date de l'opération
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving || !amount || !label.trim()}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50 ${
              type === 'income' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isSaving ? 'Enregistrement...' : type === 'income' ? 'Enregistrer le revenu' : 'Enregistrer la dépense'}
          </button>
        </div>
      </form>
    </Modal>

    {/* Categories Manager Modal */}
    <CategoriesManagerModal
      isOpen={isCatManagerOpen}
      onClose={() => setIsCatManagerOpen(false)}
      initialType={type === 'income' ? 'income' : 'expense'}
    />
  </>
);
};
