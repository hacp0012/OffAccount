/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, type Location } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { completeFirstRun, db, initializeDatabase } from './db/database';
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
import { NotificationsSettingsView } from './components/settings/NotificationsSettingsView';
import { ReportsView } from './components/reports/ReportsView';
import { PresentationView } from './components/PresentationView';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { TransactionFormModal } from './components/accounts/TransactionFormModal';
import { TransferModal } from './components/accounts/TransferModal';
import { useDailyReminderScheduler } from './hooks/useDailyReminder';

const PageTransition: React.FC<{
  children: (location: Location) => React.ReactNode;
}> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children(location)}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingList | null>(null);
  const [initializationStatus, setInitializationStatus] = useState<
    'loading' | 'setup' | 'ready' | 'error'
  >('loading');
  const [initializationError, setInitializationError] = useState<string | null>(null);
  useDailyReminderScheduler(initializationStatus === 'ready');

  // Global modal triggers
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const initializeApp = async () => {
    setInitializationStatus('loading');
    setInitializationError(null);
    try {
      const isInitialized = await initializeDatabase();
      setInitializationStatus(isInitialized ? 'ready' : 'setup');
    } catch (error) {
      setInitializationError(
        error instanceof Error ? error.message : 'Erreur inconnue lors du chargement.'
      );
      setInitializationStatus('error');
    }
  };

  useEffect(() => {
    void initializeApp();
  }, []);

  const finishFirstRun = async (useDemoData: boolean) => {
    await completeFirstRun(useDemoData);
    setInitializationStatus('ready');
  };

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
    <ThemeProvider>
      <CurrencyProvider>
        <HashRouter>
          <div className="h-dvh min-h-0 overflow-hidden bg-[#f8faf8] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white transition-colors duration-150 print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:text-black">
            {/* Offline Status Badge */}
            <OfflineIndicator />

            {/* Global Navigation Bar */}
            <Navigation
              debtsCount={activeDebtsCount}
              shoppingActiveCount={activeShoppingCount}
            />

            {/* Main Routed Viewport - Ultra-compact margins on mobile for maximum readability */}
            <main className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain print:flex-none print:overflow-visible">
              <div className="max-w-6xl w-full mx-auto px-2 sm:px-6 pt-2 sm:pt-4">
            {initializationStatus === 'loading' ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Préparation de votre espace…
              </div>
            ) : initializationStatus === 'error' ? (
              <div className="mx-auto max-w-lg py-16 text-center">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Impossible d’ouvrir la base de données : {initializationError}
                </p>
                <button
                  type="button"
                  onClick={() => void initializeApp()}
                  className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Réessayer
                </button>
              </div>
            ) : (
            <PageTransition>
              {(location) => initializationStatus === 'setup' ? (
            <Routes location={location}>
              <Route
                path="/presentation"
                element={
                  <PresentationView
                    isFirstRun
                    onCompleteFirstRun={finishFirstRun}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/presentation" replace />} />
            </Routes>
              ) : (
            <Routes location={location}>
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
              <Route
                path="/settings/advanced"
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
              <Route path="/presentation" element={<PresentationView />} />
              <Route
                path="/settings/notifications"
                element={<NotificationsSettingsView />}
              />
              <Route
                path="/reports"
                element={
                  <ReportsView
                    accounts={accounts}
                    transactions={transactions}
                    shoppingLists={shoppingLists}
                    shoppingItems={shoppingItems}
                    debts={debts}
                  />
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/expenses" replace />} />
            </Routes>
              )}
            </PageTransition>
            )}
              </div>
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
  </ThemeProvider>
  );
}
