"use client"

import { useState } from "react"
import { Archive, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Account } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ACCOUNT_TYPE_META: Record<string, { gradient: string; shadow: string }> = {
  Cash:          { gradient: "from-emerald-500 to-teal-600",   shadow: "shadow-emerald-500/20" },
  Bank:          { gradient: "from-blue-500 to-indigo-600",    shadow: "shadow-blue-500/20" },
  Savings:       { gradient: "from-violet-500 to-purple-600",  shadow: "shadow-violet-500/20" },
  "Credit Card": { gradient: "from-rose-500 to-pink-600",      shadow: "shadow-rose-500/20" },
  Wallet:        { gradient: "from-amber-500 to-orange-600",   shadow: "shadow-amber-500/20" },
  Investment:    { gradient: "from-cyan-500 to-sky-600",       shadow: "shadow-cyan-500/20" },
  Other:         { gradient: "from-slate-500 to-gray-600",     shadow: "shadow-slate-500/20" },
}

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onArchive: (account: Account) => void
}

export function AccountCard({ account, onEdit, onDelete, onArchive }: AccountCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = ACCOUNT_TYPE_META[account.type] ?? ACCOUNT_TYPE_META.Other

  const isNegative = account.balance < 0

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} p-5 text-white shadow-lg ${meta.shadow} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
    >
      {/* Glassmorphism orbs */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-black/10 blur-xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{account.icon}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
              {account.type}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold leading-tight">{account.name}</h3>
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="Account options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => { onEdit(account); setMenuOpen(false) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onArchive(account); setMenuOpen(false) }}>
              <Archive className="mr-2 h-4 w-4" />
              {account.isArchived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { onDelete(account); setMenuOpen(false) }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-6">
        <p className="text-xs text-white/60">Balance</p>
        <p className={`text-3xl font-bold tabular-nums ${isNegative ? "text-rose-200" : "text-white"}`}>
          {account.currency === "INR" ? "₹" : account.currency}{" "}
          {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Math.abs(account.balance))}
        </p>
        {isNegative && (
          <span className="mt-1 inline-block rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
            Overdue
          </span>
        )}
      </div>

      {!account.includeInTotal && (
        <div className="relative mt-3 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
          Excluded from net worth
        </div>
      )}
    </div>
  )
}
