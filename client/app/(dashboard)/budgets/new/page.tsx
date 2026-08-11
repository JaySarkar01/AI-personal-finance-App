"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ChevronDown, PieChart } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { CreateBudgetPayload } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DEFAULT_FORM: CreateBudgetPayload = {
  name: "",
  limit: 0,
  categoryId: "",
  period: "monthly",
  month: new Date().getMonth() + 1, // 1-indexed
  year: new Date().getFullYear(),
  notes: "",
}

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

export default function NewBudgetPage() {
  const router = useRouter()
  const { categories, fetchCategories, createBudget } = useFinanceStore()

  const [form, setForm] = useState<CreateBudgetPayload>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [amountInput, setAmountInput] = useState("")
  // If true, the budget applies to every month/year instead of a specific one
  const [isRecurring, setIsRecurring] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const setField = <K extends keyof CreateBudgetPayload>(
    key: K,
    value: CreateBudgetPayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    setAmountInput(cleaned)
    const parsed = parseFloat(cleaned)
    setField("limit", isNaN(parsed) ? 0 : parsed)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Budget name is required"); return }
    if (form.limit <= 0) { toast.error("Budget limit must be greater than 0"); return }

    setSubmitting(true)
    try {
      const payload: CreateBudgetPayload = {
        ...form,
        categoryId: form.categoryId || undefined,
        month: isRecurring ? undefined : form.month,
        year: isRecurring ? undefined : form.year,
      }
      await createBudget(payload)
      toast.success("Budget added successfully!")
      router.push("/budgets")
    } catch {
      toast.error("Failed to create budget. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Categories typically associated with expenses
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')

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
          <h1 className="text-xl font-bold text-foreground">Create Budget</h1>
          <p className="text-sm text-muted-foreground">Set spending limits to stay on track</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
        {/* ── Name ───────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="budget-name">Budget Name</Label>
          <Input
            id="budget-name"
            placeholder="e.g. Dining Out, Groceries, or Overall Monthly"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* ── Limit ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="budget-limit">Budget Limit</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="budget-limit"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="pl-10 text-2xl font-bold h-14 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Period ────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="budget-period">Period</Label>
            <div className="relative">
              <Select
                id="budget-period"
                value={form.period}
                onChange={(e) => setField("period", e.target.value as any)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* ── Category ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category (Optional)</Label>
            <div className="relative">
              <Select
                id="budget-category"
                value={form.categoryId || ""}
                onChange={(e) => setField("categoryId", e.target.value)}
              >
                <option value="">All Categories (Total Spend)</option>
                {expenseCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* ── Recurring Checkbox ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id="budget-recurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="budget-recurring" className="cursor-pointer font-normal">
            Apply this budget continuously (recurring)
          </Label>
        </div>

        {/* ── Month/Year selectors if not recurring ──────────────────────── */}
        {!isRecurring && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-month">Month</Label>
              <div className="relative">
                <Select
                  id="budget-month"
                  value={String(form.month)}
                  onChange={(e) => setField("month", parseInt(e.target.value, 10))}
                  disabled={form.period === "yearly"}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const date = new Date(2000, i, 1);
                    return (
                      <option key={i + 1} value={i + 1}>
                        {date.toLocaleString('default', { month: 'long' })}
                      </option>
                    )
                  })}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget-year">Year</Label>
              <div className="relative">
                <Select
                  id="budget-year"
                  value={String(form.year)}
                  onChange={(e) => setField("year", parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="budget-notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="budget-notes"
            placeholder="Any extra details..."
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
            className="flex-1 font-semibold transition-all bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PieChart className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Saving…" : "Create Budget"}
          </Button>
        </div>
      </div>
    </div>
  )
}
