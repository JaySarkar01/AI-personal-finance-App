const { GoogleGenAI } = require('@google/genai');

// Simple in-memory cache for AI responses
const aiCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of aiCache.entries()) {
    if (now > value.expiresAt) {
      aiCache.delete(key);
    }
  }
}, 1000 * 60 * 15).unref();

/**
 * Smart local fallback response generator when Gemini API is unavailable or key is invalid.
 */
function generateFallbackResponse(prompt) {
  const p = prompt.toLowerCase();

  // 1. Budget Advice
  if (p.includes('budget:') || p.includes('budget limit')) {
    const nameMatch = prompt.match(/Budget:\s*([^\n]+)/i);
    const budgetName = nameMatch ? nameMatch[1].trim() : 'this category';
    
    if (p.includes('exceeded')) {
      return `• You've exceeded your budget for ${budgetName}. Pause non-essential purchases in this category for the rest of the month.
• Review your recent transactions to pinpoint leakages and prevent future overspending.
• Adjust next month's limit if this reflects a recurring baseline expense.`;
    } else if (p.includes('warning')) {
      return `• You're approaching your limit for ${budgetName}. Keep a close watch on upcoming expenses here.
• Set a daily spending cap for the remaining days of the month to stay within bounds.
• Consider deferring non-urgent purchases to next month.`;
    } else {
      return `• Great discipline! You're on track with your ${budgetName} budget.
• Maintain this spending rate to finish the month with a healthy surplus.
• Consider redirecting any leftover funds at month-end into your high-priority savings goals.`;
    }
  }

  // 2. Goal Coach
  if (p.includes('goal:') || p.includes('savings goal')) {
    const nameMatch = prompt.match(/Goal:\s*([^\n]+)/i);
    const goalName = nameMatch ? nameMatch[1].trim() : 'your goal';
    
    return `• Stay consistent! Regular contributions to "${goalName}" will build strong momentum.
• Set up an automatic recurring transfer on payday so you save before spending.
• Any unexpected windfalls or bonus income can be allocated here to reach your milestone faster.`;
  }

  // 3. Subscription Optimization
  if (p.includes('subscription:') || p.includes('recurring payment') || p.includes('ott') || p.includes('explain')) {
    return `• Review how frequently you use this service to ensure you're getting full value for the recurring cost.
• Check if an annual plan is available, which typically offers a 15-20% discount over monthly billing.
• Set a calendar reminder before the next renewal date to evaluate whether to continue or cancel.`;
  }

  // 4. Intelligence Explanation
  if (p.includes('health score:') || p.includes('financial intelligence')) {
    const scoreMatch = prompt.match(/Health Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;
    
    if (score >= 80) {
      return `• Excellent financial health score of ${score}/100! Your savings rate and emergency fund liquidity are solid.
• Continue keeping discretionary spending disciplined to maintain strong positive cash flow.
• Focus on investing your monthly surplus into long-term growth options.`;
    } else if (score >= 50) {
      return `• Fair financial health score of ${score}/100. You have a decent foundation but room for optimization.
• Work on building a 3 to 6-month emergency reserve to improve your liquidity buffer.
• Monitor category spending trends to curb impulse expenses and boost your savings rate.`;
    } else {
      return `• Your health score is ${score}/100. Priority action is needed to improve cash flow stability.
• Start by trimming non-essential recurring bills and sticking strictly to monthly category budgets.
• Focus on accumulating a basic emergency reserve first before making large discretionary spends.`;
    }
  }

  // 5. Categorization Fallback
  if (p.includes('transaction description:') || p.includes('category id:')) {
    return 'NULL';
  }

  // 6. AI Chat Assistant
  if (p.includes('user question:')) {
    const qMatch = prompt.match(/User Question:\s*([\s\S]+?)(?:\n\nAnswer:|$)/i);
    const question = qMatch ? qMatch[1].trim().toLowerCase() : p;

    if (question.includes('save') || question.includes('saving')) {
      return `Here are key strategies to boost your savings:

1. **Follow the 50/30/20 Rule**: Allocate 50% of income to Needs, 30% to Wants, and at least 20% to Savings.
2. **Automate Savings**: Set up auto-debit to your savings/investment account on payday.
3. **Cut Invisible Leaks**: Review recurring subscriptions and minor daily expenses that add up over time.
4. **Build Emergency Fund**: Keep 3-6 months of essential expenses in a liquid savings account before aggressive investing.`;
    }

    if (question.includes('budget') || question.includes('limit')) {
      return `To create an effective budget:

1. **Track First**: Log all your expenses for a month to understand your baseline spending.
2. **Set Realistic Limits**: Assign monthly caps per category (Groceries, Dining Out, Entertainment).
3. **Use Category Cards**: Monitor spending bars regularly to catch overspending before month-end.
4. **Adjust Monthly**: Review variances at the end of each month and refine your limits.`;
    }

    if (question.includes('invest') || question.includes('investment') || question.includes('stock') || question.includes('fd') || question.includes('mutual')) {
      return `Here is a disciplined approach to investing:

1. **Safety First**: Ensure you have an emergency fund and adequate health/life insurance before investing.
2. **Start SIPs**: Systematic Investment Plans (SIPs) in mutual funds help compound wealth over time.
3. **Diversify**: Balance your portfolio across fixed return (PPF/FD) and equity investments based on your risk tolerance.
4. **Long Term Focus**: Avoid timing the market; consistent regular investing yields the best results.`;
    }

    if (question.includes('debt') || question.includes('loan') || question.includes('credit card') || question.includes('emi')) {
      return `Here is a plan to manage and pay off debt:

1. **High-Interest First (Avalanche)**: Prioritize clearing high-interest debts like credit card balances first.
2. **Avoid Minimum Payments**: Always pay your credit card bill in full to avoid heavy interest charges.
3. **Consolidate EMIs**: Ensure total monthly EMI obligations don't exceed 30-40% of net income.
4. **Pause New Debt**: Avoid taking new loans or buying non-essentials on EMI until existing debts are manageable.`;
    }

    return `Based on sound personal finance principles:

• **Cash Flow Management**: Ensure your total monthly expenses stay below 70-80% of net income.
• **Emergency Reserve**: Maintain at least 3 to 6 months of living expenses in an easily accessible account.
• **Goal Tracking**: Link savings directly to specific milestones (Emergency Fund, Vacation, Investments) to stay motivated.
• **Regular Audits**: Review your budgets, recurring subscriptions, and transaction stats weekly to stay in full control.`;
  }

  // Default fallback
  return `• Focus on maintaining a positive monthly cash flow by keeping expenses below income.
• Automate savings on payday to stay disciplined towards your long-term goals.
• Regularly audit subscriptions and discretionary spend to catch money leaks early.`;
}

/**
 * Generate content using Gemini with fallback model list and local fallback response.
 * @param {string} prompt - The prompt to send.
 * @param {boolean} bypassCache - If true, ignores the cache.
 * @returns {Promise<string>}
 */
exports.generateContent = async (prompt, bypassCache = false) => {
  try {
    const cacheKey = Buffer.from(prompt).toString('base64');
    
    if (!bypassCache && aiCache.has(cacheKey)) {
      const cached = aiCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return cached.text;
      } else {
        aiCache.delete(cacheKey);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    // Check if API key is present and looks like a standard Gemini API key (starts with AIzaSy)
    if (apiKey && apiKey.startsWith('AIzaSy')) {
      const ai = new GoogleGenAI({ apiKey });
      
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          
          if (result && result.text) {
            const text = result.text;
            aiCache.set(cacheKey, {
              text,
              expiresAt: Date.now() + CACHE_TTL
            });
            return text;
          }
        } catch (modelErr) {
          console.warn(`Gemini model ${modelName} failed:`, modelErr.message);
        }
      }
    }
  } catch (error) {
    console.error('AI Generation API Error:', error.message);
  }

  // Fallback to intelligent local AI generator
  const fallbackText = generateFallbackResponse(prompt);
  return fallbackText;
};

