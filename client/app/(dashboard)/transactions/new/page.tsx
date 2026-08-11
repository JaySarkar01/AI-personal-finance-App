"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { CreateTransactionPayload, TransactionType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<TransactionType, {
  label: string; icon: React.FC<{ className?: string }>; activeClass: string; bgClass: string
}> = {
  expense: {
    label: "Expense",
    icon: ArrowUpRight,
    activeClass: "border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30",
    bgClass: "border-rose-500/40 text-rose-500 hover:bg-rose-500/10",
  },
  income: {
    label: "Income",
    icon: ArrowDownLeft,
    activeClass: "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    bgClass: "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowLeftRight,
    activeClass: "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30",
    bgClass: "border-blue-500/40 text-blue-500 hover:bg-blue-500/10",
  },
}

const DEFAULT_FORM: CreateTransactionPayload = {
  accountId: "",
  toAccountId: "",
  categoryId: "",
  type: "expense",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  description: "",
  notes: "",
  tags: [],
  isRecurring: false,
}

export default function NewTransactionPage() {
  const router = useRouter()
  const { accounts, categories, fetchAccounts, fetchCategories, createTransaction } = useFinanceStore()

  const [form, setForm] = useState<CreateTransactionPayload>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [amountInput, setAmountInput] = useState("")

  useEffect(() => {
    fetchAccounts()
    fetchCategories()
  }, [fetchAccounts, fetchCategories])

  // Pre-select first account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !form.accountId) {
      setForm((prev) => ({ ...prev, accountId: accounts[0]._id }))
    }
  }, [accounts, form.accountId])

  const setField = <K extends keyof CreateTransactionPayload>(
    key: K,
    value: CreateTransactionPayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleAmountChange = (raw: string) => {
    // Allow only digits and a single decimal point
    const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    setAmountInput(cleaned)
    const parsed = parseFloat(cleaned)
    setField("amount", isNaN(parsed) ? 0 : parsed)
  }

  const filteredCategories = categories.filter((c) => {
    if (form.type === "income") return c.type === "income" || c.type === "both"
    if (form.type === "expense") return c.type === "expense" || c.type === "both"
    return c.type === "both"
  })

  const handleSubmit = async () => {
    if (!form.accountId) { toast.error("Please select an account"); return }
    if (form.amount <= 0) { toast.error("Amount must be greater than 0"); return }
    if (!form.description.trim()) { toast.error("Description is required"); return }
    if (form.type === "transfer" && !form.toAccountId) {
      toast.error("Please select a destination account"); return
    }
    if (form.type === "transfer" && form.toAccountId === form.accountId) {
      toast.error("Source and destination accounts must be different"); return
    }

    setSubmitting(true)
    try {
      const payload: CreateTransactionPayload = {
        ...form,
        toAccountId: form.type === "transfer" ? form.toAccountId : undefined,
        categoryId: form.categoryId || undefined,
      }
      await createTransaction(payload)
      toast.success("Transaction added successfully!")
      router.push("/transactions")
    } catch {
      toast.error("Failed to create transaction. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAccount = accounts.find((a) => a._id === form.accountId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Add Transaction</h1>
          <p className="text-sm text-muted-foreground">Record a new income, expense, or transfer</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">

        {/* ── Type selector ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label>Transaction Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TYPE_CONFIG) as TransactionType[]).map((type) => {
              const cfg = TYPE_CONFIG[type]
              const Icon = cfg.icon
              const isActive = form.type === type
              return (
                <button
                  key={type}
                  id={`type-${type}`}
                  type="button"
                  onClick={() => {
                    setField("type", type)
                    setField("categoryId", "")
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 py-3 px-2 text-sm font-semibold transition-all duration-200",
                    isActive ? cfg.activeClass : cfg.bgClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Amount ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="txn-amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="txn-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="pl-10 text-2xl font-bold h-14 rounded-xl"
            />
          </div>
        </div>

        {/* ── Description ────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="txn-description">Description</Label>
          <Input
            id="txn-description"
            placeholder={
              form.type === "income" ? "e.g. Monthly salary"
              : form.type === "expense" ? "e.g. Lunch at restaurant"
              : "e.g. Moving money to savings"
            }
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Account ──────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="txn-account">
              {form.type === "transfer" ? "From Account" : "Account"}
            </Label>
            <div className="relative">
              <Select
                id="txn-account"
                value={form.accountId}
                onChange={(e) => setField("accountId", e.target.value)}
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            {selectedAccount && (
              <p className="text-xs text-muted-foreground pl-1">
                Balance: ₹{new Intl.NumberFormat("en-IN").format(selectedAccount.balance)}
              </p>
            )}
          </div>

          {/* ── To Account (transfer only) ────────────────────────────────── */}
          {form.type === "transfer" ? (
            <div className="space-y-2">
              <Label htmlFor="txn-to-account">To Account</Label>
              <div className="relative">
                <Select
                  id="txn-to-account"
                  value={form.toAccountId}
                  onChange={(e) => setField("toAccountId", e.target.value)}
                >
                  <option value="">Select destination…</option>
                  {accounts
                    .filter((a) => a._id !== form.accountId)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ) : (
            /* ── Category ──────────────────────────────────────────────── */
            <div className="space-y-2">
              <Label htmlFor="txn-category">Category</Label>
              <div className="relative">
                <Select
                  id="txn-category"
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                >
                  <option value="">No category</option>
                  {filteredCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* ── Date ───────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="txn-date">Date</Label>
          <Input
            id="txn-date"
            type="date"
            value={form.date as string}
            onChange={(e) => setField("date", e.target.value)}
          />
        </div>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="txn-notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="txn-notes"
            placeholder="Any extra details about this transaction…"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={3}
          />
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            id="txn-submit-btn"
            className={cn(
              "flex-1 font-semibold transition-all",
              form.type === "income" ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30" :
              form.type === "expense" ? "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30" :
              "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30"
            )}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (() => { const Icon = TYPE_CONFIG[form.type].icon; return <Icon className="mr-2 h-4 w-4" /> })()
            }
            {submitting ? "Saving…" : `Add ${TYPE_CONFIG[form.type].label}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
