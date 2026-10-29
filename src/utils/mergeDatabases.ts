/**
 * mergeDatabases.ts
 * Fusion bidirectionnelle sans perte basee sur Last-Write-Wins (LWW).
 * Supporte le soft-delete via le champ deletedAt.
 */

import { db } from "../db/database";

export interface SyncRecord {
  id: string;
  updatedAt?: string;
  createdAt?: string;
  deletedAt?: string;
}

export interface P2PSyncPayload {
  version: number;
  appName: string;
  syncedAt: string;
  deviceId: string;
  data: {
    accounts:      (SyncRecord & Record<string, unknown>)[];
    transactions:  (SyncRecord & Record<string, unknown>)[];
    shoppingLists: (SyncRecord & Record<string, unknown>)[];
    shoppingItems: (SyncRecord & Record<string, unknown>)[];
    debts:         (SyncRecord & Record<string, unknown>)[];
    settings:      (SyncRecord & Record<string, unknown>)[];
    categories:    (SyncRecord & Record<string, unknown>)[];
  };
}

export interface MergeResult {
  added:   number;
  updated: number;
  deleted: number;
  tables:  Record<string, { added: number; updated: number; deleted: number }>;
}

function getTimestamp(record: SyncRecord): number {
  const ts = record.updatedAt ?? record.createdAt ?? "1970-01-01T00:00:00Z";
  const time = new Date(ts).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function mergeTable<T extends SyncRecord>(
  localRecords: T[],
  remoteRecords: T[] = [],
): { toUpsert: T[]; added: number; updated: number; deleted: number } {
  const safeRemote = Array.isArray(remoteRecords) ? remoteRecords : [];
  const localMap = new Map<string, T>(localRecords.map((r) => [r.id, r]));
  const toUpsert: T[] = [];
  let added = 0, updated = 0, deleted = 0;

  for (const remote of safeRemote) {
    if (!remote || !remote.id) continue;
    const local = localMap.get(remote.id);
    if (!local) {
      toUpsert.push(remote);
      remote.deletedAt ? deleted++ : added++;
      continue;
    }
    if (getTimestamp(remote) > getTimestamp(local)) {
      toUpsert.push(remote);
      remote.deletedAt && !local.deletedAt ? deleted++ : updated++;
    }
  }

  return { toUpsert, added, updated, deleted };
}

export async function exportLocalDatabaseForSync(deviceId: string): Promise<P2PSyncPayload> {
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

  return {
    version: 1,
    appName: "OffAccount",
    syncedAt: new Date().toISOString(),
    deviceId,
    data: {
      accounts:      accounts      as any,
      transactions:  transactions  as any,
      shoppingLists: shoppingLists as any,
      shoppingItems: shoppingItems as any,
      debts:         debts         as any,
      settings:      settings      as any,
      categories:    categories    as any,
    },
  };
}

export async function mergeDatabases(remote: P2PSyncPayload): Promise<MergeResult> {
  const remoteData = remote?.data || ({} as Partial<P2PSyncPayload["data"]>);
  const [localAccounts, localTransactions, localShoppingLists, localShoppingItems, localDebts, localSettings, localCategories] =
    await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.shoppingLists.toArray(),
      db.shoppingItems.toArray(),
      db.debts.toArray(),
      db.settings.toArray(),
      db.categories.toArray(),
    ]);

  const accountsMerge     = mergeTable(localAccounts      as any, remoteData.accounts);
  const transactionsMerge = mergeTable(localTransactions  as any, remoteData.transactions);
  const listsMerge        = mergeTable(localShoppingLists as any, remoteData.shoppingLists);
  const itemsMerge        = mergeTable(localShoppingItems as any, remoteData.shoppingItems);
  const debtsMerge        = mergeTable(localDebts         as any, remoteData.debts);
  const settingsMerge     = mergeTable(localSettings      as any, remoteData.settings);
  const categoriesMerge   = mergeTable(localCategories    as any, remoteData.categories);

  await db.transaction(
    "rw",
    [db.accounts, db.transactions, db.shoppingLists, db.shoppingItems, db.debts, db.settings, db.categories],
    async () => {
      const apply = async (table: any, merge: { toUpsert: any[] }) => {
        if (merge.toUpsert.length > 0) await table.bulkPut(merge.toUpsert);
      };
      await Promise.all([
        apply(db.accounts,      accountsMerge),
        apply(db.transactions,  transactionsMerge),
        apply(db.shoppingLists, listsMerge),
        apply(db.shoppingItems, itemsMerge),
        apply(db.debts,         debtsMerge),
        apply(db.settings,      settingsMerge),
        apply(db.categories,    categoriesMerge),
      ]);
    },
  );

  const tables: MergeResult["tables"] = {
    accounts:      { added: accountsMerge.added,     updated: accountsMerge.updated,     deleted: accountsMerge.deleted },
    transactions:  { added: transactionsMerge.added, updated: transactionsMerge.updated, deleted: transactionsMerge.deleted },
    shoppingLists: { added: listsMerge.added,        updated: listsMerge.updated,        deleted: listsMerge.deleted },
    shoppingItems: { added: itemsMerge.added,        updated: itemsMerge.updated,        deleted: itemsMerge.deleted },
    debts:         { added: debtsMerge.added,        updated: debtsMerge.updated,        deleted: debtsMerge.deleted },
    categories:    { added: categoriesMerge.added,   updated: categoriesMerge.updated,   deleted: categoriesMerge.deleted },
  };

  const total = (key: "added" | "updated" | "deleted") =>
    Object.values(tables).reduce((sum, t) => sum + t[key], 0);

  return { added: total("added"), updated: total("updated"), deleted: total("deleted"), tables };
}