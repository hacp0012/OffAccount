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
} from 'lucide-react';

interface BackupRestoreViewProps {
  stats: {
    accountsCount: number;
    transactionsCount: number;
    shoppingListsCount: number;
    debtsCount: number;
  };
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ stats }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        message: 'Sauvegarde JSON téléchargée avec succès sur votre terminal.',
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

    const confirmImport = window.confirm(
      `Attention : importer le fichier "${file.name}" remplacera les données actuelles par celles de la sauvegarde. Souhaitez-vous continuer ?`
    );

    if (!confirmImport) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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

  const handleResetToDemo = async () => {
    const confirm = window.confirm(
      'Réinitialiser la base de données avec les données de démonstration (FRw, FC, USD) ? Toutes vos modifications actuelles seront écrasées.'
    );
    if (!confirm) return;

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
          db.productPrices,
        ],
        async () => {
          await Promise.all([
            db.accounts.clear(),
            db.transactions.clear(),
            db.shoppingLists.clear(),
            db.shoppingItems.clear(),
            db.debts.clear(),
            db.settings.clear(),
            db.productPrices.clear(),
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

  const handleClearAll = async () => {
    const confirm = window.confirm(
      'Voulez-vous supprimer TOUTES vos données et repartir avec une base entièrement vide ? Cette action est irréversible.'
    );
    if (!confirm) return;

    try {
      await Promise.all([
        db.accounts.clear(),
        db.transactions.clear(),
        db.shoppingLists.clear(),
        db.shoppingItems.clear(),
        db.debts.clear(),
        db.settings.clear(),
        db.productPrices.clear(),
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
    <div className="space-y-5 pb-24 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Sauvegarde & Restauration
        </h1>
        <p className="text-xs text-slate-500">
          Sécurisez vos données financières en exportant ou important un fichier JSON complet.
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

      {/* Database State Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">État de la Base Locale (IndexedDB)</h2>
            <p className="text-xs text-slate-400">Stockage 100% privé dans le navigateur</p>
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

      {/* Export & Import Action Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Panel */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Sauvegarder (Export JSON)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Téléchargez une archive complète de vos comptes, transactions, courses et dettes. Conservez-la en lieu sûr ou transférez-la sur un autre appareil.
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
            <h3 className="text-base font-bold text-slate-900">Restaurer (Import JSON)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Restaurez vos données depuis un fichier JSON précédemment exporté pour récupérer votre historique après un changement de smartphone ou réinstallation.
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

      {/* Devise & Multi-currency Info Banner */}
      <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100 flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
            Support Multi-Devises Intégré (FRw · FC · USD)
          </h4>
          <p className="text-xs text-emerald-800/90 leading-relaxed">
            OffAccount prend en charge simultanément le Franc Rwandais (FRw), le Franc Congolais (FC) et le Dollar Américain (USD). Chaque compte gère sa devise propre sans mélange de calcul arbitraire, garantissant une intégrité comptable totale.
          </p>
        </div>
      </div>

      {/* Factory Reset & Demo Actions */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Options de Réinitialisation</h3>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleResetToDemo}
            className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recharger les données de démo</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Remettre la base à blanc</span>
          </button>
        </div>
      </div>
    </div>
  );
};
