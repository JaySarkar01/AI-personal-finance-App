"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Loader2, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { Account, AccountType, CreateAccountPayload } from "@/lib/types"
import { AccountCard } from "@/components/finance/account-card"
import { ConfirmDialog } from "@/components/finance/confirm-dialog"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const ACCOUNT_TYPES: AccountType[] = [
  "UPI", "Cash", "Debit Card", "Credit Card", "Net Banking", "NEFT", "RTGS", "IMPS", "Wallet", "Cheque", "Auto Debit", "EMI", "Bank", "Savings", "Investment", "Other"
]

const ACCOUNT_ICONS: Record<AccountType, string> = {
  UPI: "📱", Cash: "💵", "Debit Card": "💳", "Credit Card": "💳",
  "Net Banking": "💻", NEFT: "🏦", RTGS: "🏦", IMPS: "⚡",
  Wallet: "👛", Cheque: "📝", "Auto Debit": "🔄", EMI: "⏳",
  Bank: "🏦", Savings: "🐷", Investment: "📈", Other: "📂",
}

const ACCOUNT_COLORS: string[] = [
  "#0D9488", "#3B82F6", "#8B5CF6", "#F43F5E",
  "#F97316", "#10B981", "#EAB308", "#06B6D4",
]

const DEFAULT_FORM: CreateAccountPayload = {
  name: "", type: "Bank", initialBalance: 0, currency: "INR", color: "#0D9488",
  icon: "🏦", includeInTotal: true, description: "",
}

export default function AccountsPage() {
  const {
    accounts, accountSummary, accountsLoading, accountsError,
    fetchAccounts, fetchAccountSummary, createAccount, updateAccount, deleteAccount,
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState<Account | null>(null)
  const [forceDeleteCount, setForceDeleteCount] = useState(0)
  const [form, setForm] = useState<CreateAccountPayload>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAccounts()
    fetchAccountSummary()
  }, [fetchAccounts, fetchAccountSummary])

  const openCreateModal = () => {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  const openEditModal = (account: Account) => {
    setEditTarget(account)
    setForm({
      name: account.name,
      type: account.type,
      color: account.color,
      icon: account.icon,
      includeInTotal: account.includeInTotal,
      description: account.description || "",
      currency: account.currency,
    })
    setModalOpen(true)
  }

  const handleFormChange = (key: keyof CreateAccountPayload, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-set icon when type changes
      if (key === "type") next.icon = ACCOUNT_ICONS[value as AccountType]
      return next
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Account name is required"); return }
    setSubmitting(true)
    try {
      if (editTarget) {
        await updateAccount(editTarget._id, form)
        toast.success("Account updated")
      } else {
        await createAccount(form)
        toast.success("Account created")
      }
      setModalOpen(false)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (account: Account) => {
    const result = await deleteAccount(account._id, false)
    if (result.transactionCount) {
      // Account has transactions — ask user to confirm force delete
      setForceDeleteCount(result.transactionCount)
      setForceDeleteTarget(account)
    } else {
      toast.success("Account deleted")
    }
    setDeleteTarget(null)
  }

  const handleForceDelete = async () => {
    if (!forceDeleteTarget) return
    await deleteAccount(forceDeleteTarget._id, true)
    toast.success("Account and all its transactions deleted")
    setForceDeleteTarget(null)
  }

  const handleArchive = async (account: Account) => {
    await updateAccount(account._id, { isArchived: !account.isArchived } as Partial<CreateAccountPayload>)
    toast.success(account.isArchived ? "Account unarchived" : "Account archived")
  }

  // Summary cards data
  const summaryCards = accountSummary
    ? [
        {
          label: "Net Worth",
          value: accountSummary.netWorth,
          icon: Wallet,
          color: "text-primary",
          bg: "bg-primary/10",
          type: "neutral" as const,
        },
        {
          label: "Total Assets",
          value: accountSummary.totalAssets,
          icon: TrendingUp,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          type: "income" as const,
        },
        {
          label: "Total Liabilities",
          value: accountSummary.totalLiabilities,
          icon: TrendingDown,
          color: "text-rose-500",
          bg: "bg-rose-500/10",
          type: "expense" as const,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your financial accounts</p>
        </div>
        <Button id="create-account-btn" onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Account</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Summary cards */}
      {accountSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <AmountDisplay amount={card.value} type={card.type} size="lg" showSign={false} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {accountsError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{accountsError}</p>
        </div>
      )}

      {/* Loading */}
      {accountsLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Accounts grid */}
      {!accountsLoading && accounts.length === 0 && !accountsError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No accounts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your first account to get started</p>
          <Button id="empty-create-account-btn" onClick={openCreateModal} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      )}

      {!accountsLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onEdit={openEditModal}
              onDelete={(a) => setDeleteTarget(a)}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {/* Quick link to transactions */}
      {accounts.length > 0 && (
        <div className="flex justify-center pt-2">
          <Link href="/transactions">
            <Button variant="ghost" className="text-muted-foreground gap-2">
              View all transactions →
            </Button>
          </Link>
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Account Name</Label>
              <Input
                id="acc-name"
                placeholder="e.g. HDFC Savings"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-type">Account Type</Label>
              <div className="relative">
                <Select
                  id="acc-type"
                  value={form.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{ACCOUNT_ICONS[t]} {t}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Initial balance — only on create */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-balance">Initial Balance (₹)</Label>
                <Input
                  id="acc-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.initialBalance ?? ""}
                  onChange={(e) => handleFormChange("initialBalance", parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Accent Color</Label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFormChange("color", c)}
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      form.color === c ? "ring-2 ring-offset-2 ring-ring scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            {/* Include in total */}
            <label className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 cursor-pointer">
              <input
                id="acc-include-total"
                type="checkbox"
                checked={form.includeInTotal}
                onChange={(e) => handleFormChange("includeInTotal", e.target.checked)}
                className="h-4 w-4 accent-primary rounded"
              />
              <div>
                <span className="text-sm font-medium">Include in Net Worth</span>
                <p className="text-xs text-muted-foreground">Count this account in your total net worth</p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button id="acc-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Account"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteTarget) await handleDelete(deleteTarget) }}
        variant="destructive"
      />

      {/* ── Force delete confirmation (has transactions) ──────────────────── */}
      <ConfirmDialog
        open={!!forceDeleteTarget}
        onOpenChange={(o) => !o && setForceDeleteTarget(null)}
        title="Delete Account with Transactions"
        description={`"${forceDeleteTarget?.name}" has ${forceDeleteCount} transaction(s). Deleting this account will permanently remove all of them. This cannot be undone.`}
        confirmLabel={`Delete Account & ${forceDeleteCount} Transaction(s)`}
        onConfirm={handleForceDelete}
        variant="destructive"
      />
    </div>
  )
}
