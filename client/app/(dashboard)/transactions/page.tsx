"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle, Receipt } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { Transaction, TransactionFilters } from "@/lib/types"
import { TransactionRow } from "@/components/finance/transaction-row"
import { TransactionFiltersPanel } from "@/components/finance/transaction-filters"
import { ConfirmDialog } from "@/components/finance/confirm-dialog"
import { AmountDisplay } from "@/components/finance/amount-display"
import { AddTransactionFab } from "@/components/finance/add-transaction-fab"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const DEFAULT_FILTERS: TransactionFilters = {
  sortBy: "date", sortOrder: "desc", page: 1, limit: 20,
}

export default function TransactionsPage() {
  const {
    transactions, transactionPagination, transactionStats, transactionsLoading, transactionsError,
    transactionFilters,
    accounts, categories,
    fetchTransactions, fetchTransactionStats, deleteTransaction, setTransactionFilters,
    fetchAccounts, fetchCategories,
  } = useFinanceStore()

  const [localFilters, setLocalFilters] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  // Initial data load
  useEffect(() => {
    fetchAccounts()
    fetchCategories()
    fetchTransactions(DEFAULT_FILTERS)
    fetchTransactionStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync from store
  useEffect(() => {
    setLocalFilters(transactionFilters)
  }, [transactionFilters])

  const handleFilterChange = useCallback((partial: Partial<TransactionFilters>) => {
    setLocalFilters((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleApply = useCallback(() => {
    setTransactionFilters(localFilters)
    fetchTransactions(localFilters)
    fetchTransactionStats({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      accountId: localFilters.accountId,
    })
  }, [localFilters, fetchTransactions, fetchTransactionStats, setTransactionFilters])

  const handleReset = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS)
    setTransactionFilters(DEFAULT_FILTERS)
    fetchTransactions(DEFAULT_FILTERS)
    fetchTransactionStats()
  }, [fetchTransactions, fetchTransactionStats, setTransactionFilters])

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteTransaction(deleteTarget._id)
    toast.success("Transaction deleted")
    setDeleteTarget(null)
  }

  const goToPage = (page: number) => {
    const next = { ...localFilters, page }
    setLocalFilters(next)
    setTransactionFilters(next)
    fetchTransactions(next)
  }

  const stats = transactionStats
  const pagination = transactionPagination

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagination ? `${pagination.total} transactions` : "Your money flow"}
          </p>
        </div>
        <Link href="/transactions/new">
          <Button id="add-transaction-btn" className="hidden sm:flex gap-2">
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </Link>
      </div>

      {/* ── Quick stats bar ─────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Income", value: stats.income.amount, type: "income" as const, border: "border-emerald-500/30 bg-emerald-500/5" },
            { label: "Expenses", value: stats.expense.amount, type: "expense" as const, border: "border-rose-500/30 bg-rose-500/5" },
            { label: "Net", value: stats.net.amount, type: stats.net.amount >= 0 ? "income" as const : "expense" as const, border: "border-border bg-card" },
          ].map(({ label, value, type, border }) => (
            <div key={label} className={`rounded-2xl border p-3 ${border}`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <AmountDisplay amount={value} type={type} size="lg" showSign={label === "Net"} />
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <TransactionFiltersPanel
        filters={localFilters}
        accounts={accounts}
        categories={categories}
        onChange={handleFilterChange}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {transactionsError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{transactionsError}</p>
        </div>
      )}

      {/* ── Transaction list ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Loading skeletons */}
        {transactionsLoading && (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!transactionsLoading && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-base font-semibold">No transactions found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {Object.values(localFilters).some(Boolean)
                ? "Try adjusting your filters"
                : "Add your first transaction to get started"}
            </p>
            <Link href="/transactions/new">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Add Transaction
              </Button>
            </Link>
          </div>
        )}

        {/* Rows */}
        {!transactionsLoading && transactions.length > 0 && (
          <div className="divide-y divide-border/50 p-1">
            {transactions.map((t) => (
              <TransactionRow
                key={t._id}
                transaction={t}
                onDelete={(tx) => setDeleteTarget(tx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              id="pagination-prev"
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || transactionsLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = i + Math.max(1, pagination.page - 2)
              if (p > pagination.totalPages) return null
              return (
                <Button
                  key={p}
                  id={`pagination-page-${p}`}
                  variant={p === pagination.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(p)}
                  className="w-9"
                >
                  {p}
                </Button>
              )
            })}
            <Button
              id="pagination-next"
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNextPage || transactionsLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile FAB ──────────────────────────────────────────────────────── */}
      <AddTransactionFab />

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Transaction"
        description={`Delete "${deleteTarget?.description}"? This will reverse the account balance change and cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
