"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, Plus, CalendarClock, CreditCard } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { Subscription } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/lib/api"
import { format } from "date-fns"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function SubscriptionsPage() {
  const { subscriptions, subscriptionsLoading, fetchSubscriptions } = useFinanceStore()
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({})
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const handleExplain = async (sub: Subscription) => {
    setLoadingAi((prev) => ({ ...prev, [sub._id]: true }))
    try {
      const { data } = await api.post(`/subscriptions/${sub._id}/explain`, {
        name: sub.name,
        type: sub.type,
        amount: sub.amount,
        frequency: sub.frequency,
        annualEquivalent: sub.annualEquivalent,
        category: sub.category?.name,
      })
      if (data.success && data.insight) {
        setAiInsight((prev) => ({ ...prev, [sub._id]: data.insight }))
      } else {
        toast.error("AI insight unavailable right now")
      }
    } catch {
      toast.error("AI insight unavailable right now")
    } finally {
      setLoadingAi((prev) => ({ ...prev, [sub._id]: false }))
    }
  }

  // Calculate global summary
  const totalMonthly = subscriptions.reduce((acc, sub) => acc + sub.monthlyEquivalent, 0)
  const totalAnnual = subscriptions.reduce((acc, sub) => acc + sub.annualEquivalent, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions & Bills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage recurring payments, EMIs, and SIPs</p>
        </div>
        <Link href="/subscriptions/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add New
          </Button>
        </Link>
      </div>

      {/* Global Summary */}
      {!subscriptionsLoading && subscriptions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Monthly Impact</p>
              <div className="text-xl font-bold text-primary">{inr(totalMonthly)}/mo</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Annual Projected Cost</p>
              <div className="text-xl font-bold">{inr(totalAnnual)}/yr</div>
            </CardContent>
          </Card>
        </div>
      )}

      {subscriptionsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}

      {!subscriptionsLoading && subscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl">
          <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold">No active subscriptions</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your bills, SIPs, or OTT subscriptions to track them.</p>
        </div>
      )}

      {!subscriptionsLoading && subscriptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map((sub) => {
            const isDueSoon = sub.daysUntilNext >= 0 && sub.daysUntilNext <= 7;
            const isOverdue = sub.daysUntilNext < 0;

            return (
              <Card key={sub._id} className={isOverdue ? "border-rose-500/30 bg-rose-500/5" : isDueSoon ? "border-amber-500/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-sm"
                        style={{ backgroundColor: sub.color + "20" }}
                      >
                        {sub.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {sub.type} · {sub.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <AmountDisplay amount={sub.amount} type="expense" size="md" showSign={false} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{inr(sub.annualEquivalent)}/yr</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Next Payment</p>
                        <p className={`text-sm font-medium ${isOverdue ? "text-rose-500" : isDueSoon ? "text-amber-500" : "text-foreground"}`}>
                          {format(new Date(sub.nextPaymentDate), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
                      <p className={`text-sm font-medium ${isOverdue ? "text-rose-500" : isDueSoon ? "text-amber-500" : "text-emerald-500"}`}>
                        {isOverdue ? `Overdue by ${Math.abs(sub.daysUntilNext)}d` : isDueSoon ? `Due in ${sub.daysUntilNext}d` : `${sub.daysUntilNext}d away`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    {!aiInsight[sub._id] && !loadingAi[sub._id] && (
                      <Button variant="ghost" size="sm" onClick={() => handleExplain(sub)} className="text-xs text-primary gap-1.5 px-0 h-auto hover:bg-transparent">
                        <Sparkles className="h-3.5 w-3.5" /> Optimize
                      </Button>
                    )}
                    {loadingAi[sub._id] && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Analysing…
                      </div>
                    )}
                    {aiInsight[sub._id] && (
                      <div className="bg-primary/5 rounded-xl p-3 text-sm whitespace-pre-line text-foreground">
                        <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                          <Sparkles className="h-3.5 w-3.5" /> Tip
                        </div>
                        {aiInsight[sub._id]}
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
