import type { Currency } from '../types';
import { createDefaultCategories, db } from '../db/database';
import { getCurrencyInfo } from './currencies';
import type {
  Account,
  AppSettings,
  Category,
  Debt,
  ProductPrice,
  ShoppingItem,
  ShoppingList,
  Transaction,
} from '../types';

export function formatMoney(amount: number, currency?: Currency): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const info = getCurrencyInfo(currency);

  let formattedNum = '';
  if (info.code === 'USD' || info.code === 'CAD') {
    formattedNum = absAmount.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(absAmount) ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? '-' : ''}${info.symbol}${formattedNum}`;
  }

  if (info.code === 'EUR' || info.code === 'GBP') {
    formattedNum = absAmount.toLocaleString('fr-FR', {
      minimumFractionDigits: Number.isInteger(absAmount) ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? '-' : ''}${formattedNum} ${info.symbol}`;
  }

  // Typical whole-number currencies (FRw, FC, FCFA, KSh, etc.)
  formattedNum = Math.round(absAmount).toLocaleString('fr-FR');
  return `${isNegative ? '-' : ''}${formattedNum} ${info.symbol}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// Backup & Restore Services
export interface FullBackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    accounts: unknown[];
    transactions: unknown[];
    shoppingLists: unknown[];
    shoppingItems: unknown[];
    debts: unknown[];
    settings: unknown[];
    categories?: unknown[];
    productPrices?: unknown[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringFields(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string');
}

function isArrayOf<T>(value: unknown, validator: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(validator);
}

function isAccount(value: unknown): value is Account {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'name', 'currency', 'color', 'icon', 'createdAt', 'updatedAt']) &&
    ['bank', 'mobile_money', 'cash', 'savings'].includes(value.type as string) &&
    typeof value.balance === 'number' &&
    Number.isFinite(value.balance) &&
    (value.notes === undefined || typeof value.notes === 'string')
  );
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'accountId', 'currency', 'category', 'label', 'date', 'createdAt']) &&
    ['expense', 'income', 'transfer'].includes(value.type as string) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    ['time', 'toAccountId', 'shoppingListId', 'debtId'].every(
      (field) => value[field] === undefined || typeof value[field] === 'string',
    )
  );
}

function isShoppingList(value: unknown): value is ShoppingList {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'title', 'currency', 'createdAt']) &&
    ['active', 'completed', 'archived'].includes(value.status as string) &&
    ['paidFromAccountId', 'reimbursementDebtId', 'completedAt'].every(
      (field) => value[field] === undefined || typeof value[field] === 'string',
    ) &&
    (value.paidAmount === undefined ||
      (typeof value.paidAmount === 'number' && Number.isFinite(value.paidAmount)))
  );
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'listId', 'name', 'unit', 'category', 'createdAt']) &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity) &&
    typeof value.unitPrice === 'number' &&
    Number.isFinite(value.unitPrice) &&
    typeof value.checked === 'boolean' &&
    (value.notes === undefined || typeof value.notes === 'string')
  );
}

function isDebt(value: unknown): value is Debt {
  if (
    !isRecord(value) ||
    !hasStringFields(value, ['id', 'personName', 'currency', 'status', 'createdAt', 'updatedAt']) ||
    !['they_owe_me', 'i_owe_them'].includes(value.direction as string) ||
    !['active', 'settled'].includes(value.status as string) ||
    typeof value.totalAmount !== 'number' ||
    !Number.isFinite(value.totalAmount) ||
    typeof value.remainingAmount !== 'number' ||
    !Number.isFinite(value.remainingAmount) ||
    !Array.isArray(value.payments)
  ) {
    return false;
  }

  return value.payments.every(
    (payment) =>
      isRecord(payment) &&
      hasStringFields(payment, ['id', 'debtId', 'currency', 'date', 'createdAt']) &&
      typeof payment.amount === 'number' &&
      Number.isFinite(payment.amount) &&
      (payment.notes === undefined || typeof payment.notes === 'string') &&
      (payment.accountId === undefined || typeof payment.accountId === 'string'),
  );
}

function isAppSettings(value: unknown): value is AppSettings {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'defaultCurrency']) &&
    (value.userName === undefined || typeof value.userName === 'string') &&
    (value.lastBackupDate === undefined || typeof value.lastBackupDate === 'string')
  );
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'name', 'createdAt']) &&
    ['expense', 'income', 'shopping'].includes(value.type as string) &&
    (value.color === undefined || typeof value.color === 'string') &&
    (value.icon === undefined || typeof value.icon === 'string') &&
    (value.isDefault === undefined || typeof value.isDefault === 'boolean')
  );
}

function isProductPrice(value: unknown): value is ProductPrice {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'name', 'currency', 'createdAt', 'updatedAt']) &&
    (value.label === undefined || typeof value.label === 'string') &&
    typeof value.unitPrice === 'number' &&
    Number.isFinite(value.unitPrice) &&
    value.unitPrice >= 0
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erreur inconnue.';
}

export async function exportDatabaseToJSON(): Promise<string> {
  const [accounts, transactions, shoppingLists, shoppingItems, debts, settings, categories, productPrices] =
    await db.transaction(
      'r',
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
      () =>
        Promise.all([
          db.accounts.toArray(),
          db.transactions.toArray(),
          db.shoppingLists.toArray(),
          db.shoppingItems.toArray(),
          db.debts.toArray(),
          db.settings.toArray(),
          db.categories.toArray(),
          db.productPrices.toArray(),
        ]),
    );

  const payload: FullBackupPayload = {
    version: 1,
    appName: 'OffAccount',
    exportedAt: new Date().toISOString(),
    data: {
      accounts,
      transactions,
      shoppingLists,
      shoppingItems,
      debts,
      settings,
      categories,
      productPrices,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (
      !isRecord(parsed) ||
      parsed.appName !== 'OffAccount' ||
      parsed.version !== 1 ||
      !isRecord(parsed.data)
    ) {
      return {
        success: false,
        message: 'Format de sauvegarde invalide ou version non prise en charge.',
      };
    }

    const data = parsed.data;
    if (
      !isArrayOf(data.accounts, isAccount) ||
      !isArrayOf(data.transactions, isTransaction) ||
      !isArrayOf(data.shoppingLists, isShoppingList) ||
      !isArrayOf(data.shoppingItems, isShoppingItem) ||
      !isArrayOf(data.debts, isDebt) ||
      !isArrayOf(data.settings, isAppSettings) ||
      (data.categories !== undefined && !isArrayOf(data.categories, isCategory))
      || (data.productPrices !== undefined && !isArrayOf(data.productPrices, isProductPrice))
    ) {
      return {
        success: false,
        message: 'La sauvegarde est incomplète ou contient des données invalides. Aucune donnée n’a été modifiée.',
      };
    }

    const accounts = data.accounts;
    const transactions = data.transactions;
    const shoppingLists = data.shoppingLists;
    const shoppingItems = data.shoppingItems;
    const debts = data.debts;
    const settings = data.settings;
    const categories = data.categories ?? [];
    const productPrices = data.productPrices ?? [];

    const importedCategories = [...categories];
    const defaultCategories = createDefaultCategories();
    (['expense', 'income', 'shopping'] as const).forEach((type) => {
      if (!importedCategories.some((category) => category.type === type)) {
        importedCategories.push(...defaultCategories.filter((category) => category.type === type));
      }
    });

    const importedSettings = settings.filter((setting) => setting.id !== 'app_initialized');
    const defaultConfig = importedSettings.find((setting) => setting.id === 'default_config');
    if (!defaultConfig) {
      importedSettings.push({
        id: 'default_config',
        defaultCurrency: 'FRw',
        userName: 'Utilisateur OffAccount',
      });
    }
    importedSettings.push({
      id: 'app_initialized',
      defaultCurrency: defaultConfig?.defaultCurrency || 'FRw',
    });

    // Run atomic transaction across all stores
    await db.transaction('rw', [db.accounts, db.transactions, db.shoppingLists, db.shoppingItems, db.debts, db.settings, db.categories, db.productPrices], async () => {
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

      if (accounts.length > 0) {
        await db.accounts.bulkAdd(accounts);
      }
      if (transactions.length > 0) {
        await db.transactions.bulkAdd(transactions);
      }
      if (shoppingLists.length > 0) {
        await db.shoppingLists.bulkAdd(shoppingLists);
      }
      if (shoppingItems.length > 0) {
        await db.shoppingItems.bulkAdd(shoppingItems);
      }
      if (debts.length > 0) {
        await db.debts.bulkAdd(debts);
      }
      if (importedSettings.length > 0) {
        await db.settings.bulkAdd(importedSettings);
      }
      if (importedCategories.length > 0) {
        await db.categories.bulkAdd(importedCategories);
      }
      if (productPrices.length > 0) {
        await db.productPrices.bulkAdd(productPrices);
      }
    });

    return {
      success: true,
      message: `Restauration réussie ! ${accounts.length} comptes, ${transactions.length} transactions et ${importedCategories.length} catégories restaurés.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Erreur lors de la lecture du fichier : ${getErrorMessage(err)}`,
    };
  }
}
