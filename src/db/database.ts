import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Transaction,
  ShoppingList,
  ShoppingItem,
  Debt,
  AppSettings,
  Category,
  ProductPrice,
} from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Alimentation & Courses', color: '#059669', icon: 'utensils' },
  { name: 'Transport & Carburant', color: '#d97706', icon: 'car' },
  { name: 'Logement & Factures', color: '#2563eb', icon: 'home' },
  { name: 'Télécom & Internet', color: '#4f46e5', icon: 'wifi' },
  { name: 'Santé & Pharmacie', color: '#e11d48', icon: 'heart-pulse' },
  { name: 'Loisirs & Sorties', color: '#7c3aed', icon: 'coffee' },
  { name: 'Shopping & Vêtements', color: '#db2777', icon: 'shirt' },
  { name: 'Éducation & Famille', color: '#0891b2', icon: 'graduation-cap' },
  { name: 'Divers & Imprévus', color: '#64748b', icon: 'help-circle' },
];

export const DEFAULT_INCOME_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Salaire / Prestation', color: '#059669', icon: 'briefcase' },
  { name: 'Vente & Commerce', color: '#0d9488', icon: 'store' },
  { name: 'Remboursement perçu', color: '#0284c7', icon: 'arrow-down-left' },
  { name: 'Aide & Cadeau', color: '#9333ea', icon: 'gift' },
  { name: 'Investissement / Intérêts', color: '#d97706', icon: 'trending-up' },
  { name: 'Autre revenu', color: '#64748b', icon: 'plus-circle' },
];

export const DEFAULT_SHOPPING_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Autre', color: '#64748b', icon: 'tag' },
];

export class OffMoneyDatabase extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  shoppingLists!: Table<ShoppingList, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  debts!: Table<Debt, string>;
  settings!: Table<AppSettings, string>;
  categories!: Table<Category, string>;
  productPrices!: Table<ProductPrice, string>;

  constructor() {
    super('OffMoneyDB');
    this.version(1).stores({
      accounts: 'id, type, currency, createdAt',
      transactions: 'id, accountId, type, category, date, toAccountId, shoppingListId, createdAt',
      shoppingLists: 'id, status, currency, createdAt',
      shoppingItems: 'id, listId, category, checked, createdAt',
      debts: 'id, personName, direction, status, currency, dueDate, createdAt',
      settings: 'id',
    });
    this.version(2).stores({
      categories: 'id, type, name, createdAt',
    });
    this.version(3).stores({
      productPrices: 'id, name, currency, updatedAt',
    });
  }
}

export const db = new OffMoneyDatabase();

const APP_INITIALIZED_SETTING_ID = 'app_initialized';
const FIRST_RUN_PENDING_SETTING_ID = 'first_run_pending';

export function createDefaultCategories(): Category[] {
  const now = new Date().toISOString();
  return [
    ...DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
      id: `cat_exp_${index + 1}`,
      name: category.name,
      type: 'expense' as const,
      color: category.color,
      icon: category.icon,
      isDefault: true,
      createdAt: now,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((category, index) => ({
      id: `cat_inc_${index + 1}`,
      name: category.name,
      type: 'income' as const,
      color: category.color,
      icon: category.icon,
      isDefault: true,
      createdAt: now,
    })),
    ...DEFAULT_SHOPPING_CATEGORIES.map((category, index) => ({
      id: `cat_shop_${index + 1}`,
      name: category.name,
      type: 'shopping' as const,
      color: category.color,
      icon: category.icon,
      isDefault: true,
      createdAt: now,
    })),
  ];
}

export async function ensureDefaultCategories(): Promise<void> {
  try {
    const count = await db.categories.count();

    if (count === 0) {
      await db.categories.bulkAdd(createDefaultCategories());
      return;
    }

    await db.transaction('rw', [db.categories, db.shoppingItems], async () => {
      const shoppingCategories = await db.categories
        .where('type')
        .equals('shopping')
        .toArray();
      const fallbackCategory = DEFAULT_SHOPPING_CATEGORIES[0];
      let defaultCategory = shoppingCategories.find(
        (category) => category.name === fallbackCategory.name,
      );

      if (!defaultCategory) {
        defaultCategory = shoppingCategories.find(
          (category) => category.isDefault && category.name === 'Autre rayon',
        );
        if (defaultCategory) {
          const legacyItems = await db.shoppingItems
            .where('category')
            .equals(defaultCategory.name)
            .toArray();
          await db.categories.update(defaultCategory.id, {
            name: fallbackCategory.name,
            color: fallbackCategory.color,
            icon: fallbackCategory.icon,
            isDefault: true,
          });
          await Promise.all(
            legacyItems.map((item) =>
              db.shoppingItems.update(item.id, { category: fallbackCategory.name }),
            ),
          );
          defaultCategory = { ...defaultCategory, ...fallbackCategory, isDefault: true };
        } else {
          defaultCategory = {
            id: 'cat_shop_other',
            name: fallbackCategory.name,
            type: 'shopping',
            color: fallbackCategory.color,
            icon: fallbackCategory.icon,
            isDefault: true,
            createdAt: new Date().toISOString(),
          };
          await db.categories.add(defaultCategory);
        }
      } else if (!defaultCategory.isDefault) {
        await db.categories.update(defaultCategory.id, { isDefault: true });
        defaultCategory = { ...defaultCategory, isDefault: true };
      }

      const obsoleteDefaults = shoppingCategories.filter(
        (category) => category.isDefault && category.id !== defaultCategory?.id,
      );
      for (const category of obsoleteDefaults) {
        const itemsInCategory = await db.shoppingItems
          .where('category')
          .equals(category.name)
          .toArray();
        await Promise.all(
          itemsInCategory.map((item) =>
            db.shoppingItems.update(item.id, { category: fallbackCategory.name }),
          ),
        );
        await db.categories.delete(category.id);
      }
    });
  } catch (err) {
    console.error('Error ensuring default categories:', err);
  }
}

