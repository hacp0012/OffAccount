import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SHOPPING_CATEGORIES } from '../../db/database';
import type { Category } from '../../types';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
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
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PALETTE[0]);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleStartEdit = (category: Category) => {
    setEditingCatId(category.id);
    setEditName(category.name);
    setEditColor(category.color || COLOR_PALETTE[0]);
    setEditError(null);
  };

  const handleSaveEdit = async (category: Category) => {
    const newName = editName.trim();
    if (!newName) return;

    const duplicate = categories.some(
      (existing) =>
        existing.id !== category.id &&
        existing.name.toLocaleLowerCase() === newName.toLocaleLowerCase(),
    );
    if (duplicate) {
      setEditError('Une catégorie de courses porte déjà ce nom.');
      return;
    }

    try {
      await db.transaction('rw', [db.categories, db.shoppingItems], async () => {
        await db.categories.update(category.id, {
          name: newName,
          color: editColor,
        });

        if (newName !== category.name) {
          const matchingItems = await db.shoppingItems
            .where('category')
            .equals(category.name)
            .toArray();
          await Promise.all(
            matchingItems.map((item) =>
              db.shoppingItems.update(item.id, { category: newName }),
            ),
          );
        }
      });

      setEditingCatId(null);
      setEditError(null);
    } catch (error) {
      console.error('Failed to edit shopping category:', error);
      setEditError(
        error instanceof Error ? error.message : 'Impossible de modifier cette catégorie.',
      );
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
                    {editingCatId === cat.id ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) => {
                              setEditName(event.target.value);
                              setEditError(null);
                            }}
                            maxLength={60}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            aria-label="Nom de la catégorie"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(cat)}
                            disabled={!editName.trim()}
                            className="rounded-lg bg-emerald-700 p-1.5 text-white transition hover:bg-emerald-800 disabled:opacity-50"
                            title="Enregistrer"
                            aria-label="Enregistrer la catégorie"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(null);
                              setEditError(null);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Annuler"
                            aria-label="Annuler la modification"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-[10px] font-semibold text-slate-400">Couleur :</span>
                          {COLOR_PALETTE.map((color) => (
                            <button
                              type="button"
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`h-4 w-4 rounded-full transition ${
                                editColor === color ? 'ring-2 ring-slate-800 ring-offset-1 dark:ring-offset-slate-900' : ''
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={`Choisir la couleur ${color}`}
                              aria-pressed={editColor === color}
                            />
                          ))}
                        </div>
                        {editError && (
                          <p role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            {editError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full shadow-2xs"
                            style={{ backgroundColor: cat.color || '#059669' }}
                          />
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-200 sm:text-sm">
                              {cat.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                              {cat.isDefault ? (
                                <span className="font-medium text-emerald-700 dark:text-emerald-400">Par défaut</span>
                              ) : (
                                <span className="font-medium text-blue-600 dark:text-blue-400">Personnalisé</span>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>{count} article{count > 1 ? 's' : ''} associé{count > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>

                        {!cat.isDefault && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                              title="Modifier cette catégorie"
                              aria-label={`Modifier ${cat.name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatToDelete(cat)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              title="Supprimer ce rayon personnalisé"
                              aria-label={`Supprimer ${cat.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
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
