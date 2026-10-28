import React, { useState } from 'react';
import type { ShoppingList, ShoppingItem } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';
import { db } from '../../db/database';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import { useAppCurrency } from '../../context/CurrencyContext';
import {
  Plus,
  ShoppingCart,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Clock,
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
    <div className="space-y-4 pb-20">
      {/* Header and Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Listes de Courses</h1>
          <p className="text-xs text-slate-500">Planifiez vos achats et réglez vos paniers en un geste.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle liste</span>
        </button>
      </div>

      {/* Global Dynamic Cost Summary Banner */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-bold tracking-wide uppercase text-emerald-300">
              Coût Total Global des Listes en Cours
            </span>
          </div>
          <span className="text-xs text-emerald-200/80 font-medium">
            {activeLists.length} liste{activeLists.length > 1 ? 's' : ''} active{activeLists.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-emerald-700/50 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">
            {formatMoney(globalTotalCost, currency)}
          </span>
          <span className="text-xs text-emerald-300 font-semibold">au total</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
            filterTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En cours ({activeLists.length})</span>
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
            filterTab === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Payées / Terminées ({completedLists.length})</span>
        </button>
      </div>

      {/* Shopping Lists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayedLists.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-6">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {filterTab === 'active' ? 'Aucune liste de courses active' : 'Aucune liste archivée'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
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
                className="group relative bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 sm:p-5 transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                      {list.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setListToDelete(list);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Supprimer la liste"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        stats.itemsCount > 0 ? (stats.checkedCount / stats.itemsCount) * 100 : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Cost & Disclosure */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Coût total estimé</span>
                    <span className="text-base font-extrabold text-slate-900 tabular-nums">
                      {formatMoney(stats.totalCost, list.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom de la liste *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Marché Kimironko, Supermarché de la gare..."
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Devise de l'application :</span>
            <span className="font-black text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md">
              {currency}
            </span>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!newListTitle.trim()}
              className="flex-1 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-98 cursor-pointer"
            >
              Créer la liste
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
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
    </div>
  );
};
