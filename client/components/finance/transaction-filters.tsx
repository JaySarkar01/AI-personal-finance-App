"use client"

import { X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Account, Category, TransactionFilters, TransactionType } from "@/lib/types"

interface TransactionFiltersProps {
  filters: TransactionFilters
  accounts: Account[]
  categories: Category[]
  onChange: (filters: Partial<TransactionFilters>) => void
  onApply: () => void
  onReset: () => void
}

const TYPE_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
]

export function TransactionFiltersPanel({
  filters,
  accounts,
  categories,
  onChange,
  onApply,
  onReset,
}: TransactionFiltersProps) {
  const hasActiveFilters = !!(
    filters.type ||
    filters.accountId ||
    filters.categoryId ||
    filters.startDate ||
    filters.endDate ||
    filters.search
  )

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      {/* Search */}
      <div className="relative">
        <Input
          id="filter-search"
          type="search"
          placeholder="Search transactions..."
          value={filters.search || ""}
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          className="pr-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Type */}
        <div className="relative">
          <Select
            id="filter-type"
            value={filters.type || ""}
            onChange={(e) => onChange({ type: e.target.value as TransactionType | "", page: 1 })}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Account */}
        <div className="relative">
          <Select
            id="filter-account"
            value={filters.accountId || ""}
            onChange={(e) => onChange({ accountId: e.target.value, page: 1 })}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.icon} {a.name}</option>
            ))}
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Category */}
        <div className="relative">
          <Select
            id="filter-category"
            value={filters.categoryId || ""}
            onChange={(e) => onChange({ categoryId: e.target.value, page: 1 })}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Start Date */}
        <Input
          id="filter-start-date"
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => onChange({ startDate: e.target.value, page: 1 })}
          className="text-sm"
        />

        {/* End Date */}
        <Input
          id="filter-end-date"
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => onChange({ endDate: e.target.value, page: 1 })}
          className="text-sm"
        />
      </div>

      {/* Sort + Actions row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort by */}
        <div className="relative">
          <Select
            id="filter-sort-by"
            value={filters.sortBy || "date"}
            onChange={(e) => onChange({ sortBy: e.target.value as TransactionFilters["sortBy"], page: 1 })}
            className="w-36 text-xs"
          >
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
            <option value="description">Sort: Name</option>
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Sort order */}
        <div className="relative">
          <Select
            id="filter-sort-order"
            value={filters.sortOrder || "desc"}
            onChange={(e) => onChange({ sortOrder: e.target.value as "asc" | "desc", page: 1 })}
            className="w-28 text-xs"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </Select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="ml-auto flex gap-2">
          {hasActiveFilters && (
            <Button id="filter-reset" variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <Button id="filter-apply" size="sm" onClick={onApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
