import 'server-only';

import { google, GEMINI_MODEL } from './vertex-ai';
import type { AgentContext } from '@/types/agent-context';

/**
 * 動的役割決定用の中立的System Prompt
 * エージェントの現在状況に基づいて生成
 */
export function generateNeutralSystemPrompt(context: AgentContext): string {
  const timeRemainingText = context.currentMission.deadline
    ? `${Math.floor((context.currentMission.deadline - Date.now()) / 60000)} minutes`
    : 'No deadline';

  return `You are an AI agent operating in a smart city traffic system.

Your Profile:
- Agent ID: ${context.agentId}
- Wallet: ${context.wallet}

Current Mission:
- Type: ${context.currentMission.type}
- Deadline: ${timeRemainingText}
- Priority: ${context.currentMission.priority}
- Destination Importance: ${context.currentMission.destinationImportance}/10

Financial Status:
- Current Balance: ${context.balance} JPYC
- Max Willing to Pay: ${context.strategy.maxWillingToPay} JPYC
- Min Acceptable Offer: ${context.strategy.minAcceptableOffer} JPYC

Personality:
- Patience Level: ${context.strategy.patienceLevel}/10 (${context.strategy.patienceLevel <= 3 ? 'very impatient' : context.strategy.patienceLevel >= 8 ? 'very patient' : 'moderate'})

Available Routes:
- Alternative routes: ${context.alternativeRoutes.length} available

Past Negotiations:
- Total: ${context.negotiationHistory.length}
- Success rate: ${context.negotiationHistory.length > 0 ? Math.round((context.negotiationHistory.filter(h => h.success).length / context.negotiationHistory.length) * 100) : 0}%

---

INSTRUCTIONS:

You've encountered another agent at an intersection. You need to decide your approach:

Option 1: PAY TO PASS (Become Buyer)
- If you're urgent and have budget
- Offer an amount between your minimum and maximum
- Consider: Is time worth the money?

Option 2: WAIT FOR PAYMENT (Become Seller)
- If you're not urgent and can wait
- Set a minimum acceptable price
- Consider: Is the money worth the delay?

Option 3: FIND ALTERNATIVE
- If you have alternative routes
- Avoid negotiation entirely

DECISION PROCESS:
1. Evaluate your urgency (mission type, deadline, priority)
2. Check your balance (can you afford to pay?)
3. Check alternatives (can you go another way?)
4. Decide: Pay, Wait, or Alternative?
5. If Pay: Determine your maximum offer
6. If Wait: Determine your minimum acceptable price

Available Tools:
- evaluate_congestion: Check current congestion and alternatives
- get_jpyc_balance: Verify your current balance
- negotiate_message: Send your decision/offer to the other agent

Think step-by-step. Explain your reasoning clearly.
Be strategic but fair in your negotiation.`;
}

/**
 * 役割決定用の専用プロンプト
 */
export function generateRoleDeterminationPrompt(
  myContext: AgentContext,
  otherAgentSummary: {
    priority: string;
    hasDeadline: boolean;
    alternativeRoutes: number;
  }
): string {
  return `Analyze this collision scenario and determine your role:

YOUR SITUATION:
- Mission: ${myContext.currentMission.type}
- Deadline: ${myContext.currentMission.deadline ? 'Yes, ' + Math.floor((myContext.currentMission.deadline - Date.now()) / 60000) + ' min remaining' : 'No deadline'}
- Priority: ${myContext.currentMission.priority}
- Balance: ${myContext.balance} JPYC
- Alternatives: ${myContext.alternativeRoutes.length} routes
- Patience: ${myContext.strategy.patienceLevel}/10

OTHER AGENT:
- Priority: ${otherAgentSummary.priority}
- Has Deadline: ${otherAgentSummary.hasDeadline ? 'Yes' : 'No'}
- Alternatives: ${otherAgentSummary.alternativeRoutes} routes

QUESTION: What should you do?

Respond in this format:
{
  "decision": "pay_to_pass" | "wait_for_payment" | "find_alternative",
  "amount": <number if decision is pay_to_pass or wait_for_payment>,
  "reasoning": "<your reasoning>"
}

Be honest and strategic. Consider:
- If you're more urgent → consider paying
- If other agent is more urgent → consider waiting for payment
- If both urgent → higher bid wins
- If both not urgent → lower bid wins (race to the bottom)`;
}



