import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, RefreshCw, RotateCcw, ArrowDownUp } from 'lucide-react';
import { useAppCurrency } from '../context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';
import { evaluateCalculatorExpression } from '../utils/calculator';
import {
  cacheExchangeRates,
  EXCHANGE_RATES_CACHE_DURATION,
  fetchExchangeRates,
  getApiCurrencyCode,
  readCachedExchangeRates,
  type ExchangeRates,
} from '../utils/exchangeRates';
import { formatMoney } from '../utils/formatters';
import { Modal } from './Modal';

type ToolTab = 'calculator' | 'converter';
interface CalculationHistoryEntry {
  id: string;
  expression: string;
  result: number;
  createdAt: string;
}

const HISTORY_STORAGE_KEY = 'offaccount.calculatorHistory.v1';
const MAX_HISTORY = 30;
const allowedCalculatorCharacters = /[^0-9+\-*/%().,]/g;
const isAllowedCalculatorKey = /^[0-9+\-*/%().,]$/;

function readHistory(): CalculationHistoryEntry[] {
  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CalculationHistoryEntry =>
      !!entry &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.expression === 'string' &&
      typeof entry.result === 'number' &&
      Number.isFinite(entry.result) &&
      typeof entry.createdAt === 'string'
    ).slice(0, MAX_HISTORY);
  } catch (error) {
    console.warn('Unable to read calculator history:', error);
    return [];
  }
}

function getConversionRate(rates: ExchangeRates | null, from: string, to: string): number | null {
  if (!rates) return null;
  const fromRate = rates.rates[getApiCurrencyCode(from)];
  const toRate = rates.rates[getApiCurrencyCode(to)];
  if (!fromRate || !toRate) return null;
  return toRate / fromRate;
}

function formatCalculatorResult(value: number): string {
  return value.toLocaleString('fr-FR', { useGrouping: false, maximumFractionDigits: 10 });
}

