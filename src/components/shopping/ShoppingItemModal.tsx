import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../Modal';
import type { ShoppingItem, Currency, Category } from '../../types';
import { db, DEFAULT_SHOPPING_CATEGORIES } from '../../db/database';
import { Plus, Check, X } from 'lucide-react';

interface ShoppingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  currency: Currency;
  itemToEdit?: ShoppingItem | null;
}

const COMMON_UNITS = ['pcs', 'kg', 'g', 'L', 'bouteille', 'paquet', 'sac', 'boîte'];

export const ShoppingItemModal: React.FC<ShoppingItemModalProps> = ({
  isOpen,
  onClose,
  listId,
  currency,
  itemToEdit,
}) => {
  // Query shopping categories from Dexie
  const dbCategories =
    useLiveQuery(() => db.categories.where('type').equals('shopping').toArray()) || [];

  const availableCategories =
    dbCategories.length > 0
      ? dbCategories.map((c) => c.name)
      : DEFAULT_SHOPPING_CATEGORIES.map((c) => c.name);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState(availableCategories[0] || 'Épicerie');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick category creation inside modal
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsCreatingCategory(false);
      setNewCatName('');
      if (itemToEdit) {
        setName(itemToEdit.name);
        setQuantity(itemToEdit.quantity.toString());
        setUnit(itemToEdit.unit || 'pcs');
        setUnitPrice(itemToEdit.unitPrice ? itemToEdit.unitPrice.toString() : '');
        setCategory(itemToEdit.category || availableCategories[0] || 'Épicerie');
        setNotes(itemToEdit.notes || '');
      } else {
        setName('');
        setQuantity('1');
        setUnit('pcs');
        setUnitPrice('');
        setCategory(availableCategories[0] || 'Épicerie');
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
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Désignation de l'article *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Riz basmati, Savon liquide, Bananes..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Quantity and Unit row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Unité de mesure
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} className="dark:bg-slate-800">
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-400">
              {currency} / {unit}
            </div>
          </div>
        </div>

        {/* Category / Rayon */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Rayon / Catégorie
            </label>
            {!isCreatingCategory && (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Nouveau rayon</span>
              </button>
            )}
          </div>

          {isCreatingCategory ? (
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
              <input
                type="text"
                autoFocus
                placeholder="Nom du nouveau rayon..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newCatName.trim();
                    if (trimmed) {
                      const id = `cat_shop_${Date.now()}`;
                      await db.categories.add({
                        id,
                        name: trimmed,
                        type: 'shopping',
                        isDefault: false,
                        createdAt: new Date().toISOString(),
                      });
                      setCategory(trimmed);
                      setIsCreatingCategory(false);
                      setNewCatName('');
                    }
                  }
                }}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newCatName.trim();
                  if (trimmed) {
                    const id = `cat_shop_${Date.now()}`;
                    await db.categories.add({
                      id,
                      name: trimmed,
                      type: 'shopping',
                      isDefault: false,
                      createdAt: new Date().toISOString(),
                    });
                    setCategory(trimmed);
                    setIsCreatingCategory(false);
                    setNewCatName('');
                  }
                }}
                disabled={!newCatName.trim()}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCatName('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="dark:bg-slate-800">
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Marque ou précision (optionnel)
          </label>
          <input
            type="text"
            placeholder="ex: Préférer marque Broli ou emballage vert"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
            disabled={isSaving || !name.trim()}
            className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
          >
            {isSaving ? 'Enregistrement...' : itemToEdit ? 'Mettre à jour' : 'Ajouter au panier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
