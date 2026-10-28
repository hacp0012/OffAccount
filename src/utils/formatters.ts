import type { Currency } from '../types';
import { db } from '../db/database';
import { getCurrencyInfo } from './currencies';

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
  };
}

export async function exportDatabaseToJSON(): Promise<string> {
  const [accounts, transactions, shoppingLists, shoppingItems, debts, settings, categories] =
    await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.shoppingLists.toArray(),
      db.shoppingItems.toArray(),
      db.debts.toArray(),
      db.settings.toArray(),
      db.categories.toArray(),
    ]);

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
    },
  };

  return JSON.stringify(payload, null, 2);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString) as FullBackupPayload;
    if (!parsed || !parsed.data) {
      return { success: false, message: 'Format de fichier de sauvegarde invalide (structure JSON manquante).' };
    }

    const { accounts, transactions, shoppingLists, shoppingItems, debts, settings, categories } = parsed.data;

    // Run atomic transaction across all stores
    await db.transaction('rw', [db.accounts, db.transactions, db.shoppingLists, db.shoppingItems, db.debts, db.settings, db.categories], async () => {
      await Promise.all([
        db.accounts.clear(),
        db.transactions.clear(),
        db.shoppingLists.clear(),
        db.shoppingItems.clear(),
        db.debts.clear(),
        db.settings.clear(),
        db.categories.clear(),
      ]);

      if (Array.isArray(accounts) && accounts.length > 0) {
        await db.accounts.bulkAdd(accounts as any);
      }
      if (Array.isArray(transactions) && transactions.length > 0) {
        await db.transactions.bulkAdd(transactions as any);
      }
      if (Array.isArray(shoppingLists) && shoppingLists.length > 0) {
        await db.shoppingLists.bulkAdd(shoppingLists as any);
      }
      if (Array.isArray(shoppingItems) && shoppingItems.length > 0) {
        await db.shoppingItems.bulkAdd(shoppingItems as any);
      }
      if (Array.isArray(debts) && debts.length > 0) {
        await db.debts.bulkAdd(debts as any);
      }
      if (Array.isArray(settings) && settings.length > 0) {
        await db.settings.bulkAdd(settings as any);
      }
      if (Array.isArray(categories) && categories.length > 0) {
        await db.categories.bulkAdd(categories as any);
      }
    });

    return {
      success: true,
      message: `Restauration réussie ! ${accounts?.length || 0} comptes, ${transactions?.length || 0} transactions et ${categories?.length || 0} catégories restaurés.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erreur lors de la lecture du fichier : ${err.message || 'JSON non reconnu'}`,
    };
  }
}
