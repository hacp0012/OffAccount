import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import type { ShoppingItem, Currency } from '../../types';
import { db } from '../../db/database';

interface ShoppingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  currency: Currency;
  itemToEdit?: ShoppingItem | null;
}

const AISLE_CATEGORIES = [
  'Épicerie',
  'Fruits & Légumes',
  'Boucherie & Poissonnerie',
  'Produits Frais & Laitiers',
  'Boulangerie & Pâtisserie',
  'Boissons',
  'Hygiène & Entretien',
  'Maison & Bazar',
  'Autre rayon',
];

const COMMON_UNITS = ['pcs', 'kg', 'g', 'L', 'bouteille', 'paquet', 'sac', 'boîte'];

export const ShoppingItemModal: React.FC<ShoppingItemModalProps> = ({
  isOpen,
  onClose,
  listId,
  currency,
  itemToEdit,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState(AISLE_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name);
        setQuantity(itemToEdit.quantity.toString());
        setUnit(itemToEdit.unit || 'pcs');
        setUnitPrice(itemToEdit.unitPrice ? itemToEdit.unitPrice.toString() : '');
        setCategory(itemToEdit.category || AISLE_CATEGORIES[0]);
        setNotes(itemToEdit.notes || '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('pcs');
        setUnitPrice('');
        setCategory(AISLE_CATEGORIES[0]);
        setNotes('');
      }
    }
  }, [isOpen, itemToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const numQty = parseFloat(quantity) || 1;
      const numPrice = parseFloat(unitPrice) || 0;
      const now = new Date().toISOString();

      if (itemToEdit) {
        await db.shoppingItems.update(itemToEdit.id, {
          name: name.trim(),
          quantity: numQty,
          unit,
          unitPrice: numPrice,
          category,
          notes: notes.trim(),
        });
      } else {
        const newItem: ShoppingItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          listId,
          name: name.trim(),
          quantity: numQty,
          unit,
          unitPrice: numPrice,
          category,
          checked: false,
          notes: notes.trim(),
          createdAt: now,
        };
        await db.shoppingItems.add(newItem);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save shopping item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? "Modifier l'article" : 'Ajouter un article'}
      description="Précisez la quantité et le prix unitaire pour le calcul du budget."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Désignation de l'article *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Riz basmati, Savon liquide, Bananes..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Quantity and Unit row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Unité de mesure
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Prix unitaire estimé ({currency})
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {currency} / {unit}
            </div>
          </div>
        </div>

        {/* Category / Rayon */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Rayon / Catégorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
          >
            {AISLE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Marque ou précision (optionnel)
          </label>
          <input
            type="text"
            placeholder="ex: Préférer marque Broli ou emballage vert"
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
            disabled={isSaving || !name.trim()}
            className="flex-1 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
          >
            {isSaving ? 'Enregistrement...' : itemToEdit ? 'Mettre à jour' : 'Ajouter au panier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
