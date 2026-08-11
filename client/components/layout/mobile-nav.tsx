import Link from "next/link"
import { Home, PieChart, Sparkles, CreditCard, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t bg-background/80 backdrop-blur-lg lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <Link href="/dashboard" className="flex flex-col items-center justify-center gap-1 text-primary">
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/transactions" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
          <CreditCard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Txns</span>
        </Link>
        <div className="relative -top-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
        <Link href="/budgets" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
          <PieChart className="h-5 w-5" />
          <span className="text-[10px] font-medium">Budget</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </Link>
      </div>
    </div>
  )
}
