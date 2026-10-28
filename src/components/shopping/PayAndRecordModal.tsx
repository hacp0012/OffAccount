import React, { useState } from 'react';
import { Modal } from '../Modal';
import type { ShoppingList, ShoppingItem, Account, Debt } from '../../types';
import { db } from '../../db/database';
import { formatMoney } from '../../utils/formatters';
import { CheckCircle2, UserPlus, CreditCard } from 'lucide-react';

interface PayAndRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
  items: ShoppingItem[];
  accounts: Account[];
  onSuccess: () => void;
}

export const PayAndRecordModal: React.FC<PayAndRecordModalProps> = ({
  isOpen,
  onClose,
  list,
  items,
  accounts,
  onSuccess,
}) => {
  // Compute total of checked items or total of all items if none checked
  const checkedItems = items.filter((i) => i.checked);
  const itemsToPay = checkedItems.length > 0 ? checkedItems : items;
  const calculatedTotal = itemsToPay.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1), 0);

  // Accounts with matching currency first
  const matchingAccounts = accounts.filter((a) => a.currency === list.currency);
  const defaultAccount = matchingAccounts[0] || accounts[0];

  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id || '');
  const [customTotal, setCustomTotal] = useState(calculatedTotal.toString());
  const [enableReimbursement, setEnableReimbursement] = useState(false);
  const [debtPersonName, setDebtPersonName] = useState('');
  const [debtPersonPhone, setDebtPersonPhone] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Re-sync when opened
  React.useEffect(() => {
    if (isOpen) {
      const def = (accounts.filter((a) => a.currency === list.currency)[0] || accounts[0])?.id || '';
      setSelectedAccountId(def);
      setCustomTotal(calculatedTotal.toString());
      setEnableReimbursement(false);
      setDebtPersonName('');
      setDebtPersonPhone('');
      setDebtAmount('');
      const defaultDue = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
      setDebtDueDate(defaultDue);
    }
  }, [isOpen, calculatedTotal, list.currency, accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const finalAmount = parseFloat(customTotal) || calculatedTotal;
    if (finalAmount <= 0) return;

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      await db.transaction('rw', [db.accounts, db.transactions, db.shoppingLists, db.debts], async () => {
        let createdDebtId: string | undefined = undefined;

        // 1. If reimbursement requested, create a debt / receivable (they owe me)
        if (enableReimbursement && debtPersonName.trim()) {
          const numDebtAmount = parseFloat(debtAmount) || finalAmount;
          createdDebtId = `debt_${Date.now()}`;
          const newDebt: Debt = {
            id: createdDebtId,
            personName: debtPersonName.trim(),
            phone: debtPersonPhone.trim() || undefined,
            direction: 'they_owe_me',
            totalAmount: numDebtAmount,
            remainingAmount: numDebtAmount,
            currency: list.currency,
            dueDate: debtDueDate || undefined,
            status: 'active',
            notes: `Remboursement courses : "${list.title}"`,
            sourceShoppingListId: list.id,
            payments: [],
            createdAt: now,
            updatedAt: now,
          };
          await db.debts.add(newDebt);
        }

        // 2. Create the Expense Transaction
        const txId = `tx_shop_${Date.now()}`;
        await db.transactions.add({
          id: txId,
          accountId: selectedAccount.id,
          type: 'expense',
          amount: finalAmount,
          currency: selectedAccount.currency,
          category: 'Alimentation & Courses',
          label: `Règlement Courses : ${list.title}`,
          date: today,
          shoppingListId: list.id,
          createdAt: now,
        });

        // 3. Update Account Balance
        await db.accounts.update(selectedAccount.id, {
          balance: selectedAccount.balance - finalAmount,
          updatedAt: now,
        });

        // 4. Mark Shopping List as completed
        await db.shoppingLists.update(list.id, {
          status: 'completed',
          paidFromAccountId: selectedAccount.id,
          paidAmount: finalAmount,
          reimbursementDebtId: createdDebtId,
          completedAt: now,
        });
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to checkout shopping list:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payer et enregistrer la liste"
      description={`Validez le règlement de la liste "${list.title}".`}
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Recapitulation box */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">
              Total à payer ({itemsToPay.length} article{itemsToPay.length > 1 ? 's' : ''})
            </span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              {checkedItems.length > 0 ? 'Articles cochés uniquement' : 'Tous les articles de la liste'}
            </p>
          </div>
          <div className="text-lg font-black text-emerald-950 tabular-nums">
            {formatMoney(calculatedTotal, list.currency)}
          </div>
        </div>

        {/* Selected payment account */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Compte de paiement (débité) *
          </label>
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency}) — Solde: {formatMoney(acc.balance, acc.currency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom amount override if actual register ticket slightly differed */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Montant effectif payé ({list.currency}) *
          </label>
          <input
            type="number"
            step="any"
            min="0.01"
            required
            value={customTotal}
            onChange={(e) => setCustomTotal(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Vous pouvez ajuster le montant réel si le ticket de caisse diffère légèrement.
          </p>
        </div>

        {/* Reimbursement / Debt Module Interconnection */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
            <input
              type="checkbox"
              checked={enableReimbursement}
              onChange={(e) => setEnableReimbursement(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Isoler une part à rembourser (Créance)
              </span>
              <span className="text-[11px] text-slate-500">
                Avez-vous acheté des articles pour quelqu'un d'autre ? Une fiche sera créée dans le module Dettes.
              </span>
            </div>
          </label>

          {enableReimbursement && (
            <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <UserPlus className="w-4 h-4 text-amber-700" />
                <span>Détails du débiteur (qui doit vous rembourser)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-950 mb-1">
                  Nom de la personne *
                </label>
                <input
                  type="text"
                  required={enableReimbursement}
                  placeholder="ex: Patrick, Voisin, Collègue..."
                  value={debtPersonName}
                  onChange={(e) => setDebtPersonName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Montant à rembourser ({list.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required={enableReimbursement}
                    placeholder={customTotal}
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Date limite de remboursement
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-950 mb-1">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  placeholder="+250 ... ou +243 ..."
                  value={debtPersonPhone}
                  onChange={(e) => setDebtPersonPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
            disabled={isProcessing || !selectedAccount || (enableReimbursement && !debtPersonName.trim())}
            className="flex-1 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Enregistrement...' : 'Payer & Enregistrer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
