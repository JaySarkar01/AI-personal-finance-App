"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ChevronDown, CalendarClock } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { CreateSubscriptionPayload } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DEFAULT_FORM: CreateSubscriptionPayload = {
  name: "",
  amount: 0,
  categoryId: "",
  frequency: "monthly",
  type: "subscription",
  nextPaymentDate: new Date().toISOString().split("T")[0],
  notes: "",
  autoPay: false,
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
]

const TYPE_OPTIONS = [
  { value: "subscription", label: "Subscription (e.g. Netflix)" },
  { value: "bill", label: "Bill (e.g. Electricity)" },
  { value: "emi", label: "EMI (e.g. Car Loan)" },
  { value: "sip", label: "SIP (e.g. Mutual Fund)" },
  { value: "rent", label: "Rent" },
  { value: "other", label: "Other" },
]

export default function NewSubscriptionPage() {
  const router = useRouter()
  const { categories, fetchCategories, createSubscription } = useFinanceStore()

  const [form, setForm] = useState<CreateSubscriptionPayload>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [amountInput, setAmountInput] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const setField = <K extends keyof CreateSubscriptionPayload>(
    key: K,
    value: CreateSubscriptionPayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    setAmountInput(cleaned)
    const parsed = parseFloat(cleaned)
    setField("amount", isNaN(parsed) ? 0 : parsed)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (form.amount <= 0) { toast.error("Amount must be greater than 0"); return }
    if (!form.nextPaymentDate) { toast.error("Next payment date is required"); return }
    if (form.frequency === "custom" && (!form.intervalDays || form.intervalDays <= 0)) {
      toast.error("Please provide a valid custom interval in days"); return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || undefined,
      }
      await createSubscription(payload)
      toast.success("Subscription added successfully!")
      router.push("/subscriptions")
    } catch {
      toast.error("Failed to create subscription. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-xl font-bold text-foreground">Add Subscription</h1>
          <p className="text-sm text-muted-foreground">Track recurring bills, EMIs, and SIPs</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
        {/* ── Name ───────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="sub-name">Name</Label>
          <Input
            id="sub-name"
            placeholder="e.g. Netflix, Electricity Bill, Home Loan EMI"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* ── Amount ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="sub-amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="sub-amount"
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
          {/* ── Type ────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="sub-type">Type</Label>
            <div className="relative">
              <Select
                id="sub-type"
                value={form.type}
                onChange={(e) => setField("type", e.target.value as any)}
              >
                {TYPE_OPTIONS.map((opt) => (
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
            <Label htmlFor="sub-category">Category (Optional)</Label>
            <div className="relative">
              <Select
                id="sub-category"
                value={form.categoryId || ""}
                onChange={(e) => setField("categoryId", e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Frequency ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="sub-frequency">Billing Frequency</Label>
            <div className="relative">
              <Select
                id="sub-frequency"
                value={form.frequency}
                onChange={(e) => setField("frequency", e.target.value as any)}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* ── Next Payment Date ────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="sub-date">Next Payment Date</Label>
            <Input
              id="sub-date"
              type="date"
              value={form.nextPaymentDate as string}
              onChange={(e) => setField("nextPaymentDate", e.target.value)}
            />
          </div>
        </div>

        {/* ── Custom Interval (only if frequency = custom) ─────────────── */}
        {form.frequency === "custom" && (
          <div className="space-y-2">
            <Label htmlFor="sub-interval">Custom Interval (in days)</Label>
            <Input
              id="sub-interval"
              type="number"
              placeholder="e.g. 14 for bi-weekly"
              value={form.intervalDays || ""}
              onChange={(e) => setField("intervalDays", parseInt(e.target.value, 10))}
              min="1"
            />
          </div>
        )}

        {/* ── AutoPay Checkbox ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id="sub-autopay"
            type="checkbox"
            checked={form.autoPay}
            onChange={(e) => setField("autoPay", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="sub-autopay" className="cursor-pointer font-normal">
            Auto-pay enabled for this bill/subscription
          </Label>
        </div>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="sub-notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="sub-notes"
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
              <CalendarClock className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Saving…" : "Add Subscription"}
          </Button>
        </div>
      </div>
    </div>
  )
}
