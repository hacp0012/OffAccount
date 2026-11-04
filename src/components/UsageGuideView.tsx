import React from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CircleHelp,
  Database,
  Moon,
  ShoppingBasket,
  Users,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const guideSections = [
  {
    icon: WalletCards,
    title: 'Comptes et opérations',
    description:
      'Commencez par créer un compte pour chaque source d’argent que vous souhaitez suivre : compte bancaire, portefeuille Mobile Money ou espèces. Donnez-lui un nom et un solde de départ ; le solde total de vos comptes est ensuite visible dans leur écran de gestion. Depuis Dépenses, utilisez le bouton d’ajout pour enregistrer une dépense ou un revenu, en renseignant son libellé, son montant, sa date, son compte et sa catégorie. Les opérations enregistrées apparaissent dans l’historique, où vous pouvez consulter leurs détails et gérer les entrées existantes.',
    links: [
      { label: 'Voir les dépenses', path: '/expenses' },
      { label: 'Gérer les comptes', path: '/accounts' },
    ],
  },
  {
    icon: ArrowDownUp,
    title: 'Virements entre comptes',
    description:
      'Depuis Gestion des comptes, sélectionnez Virement, puis le compte de départ, le compte d’arrivée, le montant et la date. Le transfert met à jour les comptes concernés sans être comptabilisé comme une dépense ou un revenu. Vérifiez les comptes sélectionnés avant de confirmer.',
    links: [{ label: 'Gérer les comptes', path: '/accounts' }],
  },
  {
    icon: BarChart3,
    title: 'Vue d’ensemble et analyse',
    description:
      'La Vue d’ensemble rassemble des indicateurs de vos comptes, opérations, courses et dettes pour vous aider à voir votre situation en un coup d’œil. Dans les dépenses, ouvrez les graphiques pour étudier les montants par jour et par catégorie, comparer les périodes et repérer les évolutions. Les chiffres dépendent des opérations que vous avez saisies ; vérifiez que les dates, montants et devises sont corrects.',
    links: [
      { label: 'Vue d’ensemble', path: '/overview' },
      { label: 'Graphiques des dépenses', path: '/expenses/charts' },
    ],
  },
  {
    icon: ShoppingBasket,
    title: 'Listes de courses et prix',
    description:
      'Créez une liste et ajoutez-y les articles à acheter. Pour chaque article, indiquez notamment la quantité et le prix unitaire ; le total estimé de la liste se met à jour. Cochez les articles au fur et à mesure, filtrez la liste pour n’afficher que les articles à faire ou déjà faits, et gérez les rayons si besoin. Quand vous réglez vos achats, utilisez l’action de paiement pour enregistrer le montant et le compte utilisés. Le catalogue Prix des produits permet de conserver des prix habituels et de réutiliser un produit dans une liste.',
    links: [
      { label: 'Listes de courses', path: '/shopping' },
      { label: 'Prix des produits', path: '/shopping/products' },
    ],
  },
  {
    icon: Users,
    title: 'Dettes et remboursements',
    description:
      'Ajoutez une dette en précisant la personne, le montant et le sens : vous devez rembourser cette personne, ou bien elle vous doit de l’argent. Vous pouvez compléter le dossier avec une date d’échéance et des coordonnées. La fiche indique le montant restant et l’avancement ; utilisez Enregistrer un paiement pour saisir un remboursement partiel ou solder la dette. L’historique permet de retrouver les paiements déjà enregistrés.',
    links: [{ label: 'Ouvrir les dettes', path: '/debts' }],
  },
  {
    icon: BarChart3,
    title: 'Rapports : consulter, imprimer, exporter',
    description:
      'Pour imprimer un relevé de vos dépenses, de vos revenus ou des deux, ouvrez Plus > Rapports et impression ou utilisez le raccourci Rapports de la Vue d’ensemble. Dans la page Rapports imprimables, sélectionnez Dépenses & revenus, Courses ou Dettes. Pour les opérations, choisissez Dépenses, Revenus ou les deux, puis filtrez par dates, compte et catégorie. Pour les courses, filtrez par période et statut de liste ; pour les dettes, par période, sens (Je dois / On me doit) et statut. Le tableau et le total affichés suivent ces filtres. Quand le rapport est prêt, cliquez sur Imprimer : la fenêtre d’impression de votre navigateur s’ouvre. Choisissez une imprimante pour obtenir une version papier ou Enregistrer au format PDF pour créer un fichier. Vous pouvez aussi cliquer sur CSV pour télécharger les données filtrées et les ouvrir dans un tableur.',
    links: [{ label: 'Ouvrir les rapports', path: '/reports' }],
  },
  {
    icon: Moon,
    title: 'Personnalisation et rappels',
    description:
      'Dans Paramètres standards, choisissez la devise d’affichage et le thème clair, sombre ou adapté au système de l’appareil. Vous pouvez également ouvrir Rappels et notifications pour activer un rappel de dépenses, choisir son horaire, les jours et le message. Le navigateur doit prendre en charge les notifications et vous devez lui en accorder l’autorisation.',
    links: [
      { label: 'Paramètres', path: '/settings' },
      { label: 'Rappels et notifications', path: '/settings/notifications' },
    ],
  },
  {
    icon: Database,
    title: 'Sauvegarde et synchronisation',
    description:
      'Dans Paramètres avancés, téléchargez une sauvegarde complète au format JSON et conservez-la dans un emplacement sûr. Pour récupérer vos données, sélectionnez le fichier JSON de sauvegarde : l’import remplace les données actuellement présentes sur l’appareil. Faites donc une sauvegarde récente avant la restauration et vérifiez le fichier choisi. La synchronisation directe entre appareils se fait depuis cette même page : connectez les appareils l’un à l’autre en suivant les instructions affichées et gardez-les tous les deux ouverts et connectés pendant l’échange.',
    links: [{ label: 'Paramètres avancés', path: '/settings/advanced' }],
  },
  {
    icon: Bell,
    title: 'Utilisation hors ligne',
    description:
      'OA peut rester utilisable sans connexion Internet et enregistre les informations dans le stockage local du navigateur sur l’appareil. Cela signifie que vos données ne sont pas automatiquement disponibles sur un autre navigateur ou un nouvel appareil. Exportez régulièrement une sauvegarde JSON, en particulier avant de changer d’appareil ou de vider les données du navigateur. Les rapports imprimés et les fichiers CSV ou JSON téléchargés sont enregistrés via les fonctions habituelles du navigateur.',
    links: [{ label: 'Sauvegardes et synchronisation', path: '/settings/advanced' }],
  },
];

export const UsageGuideView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-20">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="mt-0.5 hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Retour aux paramètres"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Guide d’utilisation
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pas à pas : comptes, opérations, courses, dettes, rapports et paramètres.
          </p>
        </div>
      </header>

      <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <p>
          Chaque rubrique explique les actions principales et propose un raccourci vers
          l’écran correspondant. Dans le guide, « imprimer » ouvre la boîte de dialogue
          d’impression de votre navigateur ; le choix « Enregistrer au format PDF »
          dépend des options proposées par votre appareil.
        </p>
      </div>

      <div className="space-y-3">
        {guideSections.map(({ icon: Icon, title, description, links }) => (
          <section key={title} className="py-2">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {description}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => navigate(link.path)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                    >
                      {link.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/presentation')}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-emerald-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
        >
          <BookOpen className="h-4 w-4" />
          Revoir la présentation de l’application
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
