"use client"

import { useEffect, useState } from "react"
import { Sparkles, BrainCircuit, Activity, TrendingUp, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import { useFinanceStore } from "@/store/finance"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import api from "@/lib/api"
import { Progress } from "@/components/ui/progress"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function IntelligencePage() {
  const { intelligenceData, intelligenceLoading, fetchIntelligence } = useFinanceStore()
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [whatIfReduction, setWhatIfReduction] = useState(0)

  useEffect(() => {
    fetchIntelligence()
  }, [fetchIntelligence])

  const handleExplain = async () => {
    if (!intelligenceData) return
    setLoadingAi(true)
    try {
      const { data } = await api.post(`/intelligence/explain`, {
        healthScore: intelligenceData.healthScore,
        forecast: intelligenceData.forecast,
        anomalies: intelligenceData.anomalies,
        leaks: intelligenceData.leaks
      })
      if (data.success && data.insight) {
        setAiInsight(data.insight)
      } else {
        toast.error("AI insight unavailable right now")
      }
    } catch {
      toast.error("AI insight unavailable right now")
    } finally {
      setLoadingAi(false)
    }
  }

  if (intelligenceLoading || !intelligenceData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 50) return "text-amber-500"
    return "text-rose-500"
  }

  const { healthScore, metrics, forecast, anomalies, leaks } = intelligenceData

  // What-if math
  const leakTotal = leaks.reduce((acc, l) => acc + l.current, 0)
  const anomalyTotal = anomalies.reduce((acc, a) => acc + a.current, 0)
  const discretionaryTotal = leakTotal + anomalyTotal
  const monthlySavingsIncrease = discretionaryTotal * (whatIfReduction / 100)
  const annualSavingsIncrease = monthlySavingsIncrease * 12

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Financial Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deterministic insights & forecasting based on your data</p>
        </div>
        <Button onClick={handleExplain} disabled={loadingAi} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20">
          {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Get AI Review
        </Button>
      </div>

      {aiInsight && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="p-5 flex gap-4">
            <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              <span className="font-semibold text-primary mb-2 block">AI Analysis:</span>
              {aiInsight}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Score Card */}
        <Card className="lg:col-span-1 border-t-4 border-t-primary shadow-md flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Overall Health Score</p>
          <div className={`text-7xl font-bold mb-2 ${getScoreColor(healthScore)}`}>
            {healthScore}
          </div>
          <p className="text-sm font-medium text-foreground mb-6">out of 100</p>
          
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Savings Rate</span>
                <span>{metrics.savingsScore}/30</span>
              </div>
              <Progress value={(metrics.savingsScore / 30) * 100} className="h-1.5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Liquidity (Emergency)</span>
                <span>{metrics.liquidityScore}/40</span>
              </div>
              <Progress value={(metrics.liquidityScore / 40) * 100} className="h-1.5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Discipline (Anomalies)</span>
                <span>{metrics.disciplineScore}/30</span>
              </div>
              <Progress value={(metrics.disciplineScore / 30) * 100} className="h-1.5" />
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Forecast Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" /> Next Month Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Expected Income</p>
                  <p className="font-semibold text-emerald-500">{inr(forecast.nextMonthIncome)}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Expected Expenses</p>
                  <p className="font-semibold text-rose-500">{inr(forecast.nextMonthExpense)}</p>
                </div>
                <div className="bg-primary/5 rounded-xl p-4">
                  <p className="text-xs text-primary font-medium mb-1">Projected Savings</p>
                  <p className="font-bold text-primary">{inr(forecast.nextMonthSavings)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-right">Based on 3-month moving average calculations.</p>
            </CardContent>
          </Card>

          {/* Anomalies & Leaks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-rose-500/20">
              <CardHeader className="pb-3 bg-rose-500/5">
                <CardTitle className="text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" /> Spending Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {anomalies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No anomalies detected (+2σ).</p>
                ) : (
                  anomalies.map((a, i) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{a.category}</p>
                        <p className="text-xs text-muted-foreground">Avg: {inr(a.average)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-rose-500">{inr(a.current)}</p>
                        <p className="text-[10px] text-rose-600/70">+{inr(a.deviation)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/20">
              <CardHeader className="pb-3 bg-amber-500/5">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" /> Money Leaks (Trends)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {leaks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No consecutive rising trends.</p>
                ) : (
                  leaks.map((l, i) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{l.category}</p>
                        <p className="text-[10px] text-muted-foreground bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          Rising for {l.monthsIncreasing} months
                        </p>
                      </div>
                      <p className="text-sm font-bold text-amber-500">{inr(l.current)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* What-If Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            What-If Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-2xl">
            <p className="text-sm text-foreground mb-6">
              You are currently spending <strong>{inr(discretionaryTotal)}</strong> on anomalous or leaking categories. 
              What if you cut this down?
            </p>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Reduce anomalous spending by: {whatIfReduction}%</span>
                  <span className="text-sm font-bold text-emerald-500">+{inr(monthlySavingsIncrease)}/mo</span>
                </div>
                <Slider 
                  value={[whatIfReduction]} 
                  onValueChange={(val) => setWhatIfReduction(val[0])} 
                  max={100} 
                  step={5} 
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Annual Impact</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-300">
                  If you stick to this reduction for a year, your annual savings will increase by <strong className="text-lg">{inr(annualSavingsIncrease)}</strong>.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
