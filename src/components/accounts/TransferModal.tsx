import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import type { Account, Transaction } from '../../types';
import { db } from '../../db/database';
import { formatMoney } from '../../utils/formatters';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  initialFromAccountId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialFromAccountId,
}) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const from = initialFromAccountId || accounts[0]?.id || '';
      setFromAccountId(from);
      const to = accounts.find((a) => a.id !== from)?.id || accounts[1]?.id || '';
      setToAccountId(to);
      setAmount('');
      setReceivedAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, initialFromAccountId, accounts]);

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);
  const isDifferentCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) return;

    const numFromAmount = parseFloat(amount);
    if (!numFromAmount || numFromAmount <= 0) return;

    const numToAmount = isDifferentCurrency
      ? parseFloat(receivedAmount) || numFromAmount
      : numFromAmount;

    if (numToAmount <= 0) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const transferId = `trf_${Date.now()}`;

      // Source debit transaction
      const debitTx: Transaction = {
        id: `tx_out_${transferId}`,
        accountId: fromAcc.id,
        toAccountId: toAcc.id,
        type: 'transfer',
        amount: numFromAmount,
        currency: fromAcc.currency,
        category: 'Virement émis',
        label: `Virement vers ${toAcc.name}${notes ? ` (${notes})` : ''}`,
        date: date || now.split('T')[0],
        createdAt: now,
      };

      // Destination credit transaction
      const creditTx: Transaction = {
        id: `tx_in_${transferId}`,
        accountId: toAcc.id,
        toAccountId: fromAcc.id,
        type: 'transfer',
        amount: numToAmount,
        currency: toAcc.currency,
        category: 'Virement reçu',
        label: `Virement depuis ${fromAcc.name}${notes ? ` (${notes})` : ''}`,
        date: date || now.split('T')[0],
        createdAt: now,
      };

      await db.transaction('rw', [db.accounts, db.transactions], async () => {
        await db.transactions.bulkAdd([debitTx, creditTx]);
        await db.accounts.update(fromAcc.id, {
          balance: fromAcc.balance - numFromAmount,
          updatedAt: now,
        });
        await db.accounts.update(toAcc.id, {
          balance: toAcc.balance + numToAmount,
          updatedAt: now,
        });
      });

      onClose();
    } catch (err) {
      console.error('Failed to process transfer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transférer des fonds"
      description="Déplacez de l'argent entre vos comptes (ex: Banque ➔ Mobile Money / Espèces)."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Source Account */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Compte d'origine (débité) *
          </label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                {acc.name} — Solde: {formatMoney(acc.balance, acc.currency)}
              </option>
            ))}
          </select>
        </div>

        {/* Visual arrow connector */}
        <div className="flex justify-center -my-1">
          <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <ArrowDown className="w-4 h-4 sm:hidden" />
            <ArrowRight className="w-4 h-4 hidden sm:block" />
          </div>
        </div>

        {/* Destination Account */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Compte de destination (crédité) *
          </label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {accounts
              .filter((acc) => acc.id !== fromAccountId)
              .map((acc) => (
                <option key={acc.id} value={acc.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                  {acc.name} — Solde: {formatMoney(acc.balance, acc.currency)}
                </option>
              ))}
          </select>
        </div>

        {/* Amount to transfer */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Montant débité {fromAcc ? `(${fromAcc.currency})` : ''} *
          </label>
          <input
            type="number"
            step="any"
            min="0.01"
            required
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* If different currencies, ask for received amount */}
        {isDifferentCurrency && (
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
              Montant reçu sur le compte cible ({toAcc?.currency}) *
            </label>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2">
              Conversion de devise : précisez le montant effectif reçu après change ou frais.
            </p>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="Montant après conversion"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Date du virement
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Motif / Référence (optionnel)
          </label>
          <input
            type="text"
            placeholder="ex: Retrait distributeur pour espèces du week-end"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Actions */}
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
            disabled={isSaving || !amount || fromAccountId === toAccountId}
            className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
          >
            {isSaving ? 'Traitement...' : 'Effectuer le virement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
