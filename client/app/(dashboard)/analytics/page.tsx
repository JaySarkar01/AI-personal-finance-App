"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, PiggyBank, Percent } from "lucide-react"
import api from "@/lib/api"
import { AnalyticsData, AnalyticsPeriod, CategorySpendItem } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// ── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {inr(p.value)}</p>
      ))}
    </div>
  )
}

// ── Period options ────────────────────────────────────────────────────────────

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
  { value: "fy", label: "Financial Year" },
  { value: "custom", label: "Custom" },
]

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, amount, type, icon: Icon, sub }: {
  label: string; amount: number; type: "income" | "expense" | "neutral";
  icon: React.FC<{ className?: string }>; sub?: string;
}) {
  const colors = { income: "bg-emerald-500/10 text-emerald-500", expense: "bg-rose-500/10 text-rose-500", neutral: "bg-violet-500/10 text-violet-500" }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`h-8 w-8 flex items-center justify-center rounded-lg ${colors[type]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <AmountDisplay amount={amount} type={type} size="md" showSign={false} />
        </div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Category bar list ─────────────────────────────────────────────────────────

function CategoryList({ items, total }: { items: CategorySpendItem[]; total: number }) {
  if (!items.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
  return (
    <div className="space-y-3">
      {items.map((cat) => {
        const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0
        return (
          <div key={cat._id ?? cat.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2 text-xs font-medium">
                <span>{cat.icon}</span>
                <span className="truncate max-w-[140px]">{cat.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
                <span className="text-xs font-semibold tabular-nums">{inr(cat.amount)}</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("6months")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const load = useCallback(async (p: AnalyticsPeriod = period) => {
    setLoading(true)
    setAiInsight(null)
    try {
      const params = new URLSearchParams({ period: p })
      if (p === "custom") {
        if (!customStart || !customEnd) { toast.error("Select start and end dates"); setLoading(false); return }
        params.set("startDate", customStart)
        params.set("endDate", customEnd)
      }
      const { data: res } = await api.get(`/analytics?${params}`)
      setData(res.data)
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [period, customStart, customEnd])

  useEffect(() => { load("6months") }, []) // eslint-disable-line

  const handlePeriodChange = (p: AnalyticsPeriod) => {
    setPeriod(p)
    if (p !== "custom") load(p)
  }

  const handleExplain = async () => {
    if (!data) return
    setAiLoading(true)
    try {
      // Send ONLY the compact summary — never raw transactions
      const { data: res } = await api.post("/analytics/explain", {
        period: data.period.label,
        summary: data.summary,
        topCategories: data.categoryExpense.slice(0, 5).map((c) => ({ name: c.name, amount: c.amount })),
      })
      if (res.success && res.insight) {
        setAiInsight(res.insight)
      } else {
        toast.error("AI insight unavailable right now")
      }
    } catch {
      toast.error("AI insight unavailable right now")
    } finally {
      setAiLoading(false)
    }
  }

  const s = data?.summary

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.period.label ?? "Loading…"} · April–March FY · ₹ INR
          </p>
        </div>
        <Button
          id="analytics-refresh"
          variant="outline"
          size="sm"
          onClick={() => load()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Period picker ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            id={`period-${p.value}`}
            onClick={() => handlePeriodChange(p.value)}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all border",
              period === p.value
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input id="analytics-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input id="analytics-end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40 text-sm" />
          </div>
          <Button id="analytics-custom-apply" size="sm" onClick={() => load("custom")}>Apply</Button>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Summary pills ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatPill label="Income" amount={s!.income} type="income" icon={TrendingUp} sub={data.period.label} />
            <StatPill label="Expenses" amount={s!.expense} type="expense" icon={TrendingDown} sub={data.period.label} />
            <StatPill label="Savings" amount={s!.savings} type={(s!.savings ?? 0) >= 0 ? "income" : "expense"} icon={PiggyBank} sub={`${s!.savingsRate}% rate`} />
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Percent className="h-4 w-4" />
                  </div>
                  <span className={`text-base font-bold tabular-nums ${s!.savingsRate >= 20 ? "text-emerald-500" : s!.savingsRate >= 10 ? "text-amber-500" : "text-rose-500"}`}>
                    {s!.savingsRate}%
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground">Savings Rate</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s!.savingsRate >= 20 ? "bg-emerald-500" : s!.savingsRate >= 10 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, Math.max(0, s!.savingsRate))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── AI Explain ──────────────────────────────────────────────────── */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              {!aiInsight && !aiLoading && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Insight
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get a plain-English explanation of your spending patterns. Optional — no data is stored.
                    </p>
                  </div>
                  <Button id="analytics-explain-btn" size="sm" variant="outline" onClick={handleExplain} className="shrink-0 gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5" /> Explain this
                  </Button>
                </div>
              )}
              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Analysing your finances…
                </div>
              )}
              {aiInsight && (
                <div>
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5" /> AI Insight
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{aiInsight}</p>
                  <Button
                    id="analytics-explain-refresh"
                    variant="ghost"
                    size="sm"
                    onClick={handleExplain}
                    className="mt-2 h-7 text-xs text-muted-foreground"
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Trend charts ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Income vs Expense area */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Income vs Expense Trend</CardTitle>
                <CardDescription>Monthly comparison</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                      <Tooltip content={<ChartTip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fill="url(#ig)" />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" strokeWidth={2} fill="url(#eg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </CardContent>
            </Card>

            {/* Savings trend line */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Savings Trend</CardTitle>
                <CardDescription>Monthly net savings</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                      <Tooltip content={<ChartTip />} />
                      <Line
                        type="monotone"
                        dataKey="savings"
                        name="Savings"
                        stroke="#8B5CF6"
                        strokeWidth={2.5}
                        dot={(props) => {
                          const { cx, cy, payload } = props
                          return <circle key={`dot-${payload.month}`} cx={cx} cy={cy} r={4} fill={payload.savings >= 0 ? "#10B981" : "#F43F5E"} strokeWidth={0} />
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </CardContent>
            </Card>
          </div>

          {/* ── Category breakdowns ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Expense pie + list */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Expense by Category</CardTitle>
                <CardDescription>{data.period.label}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {data.categoryExpense.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.categoryExpense} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={36} paddingAngle={2}>
                          {data.categoryExpense.map((item, i) => <Cell key={i} fill={item.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => inr(Number(v ?? 0))} contentStyle={{ borderRadius: "0.75rem", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <CategoryList items={data.categoryExpense} total={s!.expense} />
                  </>
                ) : <NoData />}
              </CardContent>
            </Card>

            {/* Income pie + list */}
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Income by Category</CardTitle>
                <CardDescription>{data.period.label}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {data.categoryIncome.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.categoryIncome} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={36} paddingAngle={2}>
                          {data.categoryIncome.map((item, i) => <Cell key={i} fill={item.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => inr(Number(v ?? 0))} contentStyle={{ borderRadius: "0.75rem", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <CategoryList items={data.categoryIncome} total={s!.income} />
                  </>
                ) : <NoData />}
              </CardContent>
            </Card>
          </div>

          {/* ── FY Comparison ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Financial Year Comparison</CardTitle>
              <CardDescription>Current FY vs Previous FY · April–March</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {data.fyComparison.some((f) => f.income > 0 || f.expense > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.fyComparison} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="fy" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                    <Tooltip content={<ChartTip />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="savings" name="Savings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData />}
            </CardContent>
          </Card>

          {/* ── Day-of-week spending ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Spending by Day of Week</CardTitle>
              <CardDescription>When you spend the most</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {data.dowPattern.some((d) => d.amount > 0) ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.dowPattern} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="amount" name="Spending" radius={[5, 5, 0, 0]} fill="#0D9488" fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData />}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function NoData() {
  return (
    <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
      No data for this period
    </div>
  )
}
