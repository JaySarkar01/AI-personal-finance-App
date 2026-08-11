"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, Plus, PieChart, AlertCircle } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { Budget } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/lib/api"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function BudgetsPage() {
  const { budgets, budgetsLoading, fetchBudgets } = useFinanceStore()
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({})
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const handleExplain = async (b: Budget) => {
    setLoadingAi((prev) => ({ ...prev, [b._id]: true }))
    try {
      const { data } = await api.post(`/budgets/${b._id}/explain`, {
        budgetName: b.name,
        limit: b.limit,
        spent: b.spent,
        remaining: b.remaining,
        pct: b.pct,
        category: b.category?.name,
        status: b.status,
      })
      if (data.success && data.insight) {
        setAiInsight((prev) => ({ ...prev, [b._id]: data.insight }))
      } else {
        toast.error("AI insight unavailable right now")
      }
    } catch {
      toast.error("AI insight unavailable right now")
    } finally {
      setLoadingAi((prev) => ({ ...prev, [b._id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and control your monthly spending</p>
        </div>
        <Link href="/budgets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Budget
          </Button>
        </Link>
      </div>

      {budgetsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}

      {!budgetsLoading && budgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl">
          <PieChart className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold">No budgets set</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a budget to monitor your spending limits.</p>
        </div>
      )}

      {!budgetsLoading && budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const isExceeded = b.status === "exceeded"
            const isWarning = b.status === "warning"
            const colorClass = isExceeded ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
            const textClass = isExceeded ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"
            const bgClass = isExceeded ? "bg-rose-500/10" : isWarning ? "bg-amber-500/10" : "bg-emerald-500/10"

            return (
              <Card key={b._id} className={isExceeded ? "border-rose-500/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">
                        {b.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{b.name}</h3>
                        <p className="text-xs text-muted-foreground">{b.category?.name ?? "All categories"} · {b.period}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Budget Limit</p>
                      <AmountDisplay amount={b.limit} type="neutral" size="md" showSign={false} />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-muted-foreground">
                        Spent <span className="text-foreground">{inr(b.spent)}</span>
                      </span>
                      <span className={`font-semibold ${textClass}`}>
                        {isExceeded ? "Exceeded" : `${inr(b.remaining)} left`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${Math.min(100, b.pct)}%` }}
                      />
                    </div>
                    
                    {isWarning && !isExceeded && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Approaching limit ({b.pct}%)
                      </div>
                    )}
                    {isExceeded && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Budget exceeded by {inr(b.spent - b.limit)}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    {!aiInsight[b._id] && !loadingAi[b._id] && (
                      <Button variant="ghost" size="sm" onClick={() => handleExplain(b)} className="text-xs text-primary gap-1.5 px-0 h-auto hover:bg-transparent">
                        <Sparkles className="h-3.5 w-3.5" /> Ask AI for tips
                      </Button>
                    )}
                    {loadingAi[b._id] && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Analysing…
                      </div>
                    )}
                    {aiInsight[b._id] && (
                      <div className="bg-primary/5 rounded-xl p-3 text-sm whitespace-pre-line text-foreground">
                        <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                          <Sparkles className="h-3.5 w-3.5" /> AI Insight
                        </div>
                        {aiInsight[b._id]}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
