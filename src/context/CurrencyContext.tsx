import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { DEFAULT_CURRENCY, getCurrencyInfo, type CurrencyInfo } from '../utils/currencies';
import type { AppSettings } from '../types';

interface CurrencyContextType {
  currency: string;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  currencyInfo: getCurrencyInfo(DEFAULT_CURRENCY),
  setCurrency: async () => {},
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settings = useLiveQuery(() => db.settings.get('default_config'));
  const [currency, setLocalCurrency] = useState<string>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (settings?.defaultCurrency) {
      setLocalCurrency(settings.defaultCurrency);
    }
  }, [settings]);

  const handleSetCurrency = async (newCode: string) => {
    setLocalCurrency(newCode);
    try {
      const existing = await db.settings.get('default_config');
      await db.settings.put({
        id: 'default_config',
        userName: existing?.userName || 'Utilisateur OffAccount',
        lastBackupDate: existing?.lastBackupDate,
        defaultCurrency: newCode,
      });

      // Synchronize all existing accounts, lists, and debts to this active global currency
      await db.transaction('rw', [db.accounts, db.transactions, db.shoppingLists, db.debts], async () => {
        const accounts = await db.accounts.toArray();
        for (const acc of accounts) {
          if (acc.currency !== newCode) {
            await db.accounts.update(acc.id, { currency: newCode });
          }
        }

        const shoppingLists = await db.shoppingLists.toArray();
        for (const list of shoppingLists) {
          if (list.currency !== newCode) {
            await db.shoppingLists.update(list.id, { currency: newCode });
          }
        }

        const debts = await db.debts.toArray();
        for (const debt of debts) {
          if (debt.currency !== newCode) {
            await db.debts.update(debt.id, { currency: newCode });
          }
        }
      });
    } catch (err) {
      console.error('Failed to update global currency setting:', err);
    }
  };

  const currencyInfo = getCurrencyInfo(currency);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyInfo,
        setCurrency: handleSetCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useAppCurrency() {
  return useContext(CurrencyContext);
}
