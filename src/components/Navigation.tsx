import React from 'react';
import {
  WalletCards,
  ShoppingCart,
  Users,
  Settings,
  TrendingDown,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  debtsCount?: number;
  shoppingActiveCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  debtsCount = 0,
  shoppingActiveCount = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine active high-level tab
  const isFinancesActive =
    currentPath === '/' ||
    currentPath === '/expenses' ||
    currentPath.startsWith('/expenses/') ||
    currentPath === '/accounts';
  const isShoppingActive = currentPath.startsWith('/shopping');
  const isDebtsActive = currentPath.startsWith('/debts');
  const isSettingsActive = currentPath.startsWith('/settings');

  return (
    <>
      {/* Clean Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#f8faf8]/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-emerald-950/5 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name (Clickable to Home / Finances) */}
          <div
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 shrink-0">
              <WalletCards className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white block leading-tight">
                OffAccount
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (4 combined tabs) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => navigate('/expenses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isFinancesActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Dépenses & Flux</span>
            </button>

            <button
              onClick={() => navigate('/shopping')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isShoppingActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Courses</span>
              {shoppingActiveCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>

            <button
              onClick={() => navigate('/debts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isDebtsActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Dettes</span>
              {debtsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => navigate('/settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isSettingsActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
          </nav>

          {/* Right Slot: PWA Install trigger */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Fixed Bottom Tab Bar for Mobile Thumb Ergonomics */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-4 h-14 max-w-md mx-auto items-center px-1">
          <button
            onClick={() => navigate('/expenses')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition cursor-pointer ${
              isFinancesActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <WalletCards className={`w-4 h-4 transition-transform ${isFinancesActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Dépenses</span>
          </button>

          <button
            onClick={() => navigate('/shopping')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition cursor-pointer relative ${
              isShoppingActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <ShoppingCart className={`w-4 h-4 transition-transform ${isShoppingActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Courses</span>
            {shoppingActiveCount > 0 && (
              <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <button
            onClick={() => navigate('/debts')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition cursor-pointer relative ${
              isDebtsActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Users className={`w-4 h-4 transition-transform ${isDebtsActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Dettes</span>
            {debtsCount > 0 && (
              <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`min-h-[44px] flex flex-col items-center justify-center transition cursor-pointer ${
              isSettingsActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Settings className={`w-4 h-4 transition-transform ${isSettingsActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Paramètres</span>
          </button>
        </div>
      </div>
    </>
  );
};
