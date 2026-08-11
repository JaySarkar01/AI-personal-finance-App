import { create } from 'zustand';
import api from '@/lib/api';
import type {
  Account,
  Transaction,
  Category,
  AccountSummary,
  TransactionStats,
  TransactionFilters,
  Pagination,
  CreateAccountPayload,
  CreateTransactionPayload,
  DashboardData,
  Budget,
  Goal,
  Subscription,
  IntelligenceData,
} from '@/lib/types';

// ──────────────────────────────────────────────────────────────────────────────
// State shape
// ──────────────────────────────────────────────────────────────────────────────

interface FinanceState {
  // Accounts
  accounts: Account[];
  accountSummary: AccountSummary | null;
  accountsLoading: boolean;
  accountsError: string | null;

  // Transactions
  transactions: Transaction[];
  transactionPagination: Pagination | null;
  transactionStats: TransactionStats | null;
  transactionFilters: TransactionFilters;
  transactionsLoading: boolean;
  transactionsError: string | null;

  // Categories
  categories: Category[];
  categoriesLoading: boolean;

  // Dashboard
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  fetchDashboard: () => Promise<void>;
  
  intelligenceData: IntelligenceData | null;
  intelligenceLoading: boolean;
  fetchIntelligence: () => Promise<void>;

  // Budgets
  budgets: Budget[];
  budgetsLoading: boolean;
  fetchBudgets: (month?: number, year?: number) => Promise<void>;
  createBudget: (payload: any) => Promise<void>;
  updateBudget: (id: string, payload: any) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  // Goals
  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: () => Promise<void>;
  createGoal: (payload: any) => Promise<void>;
  updateGoal: (id: string, payload: any) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Subscriptions
  subscriptions: Subscription[];
  subscriptionsLoading: boolean;
  fetchSubscriptions: () => Promise<void>;
  createSubscription: (payload: any) => Promise<void>;
  updateSubscription: (id: string, payload: any) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;

  // Account actions
  fetchAccounts: () => Promise<void>;
  fetchAccountSummary: () => Promise<void>;
  createAccount: (payload: CreateAccountPayload) => Promise<Account>;
  updateAccount: (id: string, payload: Partial<CreateAccountPayload>) => Promise<Account>;
  deleteAccount: (id: string, force?: boolean) => Promise<{ transactionCount?: number }>;

  // Transaction actions
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  fetchTransactionStats: (params?: { startDate?: string; endDate?: string; accountId?: string }) => Promise<void>;
  createTransaction: (payload: CreateTransactionPayload) => Promise<Transaction>;
  updateTransaction: (id: string, payload: Partial<CreateTransactionPayload>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setTransactionFilters: (filters: Partial<TransactionFilters>) => void;

  // Category actions
  fetchCategories: (type?: 'income' | 'expense' | 'both') => Promise<void>;
  createCategory: (payload: { name: string; icon?: string; color?: string; type?: string }) => Promise<Category>;

  // Reset
  reset: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TransactionFilters = {
  sortBy: 'date',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────────────
  accounts: [],
  accountSummary: null,
  accountsLoading: false,
  accountsError: null,

  transactions: [],
  transactionPagination: null,
  transactionStats: null,
  transactionFilters: DEFAULT_FILTERS,
  transactionsLoading: false,
  transactionsError: null,

  categories: [],
  categoriesLoading: false,

  dashboardData: null,
  dashboardLoading: false,

  budgets: [],
  budgetsLoading: false,

  goals: [],
  goalsLoading: false,

  subscriptions: [],
  subscriptionsLoading: false,

  intelligenceData: null,
  intelligenceLoading: false,

  fetchIntelligence: async () => {
    set({ intelligenceLoading: true });
    try {
      const { data } = await api.get('/intelligence');
      set({ intelligenceData: data.data, intelligenceLoading: false });
    } catch {
      set({ intelligenceLoading: false });
    }
  },

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const { data } = await api.get('/dashboard');
      set({ dashboardData: data.data, dashboardLoading: false });
    } catch {
      set({ dashboardLoading: false });
    }
  },

  // ── Budgets actions ────────────────────────────────────────────────────────

