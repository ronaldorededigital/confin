export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE_FIXED = 'EXPENSE_FIXED',
  EXPENSE_INSTALLMENT = 'EXPENSE_INSTALLMENT',
  EXPENSE_VARIABLE = 'EXPENSE_VARIABLE'
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  type: TransactionType; // To filter categories by transaction type (Income/Expense)
  isDefault?: boolean; // To prevent deleting system defaults if we want
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  type: TransactionType;
  category: string; // Still storing the name for simplicity, or could be ID
  userId: string;
  tenantId: string; // Links transaction to a specific account/family
  installments?: {
    current: number;
    total: number;
  };
  updatedAt?: string;
}

export type UserRole = 'saas_admin' | 'tenant_admin' | 'member';
export type UserPlan = 'free' | 'premium';

export interface User {
  id: string;
  tenantId: string; // Group ID (e.g., Family ID)
  name: string;
  email: string;
  password?: string; // In real app, never store plain text
  avatarInitials: string;
  role: UserRole;
  plan: UserPlan; // Added plan field
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  status: 'open' | 'closed';
  date: string;
}

export interface FinancialSummary {
  income: number;
  fixedExpenses: number;
  installments: number;
  balance: number;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: 'free' | 'premium';
  nextBillingDate?: string;
}