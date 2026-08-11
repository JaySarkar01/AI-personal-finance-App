"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, Plus, Target, CheckCircle2 } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { Goal } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/lib/api"
import { format } from "date-fns"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function GoalsPage() {
  const { goals, goalsLoading, fetchGoals } = useFinanceStore()
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({})
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleExplain = async (g: Goal) => {
    setLoadingAi((prev) => ({ ...prev, [g._id]: true }))
    try {
      const { data } = await api.post(`/goals/${g._id}/explain`, {
        goalName: g.name,
        target: g.target,
        current: g.current,
        remaining: g.remaining,
        progressPct: g.progressPct,
        reqMonthly: g.reqMonthly,
        monthsLeft: g.monthsLeft,
        priority: g.priority,
      })
      if (data.success && data.insight) {
        setAiInsight((prev) => ({ ...prev, [g._id]: data.insight }))
      } else {
        toast.error("AI insight unavailable right now")
      }
    } catch {
      toast.error("AI insight unavailable right now")
    } finally {
      setLoadingAi((prev) => ({ ...prev, [g._id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your savings targets and milestones</p>
        </div>
        <Link href="/goals/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Goal
          </Button>
        </Link>
      </div>

      {goalsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}

      {!goalsLoading && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl">
          <Target className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold">No goals set</h3>
          <p className="text-sm text-muted-foreground mt-1">Set a savings goal to track your progress.</p>
        </div>
      )}

      {!goalsLoading && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const isCompleted = g.progressPct >= 100 || g.isCompleted
            
            return (
              <Card key={g._id} className={isCompleted ? "border-emerald-500/30 bg-emerald-500/5" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-sm"
                        style={{ backgroundColor: g.color + "20" }}
                      >
                        {g.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {g.name}
                          {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {g.priority} priority {g.deadline ? `· Due ${format(new Date(g.deadline), "dd/MM/yyyy")}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Saved so far</p>
                        <AmountDisplay amount={g.current} type={isCompleted ? "income" : "neutral"} size="md" showSign={false} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-0.5">Target</p>
                        <span className="text-sm font-semibold text-foreground tabular-nums">{inr(g.target)}</span>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted relative">
                      <div
                        className="h-full rounded-full transition-all duration-700 absolute left-0 top-0"
                        style={{ width: `${Math.min(100, g.progressPct)}%`, backgroundColor: g.color }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="font-medium text-muted-foreground">
                        {isCompleted ? "Goal reached! 🎉" : `${g.progressPct}% complete`}
                      </span>
                      {!isCompleted && g.reqMonthly !== null && (
                        <span className="text-muted-foreground">
                          Requires <span className="font-semibold text-foreground">{inr(g.reqMonthly)}</span>/mo
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      {!aiInsight[g._id] && !loadingAi[g._id] && (
                        <Button variant="ghost" size="sm" onClick={() => handleExplain(g)} className="text-xs text-primary gap-1.5 px-0 h-auto hover:bg-transparent">
                          <Sparkles className="h-3.5 w-3.5" /> AI Goal Coach
                        </Button>
                      )}
                      {loadingAi[g._id] && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Analysing…
                        </div>
                      )}
                      {aiInsight[g._id] && (
                        <div className="bg-primary/5 rounded-xl p-3 text-sm whitespace-pre-line text-foreground">
                          <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                            <Sparkles className="h-3.5 w-3.5" /> Goal Coach
                          </div>
                          {aiInsight[g._id]}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
