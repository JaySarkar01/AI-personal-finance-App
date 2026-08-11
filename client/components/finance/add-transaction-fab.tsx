"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

export function AddTransactionFab() {
  return (
    <Link
      href="/transactions/new"
      id="add-transaction-fab"
      aria-label="Add new transaction"
      className={[
        "fixed bottom-20 right-4 z-50 lg:hidden",
        "flex h-14 w-14 items-center justify-center",
        "rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40",
        "transition-all duration-200 hover:scale-110 active:scale-95",
        // Subtle pulse ring
        "before:absolute before:inset-0 before:rounded-full before:bg-primary/30",
        "before:animate-ping before:animation-delay-1000",
      ].join(" ")}
    >
      <Plus className="h-7 w-7 stroke-[2.5]" />
    </Link>
  )
}
