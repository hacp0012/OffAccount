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
        return <Smartphone className="w-5 h-5" />;
      case 'bank':
        return <Landmark className="w-5 h-5" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5" />;
      case 'cash':
      default:
        return <Wallet className="w-5 h-5" />;
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
      className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all cursor-pointer border ${
        isSelected
          ? 'ring-2 ring-emerald-600 border-emerald-300 bg-white shadow-md'
          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-xs'
      }`}
    >
      {/* Top row: Type indicator & Action icons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: account.color || '#059669' }}
          >
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-[170px] sm:max-w-[200px]">
              {account.name}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              {getTypeName()}
            </span>
          </div>
        </div>

        {/* Edit and Delete Actions */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Modifier le compte"
            aria-label="Modifier"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Supprimer le compte"
            aria-label="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance Presentation */}
      <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-500">Solde disponible</span>
        <div
          className={`text-lg sm:text-xl font-extrabold tabular-nums tracking-tight ${
            account.balance < 0 ? 'text-rose-600' : 'text-slate-900'
          }`}
        >
          {formatMoney(account.balance, currency)}
        </div>
      </div>

      {/* Currency badge */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
          {currency}
        </span>
        {account.notes && (
          <span className="truncate max-w-[180px] italic">
            {account.notes}
          </span>
        )}
      </div>
    </div>
  );
};
