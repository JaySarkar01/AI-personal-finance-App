// ──────────────────────────────────────────────────────────────────────────────
// Finance domain types
// ──────────────────────────────────────────────────────────────────────────────

export type AccountType =
  | 'UPI'
  | 'Cash'
  | 'Debit Card'
  | 'Credit Card'
  | 'Net Banking'
  | 'NEFT'
  | 'RTGS'
  | 'IMPS'
  | 'Wallet'
  | 'Cheque'
  | 'Auto Debit'
  | 'EMI'
  | 'Bank'
  | 'Savings'
  | 'Investment'
  | 'Other';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  _id: string;
  user: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  _id: string;
  user: string;
  name: string;
  type: AccountType;
  /** Balance in major units (e.g. rupees). Always use this for display. */
  balance: number;
  /** Raw integer cents — use for calculations only. */
  balanceCents: number;
  currency: string;
  color: string;
  icon: string;
  isArchived: boolean;
  includeInTotal: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  user: string;
  account: Pick<Account, '_id' | 'name' | 'type' | 'color' | 'icon'>;
  toAccount?: Pick<Account, '_id' | 'name' | 'type' | 'color' | 'icon'> | null;
  category?: Pick<Category, '_id' | 'name' | 'icon' | 'color' | 'type'> | null;
  type: TransactionType;
  /** Amount in major units (e.g. rupees). Use for display. */
  amount: number;
  /** Raw integer cents. */
  amountCents: number;
  date: string;
  description: string;
  notes?: string;
  tags: string[];
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// API response shapes
// ──────────────────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface AccountSummary {
  netWorth: number;
  netWorthCents: number;
  totalAssets: number;
  totalAssetsCents: number;
  totalLiabilities: number;
  totalLiabilitiesCents: number;
  byType: Record<AccountType, { amount: number; cents: number }>;
}

export interface TransactionStats {
  income: { amount: number; cents: number; count: number };
  expense: { amount: number; cents: number; count: number };
  transfer: { amount: number; cents: number; count: number };
  net: { amount: number; cents: number };
}

// ──────────────────────────────────────────────────────────────────────────────
// Filter / query types
// ──────────────────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  type?: TransactionType | '';
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  initialBalance?: number;
  currency?: string;
  color?: string;
  icon?: string;
  includeInTotal?: boolean;
  description?: string;
}

export interface CreateTransactionPayload {
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date?: string;
  description: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringInterval?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────────────────

export interface CashFlowMonth {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategorySpendItem {
  _id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  cents: number;
}

export interface DashboardData {
  period: { month: string; fy: string };
  netWorth: { cents: number; amount: number; assetsCents: number; liabilitiesCents: number };
  thisMonth: {
    incomeCents: number; income: number;
    expenseCents: number; expense: number;
    savingsCents: number; savings: number;
    savingsRate: number;
  };
  financialYear: { label: string; incomeCents: number; income: number; expenseCents: number; expense: number };
  cashFlow: CashFlowMonth[];
  categorySpend: CategorySpendItem[];
  recentTransactions: (Transaction & { amount: number })[];
  accounts: Account[];
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'fy' | 'custom';

export interface TrendMonth {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface DOWDay {
  day: string;
  amount: number;
  count: number;
}

export interface FYComparison {
  fy: string;
  income: number;
  expense: number;
  savings: number;
}

export interface AnalyticsData {
  period: { label: string; start: string; end: string };
  summary: {
    income: number; incomeCents: number;
    expense: number; expenseCents: number;
    savings: number; savingsCents: number;
    savingsRate: number;
  };
  trend: TrendMonth[];
  categoryExpense: CategorySpendItem[];
  categoryIncome: CategorySpendItem[];
  fyComparison: FYComparison[];
  dowPattern: DOWDay[];
}

// ── Budgets & Goals ───────────────────────────────────────────────────────────

export interface CreateBudgetPayload {
  name: string;
  limit: number;
  categoryId?: string;
  period?: 'monthly' | 'yearly';
  month?: number;
  year?: number;
  color?: string;
  icon?: string;
  notes?: string;
}

export interface Budget {
  _id: string;
  name: string;
  category: Category | null;
  limitCents: number;
  limit: number;
  spentCents: number;
  spent: number;
  remainingCents: number;
  remaining: number;
  pct: number;
  status: 'ok' | 'warning' | 'exceeded';
  period: 'monthly' | 'yearly';
  month: number | null;
  year: number | null;
  color: string;
  icon: string;
  isActive: boolean;
  notes: string;
}

export interface Goal {
  _id: string;
  name: string;
  targetCents: number;
  target: number;
  currentCents: number;
  current: number;
  remaining: number;
  progressPct: number;
  linkedAccount: Account | null;
  deadline: string | null;
  icon: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  notes: string;
  reqMonthly: number | null;
  monthsLeft: number | null;
}

export interface CreateGoalPayload {
  name: string;
  target: number;
  current?: number;
  linkedAccount?: string;
  deadline?: string;
  icon?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface CreateSubscriptionPayload {
  name: string;
  amount: number;
  categoryId?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  intervalDays?: number;
  startDate?: string;
  nextPaymentDate: string;
  autoPay?: boolean;
  isActive?: boolean;
  color?: string;
  icon?: string;
  notes?: string;
  type: 'subscription' | 'bill' | 'emi' | 'sip' | 'rent' | 'other';
}

export interface Subscription {
  _id: string;
  name: string;
  amountCents: number;
  amount: number;
  category: Category | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  intervalDays: number | null;
  startDate: string;
  nextPaymentDate: string;
  autoPay: boolean;
  isActive: boolean;
  color: string;
  icon: string;
  notes: string;
  type: 'subscription' | 'bill' | 'emi' | 'sip' | 'rent' | 'other';
  monthlyEquivalent: number;
  annualEquivalent: number;
  daysUntilNext: number;
}

export interface Anomaly {
  category: string;
  current: number;
  average: number;
  deviation: number;
}

export interface MoneyLeak {
  category: string;
  monthsIncreasing: number;
  current: number;
  history: number[];
}

export interface IntelligenceData {
  healthScore: number;
  metrics: {
    savingsScore: number;
    liquidityScore: number;
    disciplineScore: number;
  };
  forecast: {
    nextMonthIncome: number;
    nextMonthExpense: number;
    nextMonthSavings: number;
  };
  anomalies: Anomaly[];
  leaks: MoneyLeak[];
}




