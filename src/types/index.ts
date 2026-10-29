export type Currency = string;

export type AccountType = 'bank' | 'mobile_money' | 'cash' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string;
  icon: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  label: string;
  date: string; // YYYY-MM-DD
  time?: string;
  toAccountId?: string; // For transfers
  shoppingListId?: string; // Linked shopping list if created from shopping checkout
  debtId?: string; // Linked debt if created from debt payment
  createdAt: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  currency: Currency;
  status: 'active' | 'completed' | 'archived';
  paidFromAccountId?: string;
  paidAmount?: number;
  reimbursementDebtId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit: string; // 'kg', 'pcs', 'L', 'paquet', etc.
  unitPrice: number;
  category: string; // 'Fruits & Légumes', 'Épicerie', 'Hygiène', 'Frais', 'Divers', etc.
  checked: boolean;
  notes?: string;
  createdAt: string;
}

export type DebtDirection = 'they_owe_me' | 'i_owe_them'; // Créance vs Dette

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  currency: Currency;
  date: string;
  notes?: string;
  accountId?: string; // Account credited or debited
  createdAt: string;
}

export interface Debt {
  id: string;
  personName: string;
  phone?: string;
  direction: DebtDirection;
  totalAmount: number;
  remainingAmount: number;
  currency: Currency;
  dueDate?: string;
  status: 'active' | 'settled';
  notes?: string;
  sourceShoppingListId?: string;
  payments: DebtPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  defaultCurrency: Currency;
  userName?: string;
  lastBackupDate?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'shopping';
  color?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
}
