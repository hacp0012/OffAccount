import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeftRight,
  ArrowRight,
  ChartNoAxesCombined,
  LayoutGrid,
  Pin,
  Printer,
  Settings,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';

const applications = [
  {
    path: '/reports',
    title: 'Rapports et impression',
    description: 'Filtrez et imprimez vos dépenses, courses ou dettes.',
    icon: Printer,
    iconClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
  {
    path: '/exchange-rates',
    title: 'Taux de change',
    description: 'Consultez les taux indicatifs et convertissez un montant entre devises.',
    icon: ArrowLeftRight,
    iconClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  {
    path: '/overview',
    title: 'Vue d’ensemble',
    description: 'Consultez les indicateurs clés de vos comptes, opérations, courses et dettes.',
    icon: ChartNoAxesCombined,
    iconClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  {
    path: '/wishlist',
    title: 'Liste de souhaits',
    description: 'Organisez vos envies par catégorie, date cible et priorité.',
    icon: Star,
    iconClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  {
    path: '/settings',
    title: 'Paramètres',
    description: 'Personnalisez l’application, gérez les sauvegardes et configurez vos préférences.',
    icon: Settings,
    iconClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
];

export const ApplicationsView: React.FC = () => {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.get('default_config'));
  const [operationError, setOperationError] = useState<string | null>(null);
  const pinnedApplications = settings?.pinnedApplications ?? [];
  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) =>
          Number(pinnedApplications.includes(b.path)) - Number(pinnedApplications.includes(a.path)),
      ),
    [pinnedApplications],
  );

  const togglePinned = async (path: string) => {
    try {
      await db.transaction('rw', db.settings, async () => {
        const currentSettings = await db.settings.get('default_config');
        const currentPinned = currentSettings?.pinnedApplications ?? [];
        const nextPinned = currentPinned.includes(path)
          ? currentPinned.filter((pinnedPath) => pinnedPath !== path)
          : [...currentPinned, path];

        await db.settings.put({
          ...currentSettings,
          id: 'default_config',
          defaultCurrency: currentSettings?.defaultCurrency ?? 'FRw',
          pinnedApplications: nextPinned,
        });
      });
      setOperationError(null);
    } catch (error) {
      console.error('Failed to update pinned applications:', error);
      setOperationError('Impossible de modifier les applications épinglées. Réessayez.');
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <header className="rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-900 sm:rounded-3xl sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Plus
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Retrouvez ici les outils et réglages de votre espace.
            </p>
          </div>
        </div>
      </header>

      {operationError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {operationError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {sortedApplications.map(({ path, title, description, icon: Icon, iconClass }) => {
          const isPinned = pinnedApplications.includes(path);
          return (
            <div
              key={path}
              className="group relative min-h-32 rounded-2xl border border-slate-200/80 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
            >
              <button
                type="button"
                onClick={() => navigate(path)}
                className="flex min-h-32 w-full flex-col items-start gap-3 rounded-2xl p-3 pr-11 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:p-5 sm:pr-12"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                  </span>
                </span>
                <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 sm:right-5 sm:top-4" />
              </button>
              <button
                type="button"
                onClick={() => void togglePinned(path)}
                aria-label={isPinned ? `Désépingler ${title}` : `Épingler ${title}`}
                aria-pressed={isPinned}
                title={isPinned ? 'Désépingler' : 'Épingler'}
                className={`absolute right-10 top-2 flex h-8 w-8 items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:right-12 sm:top-3 ${
                  isPinned
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300'
                }`}
              >
                <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};
