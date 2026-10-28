import React, { useState } from 'react';
import { Modal } from '../Modal';
import type { Debt, Account, DebtPayment, Transaction } from '../../types';
import { db } from '../../db/database';
import { formatMoney } from '../../utils/formatters';
import { CheckCircle2, Wallet } from 'lucide-react';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  accounts: Account[];
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  accounts,
}) => {
  const [amount, setAmount] = useState(debt.remainingAmount.toString());
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [impactAccount, setImpactAccount] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(debt.remainingAmount.toString());
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      // Find matching currency account
      const match = accounts.find((a) => a.currency === debt.currency);
      setSelectedAccountId(match?.id || accounts[0]?.id || '');
    }
  }, [isOpen, debt, accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isReceivable = debt.direction === 'they_owe_me';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const paymentId = `pay_${Date.now()}`;

      const newPayment: DebtPayment = {
        id: paymentId,
        debtId: debt.id,
        amount: numAmount,
        currency: debt.currency,
        date: date || now.split('T')[0],
        notes: notes.trim() || undefined,
        accountId: impactAccount && selectedAccount ? selectedAccount.id : undefined,
        createdAt: now,
      };

      const updatedPayments = [...(debt.payments || []), newPayment];
      const newRemaining = Math.max(0, debt.remainingAmount - numAmount);
      const isSettled = newRemaining <= 0;

      await db.transaction('rw', [db.debts, db.accounts, db.transactions], async () => {
        // Update debt record
        await db.debts.update(debt.id, {
          remainingAmount: newRemaining,
          status: isSettled ? 'settled' : 'active',
          payments: updatedPayments,
          updatedAt: now,
        });

        // Optionally impact financial account
        if (impactAccount && selectedAccount) {
          const txType = isReceivable ? 'income' : 'expense';
          const newTx: Transaction = {
            id: `tx_debt_pay_${Date.now()}`,
            accountId: selectedAccount.id,
            type: txType,
            amount: numAmount,
            currency: selectedAccount.currency,
            category: isReceivable ? 'Remboursement perçu' : 'Remboursement dette',
            label: isReceivable
              ? `Remboursement de ${debt.personName}`
              : `Paiement dette à ${debt.personName}`,
            date: date || now.split('T')[0],
            debtId: debt.id,
            createdAt: now,
          };

          await db.transactions.add(newTx);

          const updatedBalance = isReceivable
            ? selectedAccount.balance + numAmount
            : selectedAccount.balance - numAmount;

          await db.accounts.update(selectedAccount.id, {
            balance: updatedBalance,
            updatedAt: now,
          });
        }
      });

      onClose();
    } catch (err) {
      console.error('Failed to register debt payment:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReceivable ? 'Enregistrer un remboursement perçu' : 'Enregistrer un paiement de dette'}
      description={`Pour le dossier de ${debt.personName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outstanding amount recap */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Reste actuellement dû</span>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatMoney(debt.remainingAmount, debt.currency)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAmount(debt.remainingAmount.toString())}
            className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-lg transition cursor-pointer"
          >
            Tout solder
          </button>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Montant versé ({debt.currency}) *
          </label>
          <input
            type="number"
            step="any"
            min="0.01"
            max={debt.remainingAmount}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
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
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
          />
        </div>

        {/* Impact account toggle */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={impactAccount}
              onChange={(e) => setImpactAccount(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-900 block">
                {isReceivable ? 'Créditer un compte financier' : 'Débiter un compte financier'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isReceivable
                  ? "L'argent perçu augmentera le solde du compte sélectionné."
                  : "Le paiement diminuera le solde du compte sélectionné."}
              </span>
            </div>
          </label>

          {impactAccount && (
            <div className="mt-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required={impactAccount}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) — Solde: {formatMoney(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Note / Référence (optionnel)
          </label>
          <input
            type="text"
            placeholder="ex: Reçu par Mobile Money"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
            disabled={isProcessing || !amount}
            className="flex-1 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Enregistrement...' : 'Valider le versement'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
