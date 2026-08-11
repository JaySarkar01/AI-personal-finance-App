"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowDownLeft, ArrowRight, ArrowUpRight, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Transaction } from "@/lib/types"
import { AmountDisplay } from "@/components/finance/amount-display"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TransactionRowProps {
  transaction: Transaction
  onEdit?: (t: Transaction) => void
  onDelete?: (t: Transaction) => void
}

const typeConfig = {
  income: {
    icon: ArrowDownLeft,
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconClass: "text-emerald-500",
  },
  expense: {
    icon: ArrowUpRight,
    bgClass: "bg-rose-500/10 dark:bg-rose-500/15",
    iconClass: "text-rose-500",
  },
  transfer: {
    icon: ArrowRight,
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    iconClass: "text-blue-500",
  },
}

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = typeConfig[transaction.type]
  const Icon = cfg.icon

  return (
    <div
      id={`transaction-${transaction._id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
    >
      {/* Type icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bgClass}`}>
        {transaction.category?.icon ? (
          <span className="text-lg">{transaction.category.icon}</span>
        ) : (
          <Icon className={`h-5 w-5 ${cfg.iconClass}`} />
        )}
      </div>

      {/* Description + meta */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {transaction.description}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {transaction.category && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: transaction.category.color + "20",
                color: transaction.category.color,
              }}
            >
              {transaction.category.name}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {transaction.account.name}
          </span>
          {transaction.toAccount && (
            <>
              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {transaction.toAccount.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Date + amount */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <AmountDisplay
          amount={transaction.amount}
          type={transaction.type}
          size="md"
          showSign
        />
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(transaction.date), "dd/MM/yyyy")}
        </span>
      </div>

      {/* Actions menu */}
      {(onEdit || onDelete) && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Transaction options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onEdit && (
              <DropdownMenuItem onClick={() => { onEdit(transaction); setMenuOpen(false) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { onDelete(transaction); setMenuOpen(false) }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
