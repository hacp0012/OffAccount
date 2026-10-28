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
      {/* Clean Top App Bar without Virement/Opérations and without 100% Hors-ligne */}
      <header className="sticky top-0 z-30 bg-[#f8faf8]/90 backdrop-blur-md border-b border-emerald-950/5 px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name (Clickable to Home / Finances) */}
          <div
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                OffAccount
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (4 combined tabs) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => navigate('/expenses')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isFinancesActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-emerald-700" />
              <span>Dépenses & Flux</span>
            </button>

            <button
              onClick={() => navigate('/shopping')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isShoppingActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isDebtsActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isSettingsActive
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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

      {/* Fixed Bottom Tab Bar for Mobile Thumb Ergonomics (4 combined tabs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-2">
          <button
            onClick={() => navigate('/expenses')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition cursor-pointer ${
              isFinancesActive ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <WalletCards className={`w-5 h-5 transition-transform ${isFinancesActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Dépenses & Flux</span>
          </button>

          <button
            onClick={() => navigate('/shopping')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition cursor-pointer relative ${
              isShoppingActive ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <ShoppingCart className={`w-5 h-5 transition-transform ${isShoppingActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Courses</span>
            {shoppingActiveCount > 0 && (
              <span className="absolute top-2 right-6 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => navigate('/debts')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition cursor-pointer relative ${
              isDebtsActive ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Users className={`w-5 h-5 transition-transform ${isDebtsActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Dettes</span>
            {debtsCount > 0 && (
              <span className="absolute top-2 right-6 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition cursor-pointer ${
              isSettingsActive ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Settings className={`w-5 h-5 transition-transform ${isSettingsActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight truncate">Paramètres</span>
          </button>
        </div>
      </div>
    </>
  );
};