export async function initializeDatabase(): Promise<boolean> {
  if (await db.settings.get(APP_INITIALIZED_SETTING_ID)) {
    await ensureDefaultCategories();
    return true;
  }

  if (await db.settings.get(FIRST_RUN_PENDING_SETTING_ID)) {
    await ensureDefaultCategories();
    return false;
  }

  const tableCounts = await Promise.all([
    db.accounts.count(),
    db.transactions.count(),
    db.shoppingLists.count(),
    db.shoppingItems.count(),
    db.debts.count(),
    db.settings.count(),
    db.categories.count(),
  ]);
  const hasExistingData = tableCounts.some((count) => count > 0);

  if (hasExistingData) {
    await ensureDefaultCategories();
    await db.settings.put({
      id: APP_INITIALIZED_SETTING_ID,
      defaultCurrency: 'FRw',
    });
  } else {
    await db.transaction('rw', [db.settings, db.categories], async () => {
      await db.categories.bulkAdd(createDefaultCategories());
      await db.settings.put({
        id: FIRST_RUN_PENDING_SETTING_ID,
        defaultCurrency: 'FRw',
      });
    });
    return false;
  }

  return true;
}

export async function completeFirstRun(useDemoData: boolean): Promise<void> {
  if (!(await db.settings.get(FIRST_RUN_PENDING_SETTING_ID))) {
    throw new Error('La configuration initiale est déjà terminée.');
  }

  await resetDatabaseToBlank();
  if (useDemoData) {
    await seedDemoData();
  } else {
    await db.shoppingLists.add({
      id: 'list_default_shopping',
      title: 'Choses à acheter',
      currency: 'FRw',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }
}

export async function resetDatabaseToBlank(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.shoppingLists,
      db.shoppingItems,
      db.debts,
      db.settings,
      db.categories,
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
        db.categories.clear(),
        db.productPrices.clear(),
      ]);
      await db.categories.bulkAdd(createDefaultCategories());
      await db.settings.bulkPut([
        {
          id: 'default_config',
          defaultCurrency: 'FRw',
          userName: 'Utilisateur OffAccount',
        },
        {
          id: APP_INITIALIZED_SETTING_ID,
          defaultCurrency: 'FRw',
        },
      ]);
    },
  );
}