interface CalculatorToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorToolsModal: React.FC<CalculatorToolsModalProps> = ({ isOpen, onClose }) => {
  const { currency } = useAppCurrency();
  const [activeTab, setActiveTab] = useState<ToolTab>('calculator');
  const [expression, setExpression] = useState('');
  const expressionInputRef = useRef<HTMLInputElement>(null);
  const pendingCaretPosition = useRef<number | null>(null);
  const [history, setHistory] = useState<CalculationHistoryEntry[]>(readHistory);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [calculationError, setCalculationError] = useState('');
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState(currency);
  const [toCurrency, setToCurrency] = useState(currency === 'USD' ? 'FRw' : 'USD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const calculation = useMemo(() => {
    if (!expression.trim()) return null;
    try {
      return evaluateCalculatorExpression(expression);
    } catch {
      return null;
    }
  }, [expression]);
  const parsedAmount = amount.trim() === '' ? null : Number(amount);
  const conversionRate = getConversionRate(exchangeRates, fromCurrency, toCurrency);
  const convertedAmount =
    parsedAmount !== null &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 0 &&
    conversionRate !== null
      ? parsedAmount * conversionRate
      : null;

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Unable to save calculator history:', error);
    }
  }, [history]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'converter') return;
    const controller = new AbortController();
    const cachedRates = readCachedExchangeRates();
    if (cachedRates) setExchangeRates(cachedRates);
    if (cachedRates && Date.now() - cachedRates.cachedAt < EXCHANGE_RATES_CACHE_DURATION) {
      setRatesLoading(false);
      setRatesError('');
      return () => controller.abort();
    }

    setRatesLoading(true);
    setRatesError('');
    void fetchExchangeRates(controller.signal)
      .then((rates) => {
        cacheExchangeRates(rates);
        setExchangeRates(rates);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load currency exchange rates:', error);
        setRatesError(error instanceof Error ? error.message : 'Impossible de charger les taux.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRatesLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, activeTab, refreshKey]);

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  useEffect(() => {
    setFromCurrency(currency);
    setToCurrency(currency === 'USD' ? 'FRw' : 'USD');
  }, [currency]);

  useLayoutEffect(() => {
    if (pendingCaretPosition.current === null) return;
    const position = pendingCaretPosition.current;
    expressionInputRef.current?.setSelectionRange(position, position);
    pendingCaretPosition.current = null;
  }, [expression]);

  const appendToExpression = (value: string) => {
    const input = expressionInputRef.current;
    const current = expression;
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? start;
    const nextExpression = `${current.slice(0, start)}${value}${current.slice(end)}`;
    pendingCaretPosition.current = start + value.length;
    setExpression(nextExpression);
    setCalculationError('');
  };

  const removeFromExpression = () => {
    const input = expressionInputRef.current;
    const start = input?.selectionStart ?? expression.length;
    const end = input?.selectionEnd ?? start;
    if (start === end && start === 0) return;
    const nextExpression = start === end
      ? `${expression.slice(0, start - 1)}${expression.slice(end)}`
      : `${expression.slice(0, start)}${expression.slice(end)}`;
    const nextCaret = start === end ? start - 1 : start;
    pendingCaretPosition.current = nextCaret;
    setExpression(nextExpression);
    setCalculationError('');
  };

  const updateExpression = (value: string, caretPosition: number) => {
    const filteredValue = value.replace(allowedCalculatorCharacters, '');
    if (filteredValue === value) {
      pendingCaretPosition.current = null;
      setExpression(value);
      setCalculationError('');
      return;
    }

    const prefix = value.slice(0, caretPosition).replace(allowedCalculatorCharacters, '');
    pendingCaretPosition.current = prefix.length;
    setExpression(filteredValue);
    setCalculationError('');
  };

  const calculate = () => {
    if (!expression.trim()) return;
    try {
      const result = evaluateCalculatorExpression(expression);
      const entry: CalculationHistoryEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        expression,
        result,
        createdAt: new Date().toISOString(),
      };
      setHistory((current) => [entry, ...current].slice(0, MAX_HISTORY));
      const resultExpression = formatCalculatorResult(result);
      pendingCaretPosition.current = resultExpression.length;
      setExpression(resultExpression);
      setCalculationError('');
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : 'Expression invalide.');
    }
  };

  const copyResult = async () => {
    if (convertedAmount === null) return;
    try {
      await navigator.clipboard.writeText(String(convertedAmount));
      setCopyStatus('copied');
    } catch (error) {
      console.error('Unable to copy converted amount:', error);
      setCopyStatus('error');
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const renderHistoryItems = () => history.length ? history.map((entry) => (
    <div key={entry.id} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/70">
      <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{entry.expression} =</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold tabular-nums text-slate-900 dark:text-white">
          {formatMoney(entry.result, currency)}
        </span>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              updateExpression(entry.expression, entry.expression.length);
              setShowMobileHistory(false);
            }}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-emerald-700 dark:hover:bg-slate-700 dark:hover:text-emerald-300"
            aria-label="Reprendre l’expression"
            title="Reprendre l’expression"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const result = formatCalculatorResult(entry.result);
              updateExpression(result, result.length);
              setShowMobileHistory(false);
            }}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-emerald-700 dark:hover:bg-slate-700 dark:hover:text-emerald-300"
            aria-label="Utiliser ce résultat"
            title="Utiliser ce résultat"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )) : (
    <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[11px] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
      Vos calculs récents apparaîtront ici.
    </p>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Outils rapides"
      description="Calculatrice et conversion de devises."
      maxWidth="lg"
    >
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([
          ['calculator', 'Calculatrice'],
          ['converter', 'Convertisseur'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === tab
                ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-700 dark:text-emerald-300'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'calculator' ? (
        <div className="mt-4 grid gap-4 sm:min-h-0 sm:grid-cols-[1.1fr_0.9fr] sm:items-stretch">
          <section className="min-w-0">
            <label htmlFor="quick-calculator-expression" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Expression
            </label>
            <input
              id="quick-calculator-expression"
              ref={expressionInputRef}
              type="text"
              inputMode="decimal"
              value={expression}
              onChange={(event) => {
                updateExpression(event.target.value, event.target.selectionStart ?? event.target.value.length);
              }}
              onKeyDown={(event) => {
                if (
                  event.key.length === 1 &&
                  !isAllowedCalculatorKey.test(event.key) &&
                  !(event.ctrlKey || event.metaKey || event.altKey)
                ) {
                  event.preventDefault();
                  return;
                }
                if (event.key === 'Enter') calculate();
              }}
              placeholder="Ex. (125+10%)*2"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-xl font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
              {calculation !== null ? (
                <p className="min-w-0 truncate text-lg font-black tabular-nums text-emerald-800 dark:text-emerald-300">
                  = {formatMoney(calculation, currency)}
                </p>
              ) : (
                <p role={calculationError ? 'alert' : undefined} className="text-[11px] text-rose-600 dark:text-rose-400">
                  {calculationError}
                </p>
              )}
              <button
                type="button"
                onClick={calculate}
                disabled={calculation === null}
                className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                Calculer
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileHistory((visible) => !visible)}
              aria-expanded={showMobileHistory}
              className="mt-2 flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:hidden"
            >
              <span>Historique ({history.length})</span>
              <span>{showMobileHistory ? 'Masquer' : 'Afficher'}</span>
            </button>
            {showMobileHistory && (
              <section className="mt-2 space-y-1.5 sm:hidden" aria-label="Historique des calculs">
                {history.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400"
                    >
                      Effacer
                    </button>
                  </div>
                )}
                <div className="max-h-[35vh] space-y-1.5 overflow-y-auto overscroll-contain">
                  {renderHistoryItems()}
                </div>
              </section>
            )}
            <div className={`mx-auto mt-3 grid w-full max-w-[20rem] grid-cols-4 gap-1.5 ${showMobileHistory ? 'hidden sm:grid' : ''}`}>
              {[
                ['C', 'clear'], ['(', '('], [')', ')'], ['⌫', 'backspace'],
                ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
                ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
                ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'],
                ['%', '%'], ['0', '0'], [',', ','], ['+', '+'],
              ].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (value === 'clear') {
                      updateExpression('', 0);
                    } else if (value === 'backspace') {
                      removeFromExpression();
                    } else {
                      appendToExpression(value);
                    }
                  }}
                  className={`min-h-10 rounded-xl text-sm font-bold transition ${
                    ['/', '*', '-', '+', '%', '(', ')'].includes(value)
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950'
                      : value === 'clear'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Les pourcentages dans une addition ou soustraction sont calculés par rapport au montant précédent.
            </p>
          </section>

          <section className="hidden min-h-0 min-w-0 overflow-hidden sm:relative sm:flex sm:flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Historique</h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400"
                >
                  Effacer
                </button>
              )}
            </div>
            <div className="space-y-1.5 overflow-y-auto overscroll-contain sm:absolute sm:inset-x-0 sm:bottom-0 sm:top-7">
              {renderHistoryItems()}
            </div>
          </section>
        </div>
      ) : (
        <section className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Montant à convertir</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">De</span>
              <select
                value={fromCurrency}
                onChange={(event) => setFromCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                aria-label="Devise de départ"
              >
                {SUPPORTED_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={swapCurrencies}
              className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/60"
              aria-label="Inverser les devises"
              title="Inverser les devises"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Vers</span>
              <select
                value={toCurrency}
                onChange={(event) => setToCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                aria-label="Devise d’arrivée"
              >
                {SUPPORTED_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
            <span className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Résultat</span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="min-w-0 break-words text-xl font-black tabular-nums text-emerald-900 dark:text-emerald-200">
                {convertedAmount !== null
                  ? formatMoney(convertedAmount, toCurrency)
                  : parsedAmount === null || !Number.isFinite(parsedAmount) || parsedAmount < 0
                    ? 'Montant invalide'
                    : ratesLoading
                      ? 'Chargement du taux…'
                      : 'Taux indisponible'}
              </span>
              <button
                type="button"
                onClick={() => void copyResult()}
                disabled={convertedAmount === null}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                aria-label="Copier le résultat"
                title="Copier le résultat"
              >
                {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </button>
            </div>
            {conversionRate !== null && (
              <p className="mt-1 text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
                1 {fromCurrency} = {conversionRate.toLocaleString('fr-FR', { maximumSignificantDigits: 6 })} {toCurrency}
              </p>
            )}
          </div>
          {copyStatus === 'copied' && <p role="status" className="text-[10px] text-emerald-700 dark:text-emerald-300">Résultat copié.</p>}
          {copyStatus === 'error' && <p role="alert" className="text-[10px] text-rose-600 dark:text-rose-400">Copie impossible dans ce navigateur.</p>}
          {ratesError && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <span>{ratesError}{exchangeRates ? ' Taux mis en cache affiché.' : ''}</span>
              <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="shrink-0 font-bold underline">
                Réessayer
              </button>
            </div>
          )}
          {ratesLoading && <RefreshCw className="mx-auto h-4 w-4 animate-spin text-emerald-700" aria-label="Chargement des taux" />}
        </section>
      )}
    </Modal>
  );
};
