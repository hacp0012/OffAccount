import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Printer,
  ShoppingBasket,
  TrendingDown,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type {
  Account,
  Debt,
  ShoppingItem,
  ShoppingList,
  Transaction,
} from '../../types';
import { formatDate, formatMoney } from '../../utils/formatters';

type ReportType = 'transactions' | 'shopping' | 'debts';

interface ReportsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
  debts: Debt[];
}

const localDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = () => {
  const today = new Date();
  return {
    from: localDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDateInputValue(today),
  };
};

const sumByCurrency = (
  values: Array<{ amount: number; currency: string }>
): string => {
  const totals = new Map<string, number>();
  values.forEach(({ amount, currency }) => {
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  });
  if (totals.size === 0) return formatMoney(0);
  return [...totals.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' · ');
};

const dateIsInRange = (date: string, from: string, to: string) =>
  date >= from && date <= to;

const csvCell = (value: string | number): string => {
  let text = String(value);
  const isNegativeNumber = /^-\d+(?:,\d+)?$/.test(text);
  if (/^[\t\r\n ]*[=+\-@]/.test(text) && !isNegativeNumber) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

const csvAmount = (value: number): string =>
  value.toLocaleString('fr-FR', {
    useGrouping: false,
    maximumFractionDigits: 2,
  });

const ReportPageHeader: React.FC<{
  title: string;
  range: { from: string; to: string };
}> = ({ title, range }) => (
  <header className="hidden print:block">
    <h1 className="text-2xl font-bold text-black">OA — {title}</h1>
    <p className="mt-1 text-sm text-black">
      Période : {formatDate(range.from)} – {formatDate(range.to)}
    </p>
    <p className="mt-1 text-xs text-black">
      Imprimé le {new Date().toLocaleDateString('fr-FR')}
    </p>
  </header>
);

export const ReportsView: React.FC<ReportsViewProps> = ({
  accounts,
  transactions,
  shoppingLists,
  shoppingItems,
  debts,
}) => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<ReportType>('transactions');
  const [range, setRange] = useState(getDateRange);
  const [transactionType, setTransactionType] = useState<'all' | 'expense' | 'income'>('all');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [shoppingStatus, setShoppingStatus] = useState<'all' | ShoppingList['status']>('all');
  const [debtDirection, setDebtDirection] = useState<'all' | Debt['direction']>('all');
  const [debtStatus, setDebtStatus] = useState<'all' | Debt['status']>('all');
  const [exportError, setExportError] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      [...new Set(
        transactions
          .filter((transaction) => transaction.type !== 'transfer')
          .map((transaction) => transaction.category)
      )].sort((a, b) => a.localeCompare(b, 'fr')),
    [transactions]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        return (
          transaction.type !== 'transfer' &&
          dateIsInRange(transaction.date, range.from, range.to) &&
          (transactionType === 'all' || transaction.type === transactionType) &&
          (accountId === 'all' || transaction.accountId === accountId) &&
          (category === 'all' || transaction.category === category)
        );
      }),
    [transactions, range, transactionType, accountId, category]
  );

  const filteredShoppingLists = useMemo(
    () =>
      shoppingLists.filter((list) => {
        const listDate = list.completedAt?.slice(0, 10) ?? list.createdAt.slice(0, 10);
        return (
          dateIsInRange(listDate, range.from, range.to) &&
          (shoppingStatus === 'all' || list.status === shoppingStatus)
        );
      }),
    [shoppingLists, range, shoppingStatus]
  );

  const filteredDebts = useMemo(
    () =>
      debts.filter((debt) => {
        const createdDate = debt.createdAt.slice(0, 10);
        return (
          dateIsInRange(createdDate, range.from, range.to) &&
          (debtDirection === 'all' || debt.direction === debtDirection) &&
          (debtStatus === 'all' || debt.status === debtStatus)
        );
      }),
    [debts, range, debtDirection, debtStatus]
  );

  const shoppingTotal = (list: ShoppingList) => {
    if (typeof list.paidAmount === 'number') return list.paidAmount;
    return shoppingItems
      .filter((item) => item.listId === list.id)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const title =
    reportType === 'transactions'
      ? 'Rapport des dépenses et revenus'
      : reportType === 'shopping'
        ? 'Rapport des courses'
        : 'Rapport des dettes';

  const totalLabel =
    reportType === 'transactions'
      ? sumByCurrency(
          filteredTransactions.map(({ amount, currency }) => ({ amount, currency }))
        )
      : reportType === 'shopping'
        ? sumByCurrency(
            filteredShoppingLists.map((list) => ({
              amount: shoppingTotal(list),
              currency: list.currency,
            }))
          )
        : sumByCurrency(
            filteredDebts.map((debt) => ({
              amount: debt.totalAmount,
              currency: debt.currency,
            }))
          );

  const printReport = () => window.print();
  const exportCsv = () => {
    let rows: Array<Array<string | number>>;
    if (reportType === 'transactions') {
      rows = [
        ['Date', 'Opération', 'Type', 'Catégorie', 'Compte', 'Montant', 'Devise'],
        ...filteredTransactions.map((transaction) => [
          transaction.date,
          transaction.label,
          transaction.type === 'income' ? 'Revenu' : 'Dépense',
          transaction.category,
          accounts.find((account) => account.id === transaction.accountId)?.name ??
            'Compte supprimé',
          csvAmount(transaction.amount),
          transaction.currency,
        ]),
      ];
    } else if (reportType === 'shopping') {
      rows = [
        ['Date', 'Liste', 'Nombre d’articles', 'Statut', 'Total', 'Devise'],
        ...filteredShoppingLists.map((list) => [
          list.completedAt?.slice(0, 10) ?? list.createdAt.slice(0, 10),
          list.title,
          shoppingItems.filter((item) => item.listId === list.id).length,
          list.status === 'completed'
            ? 'Terminée'
            : list.status === 'archived'
              ? 'Archivée'
              : 'En cours',
          csvAmount(shoppingTotal(list)),
          list.currency,
        ]),
      ];
    } else {
      rows = [
        [
          'Date',
          'Personne',
          'Sens',
          'Statut',
          'Montant initial',
          'Remboursé',
          'Restant',
          'Devise',
        ],
        ...filteredDebts.map((debt) => [
          debt.createdAt.slice(0, 10),
          debt.personName,
          debt.direction === 'i_owe_them' ? 'Je dois' : 'On me doit',
          debt.status === 'settled' ? 'Réglée' : 'En cours',
          csvAmount(debt.totalAmount),
          csvAmount(Math.max(0, debt.totalAmount - debt.remainingAmount)),
          csvAmount(debt.remainingAmount),
          debt.currency,
        ]),
      ];
    }

    try {
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      const filename = `oa-rapport-${reportType}-${range.from}-${range.to}.csv`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError(null);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? `Échec de l’export CSV : ${error.message}`
          : 'Échec de l’export CSV.'
      );
    }
  };
  const setDailyRange = () => {
    const today = localDateInputValue(new Date());
    setRange({ from: today, to: today });
  };
  const setMonthlyRange = () => setRange(getDateRange());

  return (
    <div id="report-print-root" className="mx-auto max-w-5xl space-y-4 pb-20 print:max-w-none print:space-y-4 print:p-0 print:pb-0">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Retour aux paramètres"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Rapports imprimables
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filtrez les données, puis imprimez ou enregistrez en PDF.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Exporter en CSV compatible avec Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={printReport}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300 print:hidden">
          {exportError}
        </p>
      )}

      <section className="rounded-2xl bg-white p-3 shadow-xs dark:bg-slate-900 sm:p-4 print:hidden">
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['transactions', 'Dépenses & revenus', TrendingDown],
            ['shopping', 'Courses', ShoppingBasket],
            ['debts', 'Dettes', Users],
          ] as const).map(([type, label, Icon]) => (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[10px] font-bold transition sm:text-xs ${
                reportType === type
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Période rapide :
          </span>
          <button
            type="button"
            onClick={setDailyRange}
            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            onClick={setMonthlyRange}
            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Ce mois
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Du
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Au
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            />
          </label>

          {reportType === 'transactions' && (
            <>
              <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Type
                <select
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(event.target.value as typeof transactionType)
                  }
                  className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Dépenses et revenus</option>
                  <option value="expense">Dépenses</option>
                  <option value="income">Revenus</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Compte
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Tous les comptes</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Catégorie
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {reportType === 'shopping' && (
            <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Statut des listes
              <select
                value={shoppingStatus}
                onChange={(event) =>
                  setShoppingStatus(event.target.value as typeof shoppingStatus)
                }
                className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">En cours</option>
                <option value="completed">Terminées</option>
                <option value="archived">Archivées</option>
              </select>
            </label>
          )}

          {reportType === 'debts' && (
            <>
              <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Sens
                <select
                  value={debtDirection}
                  onChange={(event) =>
                    setDebtDirection(event.target.value as typeof debtDirection)
                  }
                  className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Dettes et créances</option>
                  <option value="i_owe_them">Je dois</option>
                  <option value="they_owe_me">On me doit</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Statut
                <select
                  value={debtStatus}
                  onChange={(event) =>
                    setDebtStatus(event.target.value as typeof debtStatus)
                  }
                  className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">En cours</option>
                  <option value="settled">Réglées</option>
                </select>
              </label>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-900 print:space-y-4 print:rounded-none print:bg-white print:p-0 print:shadow-none">
        <ReportPageHeader title={title} range={range} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800 print:border-black">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white print:text-black">
              {title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-black">
              {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-400 print:text-black">Total affiché</p>
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 print:text-black">
              {totalLabel}
            </p>
          </div>
        </div>

        {reportType === 'transactions' && (
          filteredTransactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs print:min-w-0">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-black print:text-black">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Opération</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Catégorie</th>
                    <th className="py-2 pr-2">Compte</th>
                    <th className="py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatDate(transaction.date)}</td>
                      <td className="py-2 pr-2 font-semibold">{transaction.label}</td>
                      <td className="py-2 pr-2">{transaction.type === 'income' ? 'Revenu' : 'Dépense'}</td>
                      <td className="py-2 pr-2">{transaction.category}</td>
                      <td className="py-2 pr-2">{accounts.find((account) => account.id === transaction.accountId)?.name ?? 'Compte supprimé'}</td>
                      <td className="py-2 text-right whitespace-nowrap">{formatMoney(transaction.amount, transaction.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyReport />
        )}

        {reportType === 'shopping' && (
          filteredShoppingLists.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-left text-xs print:min-w-0">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-black print:text-black">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Liste</th>
                    <th className="py-2 pr-2">Articles</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShoppingLists.map((list) => {
                    const items = shoppingItems.filter((item) => item.listId === list.id);
                    return (
                      <tr key={list.id} className="border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                        <td className="py-2 pr-2 whitespace-nowrap">{formatDate(list.completedAt?.slice(0, 10) ?? list.createdAt.slice(0, 10))}</td>
                        <td className="py-2 pr-2 font-semibold">{list.title}</td>
                        <td className="py-2 pr-2">{items.length}</td>
                        <td className="py-2 pr-2">{list.status === 'completed' ? 'Terminée' : list.status === 'archived' ? 'Archivée' : 'En cours'}</td>
                        <td className="py-2 text-right whitespace-nowrap">{formatMoney(shoppingTotal(list), list.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyReport />
        )}

        {reportType === 'debts' && (
          filteredDebts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs print:min-w-0">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-black print:text-black">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Personne</th>
                    <th className="py-2 pr-2">Sens</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 pr-2 text-right">Montant initial</th>
                    <th className="py-2 pr-2 text-right">Remboursé</th>
                    <th className="py-2 text-right">Restant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts.map((debt) => (
                    <tr key={debt.id} className="border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatDate(debt.createdAt.slice(0, 10))}</td>
                      <td className="py-2 pr-2 font-semibold">{debt.personName}</td>
                      <td className="py-2 pr-2">{debt.direction === 'i_owe_them' ? 'Je dois' : 'On me doit'}</td>
                      <td className="py-2 pr-2">{debt.status === 'settled' ? 'Réglée' : 'En cours'}</td>
                      <td className="py-2 pr-2 text-right whitespace-nowrap">{formatMoney(debt.totalAmount, debt.currency)}</td>
                      <td className="py-2 pr-2 text-right whitespace-nowrap">{formatMoney(Math.max(0, debt.totalAmount - debt.remainingAmount), debt.currency)}</td>
                      <td className="py-2 text-right whitespace-nowrap">{formatMoney(debt.remainingAmount, debt.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyReport />
        )}
      </section>
    </div>
  );
};

const EmptyReport: React.FC = () => (
  <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400 dark:text-slate-500 print:text-black">
    <FileText className="h-7 w-7" />
    <p className="text-xs">Aucune donnée ne correspond aux filtres sélectionnés.</p>
  </div>
);
