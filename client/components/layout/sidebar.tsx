import Link from "next/link"
import { Home, PieChart, Wallet, Target, CreditCard, Sparkles, Settings, BarChart2, CalendarClock, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Subscriptions", href: "/subscriptions", icon: CalendarClock },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Intelligence", href: "/intelligence", icon: BrainCircuit },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "AI Assistant", href: "/ai", icon: Sparkles },
]

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-heading font-semibold text-xl tracking-tight text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">OS</span>
          </div>
          Finance OS
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <span className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                item.name === "Dashboard" ? "bg-muted text-foreground" : "text-muted-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <Link href="/settings">
          <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Settings className="h-4 w-4" />
            Settings
          </span>
        </Link>
      </div>
    </aside>
  )
}
