import React from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  ChartNoAxesCombined,
  LayoutGrid,
  Printer,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    path: '/settings',
    title: 'Paramètres',
    description: 'Personnalisez l’application, gérez les sauvegardes et configurez vos préférences.',
    icon: Settings,
    iconClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
];

export const ApplicationsView: React.FC = () => {
  const navigate = useNavigate();

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {applications.map(({ path, title, description, icon: Icon, iconClass }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="group relative flex min-h-32 flex-col items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 sm:p-5"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 pr-1">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </span>
            </span>
            <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 sm:right-5 sm:top-5" />
          </button>
        ))}
      </div>

    </div>
  );
};
