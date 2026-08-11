"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ChevronDown, Target } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { CreateGoalPayload } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DEFAULT_FORM: CreateGoalPayload = {
  name: "",
  target: 0,
  current: 0,
  linkedAccount: "",
  deadline: "",
  priority: "medium",
  notes: "",
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "border-blue-500/40 text-blue-500 hover:bg-blue-500/10", active: "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30" },
  { value: "medium", label: "Medium", color: "border-amber-500/40 text-amber-500 hover:bg-amber-500/10", active: "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/30" },
  { value: "high", label: "High", color: "border-rose-500/40 text-rose-500 hover:bg-rose-500/10", active: "border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30" },
]

export default function NewGoalPage() {
  const router = useRouter()
  const { accounts, fetchAccounts, createGoal } = useFinanceStore()

  const [form, setForm] = useState<CreateGoalPayload>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [targetInput, setTargetInput] = useState("")
  const [currentInput, setCurrentInput] = useState("")

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const setField = <K extends keyof CreateGoalPayload>(
    key: K,
    value: CreateGoalPayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleNumberInput = (
    raw: string,
    setter: (v: string) => void,
    field: "target" | "current"
  ) => {
    const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    setter(cleaned)
    const parsed = parseFloat(cleaned)
    setField(field, isNaN(parsed) ? 0 : parsed)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Goal name is required"); return }
    if ((form.target ?? 0) <= 0) { toast.error("Target amount must be greater than 0"); return }

    setSubmitting(true)
    try {
      const payload: CreateGoalPayload = {
        ...form,
        linkedAccount: form.linkedAccount || undefined,
        deadline: form.deadline || undefined,
      }
      await createGoal(payload)
      toast.success("Goal created successfully!")
      router.push("/goals")
    } catch {
      toast.error("Failed to create goal. Please try again.")
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
          <h1 className="text-xl font-bold text-foreground">Create Goal</h1>
          <p className="text-sm text-muted-foreground">Set a savings target and track your progress</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
        {/* ── Name ───────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="goal-name">Goal Name</Label>
          <Input
            id="goal-name"
            placeholder="e.g. Emergency Fund, New Laptop, Vacation"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* ── Target Amount ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="goal-target">Target Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="goal-target"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={targetInput}
              onChange={(e) => handleNumberInput(e.target.value, setTargetInput, "target")}
              className="pl-10 text-2xl font-bold h-14 rounded-xl"
            />
          </div>
        </div>

        {/* ── Current Saved ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="goal-current">Already Saved <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
              ₹
            </span>
            <Input
              id="goal-current"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={currentInput}
              onChange={(e) => handleNumberInput(e.target.value, setCurrentInput, "current")}
              className="pl-10 text-lg font-semibold h-12 rounded-xl"
            />
          </div>
          <p className="text-xs text-muted-foreground pl-1">If you link an account below, its balance will be used instead.</p>
        </div>

        {/* ── Priority ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="grid grid-cols-3 gap-3">
            {PRIORITY_OPTIONS.map((opt) => {
              const isActive = form.priority === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField("priority", opt.value as any)}
                  className={cn(
                    "rounded-xl border-2 py-2.5 px-2 text-sm font-semibold transition-all duration-200",
                    isActive ? opt.active : opt.color
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Linked Account ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="goal-account">Linked Account (Optional)</Label>
            <div className="relative">
              <Select
                id="goal-account"
                value={form.linkedAccount || ""}
                onChange={(e) => setField("linkedAccount", e.target.value)}
              >
                <option value="">No linked account</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground pl-1">Account balance will track progress automatically.</p>
          </div>

          {/* ── Deadline ──────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Deadline (Optional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={form.deadline || ""}
              onChange={(e) => setField("deadline", e.target.value)}
            />
            <p className="text-xs text-muted-foreground pl-1">Helps calculate required monthly savings.</p>
          </div>
        </div>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="goal-notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="goal-notes"
            placeholder="Any extra details about this goal..."
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
              <Target className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Saving…" : "Create Goal"}
          </Button>
        </div>
      </div>
    </div>
  )
}
