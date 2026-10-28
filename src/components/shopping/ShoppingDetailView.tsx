import React, { useState } from 'react';
import type { ShoppingList, ShoppingItem, Account } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { db } from '../../db/database';
import { ShoppingItemModal } from './ShoppingItemModal';
import { PayAndRecordModal } from './PayAndRecordModal';
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
    <div className="space-y-4 pb-24">
      {/* Top Navigation & Title Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Retour aux listes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">{list.title}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isCompleted ? 'Payée & Soldée' : 'En cours'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {items.length} article{items.length > 1 ? 's' : ''} ({checkedItems.length} coché{checkedItems.length > 1 ? 's' : ''})
            </p>
          </div>
        </div>

        {/* Add Item Button */}
        {!isCompleted && (
          <button
            onClick={() => {
              setItemToEdit(null);
              setIsItemModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Ajouter</span> Article
          </button>
        )}
      </div>

      {/* Dynamic Total Cost KPI Dashboard */}
      <div className="grid grid-cols-3 gap-2.5 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">Total Estimé</span>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
            {formatMoney(totalEstimated, list.currency)}
          </div>
        </div>
        <div className="border-x border-slate-100 px-2 sm:px-3">
          <span className="text-[11px] font-semibold text-emerald-700 block">Coché / Acheté</span>
          <div className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums mt-0.5">
            {formatMoney(totalChecked, list.currency)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">Restant à régler</span>
          <div className="text-sm sm:text-base font-extrabold text-slate-600 tabular-nums mt-0.5">
            {formatMoney(totalRemaining, list.currency)}
          </div>
        </div>
      </div>

      {/* Filter and Quick Actions Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('todo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'todo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            À acheter ({remainingItems.length})
          </button>
          <button
            onClick={() => setFilterMode('done')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              filterMode === 'done' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Achetés ({checkedItems.length})
          </button>
        </div>

        {items.length > 0 && !isCompleted && (
          <button
            onClick={() => checkAll(checkedItems.length < items.length)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition p-1 cursor-pointer flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {checkedItems.length === items.length ? 'Décocher tout' : 'Tout cocher'}
            </span>
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 p-4">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-sm font-semibold text-slate-700">Aucun article dans cette vue</p>
            <p className="text-xs text-slate-400 mt-1">
              Appuyez sur "Ajouter Article" pour garnir votre panier.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const subtotal = (item.unitPrice || 0) * (item.quantity || 1);

            return (
              <div
                key={item.id}
                onClick={() => !isCompleted && toggleItemCheck(item)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                  item.checked ? 'bg-emerald-50/30 text-slate-400' : 'hover:bg-slate-50/70'
                } ${!isCompleted ? 'cursor-pointer' : ''}`}
              >
                {/* Left: Checkbox & Item info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
                      item.checked ? 'text-emerald-700' : 'text-slate-300'
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle className="w-6 h-6 fill-emerald-100 text-emerald-700" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        item.checked ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-600">
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
                      className={`text-sm font-extrabold tabular-nums ${
                        item.checked ? 'text-slate-400' : 'text-slate-900'
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
                        className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        title="Modifier l'article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
        <div className="fixed bottom-16 md:bottom-4 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-30">
          <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="w-full h-13 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-xl shadow-emerald-700/20 active:scale-98 transition flex items-center justify-between px-5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-200" />
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
    </div>
  );
};
