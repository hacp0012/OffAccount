import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  PieChart,
  ShoppingBasket,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import type { Account, Debt, ShoppingItem, ShoppingList, Transaction } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { useAppCurrency } from '../../context/CurrencyContext';

interface FinancialOverviewViewProps {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
}

type CurrencyTotal = Map<string, number>;

const CHART_COLORS = ['#059669', '#e11d48', '#0284c7', '#f59e0b', '#8b5cf6', '#0d9488', '#ec4899', '#64748b'];

const addAmount = (totals: CurrencyTotal, currency: string, amount: number) => {
  totals.set(currency, (totals.get(currency) ?? 0) + amount);
};

const formatTotals = (totals: CurrencyTotal) =>
  totals.size
    ? [...totals.entries()]
        .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
        .map(([currency, amount]) => formatMoney(amount, currency))
        .join(' · ')
    : formatMoney(0);

const SummaryCard: React.FC<{
  title: string;
  description: string;
  value: string;
  icon: React.FC<{ className?: string }>;
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate';
}> = ({ title, description, value, icon: Icon, tone }) => {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }[tone];

  return (
    <article className="rounded-2xl bg-white p-3.5 shadow-xs dark:bg-slate-900 sm:p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{description}</p>
          <p className="mt-2 break-words text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
};

