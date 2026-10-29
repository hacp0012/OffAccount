import React, { useState } from 'react';
import type { ShoppingList, ShoppingItem, Account } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { db } from '../../db/database';
import { ShoppingItemModal } from './ShoppingItemModal';
import { PayAndRecordModal } from './PayAndRecordModal';
import { ShoppingCategoriesModal } from './ShoppingCategoriesModal';
import { ShoppingItemDetailModal } from './ShoppingItemDetailModal';
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  CreditCard,
  Edit2,
  Trash2,
  ShoppingBag,
  CheckCheck,
  Tag,
} from 'lucide-react';

interface ShoppingDetailViewProps {
  list: ShoppingList;
  items: ShoppingItem[];
  accounts: Account[];
  onBack: () => void;
}

export const ShoppingDetailView: React.FC<ShoppingDetailViewProps> = ({
  list,
  items,
  accounts,
  onBack,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'todo' | 'done'>('all');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ShoppingItem | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Dynamic cost calculations
  const totalEstimated = items.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1), 0);
  const checkedItems = items.filter((i) => i.checked);
  const totalChecked = checkedItems.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1), 0);
  const remainingItems = items.filter((i) => !i.checked);
  const totalRemaining = remainingItems.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1), 0);

  const filteredItems = items.filter((it) => {
    if (filterMode === 'todo') return !it.checked;
    if (filterMode === 'done') return it.checked;
    return true;
  });

  const toggleItemCheck = async (item: ShoppingItem) => {
    try {
      await db.shoppingItems.update(item.id, {
        checked: !item.checked,
      });
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    try {
      await db.shoppingItems.delete(item.id);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const checkAll = async (targetState: boolean) => {
    try {
      await Promise.all(
        items.map((it) => db.shoppingItems.update(it.id, { checked: targetState }))
      );
    } catch (err) {
      console.error('Error checking all items:', err);
    }
  };

  const isCompleted = list.status === 'completed';

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-24">
      {/* Top Navigation & Title Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Retour aux listes"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">{list.title}</h1>
              <span className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md ${
                isCompleted
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}>
                {isCompleted ? 'Payée & Soldée' : 'En cours'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {items.length} article{items.length > 1 ? 's' : ''} ({checkedItems.length} coché{checkedItems.length > 1 ? 's' : ''})
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-2xs transition cursor-pointer"
            title="Gérer les rayons et catégories"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline">Rayons</span>
          </button>

          {!isCompleted && (
            <button
              onClick={() => {
                setItemToEdit(null);
                setIsItemModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Ajouter</span> Article
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Total Cost KPI Dashboard */}
      <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">Total Estimé</span>
          <div className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {formatMoney(totalEstimated, list.currency)}
          </div>
        </div>
        <div className="border-x border-slate-100 dark:border-slate-800 px-2 sm:px-3">
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">Coché / Acheté</span>
          <div className="text-xs sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatMoney(totalChecked, list.currency)}
          </div>
        </div>
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">Restant à régler</span>
          <div className="text-xs sm:text-base font-extrabold text-slate-600 dark:text-slate-400 tabular-nums mt-0.5">
            {formatMoney(totalRemaining, list.currency)}
          </div>
        </div>
      </div>

      {/* Filter and Quick Actions Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('todo')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'todo'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            À acheter ({remainingItems.length})
          </button>
          <button
            onClick={() => setFilterMode('done')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'done'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Achetés ({checkedItems.length})
          </button>
        </div>

        {items.length > 0 && !isCompleted && (
          <button
            onClick={() => checkAll(checkedItems.length < items.length)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition p-1 cursor-pointer flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {checkedItems.length === items.length ? 'Décocher tout' : 'Tout cocher'}
            </span>
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="py-10 sm:py-12 text-center text-slate-400 dark:text-slate-500 p-4">
            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Aucun article dans cette vue</p>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">
              Appuyez sur "Ajouter Article" pour garnir votre panier.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const subtotal = (item.unitPrice || 0) * (item.quantity || 1);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemForDetail(item)}
                className={`p-3 sm:p-4 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                  item.checked
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-400 dark:text-slate-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Left: Direct Checkbox & Item info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCompleted) toggleItemCheck(item);
                    }}
                    title={item.checked ? 'Marquer à acheter' : 'Cocher comme acheté'}
                    className={`min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0 rounded-xl transition cursor-pointer ${
                      item.checked
                        ? 'text-emerald-700 dark:text-emerald-400 hover:scale-105'
                        : 'text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105'
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 fill-emerald-100 dark:fill-emerald-950 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-bold truncate ${
                        item.checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {item.quantity} {item.unit}
                      </span>
                      {item.unitPrice > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatMoney(item.unitPrice, list.currency)}/{item.unit}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Subtotal & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                        item.checked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatMoney(subtotal, list.currency)}
                    </span>
                  </div>

                  {!isCompleted && (
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setItemToEdit(item);
                          setIsItemModalOpen(true);
                        }}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                        title="Modifier l'article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Supprimer l'article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom CTA for "Payer et enregistrer" */}
      {!isCompleted && items.length > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-white dark:from-slate-950 via-white/95 dark:via-slate-950/95 to-transparent pointer-events-none z-30">
          <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="w-full h-12 sm:h-13 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-700/20 active:scale-98 transition flex items-center justify-between px-4 sm:px-5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                <span>Payer et enregistrer</span>
              </div>
              <div className="text-emerald-100 font-bold tabular-nums">
                {formatMoney(checkedItems.length > 0 ? totalChecked : totalEstimated, list.currency)}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Item Modal */}
      <ShoppingItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        listId={list.id}
        currency={list.currency}
        itemToEdit={itemToEdit}
      />

      {/* Pay and Record Interconnection Modal */}
      <PayAndRecordModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        list={list}
        items={items}
        accounts={accounts}
        onSuccess={() => {
          // Handled via reactive db query
        }}
      />

      {/* Shopping Item Detail Modal (opens when clicking an item) */}
      <ShoppingItemDetailModal
        isOpen={!!selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        item={selectedItemForDetail}
        currency={list.currency}
        onToggleCheck={(item) => toggleItemCheck(item)}
        onEdit={(item) => {
          setItemToEdit(item);
          setIsItemModalOpen(true);
        }}
        onDelete={(item) => deleteItem(item)}
        isListCompleted={isCompleted}
      />

      {/* Shopping Categories / Rayons Manager Modal */}
      <ShoppingCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />
    </div>
  );
};
