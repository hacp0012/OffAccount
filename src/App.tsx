/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoData } from './db/database';
import type { ShoppingList } from './types';
import { Navigation } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MonthlyExpensesView } from './components/finances/MonthlyExpensesView';
import { ExpenseChartsView } from './components/finances/ExpenseChartsView';
import { AccountsManagementView } from './components/accounts/AccountsManagementView';
import { ShoppingListsOverview } from './components/shopping/ShoppingListsOverview';
import { ShoppingDetailView } from './components/shopping/ShoppingDetailView';
import { DebtsView } from './components/debts/DebtsView';
import { SettingsView } from './components/settings/SettingsView';
import { CurrencyProvider } from './context/CurrencyContext';
import { TransactionFormModal } from './components/accounts/TransactionFormModal';
import { TransferModal } from './components/accounts/TransferModal';

export default function App() {
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingList | null>(null);

  // Global modal triggers
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Initialize seed demo data on mount if database empty
  useEffect(() => {
    seedDemoData().catch((err) => console.error('Failed to seed demo data:', err));
  }, []);

  // Reactive Live Queries from IndexedDB
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const transactions =
    useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];
  const shoppingLists =
    useLiveQuery(() => db.shoppingLists.orderBy('createdAt').reverse().toArray()) || [];
  const shoppingItems = useLiveQuery(() => db.shoppingItems.toArray()) || [];
  const debts =
    useLiveQuery(() => db.debts.orderBy('createdAt').reverse().toArray()) || [];

  // Active counts for badges
  const activeDebtsCount = debts.filter(
    (d) => d.status !== 'settled' && d.remainingAmount > 0
  ).length;
  const activeShoppingCount = shoppingLists.filter(
    (l) => l.status !== 'completed'
  ).length;

  const activeSelectedList = selectedShoppingList
    ? shoppingLists.find((l) => l.id === selectedShoppingList.id) || null
    : null;

  return (
    <CurrencyProvider>
      <HashRouter>
        <div className="min-h-screen bg-[#f8faf8] text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white">
          {/* Offline Status Badge */}
          <OfflineIndicator />

          {/* Global Navigation Bar */}
          <Navigation
            debtsCount={activeDebtsCount}
            shoppingActiveCount={activeShoppingCount}
          />

          {/* Main Routed Viewport */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-5 sm:pt-6">
            <Routes>
              {/* Redirect root to expenses */}
              <Route path="/" element={<Navigate to="/expenses" replace />} />

              {/* Combined Tab Primary View: Monthly Expenses History */}
              <Route
                path="/expenses"
                element={
                  <MonthlyExpensesView
                    transactions={transactions}
                    accounts={accounts}
                    onOpenNewTransaction={() => setIsNewTxOpen(true)}
                  />
                }
              />

              {/* Dedicated Page: Expense Diagrams & Analytics */}
              <Route
                path="/expenses/charts"
                element={
                  <ExpenseChartsView
                    transactions={transactions}
                    accounts={accounts}
                  />
                }
              />

              {/* Dedicated Page: Accounts Management (ONLY accounts, full CRUD) */}
              <Route
                path="/accounts"
                element={<AccountsManagementView accounts={accounts} />}
              />

              {/* Shopping Module */}
              <Route
                path="/shopping"
                element={
                  activeSelectedList ? (
                    <ShoppingDetailView
                      list={activeSelectedList}
                      items={shoppingItems.filter(
                        (it) => it.listId === activeSelectedList.id
                      )}
                      accounts={accounts}
                      onBack={() => setSelectedShoppingList(null)}
                    />
                  ) : (
                    <ShoppingListsOverview
                      lists={shoppingLists}
                      items={shoppingItems}
                      onSelectList={(list) => setSelectedShoppingList(list)}
                    />
                  )
                }
              />

              {/* Debts Module */}
              <Route
                path="/debts"
                element={<DebtsView debts={debts} accounts={accounts} />}
              />

              {/* Paramètres & Sauvegarde Module */}
              <Route
                path="/settings"
                element={
                  <SettingsView
                    stats={{
                      accountsCount: accounts.length,
                      transactionsCount: transactions.length,
                      shoppingListsCount: shoppingLists.length,
                      debtsCount: debts.length,
                    }}
                  />
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/expenses" replace />} />
            </Routes>
          </main>

          {/* Global Modals */}
          <TransactionFormModal
            isOpen={isNewTxOpen}
            onClose={() => setIsNewTxOpen(false)}
            accounts={accounts}
          />

          <TransferModal
            isOpen={isTransferOpen}
            onClose={() => setIsTransferOpen(false)}
            accounts={accounts}
          />
        </div>
      </HashRouter>
    </CurrencyProvider>
  );
}
