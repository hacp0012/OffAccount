import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const closeIOSGuide = useModalHistory(showIOSGuide, () => setShowIOSGuide(false));

  // If already running in standalone mode, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        title="Installer l'application sur votre appareil"
      >
        <Download className="w-4 h-4 text-emerald-200" />
        <span>Installer l'app</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Installer sur iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="fixed inset-x-0 bottom-0 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 sm:relative sm:inset-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Installer OffAccount sur iPhone / iPad</h3>
                <button
                  onClick={closeIOSGuide}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <Share2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">1. Touchez le bouton Partager</span>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dans la barre d'outils Safari en bas de l'écran.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <PlusSquare className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">2. Choisissez "Sur l'écran d'accueil"</span>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Faites défiler le menu puis confirmez en haut à droite.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={closeIOSGuide}
                className="mt-5 w-full rounded-xl bg-emerald-700 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition active:scale-98 cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
