import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../db/database';
import type { Category, Transaction } from '../../types';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Palette,
} from 'lucide-react';

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income';
}

const COLOR_PALETTE = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#e11d48', // Rose
  '#d97706', // Amber
  '#0d9488', // Teal
  '#64748b', // Slate
];

export const CategoriesManagerModal: React.FC<CategoriesManagerModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(initialType);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete confirmation state
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [catUsageCount, setCatUsageCount] = useState<number>(0);

  // Queries
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  // Categorize counts
  const usageByCatName = React.useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.category) {
        map[tx.category] = (map[tx.category] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  const displayedCategories = categories.filter((c) => c.type === activeTab);

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewCatName('');
    setNewCatColor(activeTab === 'expense' ? '#e11d48' : '#059669');
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const now = new Date().toISOString();
      const newCategory: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: newCatName.trim(),
        type: activeTab,
        color: newCatColor,
        isDefault: false,
        createdAt: now,
      };

      await db.categories.add(newCategory);
      setNewCatName('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLOR_PALETTE[0]);
  };

  const handleSaveEdit = async (cat: Category) => {
    if (!editName.trim()) return;
    const oldName = cat.name;
    const newName = editName.trim();

    try {
      await db.transaction('rw', [db.categories, db.transactions], async () => {
        // 1. Update category
        await db.categories.update(cat.id, {
          name: newName,
          color: editColor,
        });

        // 2. Cascade rename across all historical transactions if name changed
        if (oldName !== newName) {
          const matchingTxs = await db.transactions
            .where('category')
            .equals(oldName)
            .toArray();

          for (const tx of matchingTxs) {
            await db.transactions.update(tx.id, { category: newName });
          }
        }
      });

      setEditingCatId(null);
    } catch (err) {
      console.error('Failed to edit category:', err);
    }
  };

  const handleRequestDelete = (cat: Category) => {
    const count = usageByCatName[cat.name] || 0;
    setCatUsageCount(count);
    setCatToDelete(cat);
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;

    try {
      await db.transaction('rw', [db.categories, db.transactions], async () => {
        // Reassign affected transactions to default fallback
        const fallbackName =
          catToDelete.type === 'expense' ? 'Divers & Imprévus' : 'Autre revenu';

        if (catUsageCount > 0) {
          const matchingTxs = await db.transactions
            .where('category')
            .equals(catToDelete.name)
            .toArray();

          for (const tx of matchingTxs) {
            await db.transactions.update(tx.id, { category: fallbackName });
          }
        }

        // Delete category
        await db.categories.delete(catToDelete.id);
      });

      setCatToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestion des Catégories"
        description="Ajoutez, personnalisez et modifiez vos catégories de dépenses et de flux."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Tab Switcher: Dépenses vs Revenus */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('expense');
                  setIsAdding(false);
                  setEditingCatId(null);
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeTab === 'expense'
                    ? 'bg-white dark:bg-slate-700 text-rose-800 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>
                  Dépenses (
                  {categories.filter((c) => c.type === 'expense').length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('income');
                  setIsAdding(false);
                  setEditingCatId(null);
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeTab === 'income'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Revenus (
                  {categories.filter((c) => c.type === 'income').length})
                </span>
              </button>
            </div>

            {!isAdding && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            )}
          </div>

          {/* Add Category Form Box */}
          {isAdding && (
            <form
              onSubmit={handleSaveNew}
              className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    Nouvelle catégorie de{' '}
                    {activeTab === 'expense' ? 'Dépense' : 'Revenu'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'expense'
                      ? 'ex: Abonnements, Animaux, Restaurant...'
                      : 'ex: Primes, Location immobilière, Cadeaux...'
                  }
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Couleur du badge
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setNewCatColor(color)}
                      className={`w-6 h-6 rounded-full transition cursor-pointer ${
                        newCatColor === color
                          ? 'ring-2 ring-offset-2 ring-emerald-700 dark:ring-offset-slate-900 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Enregistrer la catégorie
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
            {displayedCategories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <Tag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aucune catégorie trouvée
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Cliquez sur "Ajouter" pour créer votre première catégorie.
                </p>
              </div>
            ) : (
              displayedCategories.map((cat) => {
                const isEditing = editingCatId === cat.id;
                const usage = usageByCatName[cat.name] || 0;

                return (
                  <div
                    key={cat.id}
                    className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat)}
                            disabled={!editName.trim()}
                            className="p-1.5 rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Annuler"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold mr-1">
                            Couleur:
                          </span>
                          {COLOR_PALETTE.map((color) => (
                            <button
                              type="button"
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`w-4 h-4 rounded-full cursor-pointer transition ${
                                editColor === color
                                  ? 'ring-2 ring-offset-1 ring-slate-800 dark:ring-offset-slate-900 scale-110'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* View Row */
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cat.color || '#64748b' }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                              {usage} opération{usage > 1 ? 's' : ''} associée
                              {usage > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                            title="Modifier la catégorie"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Supprimer la catégorie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Category Deletion Modal */}
      <ConfirmModal
        isOpen={catToDelete !== null}
        onClose={() => setCatToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer la catégorie ?"
        message={
          catUsageCount > 0
            ? `Cette catégorie est utilisée par ${catUsageCount} transaction(s). Si vous la supprimez, ces transactions seront automatiquement réaffectées à "${
                catToDelete?.type === 'expense'
                  ? 'Divers & Imprévus'
                  : 'Autre revenu'
              }". Confirmer la suppression ?`
            : `Voulez-vous vraiment supprimer définitivement la catégorie "${catToDelete?.name}" ?`
        }
        confirmLabel="Supprimer"
        cancelLabel="Conserver"
        isDestructive={true}
      />
    </>
  );
};
