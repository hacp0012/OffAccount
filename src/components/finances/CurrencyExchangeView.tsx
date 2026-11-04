import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Calculator, RefreshCw } from 'lucide-react';
import { useAppCurrency } from '../../context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '../../utils/currencies';
import { formatMoney } from '../../utils/formatters';
import {
  cacheExchangeRates,
  EXCHANGE_RATES_CACHE_DURATION,
  fetchExchangeRates,
  getApiCurrencyCode,
  readCachedExchangeRates,
  type ExchangeRates,
} from '../../utils/exchangeRates';

const getRate = (rates: Record<string, number>, fromCode: string, toCode: string) => {
  const fromRate = rates[getApiCurrencyCode(fromCode)];
  const toRate = rates[getApiCurrencyCode(toCode)];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
};

const formatRate = (rate: number) =>
  rate.toLocaleString('fr-FR', { maximumSignificantDigits: 6 });

export const CurrencyExchangeView: React.FC = () => {
  const { currency } = useAppCurrency();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState(currency);
  const [toCurrency, setToCurrency] = useState(currency === 'USD' ? 'FRw' : 'USD');

  useEffect(() => {
    const controller = new AbortController();
    const cachedRates = readCachedExchangeRates();
    if (cachedRates) setExchangeRates(cachedRates);

    const cacheIsFresh =
      cachedRates && Date.now() - cachedRates.cachedAt < EXCHANGE_RATES_CACHE_DURATION;
    if (cacheIsFresh) {
      setIsLoading(false);
      setErrorMessage(null);
      return () => controller.abort();
    }

    setIsLoading(true);
    setErrorMessage(null);
    void fetchExchangeRates(controller.signal)
      .then((rates) => {
        cacheExchangeRates(rates);
        setExchangeRates(rates);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load currency exchange rates:', error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Impossible de charger les taux de change.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const parsedAmount = amount.trim() === '' ? null : Number(amount);
  const conversionRate = exchangeRates
    ? getRate(exchangeRates.rates, fromCurrency, toCurrency)
    : null;
  const convertedAmount =
    parsedAmount !== null &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 0 &&
    conversionRate !== null
      ? parsedAmount * conversionRate
      : null;

  const displayedRates = useMemo(() => {
    if (!exchangeRates) return [];
    return SUPPORTED_CURRENCIES.map((item) => ({
      ...item,
      rate: getRate(exchangeRates.rates, fromCurrency, item.code),
    })).filter((item) => item.rate !== null && item.code !== fromCurrency);
  }, [exchangeRates, fromCurrency]);

  const updatedAtLabel = exchangeRates
    ? new Date(exchangeRates.updatedAt).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }) + ' UTC'
    : null;

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="space-y-4 pb-8">
      <header className="rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-900 sm:rounded-3xl sm:p-6">
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          Taux de change
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Consultez les taux indicatifs et convertissez un montant entre devises.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Calculateur</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Montant et devise de départ
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                aria-label="Montant à convertir"
              />
              <select
                value={fromCurrency}
                onChange={(event) => setFromCurrency(event.target.value)}
                className="w-28 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                aria-label="Devise de départ"
              >
                {SUPPORTED_CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>{item.code}</option>
                ))}
              </select>
            </div>
          </label>

          <button
            type="button"
            onClick={handleSwapCurrencies}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 sm:mb-0.5"
            aria-label="Inverser les devises"
            title="Inverser les devises"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>

          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Devise d’arrivée
            </span>
            <select
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="Devise d’arrivée"
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>{item.code} — {item.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
          <span className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            Montant converti
          </span>
          <span className="mt-0.5 block break-words text-xl font-black tabular-nums text-emerald-900 dark:text-emerald-200">
            {convertedAmount !== null
              ? formatMoney(convertedAmount, toCurrency)
              : 'Saisissez un montant valide'}
          </span>
          {conversionRate !== null && (
            <span className="mt-1 block text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
              1 {fromCurrency} = {formatRate(conversionRate)} {toCurrency}
            </span>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Taux par rapport au {fromCurrency}
            </h2>
            {updatedAtLabel && (
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Mise à jour des données : {updatedAtLabel}
              </p>
            )}
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" aria-label="Chargement" />}
        </div>

        {errorMessage && (
          <div className="m-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p>{errorMessage}</p>
            {exchangeRates && (
              <p className="mt-1">Les taux enregistrés précédemment sont affichés, mais peuvent être périmés.</p>
            )}
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="mt-2 font-bold underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {!exchangeRates && isLoading ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Chargement des taux de change…
          </p>
        ) : displayedRates.length > 0 ? (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold sm:px-5">Devise</th>
                  <th className="px-4 py-2 text-right font-semibold sm:px-5">1 {fromCurrency} équivaut à</th>
                </tr>
              </thead>
              <tbody>
                {displayedRates.map((item) => (
                  <tr key={item.code} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2.5 sm:px-5">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{item.code}</span>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">{item.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100 sm:px-5">
                      {item.rate !== null ? formatRate(item.rate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading && (
            <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Aucun taux de change disponible pour le moment.
            </p>
          )
        )}

        <div className="border-t border-slate-100 px-4 py-2.5 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5">
          <p>Les taux sont indicatifs et mis à jour quotidiennement. Le taux réellement appliqué par une banque ou un bureau de change peut différer.</p>
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block font-semibold text-emerald-700 underline dark:text-emerald-400"
          >
            Taux fournis par ExchangeRate-API
          </a>
        </div>
      </section>
    </div>
  );
};
