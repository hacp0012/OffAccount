import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import type { Debt, DebtDirection } from '../../types';
import { db } from '../../db/database';
import { useAppCurrency } from '../../context/CurrencyContext';
import { UserPlus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: Debt | null;
  initialDirection?: DebtDirection;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  debtToEdit,
  initialDirection = 'they_owe_me',
}) => {
  const { currency: globalCurrency } = useAppCurrency();
  const [direction, setDirection] = useState<DebtDirection>(initialDirection);
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<string>(globalCurrency);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (debtToEdit) {
        setDirection(debtToEdit.direction);
        setPersonName(debtToEdit.personName);
        setPhone(debtToEdit.phone || '');
        setTotalAmount(debtToEdit.totalAmount.toString());
        setCurrency(debtToEdit.currency || globalCurrency);
        setDueDate(debtToEdit.dueDate || '');
        setNotes(debtToEdit.notes || '');
      } else {
        setDirection(initialDirection);
        setPersonName('');
        setPhone('');
        setTotalAmount('');
        setCurrency(globalCurrency);
        const defaultDue = new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0];
        setDueDate(defaultDue);
        setNotes('');
      }
    }
  }, [isOpen, debtToEdit, initialDirection, globalCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(totalAmount);
    if (!personName.trim() || !numAmount || numAmount <= 0) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      if (debtToEdit) {
        // compute remaining based on existing payments
        const paidSoFar = debtToEdit.payments.reduce((acc, p) => acc + p.amount, 0);
        const newRemaining = Math.max(0, numAmount - paidSoFar);

        await db.debts.update(debtToEdit.id, {
          direction,
          personName: personName.trim(),
          phone: phone.trim() || undefined,
          totalAmount: numAmount,
          remainingAmount: newRemaining,
          currency,
          dueDate: dueDate || undefined,
          status: newRemaining <= 0 ? 'settled' : 'active',
          notes: notes.trim(),
          updatedAt: now,
        });
      } else {
        const newDebt: Debt = {
          id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          direction,
          personName: personName.trim(),
          phone: phone.trim() || undefined,
          totalAmount: numAmount,
          remainingAmount: numAmount,
          currency,
          dueDate: dueDate || undefined,
          status: 'active',
          notes: notes.trim(),
          payments: [],
          createdAt: now,
          updatedAt: now,
        };
        await db.debts.add(newDebt);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save debt:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        debtToEdit
          ? 'Modifier la fiche'
          : direction === 'they_owe_me'
          ? 'Nouvelle Créance (On me doit)'
          : 'Nouvelle Dette (Je dois)'
      }
      description="Consignez les engagements financiers avec vos proches ou créanciers."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Switcher: They owe me vs I owe them */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection('they_owe_me')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              direction === 'they_owe_me'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>On me doit (Créance)</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('i_owe_them')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              direction === 'i_owe_them'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Je dois (Dette)</span>
          </button>
        </div>

        {/* Person Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nom de la personne ou entreprise *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Jean de Dieu, Marie, Garage Central..."
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Amount & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Montant total *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Devise
            </label>
            <div className="h-[42px] px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Devise active :</span>
              <span className="font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Phone & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Numéro de téléphone (optionnel)
            </label>
            <input
              type="tel"
              placeholder="+250 ... / +243 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date limite convenue
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Motif / Contexte
          </label>
          <input
            type="text"
            placeholder="ex: Prêt d'urgence pour frais scolaires"
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
            disabled={isSaving || !personName.trim() || !totalAmount}
            className="flex-1 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
          >
            {isSaving ? 'Enregistrement...' : debtToEdit ? 'Mettre à jour' : 'Créer la fiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
