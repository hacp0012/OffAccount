import React, { useState } from 'react';
import type { ShoppingList, ShoppingItem } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import { db } from '../../db/database';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import { ShoppingCategoriesModal } from './ShoppingCategoriesModal';
import { ShoppingListRenameModal } from './ShoppingListRenameModal';
import { useAppCurrency } from '../../context/CurrencyContext';
import {
  Plus,
  ShoppingCart,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Clock,
  Tag,
  Edit2,
} from 'lucide-react';

interface ShoppingListsOverviewProps {
  lists: ShoppingList[];
  items: ShoppingItem[];
  onSelectList: (list: ShoppingList) => void;
}

export const ShoppingListsOverview: React.FC<ShoppingListsOverviewProps> = ({
  lists,
  items,
  onSelectList,
}) => {
  const { currency } = useAppCurrency();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'completed'>('active');
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);
  const [listToRename, setListToRename] = useState<ShoppingList | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Compute cost for each list
  const getListStats = (listId: string) => {
    const listItems = items.filter((it) => it.listId === listId);
    const totalCost = listItems.reduce(
      (acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1),
      0
    );
    const checkedCount = listItems.filter((it) => it.checked).length;
    return {
      itemsCount: listItems.length,
      checkedCount,
      totalCost,
    };
  };

  // Dynamic global totals across active lists
  const activeLists = lists.filter((l) => l.status !== 'completed');
  const completedLists = lists.filter((l) => l.status === 'completed');

  const globalTotalCost = activeLists.reduce((acc, l) => {
    const stats = getListStats(l.id);
    return acc + stats.totalCost;
  }, 0);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      const now = new Date().toISOString();
      const newList: ShoppingList = {
        id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: newListTitle.trim(),
        currency,
        status: 'active',
        createdAt: now,
      };

      await db.shoppingLists.add(newList);
      setNewListTitle('');
      setIsCreateModalOpen(false);
      onSelectList(newList);
    } catch (err) {
      console.error('Failed to create shopping list:', err);
    }
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    try {
      await db.transaction('rw', [db.shoppingLists, db.shoppingItems], async () => {
        await db.shoppingLists.delete(listToDelete.id);
        const relatedItems = items.filter((it) => it.listId === listToDelete.id);
        await Promise.all(relatedItems.map((it) => db.shoppingItems.delete(it.id)));
      });
      setListToDelete(null);
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  const displayedLists = filterTab === 'active' ? activeLists : completedLists;

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-20">
      {/* Header and Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Listes de Courses</h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Planifiez vos achats et réglez vos paniers en un geste.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-2xs transition cursor-pointer"
            title="Gérer les rayons et catégories"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline">Rayons</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Nouvelle liste</span>
          </button>
        </div>
      </div>

      {/* Global Dynamic Cost Summary Banner */}
      <div className="bg-emerald-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wide uppercase text-emerald-300">
              Coût Total Global des Listes en Cours
            </span>
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-200/80 font-medium">
            {activeLists.length} liste{activeLists.length > 1 ? 's' : ''} active{activeLists.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-1 sm:mt-2 pt-2 border-t border-emerald-700/50 flex items-baseline gap-2">
          <span className="text-xl sm:text-3xl font-black tabular-nums tracking-tight">
            {formatMoney(globalTotalCost, currency)}
          </span>
          <span className="text-[11px] sm:text-xs text-emerald-300 font-semibold">au total</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
            filterTab === 'active'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En cours ({activeLists.length})</span>
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
            filterTab === 'completed'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Payées / Terminées ({completedLists.length})</span>
        </button>
      </div>

      {/* Shopping Lists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {displayedLists.length === 0 ? (
          <div className="col-span-full py-10 sm:py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6">
            <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filterTab === 'active' ? 'Aucune liste de courses active' : 'Aucune liste archivée'}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Créez une liste pour suivre vos emplettes au marché ou supermarché.
            </p>
          </div>
        ) : (
          displayedLists.map((list) => {
            const stats = getListStats(list.id);
            const isCompleted = list.status === 'completed';

            return (
              <div
                key={list.id}
                onClick={() => onSelectList(list)}
                className="group relative bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {list.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 sm:px-2 py-0.5 rounded-md">
                        {list.currency}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {stats.checkedCount}/{stats.itemsCount} article{stats.itemsCount > 1 ? 's' : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(list.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setListToRename(list);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      title="Renommer la liste"
                      aria-label={`Renommer ${list.title}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setListToDelete(list);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      title="Supprimer la liste"
                      aria-label={`Supprimer ${list.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Compact progress, cost and disclosure row */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="w-12 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden"
                      role="progressbar"
                      aria-label="Progression de la liste"
                      aria-valuemin={0}
                      aria-valuemax={stats.itemsCount}
                      aria-valuenow={stats.checkedCount}
                    >
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            stats.itemsCount > 0 ? (stats.checkedCount / stats.itemsCount) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Estimé</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
                      {formatMoney(stats.totalCost, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Ouvrir</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create List Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer une liste de courses"
        description="Organisez vos achats par marché, magasin ou projet."
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nom de la liste *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Marché Kimironko, Supermarché de la gare..."
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Devise de l'application :</span>
            <span className="font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
              {currency}
            </span>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-2.5 sm:py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!newListTitle.trim()}
              className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
            >
              Créer la liste
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ShoppingListRenameModal
        list={listToRename}
        isOpen={listToRename !== null}
        onClose={() => setListToRename(null)}
      />

      <ConfirmModal
        isOpen={listToDelete !== null}
        onClose={() => setListToDelete(null)}
        onConfirm={confirmDeleteList}
        title="Supprimer la liste de courses ?"
        message={`Voulez-vous vraiment supprimer définitivement la liste "${listToDelete?.title}" et tous les articles associés ? Cette action est irréversible.`}
        confirmText="Supprimer la liste"
        cancelText="Conserver"
        isDestructive={true}
      />

      {/* Shopping Categories / Rayons Manager Modal */}
      <ShoppingCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-950/40 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
        aria-label="Nouvelle liste"
        title="Ajouter une nouvelle liste"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
