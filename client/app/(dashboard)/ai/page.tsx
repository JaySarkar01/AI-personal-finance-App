"use client"

import { useState } from "react"
import { Sparkles, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import api from "@/lib/api"
import { useFinanceStore } from "@/store/finance"

export default function AIChatPage() {
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<{ role: "user" | "ai"; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const { dashboardData } = useFinanceStore()

  const handleSend = async () => {
    if (!question.trim()) return
    const currentQ = question
    setQuestion("")
    setHistory((prev) => [...prev, { role: "user", text: currentQ }])
    setLoading(true)

    try {
      // Send compact summary as context, NEVER raw transactions
      const context = dashboardData ? {
        netWorth: dashboardData.netWorth.amount,
        thisMonth: { income: dashboardData.thisMonth.income, expense: dashboardData.thisMonth.expense, savingsRate: dashboardData.thisMonth.savingsRate },
        categorySpend: dashboardData.categorySpend.map((c: any) => ({ name: c.name, amount: c.amount }))
      } : null;

      const { data } = await api.post("/ai/chat", { question: currentQ, context })
      
      if (data.success && data.answer) {
        setHistory((prev) => [...prev, { role: "ai", text: data.answer }])
      } else {
        setHistory((prev) => [...prev, { role: "ai", text: data.message || "Sorry, I am currently unavailable. Please try again later." }])
      }
    } catch {
      setHistory((prev) => [...prev, { role: "ai", text: "Sorry, I am currently unavailable. Please try again later." }])
      toast.error("AI service error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Financial Assistant</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ask questions about your spending and habits</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-muted/20 border-border/50">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 text-primary/30" />
              <p className="text-sm">Hi! I can help you analyze your spending habits, suggest savings tips, and review your budget.</p>
              <p className="text-xs mt-2 opacity-70">Calculations are done on the backend for accuracy. I focus on insights.</p>
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm whitespace-pre-line ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-card border text-foreground shadow-sm rounded-tl-sm"
              }`}>
                {msg.role === "ai" && <Sparkles className="h-4 w-4 mb-2 text-primary" />}
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card border text-foreground shadow-sm p-4 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Thinking…
              </div>
            </div>
          )}
        </CardContent>
        
        <div className="p-4 bg-card border-t">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your finances..."
              className="pr-12 rounded-full h-12 bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              disabled={loading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!question.trim() || loading}
              className="absolute right-1.5 h-9 w-9 rounded-full transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            AI can make mistakes. Always verify important financial decisions.
          </p>
        </div>
      </Card>
    </div>
  )
}
