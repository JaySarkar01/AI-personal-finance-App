"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Target,
  ArrowUpRight, Plus, RefreshCw, Loader2,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"
import { useFinanceStore } from "@/store/finance"
import { TransactionRow } from "@/components/finance/transaction-row"
import { AmountDisplay } from "@/components/finance/amount-display"
import { AddTransactionFab } from "@/components/finance/add-transaction-fab"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ── Indian number formatter ──────────────────────────────────────────────────
const inr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

// ── Custom tooltip for charts ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {inr(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, amount, type, icon: Icon, sub, iconBg,
}: {
  label: string; amount: number; type: "income" | "expense" | "neutral";
  icon: React.FC<{ className?: string }>; sub?: string; iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <AmountDisplay amount={amount} type={type} size="lg" showSign={false} />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { dashboardData, dashboardLoading, fetchDashboard } = useFinanceStore()
  const d = dashboardData

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (dashboardLoading && !d) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  const tm = d?.thisMonth
  const fw = d?.financialYear

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {d?.period.month} · {d?.period.fy}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="dashboard-refresh"
            variant="ghost"
            size="icon"
            onClick={fetchDashboard}
            disabled={dashboardLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${dashboardLoading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/transactions/new">
            <Button id="dashboard-add-txn" className="hidden sm:flex gap-2">
              <Plus className="h-4 w-4" /> Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Net worth hero ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-teal-600 p-6 text-white shadow-xl shadow-primary/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">Net Worth</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {d ? inr(d.netWorth.amount) : "—"}
          </p>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <p className="text-white/60">Assets</p>
              <p className="font-semibold">{d ? inr(d.netWorth.assetsCents / 100) : "—"}</p>
            </div>
            <div>
              <p className="text-white/60">Liabilities</p>
              <p className="font-semibold">{d ? inr(d.netWorth.liabilitiesCents / 100) : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── This-month stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Income"
          amount={tm?.income ?? 0}
          type="income"
          icon={TrendingUp}
          iconBg="bg-emerald-500/10 text-emerald-500"
          sub={`${d?.period.month}`}
        />
        <StatCard
          label="Expenses"
          amount={tm?.expense ?? 0}
          type="expense"
          icon={TrendingDown}
          iconBg="bg-rose-500/10 text-rose-500"
          sub={`${d?.period.month}`}
        />
        <StatCard
          label="Savings"
          amount={tm?.savings ?? 0}
          type={(tm?.savings ?? 0) >= 0 ? "income" : "expense"}
          icon={PiggyBank}
          iconBg="bg-violet-500/10 text-violet-500"
          sub={tm ? `${tm.savingsRate}% savings rate` : undefined}
        />
        <StatCard
          label="FY Income"
          amount={fw?.income ?? 0}
          type="income"
          icon={Wallet}
          iconBg="bg-blue-500/10 text-blue-500"
          sub={fw?.label}
        />
      </div>

      {/* ── Savings rate bar ─────────────────────────────────────────────── */}
      {tm && tm.income > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Savings Rate</span>
              <span className={`text-sm font-bold ${tm.savingsRate >= 20 ? "text-emerald-500" : tm.savingsRate >= 10 ? "text-amber-500" : "text-rose-500"}`}>
                {tm.savingsRate}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${tm.savingsRate >= 20 ? "bg-emerald-500" : tm.savingsRate >= 10 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.max(0, tm.savingsRate))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Saved {inr(tm.savings)} of {inr(tm.income)} earned this month
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Cash flow — area chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Cash Flow</CardTitle>
            <CardDescription>Last 6 months · Income vs Expenses</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {d?.cashFlow.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.cashFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending by category — pie */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Spending by Category</CardTitle>
            <CardDescription>{d?.period.month} · Top categories</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {d?.categorySpend.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={d.categorySpend}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={44}
                    paddingAngle={2}
                  >
                    {d.categorySpend.map((item, i) => (
                      <Cell key={i} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => inr(Number(value ?? 0))}
                    contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value, entry) => (
                      <span className="text-xs text-foreground">
                        {/* @ts-ignore */}
                        {entry.payload?.icon} {value}
                      </span>
                    )}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No expense data this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly bar chart ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Monthly Net Savings</CardTitle>
          <CardDescription>Income minus Expenses · last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {d?.cashFlow.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.cashFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="net"
                  name="Net Savings"
                  radius={[6, 6, 0, 0]}
                >
                  {d.cashFlow.map((entry, i) => (
                    <Cell key={i} fill={entry.net >= 0 ? "#10B981" : "#F43F5E"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">No data yet</div>
          )}
        </CardContent>
      </Card>

      {/* ── Account balances quick view ───────────────────────────────────── */}
      {d?.accounts && d.accounts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Accounts</CardTitle>
              <Link href="/accounts">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {d.accounts.slice(0, 5).map((acc) => (
              <div key={acc._id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: acc.color + "20" }}
                  >
                    {acc.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{acc.type}</p>
                  </div>
                </div>
                <AmountDisplay
                  amount={acc.balance}
                  type={acc.balance >= 0 ? "neutral" : "expense"}
                  size="sm"
                  showSign={false}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Recent transactions ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {d?.recentTransactions.length ? (
            <div className="divide-y divide-border/50">
              {d.recentTransactions.map((t) => (
                <TransactionRow key={t._id} transaction={t} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No transactions yet.{" "}
              <Link href="/transactions/new" className="text-primary underline underline-offset-2">
                Add your first one
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Budget / Goals placeholders ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Budgets", desc: "Set monthly spending limits", href: "/budgets", icon: "📊" },
          { label: "Goals", desc: "Track savings goals", href: "/goals", icon: "🎯" },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Coming soon →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AddTransactionFab />
    </div>
  )
}
