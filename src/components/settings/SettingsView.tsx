import React, { useState, useRef } from 'react';
import {
  exportDatabaseToJSON,
  importDatabaseFromJSON,
} from '../../utils/formatters';
import { resetDatabaseToBlank, seedDemoData } from '../../db/database';
import {
  Download,
  Upload,
  RotateCcw,
  Database,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Sparkles,
  Coins,
  Check,
  Sun,
  Moon,
  Monitor,
  Palette,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bell,
  Printer,
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../../utils/currencies';
import { useAppCurrency } from '../../context/CurrencyContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { ConfirmModal } from '../ConfirmModal';
import { P2PSyncSettings } from './P2PSyncSettings';
import { useLocation, useNavigate } from 'react-router-dom';

interface SettingsViewProps {
  stats: {
    accountsCount: number;
    transactionsCount: number;
    shoppingListsCount: number;
    debtsCount: number;
  };
}

export const SettingsView: React.FC<SettingsViewProps> = ({ stats }) => {
  const { currency, currencyInfo, setCurrency } = useAppCurrency();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdvanced = location.pathname === '/settings/advanced';

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modal confirmations
  const [showDemoResetConfirm, setShowDemoResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    let downloadUrl: string | null = null;
    try {
      const jsonContent = await exportDatabaseToJSON();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateTag = now.toISOString().split('T')[0];
      link.href = downloadUrl;
      link.download = `offaccount-sauvegarde-${dateTag}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setNotification({
        type: 'success',
        message: 'Sauvegarde JSON téléchargée avec succès sur votre appareil.',
      });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: `Erreur d'exportation : ${err instanceof Error ? err.message : 'Échec du téléchargement.'}`,
      });
    } finally {
      const urlToRevoke = downloadUrl;
      if (urlToRevoke) window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileInput = e.currentTarget;
    if (!window.confirm(`Importer "${file.name}" remplacera les données actuelles. Voulez-vous continuer ?`)) {
      fileInput.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setNotification({ type: 'error', message: 'Fichier vide ou illisible.' });
        return;
      }

      const result = await importDatabaseFromJSON(text);
      setNotification({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: `Erreur lors de l'import : ${err instanceof Error ? err.message : 'Fichier illisible.'}`,
      });
    } finally {
      setIsImporting(false);
      fileInput.value = '';
    }
  };

  const executeResetToDemo = async () => {
    try {
      await resetDatabaseToBlank();
      await seedDemoData();
      setShowDemoResetConfirm(false);
      setNotification({
        type: 'success',
        message: 'Données de démonstration rechargées avec succès !',
      });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: `Erreur de réinitialisation : ${err instanceof Error ? err.message : 'Erreur inconnue.'}`,
      });
    }
  };

  const executeClearAll = async () => {
    try {
      await resetDatabaseToBlank();
      setShowClearConfirm(false);
      setNotification({
        type: 'success',
        message: 'Base réinitialisée. Les catégories par défaut sont prêtes et vos données ne seront pas recréées au prochain démarrage.',
      });
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: `Erreur : ${err instanceof Error ? err.message : 'Erreur inconnue.'}`,
      });
    }
  };

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    description: string;
    icon: typeof Sun;
  }[] = [
    {
      mode: 'light',
      label: 'Mode Clair',
      description: 'Interface lumineuse et vive',
      icon: Sun,
    },
    {
      mode: 'dark',
      label: 'Mode Sombre',
      description: 'Confort visuel et économie batterie',
      icon: Moon,
    },
    {
      mode: 'system',
      label: 'Mode Système',
      description: `Suit l'appareil (${resolvedTheme === 'dark' ? 'Sombre' : 'Clair'})`,
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-20 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {isAdvanced ? 'Paramètres avancés' : 'Paramètres standards'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isAdvanced
            ? 'Synchronisation, sauvegardes et réinitialisation de vos données.'
            : 'Personnalisez le thème, la devise et les préférences de l’application.'}
        </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(isAdvanced ? '/settings' : '/settings/advanced')}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          {isAdvanced ? <ArrowLeft className="w-4 h-4" /> : null}
          <span>{isAdvanced ? 'Standards' : 'Avancés'}</span>
          {!isAdvanced ? <ArrowRight className="w-4 h-4" /> : null}
        </button>
      </div>

      {isAdvanced && <P2PSyncSettings />}

      <>
        {/* Notification Toast */}
        {isAdvanced && notification && (
            <div
              className={`p-3 sm:p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold shadow-xs transition-all ${
                notification.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

      {!isAdvanced && <>
      {/* 1. THEME SWITCHER (Mode Clair, Sombre, Système) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Thème de l'Application
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Basculez entre le mode clair, le mode sombre ou l'adaptation automatique au système.
            </p>
          </div>
        </div>

        {/* 3 Theme Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.mode;
            const Icon = opt.icon;

            return (
              <button
                type="button"
                key={opt.mode}
                onClick={() => setTheme(opt.mode)}
                className={`p-3 rounded-xl sm:rounded-2xl text-left border transition-all cursor-pointer flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2.5 ${
                  isSelected
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center sm:items-start gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        isSelected
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {opt.description}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 sm:self-end rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Global Currency Selector - Compact Dropdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Devise Globale de l'Application
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              L'application utilise cette unique devise pour tous vos comptes, dépenses, courses et dettes.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <label htmlFor="global-currency-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Sélectionner la devise active
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                id="global-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="dark:bg-slate-800 dark:text-white">
                    {c.code} - {c.name} ({c.symbol}){c.region ? ` — ${c.region}` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 dark:text-slate-500 text-xs">
                ▼
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm shrink-0 shadow-2xs">
              {currencyInfo.symbol}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Devise active : <span className="font-semibold text-slate-800 dark:text-slate-200">{currencyInfo.name}</span> ({currencyInfo.code})
            {currencyInfo.region ? ` · ${currencyInfo.region}` : ''}
          </p>
        </div>
      </div>

      {/* 3. Database Stats Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Stockage Local & Intégrité
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400">
              IndexedDB local sans dépendance serveur
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
          <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {stats.accountsCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              Comptes
            </span>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {stats.transactionsCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              Transactions
            </span>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {stats.shoppingListsCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              Listes Courses
            </span>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {stats.debtsCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
              Dossiers Dettes
            </span>
          </div>
        </div>
      </div>

      {/* Advanced settings navigation */}
      <button
        type="button"
        onClick={() => navigate('/reports')}
        className="w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between text-left hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <Printer className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Rapports et impression</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filtrez et imprimez dépenses, courses ou dettes</span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings/notifications')}
        className="w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between text-left hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Rappels et notifications</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configurez votre rappel quotidien de dépenses</span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/presentation')}
        className="w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between text-left hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Présentation de l’application</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Découvrez les principales fonctionnalités de OA</span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings/advanced')}
        className="w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between text-left hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <span>
          <span className="block text-sm font-bold text-slate-900 dark:text-white">Paramètres avancés</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Synchronisation, sauvegardes et réinitialisation</span>
        </span>
        <ArrowRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
      </button>
      </>}

      {/* 4. Export & Import Backup Panels */}
      {isAdvanced && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        {/* Export Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mb-2.5">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Sauvegarder (Export JSON)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Téléchargez un fichier de backup complet de vos comptes, transactions, courses et dettes.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="mt-3.5 w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isExporting ? 'Génération...' : 'Télécharger le Backup JSON'}</span>
          </button>
        </div>

        {/* Import Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-2.5">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Restaurer (Import JSON)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Restaurez toutes vos données depuis une sauvegarde précédente en cas de changement de téléphone.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="mt-3.5 w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-300" />
              <span>{isImporting ? 'Restauration...' : 'Sélectionner un fichier JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Factory Reset & Demo Actions with safe Confirmation Modals */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Options de Réinitialisation</h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowDemoResetConfirm(true)}
            className="flex-1 py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Recharger les données de démo</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex-1 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Remettre la base à blanc</span>
          </button>
        </div>
      </div>

      {/* In-app confirmation dialogs */}
      <ConfirmModal
        isOpen={showDemoResetConfirm}
        onClose={() => setShowDemoResetConfirm(false)}
        onConfirm={executeResetToDemo}
        title="Recharger les données de démonstration ?"
        message="Vos opérations actuelles seront remplacées par le jeu d'essai réaliste avec des comptes et listes d'exemple."
        confirmLabel="Recharger la démo"
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={executeClearAll}
        title="Vider entièrement la base de données ?"
        message="Cette action effacera irréversiblement tous vos comptes, opérations, listes de courses et dossiers de dettes."
        confirmLabel="Tout effacer"
        isDestructive={true}
      />
      </>}
      </>
    </div>
  );
};
