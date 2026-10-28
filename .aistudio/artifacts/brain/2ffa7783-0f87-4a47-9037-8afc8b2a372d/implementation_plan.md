# OffMoney — Application PWA Hors-Ligne de Gestion Financière Personnelle

Application web progressive (PWA) 100 % front-end et offline-first conçue pour la gestion des finances personnelles, le suivi des comptes (Banque, Mobile Money, Espèces), la gestion de listes de courses avec calcul dynamique, le suivi des dettes et créances avec remboursements partiels, et la sauvegarde/restauration JSON intégrale.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Décisions validées lors de la phase de cadrage et choix architecturaux recommandés :
>
> - **Devise principale & Multi-devises** : Prise en charge native du **Franc Rwandais (FRw)** et du **Franc Congolais (FC)** avec possibilité de bascule rapide et sélection par compte/transaction, ainsi qu'un sélecteur de symbole dans les paramètres.
> - **Interconnexion Courses ➔ Dépense & Dettes** : Lors du règlement d'une liste de courses ("Payer et enregistrer"), l'utilisateur sélectionne le compte débité et peut saisir un montant personnalisé de remboursement attribué à un contact tiers (créance créée automatiquement dans le module Dettes).
> - **Données de démonstration initiales** : Au premier démarrage, initialisation avec un jeu complet de données réalistes (comptes MTN Mobile Money, Airtel Money, Banque, Espèces ; catégories courantes ; liste de courses type ; créance/dette en cours).
> - **Stockage & PWA** : IndexedDB propulsé par `dexie` pour une gestion réactive et robuste des stores, couplé à `vite-plugin-pwa` avec Service Worker precache et bouton d'installation in-app natif / guide iOS Safari.

---

### 1. Overview & Core Concept

- **Fonctionnement global** : OffMoney fonctionne de manière 100 % autonome sur le terminal de l'utilisateur sans aucun serveur distant. Toutes les données financières, listes et contacts restent strictement privées et stockées dans l'IndexedDB du navigateur.
- **Public cible & Contexte** : Particuliers, commerçants locaux, freelances ou familles ayant besoin d'un suivi précis de leurs liquidités, comptes Mobile Money (MTN, Airtel, M-Pesa, Orange Money) et comptes bancaires, en zones où la connectivité internet peut être intermittente.
- **Valeur clé** : Indépendance réseau totale (Offline-first), rapidité d'exécution tactile sur smartphone, réconciliation automatique entre budget courses et créances partagées entre amis ou collègues.

---

### 2. User Experience & Visual Design

#### Parcours Utilisateurs Principaux

1. **Dashboard & Comptes** : Vue synthétique du patrimoine net en FRw et FC, carrousel tactile des comptes avec solde en temps réel, actions rapides (+ Dépense, + Revenu, Virement).
2. **Transactions & Historique** : Liste fluide des mouvements avec filtrage par type, date, compte et catégorie. Formulaire d'ajout rapide optimisé pour le clavier mobile.
3. **Listes de Courses** : Création de listes multiples (ex: "Marché Central", "Supermarché"), ajout d'articles avec prix unitaire, quantité, unité et rayon. Coût dynamique temps réel, case à cocher tactile. Bouton "Payer et enregistrer" débitant le compte et créant optionnellement une créance si des achats ont été faits pour autrui.
4. **Gestion des Dettes & Créances** : Suivi séparé des montants dus ("Je dois") et à percevoir ("On me doit"), fiche par personne avec historique des versements partiels, calcul du restant dû et bouton "Enregistrer un versement".
5. **Sauvegarde & Réglages** : Exportation d'un backup JSON complet téléchargeable en un clic, importation/restauration avec validation d'intégrité, réinitialisation et configuration de devise.

#### Identité Visuelle & Thème Végétal

- **Palette chromatique végétale (60-30-10)** :
  - *Toile de fond (60%)* : Vert forêt très doux / blanc cassé naturel (`#f8faf8` en mode clair, slate végétal sombre `#0f1713` en mode nuit).
  - *Surfaces structurelles (30%)* : Cartes et feuilles inférieures en blanc pur ou vert sauge très pâle (`#ffffff` / `border-emerald-100`), dividers ultra-fins.
  - *Accents énergiques (10%)* : Émeraude vif (`emerald-600` / `#059669`) pour les actions primaires et soldes positifs, rouge carmin doux (`rose-600`) pour les dépenses et dettes, ambre chaud pour les créances en attente.
- **Typographie & Lisibilité** :
  - Titres & Chiffres clés : Police géométrique moderne à fort impact avec support natif `tabular-nums` pour l'alignement parfait des montants.
  - Métadonnées : Texte épuré sans badges pilules décoratifs superflus, séparateurs typographiques discrets (`·` ou `/`).
