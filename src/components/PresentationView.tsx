import React, { useState } from "react";
import { ArrowDownUp, ArrowRight, BookOpen, CheckCircle, ShoppingBasket, Users, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";

interface PresentationViewProps {
  isFirstRun?: boolean;
  onCompleteFirstRun?: (useDemoData: boolean) => Promise<void>;
}

const features = [
  {
    icon: ArrowDownUp,
    title: "Suivez vos finances",
    description: "Enregistrez revenus, dépenses et transferts, puis consultez leur évolution.",
  },
  {
    icon: WalletCards,
    title: "Gérez vos comptes",
    description: "Retrouvez les soldes de vos comptes et leur historique au même endroit.",
  },
  {
    icon: ShoppingBasket,
    title: "Préparez vos courses",
    description: "Organisez vos listes et gardez le suivi de vos achats.",
  },
  {
    icon: Users,
    title: "Gardez le fil des dettes",
    description: "Suivez les montants prêtés ou dus et leurs remboursements.",
  },
];

export const PresentationView: React.FC<PresentationViewProps> = ({ isFirstRun = false, onCompleteFirstRun }) => {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSetupOptions, setShowSetupOptions] = useState(false);

  const chooseData = async (useDemoData: boolean) => {
    if (!onCompleteFirstRun) return;

    setIsStarting(true);
    setErrorMessage(null);
    try {
      await onCompleteFirstRun(useDemoData);
      navigate("/expenses", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "La configuration initiale a échoué. Veuillez réessayer.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <div
        className={isFirstRun
          ? "flex min-h-dvh w-full flex-col justify-center gap-6 px-4 py-8 sm:px-8"
          : "mx-auto max-w-4xl space-y-6 pb-20"}
      >
        <section className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-10 text-center shadow-xs">
          <img src="./icon.png" alt="OA" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Bienvenue dans OA
          </p>
          <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Vos finances, simplement.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            OA vous aide à organiser vos comptes, suivre vos opérations et garder une vue claire sur votre quotidien
            financier.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex items-start gap-3 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Vos données sont enregistrées localement sur votre appareil.
        </div>

        {isFirstRun ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowSetupOptions(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Commencer à utiliser l’application
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Retour aux paramètres
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isFirstRun && showSetupOptions}
        onClose={() => setShowSetupOptions(false)}
        title="Comment souhaitez-vous commencer ?"
        description="Vous pourrez ajouter ou modifier vos données à tout moment."
        maxWidth="md"
        dismissible={!isFirstRun}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => chooseData(false)}
            disabled={isStarting}
            className="w-full rounded-2xl bg-emerald-700 p-4 text-left text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-bold">Commencer avec une base vide</span>
                <span className="mt-1 block text-xs text-emerald-100">
                  Recommandé — ajoutez vos propres comptes et opérations.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => chooseData(true)}
            disabled={isStarting}
            className="w-full rounded-2xl bg-slate-100 p-4 text-left text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>
                <span className="block text-sm font-bold">Explorer avec les données de démo</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Charge des exemples que vous pourrez remplacer plus tard.
                </span>
              </span>
            </span>
          </button>

          {isStarting && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">Préparation de votre espace…</p>
          )}
          {errorMessage && (
            <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorMessage}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
};
