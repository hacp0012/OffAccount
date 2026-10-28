export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  region: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  // User's Core Regional Currencies
  { code: 'FRw', symbol: 'FRw', name: 'Franc Rwandais (RWF)', region: 'Rwanda' },
  { code: 'FC', symbol: 'FC', name: 'Franc Congolais (CDF)', region: 'RD Congo' },
  { code: 'USD', symbol: '$', name: 'Dollar Américain', region: 'International / USA' },

  // Major African Currencies
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (UEMOA)', region: 'Afrique de l’Ouest' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (CEMAC)', region: 'Afrique Centrale' },
  { code: 'KES', symbol: 'KSh', name: 'Shilling Kenyan', region: 'Kenya' },
  { code: 'UGX', symbol: 'USh', name: 'Shilling Ougandais', region: 'Ouganda' },
  { code: 'TZS', symbol: 'TSh', name: 'Shilling Tanzanien', region: 'Tanzanie' },
  { code: 'BIF', symbol: 'FBu', name: 'Franc Burundais', region: 'Burundi' },
  { code: 'ZAR', symbol: 'R', name: 'Rand Sud-Africain', region: 'Afrique du Sud' },
  { code: 'NGN', symbol: '₦', name: 'Naira Nigérian', region: 'Nigeria' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedi Ghanéen', region: 'Ghana' },
  { code: 'ZMW', symbol: 'ZK', name: 'Kwacha Zambien', region: 'Zambie' },
  { code: 'AOA', symbol: 'Kz', name: 'Kwanza Angolais', region: 'Angola' },
  { code: 'MZN', symbol: 'MT', name: 'Metical Mozambicain', region: 'Mozambique' },
  { code: 'MAD', symbol: 'DH', name: 'Dirham Marocain', region: 'Maroc' },
  { code: 'DZD', symbol: 'DA', name: 'Dinar Algérien', region: 'Algérie' },
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien', region: 'Tunisie' },

  // Major World Currencies
  { code: 'EUR', symbol: '€', name: 'Euro', region: 'Zone Euro' },
  { code: 'GBP', symbol: '£', name: 'Livre Sterling', region: 'Royaume-Uni' },
  { code: 'CAD', symbol: 'CAD$', name: 'Dollar Canadien', region: 'Canada' },
  { code: 'CHF', symbol: 'CHF', name: 'Franc Suisse', region: 'Suisse' },
  { code: 'CNY', symbol: '¥', name: 'Yuan Renminbi', region: 'Chine' },
  { code: 'JPY', symbol: '¥', name: 'Yen Japonais', region: 'Japon' },
  { code: 'INR', symbol: '₹', name: 'Roupie Indienne', region: 'Inde' },
];

export const DEFAULT_CURRENCY = 'FRw';

export function getCurrencyInfo(code?: string): CurrencyInfo {
  if (!code) return SUPPORTED_CURRENCIES[0];
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toLowerCase() === code.toLowerCase());
  if (found) return found;
  return { code, symbol: code, name: code, region: '' };
}