  fetchBudgets: async (month, year) => {
    set({ budgetsLoading: true });
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      const { data } = await api.get(`/budgets?${params.toString()}`);
      set({ budgets: data.data, budgetsLoading: false });
    } catch {
      set({ budgetsLoading: false });
    }
  },

  createBudget: async (payload) => {
    await api.post('/budgets', payload);
    get().fetchBudgets();
  },

  updateBudget: async (id, payload) => {
    await api.put(`/budgets/${id}`, payload);
    get().fetchBudgets();
  },

  deleteBudget: async (id) => {
    await api.delete(`/budgets/${id}`);
    get().fetchBudgets();
  },

  // ── Goals actions ──────────────────────────────────────────────────────────

  fetchGoals: async () => {
    set({ goalsLoading: true });
    try {
      const { data } = await api.get('/goals');
      set({ goals: data.data, goalsLoading: false });
    } catch {
      set({ goalsLoading: false });
    }
  },

  createGoal: async (payload) => {
    await api.post('/goals', payload);
    get().fetchGoals();
  },

  updateGoal: async (id, payload) => {
    await api.put(`/goals/${id}`, payload);
    get().fetchGoals();
  },

  deleteGoal: async (id) => {
    await api.delete(`/goals/${id}`);
    get().fetchGoals();
  },

  // ── Subscriptions actions ────────────────────────────────────────────────

  fetchSubscriptions: async () => {
    set({ subscriptionsLoading: true });
    try {
      const { data } = await api.get('/subscriptions');
      set({ subscriptions: data.data, subscriptionsLoading: false });
    } catch {
      set({ subscriptionsLoading: false });
    }
  },

  createSubscription: async (payload) => {
    await api.post('/subscriptions', payload);
    get().fetchSubscriptions();
  },

  updateSubscription: async (id, payload) => {
    await api.put(`/subscriptions/${id}`, payload);
    get().fetchSubscriptions();
  },

  deleteSubscription: async (id) => {
    await api.delete(`/subscriptions/${id}`);
    get().fetchSubscriptions();
  },

  // ── Account actions ──────────────────────────────────────────────────────

  fetchAccounts: async () => {
    set({ accountsLoading: true, accountsError: null });
    try {
      const { data } = await api.get('/accounts');
      set({ accounts: data.data, accountsLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load accounts';
      set({ accountsError: msg, accountsLoading: false });
    }
  },

  fetchAccountSummary: async () => {
    try {
      const { data } = await api.get('/accounts/summary');
      set({ accountSummary: data.data });
    } catch {
      // Non-critical — silently fail
    }
  },

  createAccount: async (payload) => {
    const { data } = await api.post('/accounts', payload);
    set((s) => ({ accounts: [...s.accounts, data.data] }));
    get().fetchAccountSummary();
    return data.data;
  },

  updateAccount: async (id, payload) => {
    const { data } = await api.put(`/accounts/${id}`, payload);
    set((s) => ({
      accounts: s.accounts.map((a) => (a._id === id ? data.data : a)),
    }));
    get().fetchAccountSummary();
    return data.data;
  },

  deleteAccount: async (id, force = false) => {
    try {
      await api.delete(`/accounts/${id}${force ? '?force=true' : ''}`);
      set((s) => ({ accounts: s.accounts.filter((a) => a._id !== id) }));
      get().fetchAccountSummary();
      return {};
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { transactionCount?: number; message?: string } } };
      if (axiosErr.response?.data?.transactionCount) {
        return { transactionCount: axiosErr.response.data.transactionCount };
      }
      throw err;
    }
  },

  // ── Transaction actions ──────────────────────────────────────────────────

  fetchTransactions: async (filters) => {
    set({ transactionsLoading: true, transactionsError: null });
    try {
      const merged = { ...get().transactionFilters, ...filters };
      if (filters) set({ transactionFilters: merged });

      const params = new URLSearchParams();
      if (merged.type) params.set('type', merged.type);
      if (merged.accountId) params.set('accountId', merged.accountId);
      if (merged.categoryId) params.set('categoryId', merged.categoryId);
      if (merged.startDate) params.set('startDate', merged.startDate);
      if (merged.endDate) params.set('endDate', merged.endDate);
      if (merged.search) params.set('search', merged.search);
      if (merged.sortBy) params.set('sortBy', merged.sortBy);
      if (merged.sortOrder) params.set('sortOrder', merged.sortOrder);
      params.set('page', String(merged.page ?? 1));
      params.set('limit', String(merged.limit ?? 20));

      const { data } = await api.get(`/transactions?${params.toString()}`);
      set({
        transactions: data.data,
        transactionPagination: data.pagination,
        transactionsLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load transactions';
      set({ transactionsError: msg, transactionsLoading: false });
    }
  },

  fetchTransactionStats: async (params = {}) => {
    try {
      const qp = new URLSearchParams(params as Record<string, string>);
      const { data } = await api.get(`/transactions/stats?${qp.toString()}`);
      set({ transactionStats: data.data });
    } catch {
      // Non-critical
    }
  },

  createTransaction: async (payload) => {
    const { data } = await api.post('/transactions', payload);
    // Refresh list and accounts (balance changed)
    get().fetchTransactions();
    get().fetchAccounts();
    get().fetchAccountSummary();
    return data.data;
  },

  updateTransaction: async (id, payload) => {
    const { data } = await api.put(`/transactions/${id}`, payload);
    get().fetchTransactions();
    get().fetchAccounts();
    get().fetchAccountSummary();
    return data.data;
  },

  deleteTransaction: async (id) => {
    await api.delete(`/transactions/${id}`);
    set((s) => ({ transactions: s.transactions.filter((t) => t._id !== id) }));
    get().fetchAccounts();
    get().fetchAccountSummary();
  },

  setTransactionFilters: (filters) => {
    set((s) => ({ transactionFilters: { ...s.transactionFilters, ...filters } }));
  },

  // ── Category actions ─────────────────────────────────────────────────────

  fetchCategories: async (type) => {
    set({ categoriesLoading: true });
    try {
      const params = type ? `?type=${type}` : '';
      const { data } = await api.get(`/categories${params}`);
      set({ categories: data.data, categoriesLoading: false });
    } catch {
      set({ categoriesLoading: false });
    }
  },

  createCategory: async (payload) => {
    const { data } = await api.post('/categories', payload);
    set((s) => ({ categories: [...s.categories, data.data] }));
    return data.data;
  },

  // ── Reset ────────────────────────────────────────────────────────────────

  reset: () => {
    set({
      accounts: [],
      accountSummary: null,
      transactions: [],
      transactionPagination: null,
      transactionStats: null,
      transactionFilters: DEFAULT_FILTERS,
      categories: [],
    });
  },
}));
