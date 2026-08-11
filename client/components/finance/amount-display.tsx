import { cn } from "@/lib/utils"

interface AmountDisplayProps {
  amount: number
  type?: "income" | "expense" | "transfer" | "neutral"
  currency?: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showSign?: boolean
  format?: "standard" | "short"
}

export function AmountDisplay({
  amount,
  type = "neutral",
  currency = "₹",
  className,
  size = "md",
  showSign = true,
  format = "standard",
}: AmountDisplayProps) {
  let formatted = "";
  const absAmount = Math.abs(amount);

  if (format === "short" && absAmount >= 100000) {
    if (absAmount >= 10000000) {
      formatted = (absAmount / 10000000).toFixed(2).replace(/\.00$/, '') + "Cr";
    } else {
      formatted = (absAmount / 100000).toFixed(2).replace(/\.00$/, '') + "L";
    }
  } else {
    formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: format === "short" ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(absAmount);
  }

  const sign = showSign ? (type === "income" ? "+" : type === "expense" ? "−" : "") : ""

  const colorClass = {
    income: "text-emerald-500 dark:text-emerald-400",
    expense: "text-rose-500 dark:text-rose-400",
    transfer: "text-blue-500 dark:text-blue-400",
    neutral: "text-foreground",
  }[type]

  const sizeClass = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
    xl: "text-2xl font-bold",
  }[size]

  return (
    <span className={cn("tabular-nums font-medium", colorClass, sizeClass, className)}>
      {sign}{currency}{formatted}
    </span>
  )
}