// Seed initial realistic data for quick exploration
export async function seedDemoData(): Promise<void> {
  await ensureDefaultCategories();
  const accountsCount = await db.accounts.count();
  if (accountsCount > 0) return; // already initialized

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const threeDaysAgoStr = new Date(now.getTime() - 86400000 * 3).toISOString().split('T')[0];

  const demoAccounts: Account[] = [
    {
      id: 'acc_mtn_rw',
      name: 'MTN Mobile Money',
      type: 'mobile_money',
      currency: 'FRw',
      balance: 145000,
      color: '#eab308', // amber/yellow typical of MTN
      icon: 'smartphone',
      notes: 'Compte principal au Rwanda',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    },
    {
      id: 'acc_airtel_cd',
      name: 'Airtel Money',
      type: 'mobile_money',
      currency: 'FC',
      balance: 280000,
      color: '#ef4444', // red typical of Airtel
      icon: 'smartphone',
      notes: 'Compte principal en RDC',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    },
    {
      id: 'acc_bank_usd',
      name: 'Compte Épargne Dollar',
      type: 'bank',
      currency: 'USD',
      balance: 450,
      color: '#0284c7', // sky blue
      icon: 'landmark',
      notes: 'Banque commerciale BK / Rawbank',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    },
    {
      id: 'acc_cash_rw',
      name: 'Espèces Portefeuille',
      type: 'cash',
      currency: 'FRw',
      balance: 28500,
      color: '#059669', // emerald
      icon: 'wallet',
      notes: 'Liquidités physiques quotidiennes',
      createdAt: threeDaysAgoStr,
      updatedAt: todayStr,
    },
  ];

  await db.accounts.bulkAdd(demoAccounts);

  const demoTransactions: Transaction[] = [
    // Current month: October 2026 (FRw)
    {
      id: 'tx_init_1',
      accountId: 'acc_mtn_rw',
      type: 'income',
      amount: 450000,
      currency: 'FRw',
      category: 'Salaire / Prestation',
      label: 'Salaire mensuel & honoraires',
      date: '2026-10-02',
      createdAt: '2026-10-02T08:00:00Z',
    },
    {
      id: 'tx_init_2',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 120000,
      currency: 'FRw',
      category: 'Logement & Factures',
      label: 'Loyer appartement & eau/électricité',
      date: '2026-10-04',
      createdAt: '2026-10-04T10:00:00Z',
    },
    {
      id: 'tx_init_3',
      accountId: 'acc_cash_rw',
      type: 'expense',
      amount: 32000,
      currency: 'FRw',
      category: 'Alimentation & Courses',
      label: 'Provisions marché Kimironko',
      date: '2026-10-08',
      createdAt: '2026-10-08T11:30:00Z',
    },
    {
      id: 'tx_init_4',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 22000,
      currency: 'FRw',
      category: 'Transport & Carburant',
      label: 'Carburant moto / véhicule',
      date: '2026-10-12',
      createdAt: '2026-10-12T15:00:00Z',
    },
    {
      id: 'tx_init_5',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 15000,
      currency: 'FRw',
      category: 'Télécom & Internet',
      label: 'Forfait data mensuel 4G',
      date: '2026-10-15',
      createdAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'tx_init_6',
      accountId: 'acc_cash_rw',
      type: 'expense',
      amount: 9500,
      currency: 'FRw',
      category: 'Santé & Pharmacie',
      label: 'Pharmacie médicaments & vitamines',
      date: '2026-10-18',
      createdAt: '2026-10-18T16:00:00Z',
    },
    {
      id: 'tx_init_7',
      accountId: 'acc_cash_rw',
      type: 'expense',
      amount: 18500,
      currency: 'FRw',
      category: 'Loisirs & Sorties',
      label: 'Dîner en ville & café',
      date: '2026-10-22',
      createdAt: '2026-10-22T19:30:00Z',
    },
    {
      id: 'tx_init_8',
      accountId: 'acc_cash_rw',
      type: 'expense',
      amount: 14200,
      currency: 'FRw',
      category: 'Alimentation & Courses',
      label: 'Boucherie & légumes frais',
      date: '2026-10-26',
      createdAt: '2026-10-26T12:00:00Z',
    },
    {
      id: 'tx_init_9',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 8000,
      currency: 'FRw',
      category: 'Divers & Imprévus',
      label: 'Réparation cordon chargeur',
      date: '2026-10-28',
      createdAt: '2026-10-28T09:15:00Z',
    },

    // Previous month: September 2026 (FRw) for historical comparison
    {
      id: 'tx_sep_1',
      accountId: 'acc_mtn_rw',
      type: 'income',
      amount: 430000,
      currency: 'FRw',
      category: 'Salaire / Prestation',
      label: 'Salaire septembre',
      date: '2026-09-02',
      createdAt: '2026-09-02T08:00:00Z',
    },
    {
      id: 'tx_sep_2',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 120000,
      currency: 'FRw',
      category: 'Logement & Factures',
      label: 'Loyer septembre',
      date: '2026-09-05',
      createdAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'tx_sep_3',
      accountId: 'acc_cash_rw',
      type: 'expense',
      amount: 65000,
      currency: 'FRw',
      category: 'Alimentation & Courses',
      label: 'Grosses courses mensuelles',
      date: '2026-09-12',
      createdAt: '2026-09-12T14:00:00Z',
    },
    {
      id: 'tx_sep_4',
      accountId: 'acc_mtn_rw',
      type: 'expense',
      amount: 30000,
      currency: 'FRw',
      category: 'Transport & Carburant',
      label: 'Déplacements & taxi',
      date: '2026-09-20',
      createdAt: '2026-09-20T17:00:00Z',
    },

    // Franc Congolais (FC)
    {
      id: 'tx_fc_1',
      accountId: 'acc_airtel_cd',
      type: 'income',
      amount: 600000,
      currency: 'FC',
      category: 'Vente & Commerce',
      label: 'Recette boutique & vente marchandises',
      date: '2026-10-05',
      createdAt: '2026-10-05T09:00:00Z',
    },
    {
      id: 'tx_fc_2',
      accountId: 'acc_airtel_cd',
      type: 'expense',
      amount: 140000,
      currency: 'FC',
      category: 'Transport & Carburant',
      label: 'Carburant véhicule transport',
      date: '2026-10-14',
      createdAt: '2026-10-14T11:00:00Z',
    },
    {
      id: 'tx_fc_3',
      accountId: 'acc_airtel_cd',
      type: 'expense',
      amount: 95000,
      currency: 'FC',
      category: 'Alimentation & Courses',
      label: 'Approvisionnement vivres frais',
      date: '2026-10-23',
      createdAt: '2026-10-23T15:30:00Z',
    },

    // USD
    {
      id: 'tx_usd_1',
      accountId: 'acc_bank_usd',
      type: 'income',
      amount: 600,
      currency: 'USD',
      category: 'Virement international',
      label: 'Contrat prestation logicielle',
      date: '2026-10-03',
      createdAt: '2026-10-03T08:00:00Z',
    },
    {
      id: 'tx_usd_2',
      accountId: 'acc_bank_usd',
      type: 'expense',
      amount: 85,
      currency: 'USD',
      category: 'Télécom & Internet',
      label: 'Abonnement outils cloud & SaaS',
      date: '2026-10-10',
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'tx_usd_3',
      accountId: 'acc_bank_usd',
      type: 'expense',
      amount: 45,
      currency: 'USD',
      category: 'Services bancaires',
      label: 'Frais de carte bancaire & tenue',
      date: '2026-10-25',
      createdAt: '2026-10-25T16:00:00Z',
    },
  ];

  await db.transactions.bulkAdd(demoTransactions);

  // Demo Shopping list
  const listId = 'list_demo_1';
  const demoShoppingList: ShoppingList = {
    id: listId,
    title: 'Marché hebdomadaire & Provisions',
    currency: 'FRw',
    status: 'active',
    createdAt: yesterdayStr,
  };

  await db.shoppingLists.add(demoShoppingList);

  const demoItems: ShoppingItem[] = [
    {
      id: 'item_1',
      listId: listId,
      name: 'Riz parfumé de Bugarama (5kg)',
      quantity: 1,
      unit: 'sac',
      unitPrice: 8500,
      category: 'Épicerie',
      checked: true,
      createdAt: yesterdayStr,
    },
    {
      id: 'item_2',
      listId: listId,
      name: 'Huile végétale raffinée (2L)',
      quantity: 1,
      unit: 'bouteille',
      unitPrice: 6000,
      category: 'Épicerie',
      checked: true,
      createdAt: yesterdayStr,
    },
    {
      id: 'item_3',
      listId: listId,
      name: 'Tomates fraîches & Oignons',
      quantity: 3,
      unit: 'kg',
      unitPrice: 1500,
      category: 'Fruits & Légumes',
      checked: false,
      createdAt: yesterdayStr,
    },
    {
      id: 'item_4',
      listId: listId,
      name: 'Lessive poudre & Savon',
      quantity: 2,
      unit: 'paquet',
      unitPrice: 2200,
      category: 'Hygiène & Entretien',
      checked: false,
      createdAt: yesterdayStr,
    },
  ];

  await db.shoppingItems.bulkAdd(demoItems);

  // Demo Debts
  const demoDebts: Debt[] = [
    {
      id: 'debt_demo_1',
      personName: 'Alice Mukamana',
      phone: '+250 788 123 456',
      direction: 'they_owe_me', // Créance (on me doit)
      totalAmount: 50000,
      remainingAmount: 35000,
      currency: 'FRw',
      dueDate: new Date(now.getTime() + 86400000 * 7).toISOString().split('T')[0],
      status: 'active',
      notes: 'Partage de frais abonnement annuel et courses',
      payments: [
        {
          id: 'pay_1',
          debtId: 'debt_demo_1',
          amount: 15000,
          currency: 'FRw',
          date: yesterdayStr,
          notes: 'Premier versement en espèces',
          createdAt: yesterdayStr,
        },
      ],
      createdAt: threeDaysAgoStr,
      updatedAt: yesterdayStr,
    },
    {
      id: 'debt_demo_2',
      personName: 'Garage Auto Kicukiro',
      phone: '+250 783 999 888',
      direction: 'i_owe_them', // Dette (je dois)
      totalAmount: 40000,
      remainingAmount: 40000,
      currency: 'FRw',
      dueDate: new Date(now.getTime() + 86400000 * 14).toISOString().split('T')[0],
      status: 'active',
      notes: 'Solde pour remplacement plaquettes de frein',
      payments: [],
      createdAt: yesterdayStr,
      updatedAt: yesterdayStr,
    },
  ];

  await db.debts.bulkAdd(demoDebts);

  // Demo settings
  await db.settings.put({
    id: 'default_config',
    defaultCurrency: 'FRw',
    userName: 'Utilisateur OffMoney',
    lastBackupDate: undefined,
  });
}
