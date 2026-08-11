import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function ErrorState({ 
  className, 
  title = "Something went wrong", 
  description = "There was an error loading this data. Please try again.", 
  action,
  ...props 
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-destructive/20 bg-destructive/5", className)} {...props}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mt-4 text-lg font-heading font-semibold text-destructive">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