- **Ergonomie Mobile-First & Thumb-Zone** :
  - Barre de navigation inférieure fixe (Comptes, Courses, Dettes, Paramètres) avec zones tactiles $\ge 48\text{px}$.
  - Fiches coulissantes (bottom sheets) pour les formulaires de saisie rapide sans masquer le contexte.
  - Boutons d'action flottants ou ancrés au bas de l'écran pour une validation facile à une main.
  - Bannière PWA non intrusive avec installation guidée (bouton d'installation direct sur Android/Chromium, modal pas-à-pas pour Safari iOS).

---

### 3. Key Product Decisions & Trade-Offs

- **Stockage avec Dexie.js (IndexedDB)** :
  - *Choix* : Utilisation de la bibliothèque légère Dexie.js sur l'IndexedDB standard.
  - *Pourquoi* : Transactions atomiques fiables, indexation rapide sur les dates et catégories, migration de schéma sans accroc, et gestion synchrone/asynchrone simplifiée avec hooks React (`useLiveQuery`).
  - *Alternative écartée* : `localStorage` (trop limité en volume à 5 Mo, synchrone et bloquant l'UI, risque de corruption) ou IndexedDB natif nu (syntaxe verbeuse sujette aux erreurs de curseur).
- **Architecture Offline & Service Worker (`vite-plugin-pwa`)** :
  - *Choix* : Service Worker avec precaching des assets statiques (HTML, JS, CSS, SVG, polices) et stratégie CacheFirst pour un chargement instantané sans réseau.
  - *Pourquoi* : Conforme aux standards PWA de Chrome et Safari, support d'installation complet sur écran d'accueil, zéro dépendance serveur.
- **Gestion Bidevise FRw / FC** :
  - *Choix* : Chaque compte possède une devise déclarée (FRw par défaut ou FC). Les transactions adoptent la devise du compte. Les listes de courses permettent de définir la devise cible lors du paiement.
  - *Pourquoi* : Reflète fidèlement la réalité économique dans la région des Grands Lacs où les usagers jonglent couramment entre Franc Rwandais, Franc Congolais et Mobile Money.
- **Remboursement de Courses vers Dettes** :
  - *Choix* : Modal de checkout proposant un interrupteur "Frais partagés / À faire rembourser", avec saisie du contact et du montant précis isolé.
  - *Pourquoi* : Permet de ne pas tronquer le montant réel débité sur le compte de paiement tout en gardant une traçabilité automatique de qui doit quoi.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OffMoney PWA (Client)                         │
├────────────────────────────────────────────────────────────────────────┤
│  UI Layer (React 19 + Tailwind CSS + Lucide Icons + Motion)            │
│  ┌──────────────────┬─────────────────┬────────────────┬─────────────┐ │
│  │ Comptes & Flux   │ Courses & Panier│ Dettes/Prêts   │ Sauvegarde  │ │
│  │ - Solde & Virement│ - Multi-listes  │ - Créances     │ - Export JSON││
│  │ - Transactions   │ - Checkout débit│ - Historique   │ - Import JSON││
│  └─────────┬────────┴────────┬────────┴────────┬───────┴──────┬──────┘ │
├────────────┼─────────────────┼─────────────────┼──────────────┼────────┤
│ State & Services Layer (Dexie.js / IndexedDB Reactive Store)           │
│  ┌─────────▼────────┐ ┌──────▼────────┐ ┌──────▼───────┐ ┌────▼──────┐ │
│  │ accounts store   │ │ shoppingLists │ │ debts store  │ │ settings  │ │
│  │ transactions     │ │ shoppingItems │ │ debtPayments │ │ appConfig │ │
│  └──────────────────┴─────────────────┴────────────────┴─────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ Service Worker (vite-plugin-pwa) Cache Storage                         │
│ - Precached Shell (index.html, JS bundles, manifest.json, icons)       │
│ - Offline Fallback & In-App Install Prompt Controller                   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modèle de Données IndexedDB (Stores Dexie)

1. **`accounts`** : `id`, `name`, `type` ('bank' | 'mobile_money' | 'cash' | 'savings'), `currency` ('FRw' | 'FC'), `balance`, `color`, `icon`, `createdAt`, `updatedAt`
2. **`transactions`** : `id`, `accountId`, `type` ('expense' | 'income' | 'transfer'), `amount`, `category`, `label`, `date`, `toAccountId` (si transfert), `shoppingListId` (si lié), `createdAt`
3. **`shoppingLists`** : `id`, `title`, `currency`, `status` ('active' | 'completed'), `archivedAt`, `createdAt`
4. **`shoppingItems`** : `id`, `listId`, `name`, `quantity`, `unit`, `unitPrice`, `category` (rayon), `checked`, `createdAt`
5. **`debts`** : `id`, `personName`, `phone`, `direction` ('they_owe_me' | 'i_owe_them'), `totalAmount`, `remainingAmount`, `currency`, `dueDate`, `status` ('active' | 'settled'), `notes`, `sourceShoppingListId`, `createdAt`
6. **`debtPayments`** : `id`, `debtId`, `amount`, `date`, `notes`, `accountId` (si le remboursement a réintégré un compte)
7. **`categories`** : `id`, `name`, `type` ('expense' | 'income' | 'shopping'), `icon`, `color`
8. **`settings`** : `key`, `value` (devise par défaut, thème, date de dernière sauvegarde)

#### Interaction & Flux Clés

- **Enregistrement de transaction** : Transaction DB atomique incrémentant/décrémentant le `balance` de `accounts`.
- **Virement de compte à compte** : Transaction atomique unique décrémentant le compte émetteur, créditant le compte récepteur, et consignant deux lignes ou un mouvement lié.
- **Règlement de panier Courses** :
  1. Calcul du montant total coché ou global.
  2. Débit immédiat du compte sélectionné avec enregistrement de transaction type `expense` (catégorie Alimentation/Courses).
  3. Si remboursement tiers spécifié : création immédiate d'une fiche `debts` (type `they_owe_me`) liée.
  4. Marquage de la liste comme soldée / archivée.
- **Export / Import JSON** :
  - Export : Lecture de tous les stores et génération d'un blob JSON formaté avec horodatage et checksum de version.
  - Import : Nettoyage et réhydratation atomique de toutes les collections avec confirmation utilisateur et rafraîchissement d'état réactif.
