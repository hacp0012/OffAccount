import React from 'react';
import type { Account } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { Smartphone, Landmark, Wallet, PiggyBank, Edit3, Trash2 } from 'lucide-react';
import { useAppCurrency } from '../../context/CurrencyContext';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onSelect?: (account: Account) => void;
  isSelected?: boolean;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
}) => {
  const { currency } = useAppCurrency();
  const getIcon = () => {
    switch (account.type) {
      case 'mobile_money':
        return <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'bank':
        return <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'savings':
        return <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'cash':
      default:
        return <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  const getTypeName = () => {
    switch (account.type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank':
        return 'Compte Bancaire';
      case 'savings':
        return 'Épargne';
      case 'cash':
      default:
        return 'Espèces / Cash';
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(account)}
      className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 transition-all cursor-pointer border ${
        isSelected
          ? 'ring-2 ring-emerald-600 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-900 shadow-md'
          : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 shadow-xs'
      }`}
    >
      {/* Top row: Type indicator & Action icons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: account.color || '#059669' }}
          >
            {getIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
              {account.name}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {getTypeName()}
            </span>
          </div>
        </div>

        {/* Edit and Delete Actions - Accessible directly on touch */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
            title="Modifier le compte"
            aria-label="Modifier"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account);
            }}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            title="Supprimer le compte"
            aria-label="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Balance Presentation */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
        <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Solde disponible</span>
        <div
          className={`text-base sm:text-lg font-extrabold tabular-nums tracking-tight ${
            account.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          }`}
        >
          {formatMoney(account.balance, currency)}
        </div>
      </div>

      {/* Currency badge */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
        <span className="font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
          {currency}
        </span>
        {account.notes && (
          <span className="truncate max-w-[140px] italic">
            {account.notes}
          </span>
        )}
      </div>
    </div>
  );
};
