import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SHOPPING_CATEGORIES } from '../../db/database';
import type { Category } from '../../types';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import {
  Tag,
  Plus,
  Trash2,
  Check,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

interface ShoppingCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (catName: string) => void;
}

const COLOR_PALETTE = [
  '#059669', // Emerald
  '#16a34a', // Green
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#e11d48', // Rose
  '#ea580c', // Orange
  '#d97706', // Amber
  '#0d9488', // Teal
  '#64748b', // Slate
];

export const ShoppingCategoriesModal: React.FC<ShoppingCategoriesModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  // Queries
  const categories =
    useLiveQuery(() => db.categories.where('type').equals('shopping').toArray()) || [];
  const items = useLiveQuery(() => db.shoppingItems.toArray()) || [];

  // Usage by category
  const usageByCatName = React.useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      if (it.category) {
        map[it.category] = (map[it.category] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // Check duplicate
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      alert('Un rayon ou catégorie portant ce nom existe déjà.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const newCategory: Category = {
        id: `cat_shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        type: 'shopping',
        color: newCatColor,
        isDefault: false,
        createdAt: now,
      };

      await db.categories.add(newCategory);
      if (onCategoryCreated) {
        onCategoryCreated(trimmed);
      }
      setNewCatName('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create shopping category:', err);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      await db.categories.delete(catToDelete.id);
      setCatToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Rayons & Catégories de courses"
        description="Gérez les rayons et catégories pour organiser vos articles de courses."
      >
        <div className="space-y-4">
          {/* Header Action: Add category trigger */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un nouveau rayon / catégorie</span>
            </button>
          ) : (
            <form
              onSubmit={handleSaveNew}
              className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Nouveau rayon
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nom du rayon *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ex: Surgelés, Bébé, Animaux, Bricolage..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Couleur d'identification
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className="w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c }}
                    >
                      {newCatColor === c && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Enregistrer le rayon
                </button>
              </div>
            </form>
          )}

          {/* List of categories */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar pr-0.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Rayons existants ({categories.length})
            </span>

            {categories.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chargement des catégories...
              </div>
            ) : (
              categories.map((cat) => {
                const count = usageByCatName[cat.name] || 0;
                return (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color || '#059669' }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {cat.isDefault ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Standard</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Personnalisé</span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{count} article{count > 1 ? 's' : ''} associé{count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {!cat.isDefault && (
                      <button
                        onClick={() => setCatToDelete(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Supprimer ce rayon personnalisé"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Deleting Category */}
      <ConfirmModal
        isOpen={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Supprimer le rayon ?"
        message={`Êtes-vous sûr de vouloir supprimer le rayon "${catToDelete?.name}" ? Les articles existants conserveront leur libellé.`}
        confirmText="Supprimer"
        isDestructive={true}
      />
    </>
  );
};
