import React, { useState, useRef } from 'react';
import {
  exportDatabaseToJSON,
  importDatabaseFromJSON,
} from '../../utils/formatters';
import { seedDemoData, db } from '../../db/database';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Database,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Sparkles,
  Coins,
  Check,
  Search,
} from 'lucide-react';
import { SUPPORTED_CURRENCIES, type CurrencyInfo } from '../../utils/currencies';
import { useAppCurrency } from '../../context/CurrencyContext';
import { ConfirmModal } from '../ConfirmModal';

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

  const [currencySearch, setCurrencySearch] = useState('');
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

  // Filter currencies by search
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((c) => {
    if (!currencySearch.trim()) return true;
    const q = currencySearch.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const jsonContent = await exportDatabaseToJSON();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateTag = now.toISOString().split('T')[0];
      link.href = url;
      link.download = `offaccount-sauvegarde-${dateTag}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: 'Sauvegarde JSON téléchargée avec succès sur votre appareil.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erreur d'exportation : ${err.message || 'Échec du téléchargement.'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) {
          setNotification({ type: 'error', message: 'Fichier vide ou illisible.' });
          setIsImporting(false);
          return;
        }

        const result = await importDatabaseFromJSON(text);
        if (result.success) {
          setNotification({ type: 'success', message: result.message });
        } else {
          setNotification({ type: 'error', message: result.message });
        }
        setIsImporting(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erreur lors de l'import : ${err.message}`,
      });
      setIsImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeResetToDemo = async () => {
    try {
      await db.transaction(
        'rw',
        [
          db.accounts,
          db.transactions,
          db.shoppingLists,
          db.shoppingItems,
          db.debts,
          db.settings,
        ],
        async () => {
          await Promise.all([
            db.accounts.clear(),
            db.transactions.clear(),
            db.shoppingLists.clear(),
            db.shoppingItems.clear(),
            db.debts.clear(),
            db.settings.clear(),
          ]);
        }
      );
      await seedDemoData();
      setNotification({
        type: 'success',
        message: 'Données de démonstration rechargées avec succès !',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erreur de réinitialisation : ${err.message}`,
      });
    }
  };

  const executeClearAll = async () => {
    try {
      await Promise.all([
        db.accounts.clear(),
        db.transactions.clear(),
        db.shoppingLists.clear(),
        db.shoppingItems.clear(),
        db.debts.clear(),
        db.settings.clear(),
      ]);
      setNotification({
        type: 'success',
        message: 'Base de données réinitialisée à blanc.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erreur : ${err.message}`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Paramètres & Configuration
        </h1>
        <p className="text-xs text-slate-500">
          Choisissez la devise globale de votre application et gérez vos sauvegardes.
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* 1. Global Currency Selector (MANDATORY REQUIREMENT) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Devise Globale de l'Application
            </h2>
            <p className="text-xs text-slate-500">
              L'application utilisera cette unique devise pour tous vos comptes, dépenses, courses et dettes.
            </p>
          </div>
        </div>

        {/* Current Active Currency Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide block">
              Devise activement sélectionnée
            </span>
            <div className="text-lg font-black text-emerald-950 mt-0.5 flex items-center gap-2">
              <span>{currencyInfo.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-bold">
                {currencyInfo.code} ({currencyInfo.symbol})
              </span>
            </div>
            {currencyInfo.region && (
              <span className="text-xs text-emerald-700 block mt-0.5">
                Région : {currencyInfo.region}
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
            {currencyInfo.symbol}
          </div>
        </div>

        {/* Search for currencies */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une devise (ex: Franc, Dollar, Euro, CFA, KSh...)..."
            value={currencySearch}
            onChange={(e) => setCurrencySearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        {/* Grid of Currencies to choose from */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto no-scrollbar p-1">
          {filteredCurrencies.map((c) => {
            const isSelected = c.code === currency;

            return (
              <button
                type="button"
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-emerald-700">{c.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{c.symbol}</span>
                    {c.region && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[90px]">{c.region}</span>
                      </>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Database Stats Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Stockage Local & Intégrité
            </h2>
            <p className="text-xs text-slate-400">
              IndexedDB local sans dépendance serveur
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
          <div className="p-3 rounded-2xl bg-slate-50">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {stats.accountsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              Comptes
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {stats.transactionsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              Transactions
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {stats.shoppingListsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              Listes Courses
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {stats.debtsCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              Dossiers Dettes
            </span>
          </div>
        </div>
      </div>

      {/* 3. Export & Import Backup Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Panel */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Sauvegarder (Export JSON)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Téléchargez un fichier de backup complet de vos comptes, transactions, courses et dettes.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="mt-5 w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <FileJson className="w-4 h-4 text-emerald-200" />
            <span>{isExporting ? 'Génération...' : 'Télécharger le Backup JSON'}</span>
          </button>
        </div>

        {/* Import Panel */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Restaurer (Import JSON)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
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
              className="mt-5 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-slate-300" />
              <span>{isImporting ? 'Restauration...' : 'Sélectionner un fichier JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Factory Reset & Demo Actions with safe Confirmation Modals */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Options de Réinitialisation</h3>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={() => setShowDemoResetConfirm(true)}
            className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recharger les données de démo</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
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
    </div>
  );
};
