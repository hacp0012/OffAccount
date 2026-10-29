import React from 'react';
import type { ShoppingItem, Currency } from '../../types';
import { Modal } from '../Modal';
import { formatMoney } from '../../utils/formatters';
import {
  CheckCircle,
  Circle,
  Edit2,
  Trash2,
  Tag,
  Package,
  Layers,
  FileText,
  DollarSign,
} from 'lucide-react';

interface ShoppingItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShoppingItem | null;
  currency: Currency;
  onToggleCheck: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  isListCompleted?: boolean;
}

export const ShoppingItemDetailModal: React.FC<ShoppingItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currency,
  onToggleCheck,
  onEdit,
  onDelete,
  isListCompleted = false,
}) => {
  if (!item) return null;

  const total = (item.unitPrice || 0) * (item.quantity || 1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de l'article"
      description="Consultez les informations complètes et gérez l'état de l'article."
    >
      <div className="space-y-4">
        {/* Item Header & Status */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Désignation du produit
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 break-words">
              {item.name}
            </h2>
          </div>
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 ${
              item.checked
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
            }`}
          >
            {item.checked ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Acheté</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" />
                <span>À acheter</span>
              </>
            )}
          </span>
        </div>

        {/* Quantities & Price KPI Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
              <Package className="w-3.5 h-3.5" />
              <span>Quantité</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {item.quantity} {item.unit}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Prix Unitaire</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
              {item.unitPrice > 0 ? formatMoney(item.unitPrice, currency) : 'Non renseigné'}
            </div>
          </div>
        </div>

        {/* Total Price Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide block">
              Coût Total Estimé
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-100 tabular-nums">
              {formatMoney(total, currency)}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {item.quantity} × {item.unitPrice > 0 ? formatMoney(item.unitPrice, currency) : 0}
          </span>
        </div>

        {/* Rayon / Category */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Rayon / Catégorie</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {item.category || 'Rayon général'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes / Marque if any */}
        {item.notes && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes ou spécifications</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">
              "{item.notes}"
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {!isListCompleted && (
            <button
              onClick={() => {
                onToggleCheck(item);
                onClose();
              }}
              className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                item.checked
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {item.checked ? (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Marquer comme à acheter</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Valider / Cocher comme acheté</span>
                </>
              )}
            </button>
          )}

          <div className="flex gap-2">
            {!isListCompleted && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onDelete(item);
                  }}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
