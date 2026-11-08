import React, { useState } from "react";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Ellipsis,
  WalletCards,
  ShoppingCart,
  Users,
  TrendingDown,
  Calculator,
} from "lucide-react";
import { PWAInstallButton } from "./PWAInstallButton";
import { useNavigate, useLocation } from "react-router-dom";
import { CalculatorToolsModal } from "./CalculatorToolsModal";

interface NavigationProps {
  debtsCount?: number;
  shoppingActiveCount?: number;
  showMobileNavigation?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  debtsCount = 0,
  shoppingActiveCount = 0,
  showMobileNavigation = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

  // Determine active high-level tab
  const isFinancesActive =
    currentPath === "/" || currentPath === "/expenses" || currentPath.startsWith("/expenses/") || currentPath === "/accounts";
  const isShoppingActive = currentPath.startsWith("/shopping");
  const isDebtsActive = currentPath.startsWith("/debts");
  const isApplicationsActive =
    currentPath === "/applications" ||
    currentPath.startsWith("/overview") ||
    currentPath.startsWith("/settings") ||
    currentPath.startsWith("/wishlist");
  const showMobileBackButton = !["/expenses", "/shopping", "/debts"].includes(currentPath);

  return (
    <>
      {/* Clean Top App Bar */}
      <header className="sticky top-0 z-30 shrink-0 bg-[#f8faf8]/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-emerald-950/5 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 transition-colors print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name (Clickable to Home / Finances) */}
          <div className="flex items-center gap-2">
            {showMobileBackButton && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate("/expenses");
                  }
                }}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Retour à la page précédente"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div onClick={() => navigate("/expenses")} className="flex items-center gap-0 cursor-pointer">
              <img src="./icon.png" alt="OA" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shrink-0" />
              <div>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white block leading-tight">
                  OA
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => navigate("/expenses")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isFinancesActive
                  ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Dépenses & Flux</span>
            </button>

            <button
              onClick={() => navigate("/shopping")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isShoppingActive
                  ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Courses</span>
              {shoppingActiveCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
            </button>

            <button
              onClick={() => navigate("/debts")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer relative ${
                isDebtsActive
                  ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Dettes</span>
              {debtsCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            </button>

            <button
              onClick={() => navigate("/applications")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                isApplicationsActive
                  ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Ellipsis className="w-5 h-5" />
              <span>Plus</span>
            </button>
          </nav>

          {/* Right Slot: PWA install trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsToolsModalOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
              aria-label="Ouvrir la calculatrice et le convertisseur"
              title="Calculatrice et convertisseur"
            >
              <Calculator className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/overview")}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Vue d’ensemble"
              title="Vue d’ensemble"
            >
              <ChartNoAxesCombined className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/applications")}
              className={`md:hidden flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition cursor-pointer ${
                isApplicationsActive
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-label="Plus"
              title="Plus"
            >
              <Ellipsis className="h-5 w-5" />
              <span>Plus</span>
            </button>
            <PWAInstallButton />
          </div>
        </div>
      </header>

      <CalculatorToolsModal isOpen={isToolsModalOpen} onClose={() => setIsToolsModalOpen(false)} />

      {showMobileNavigation && (
        /* Fixed Bottom Tab Bar for routes that request mobile navigation */
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] print:hidden">
          <div className="grid grid-cols-3 h-14 max-w-md mx-auto items-center px-1">
            <button
              onClick={() => navigate("/expenses")}
              className={`mx-1 min-h-[44px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
                isFinancesActive
                  ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <WalletCards className={`w-4 h-4 transition-transform ${isFinancesActive ? "scale-110" : ""}`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate">Dépenses</span>
            </button>

            <button
              onClick={() => navigate("/shopping")}
              className={`mx-1 min-h-[44px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer relative ${
                isShoppingActive
                  ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <span className="relative inline-flex">
                <ShoppingCart className={`w-4 h-4 transition-transform ${isShoppingActive ? "scale-110" : ""}`} />
                {shoppingActiveCount > 0 && (
                  <span
                    aria-label={`${shoppingActiveCount} liste${shoppingActiveCount > 1 ? "s" : ""} de courses active${shoppingActiveCount > 1 ? "s" : ""}`}
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900"
                  >
                    {shoppingActiveCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">Courses</span>
            </button>

            <button
              onClick={() => navigate("/debts")}
              className={`mx-1 min-h-[44px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer relative ${
                isDebtsActive
                  ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <span className="relative inline-flex">
                <Users className={`w-4 h-4 transition-transform ${isDebtsActive ? "scale-110" : ""}`} />
                {debtsCount > 0 && (
                  <span
                    aria-label={`${debtsCount} dette${debtsCount > 1 ? "s" : ""} active${debtsCount > 1 ? "s" : ""}`}
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900"
                  >
                    {debtsCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight truncate">Dettes</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