export const FinancialOverviewView: React.FC<FinancialOverviewViewProps> = ({
  accounts,
  transactions,
  debts,
  shoppingLists,
  shoppingItems,
}) => {
  const { currency: defaultCurrency } = useAppCurrency();
  const [activeTab, setActiveTab] = useState<'summary' | 'chart'>('chart');
  const [chartCurrency, setChartCurrency] = useState(defaultCurrency);
  const totals = useMemo(() => {
    const income = new Map<string, number>();
    const expenses = new Map<string, number>();
    const accountsBalance = new Map<string, number>();
    const debtsToPay = new Map<string, number>();
    const receivables = new Map<string, number>();
    const shoppingNeeds = new Map<string, number>();
    const shoppingRemaining = new Map<string, number>();
    const accountsBalanceMagnitude = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (transaction.type === 'income') addAmount(income, transaction.currency, transaction.amount);
      if (transaction.type === 'expense') addAmount(expenses, transaction.currency, transaction.amount);
    });

    accounts.forEach((account) => {
      addAmount(accountsBalance, account.currency, account.balance);
      addAmount(accountsBalanceMagnitude, account.currency, Math.abs(account.balance));
    });

    debts.forEach((debt) => {
      if (debt.status === 'settled' || debt.remainingAmount <= 0) return;
      if (debt.direction === 'i_owe_them') {
        addAmount(debtsToPay, debt.currency, debt.remainingAmount);
      } else {
        addAmount(receivables, debt.currency, debt.remainingAmount);
      }
    });

    const activeLists = shoppingLists.filter((list) => list.status === 'active');
    activeLists.forEach((list) => {
      const listItems = shoppingItems.filter((item) => item.listId === list.id);
      listItems.forEach((item) => {
        const estimated = item.quantity * item.unitPrice;
        addAmount(shoppingNeeds, list.currency, estimated);
        if (!item.checked) addAmount(shoppingRemaining, list.currency, estimated);
      });
    });

    const net = new Map<string, number>();
    new Set([...income.keys(), ...expenses.keys()]).forEach((currency) => {
      addAmount(net, currency, (income.get(currency) ?? 0) - (expenses.get(currency) ?? 0));
    });

    return {
      income,
      expenses,
      net,
      accountsBalance,
      accountsBalanceMagnitude,
      debtsToPay,
      receivables,
      shoppingNeeds,
      shoppingRemaining,
      activeShoppingCount: activeLists.length,
      unpaidItemsCount: shoppingItems.filter((item) => {
        const list = activeLists.find((activeList) => activeList.id === item.listId);
        return Boolean(list && !item.checked);
      }).length,
    };
  }, [accounts, debts, shoppingItems, shoppingLists, transactions]);

  const chartData = useMemo(() => {
    const netAmount = totals.net.get(chartCurrency) ?? 0;
    return [
      { label: 'Revenus enregistrés', amount: totals.income.get(chartCurrency) ?? 0 },
      { label: 'Dépenses enregistrées', amount: totals.expenses.get(chartCurrency) ?? 0 },
      { label: 'Solde net (valeur absolue)', amount: Math.abs(netAmount) },
      { label: 'Soldes des comptes (valeur absolue)', amount: totals.accountsBalanceMagnitude.get(chartCurrency) ?? 0 },
      { label: 'Dettes à rembourser', amount: totals.debtsToPay.get(chartCurrency) ?? 0 },
      { label: 'Créances à récupérer', amount: totals.receivables.get(chartCurrency) ?? 0 },
      { label: 'Besoins d’achat estimés', amount: totals.shoppingNeeds.get(chartCurrency) ?? 0 },
      { label: 'Achats restant à faire', amount: totals.shoppingRemaining.get(chartCurrency) ?? 0 },
    ];
  }, [chartCurrency, totals]);
  const chartTotal = chartData.reduce((sum, entry) => sum + entry.amount, 0);
  const chartSlices = chartData.filter((entry) => entry.amount > 0);
  const chartCurrencies = useMemo(
    () =>
      [...new Set([
        ...totals.income.keys(),
        ...totals.expenses.keys(),
        ...totals.net.keys(),
        ...totals.accountsBalanceMagnitude.keys(),
        ...totals.debtsToPay.keys(),
        ...totals.receivables.keys(),
        ...totals.shoppingNeeds.keys(),
        ...totals.shoppingRemaining.keys(),
      ])].sort((a, b) => a.localeCompare(b)),
    [totals],
  );
  const availableChartCurrencies = chartCurrencies.length ? chartCurrencies : [defaultCurrency];
  const chartRadius = 62;
  const chartCircumference = 2 * Math.PI * chartRadius;
  let chartOffset = 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-20 sm:space-y-5">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ChartNoAxesCombined className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Vue d’ensemble
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Récapitulatif de vos revenus, dépenses et engagements enregistrés.
          </p>
        </div>
      </header>

      <div className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" role="tablist" aria-label="Affichage de la vue d’ensemble">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chart'}
          onClick={() => setActiveTab('chart')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'chart'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <PieChart className="h-3.5 w-3.5" />
          Diagramme
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'summary'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Synthèse
        </button>
      </div>

      {activeTab === 'summary' ? (
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total des revenus"
          description="Revenus enregistrés, hors virements"
          value={formatTotals(totals.income)}
          icon={TrendingUp}
          tone="emerald"
        />
        <SummaryCard
          title="Total des dépenses"
          description="Dépenses enregistrées, hors virements"
          value={formatTotals(totals.expenses)}
          icon={TrendingDown}
          tone="rose"
        />
        <SummaryCard
          title="Solde revenus − dépenses"
          description="Différence cumulée sur les opérations"
          value={formatTotals(totals.net)}
          icon={CircleDollarSign}
          tone="blue"
        />
        <SummaryCard
          title="Soldes des comptes"
          description={`${accounts.length} compte${accounts.length === 1 ? '' : 's'} enregistré${accounts.length === 1 ? '' : 's'}`}
          value={formatTotals(totals.accountsBalance)}
          icon={WalletCards}
          tone="slate"
        />
        <SummaryCard
          title="Dettes à rembourser"
          description="Montant restant dû"
          value={formatTotals(totals.debtsToPay)}
          icon={ArrowUpRight}
          tone="rose"
        />
        <SummaryCard
          title="Créances à récupérer"
          description="Montant restant à recevoir"
          value={formatTotals(totals.receivables)}
          icon={ArrowDownLeft}
          tone="emerald"
        />
        <SummaryCard
          title="Besoins d’achat estimés"
          description={`${totals.activeShoppingCount} liste${totals.activeShoppingCount === 1 ? '' : 's'} de courses active${totals.activeShoppingCount === 1 ? '' : 's'}`}
          value={formatTotals(totals.shoppingNeeds)}
          icon={ShoppingBasket}
          tone="amber"
        />
        <SummaryCard
          title="Achats restant à faire"
          description={`${totals.unpaidItemsCount} article${totals.unpaidItemsCount === 1 ? '' : 's'} non coché${totals.unpaidItemsCount === 1 ? '' : 's'}`}
          value={formatTotals(totals.shoppingRemaining)}
          icon={Banknote}
          tone="amber"
        />
      </section>
      ) : (
        <section className="rounded-2xl bg-white p-3.5 shadow-xs dark:bg-slate-900 sm:p-5" role="tabpanel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Répartition des indicateurs financiers</h2>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Chaque devise est représentée séparément.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Devise
              <select
                value={chartCurrency}
                onChange={(event) => setChartCurrency(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {availableChartCurrencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
          </div>

          {chartTotal === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Aucun montant à représenter dans cette devise.
            </div>
          ) : (
            <div className="grid gap-5 pt-4 md:grid-cols-[220px_1fr] md:items-center">
              <div className="relative mx-auto h-52 w-52">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label={`Diagramme circulaire des indicateurs en ${chartCurrency}`}>
                  <circle cx="80" cy="80" r={chartRadius} fill="none" stroke="currentColor" strokeWidth="22" className="text-slate-100 dark:text-slate-800" />
                  {chartSlices.map((entry, index) => {
                    const segment = (entry.amount / chartTotal) * chartCircumference;
                    const offset = chartOffset;
                    chartOffset += segment;
                    return (
                      <circle
                        key={entry.label}
                        cx="80"
                        cy="80"
                        r={chartRadius}
                        fill="none"
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth="22"
                        strokeDasharray={`${segment} ${chartCircumference - segment}`}
                        strokeDashoffset={-offset}
                      />
                    );
                  })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Indicateurs</span>
                  <span className="mt-1 max-w-[130px] break-words text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(chartTotal, chartCurrency)}
                  </span>
                </div>
              </div>

              <ul className="space-y-2">
                {chartData.map((entry, index) => (
                  <li key={entry.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="truncate">{entry.label}</span>
                    </span>
                    <span className="shrink-0 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(entry.amount, chartCurrency)}
                      <span className="ml-1 text-[10px] font-medium text-slate-400">
                        {chartTotal > 0 ? ((entry.amount / chartTotal) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Les indicateurs ne sont pas des parts mutuellement exclusives : le graphique compare leurs montants et ne constitue pas un solde global. Le solde net et les soldes négatifs des comptes sont représentés en valeur absolue.
          </p>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Les totaux couvrent toutes les données enregistrées. Les montants sont présentés séparément par devise ;
        les besoins d’achat sont calculés à partir des articles des listes actives.
      </p>
    </div>
  );
};
