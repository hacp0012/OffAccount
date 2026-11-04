import { SUPPORTED_CURRENCIES } from './currencies';

const EXCHANGE_RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'offaccount.exchangeRates.v1';
export const EXCHANGE_RATES_CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface ExchangeRates {
  rates: Record<string, number>;
  updatedAt: string;
  cachedAt: number;
}

interface ExchangeRatesResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

export function getApiCurrencyCode(currencyCode: string): string {
  if (currencyCode === 'FRw') return 'RWF';
  if (currencyCode === 'FC') return 'CDF';
  return currencyCode;
}

function isExchangeRatesResponse(value: unknown): value is ExchangeRatesResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ExchangeRatesResponse>;
  return (
    response.result === 'success' &&
    response.base_code === 'USD' &&
    typeof response.time_last_update_utc === 'string' &&
    !!response.rates &&
    typeof response.rates === 'object'
  );
}

function hasSupportedRates(rates: Record<string, number>): boolean {
  return SUPPORTED_CURRENCIES.every((currency) => {
    const rate = rates[getApiCurrencyCode(currency.code)];
    return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
  });
}

export function readCachedExchangeRates(): ExchangeRates | null {
  try {
    const cachedValue = window.localStorage.getItem(CACHE_KEY);
    if (!cachedValue) return null;

    const parsed: unknown = JSON.parse(cachedValue);
    if (!parsed || typeof parsed !== 'object') return null;

    const cached = parsed as Partial<ExchangeRates>;
    if (
      typeof cached.updatedAt !== 'string' ||
      typeof cached.cachedAt !== 'number' ||
      !cached.rates ||
      typeof cached.rates !== 'object' ||
      !hasSupportedRates(cached.rates)
    ) {
      return null;
    }

    return cached as ExchangeRates;
  } catch (error) {
    console.warn('Unable to read cached exchange rates:', error);
    return null;
  }
}

export function cacheExchangeRates(exchangeRates: ExchangeRates): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(exchangeRates));
  } catch (error) {
    console.warn('Unable to cache exchange rates:', error);
  }
}

export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const response = await fetch(EXCHANGE_RATES_URL, { signal });
  if (!response.ok) {
    throw new Error(`Le service de taux a répondu avec le code HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isExchangeRatesResponse(payload)) {
    throw new Error('Le service a renvoyé une réponse de taux invalide.');
  }
  if (!hasSupportedRates(payload.rates)) {
    throw new Error('Le service ne fournit pas les taux de toutes les devises prises en charge.');
  }

  return {
    rates: payload.rates,
    updatedAt: payload.time_last_update_utc,
    cachedAt: Date.now(),
  };
}
