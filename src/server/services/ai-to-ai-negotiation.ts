import 'server-only';

import { streamText } from 'ai';
import { google, GEMINI_MODEL } from '../lib/vertex-ai';
import { getVercelAITools } from '@/mcp-server';
import { resolveCollision } from './traffic-simulation';
import { executeEIP7702Bid } from '../lib/eip-7702';
import { env } from '../config/env';
import type { AgentContext } from '@/types/agent-context';
import type { Address } from 'viem';

/**
 * 本物のAI-to-AIネゴシエーション
 * 
 * 2つのAIエージェントが実際に会話を通じて価格を交渉する
 * 人間のネゴシエーションをシミュレート
 */

interface ConversationTurn {
  speaker: number; // agentId
  message: string;
  offerAmount: number | null;
  action: 'initial_offer' | 'counter_offer' | 'accept' | 'reject';
}

export async function negotiateAItoAI(
  contextA: AgentContext,
  contextB: AgentContext,
  locationId: string
): Promise<{
  success: boolean;
  finalPrice: number | null;
  conversation: ConversationTurn[];
  transcript: string[];
}> {
  console.log('[AI-to-AI] Starting real negotiation between agents...');
  
  const conversation: ConversationTurn[] = [];
  const transcript: string[] = [];
  const maxRounds = 5; // 最大5往復

  try {
    // ===== Round 1: Agent A が初回オファー =====
    transcript.push('[System] Agent A making initial offer...');
    
    const initialOfferPrompt = `You are Agent ${contextA.agentId} in a traffic negotiation.

Your situation:
- Mission: ${contextA.currentMission.type} (Priority: ${contextA.currentMission.priority})
- Deadline: ${contextA.currentMission.deadline ? `${Math.floor((contextA.currentMission.deadline - Date.now()) / 60000)} min` : 'None'}
- Balance: ${contextA.balance} JPYC
- Max willing to pay: ${contextA.strategy.maxWillingToPay} JPYC

You've collided with Agent ${contextB.agentId} at ${locationId}.
The other agent has low priority and alternatives available.

Make your INITIAL OFFER to purchase the right-of-way.
Be strategic: Start lower than your maximum to leave room for negotiation.

Respond with ONLY a number (the JPYC amount you're offering). Example: "380"`;

    const initialOffer = await callAI(initialOfferPrompt);
    const offerAmount = extractNumber(initialOffer);
    
    conversation.push({
      speaker: contextA.agentId,
      message: `I offer ${offerAmount} JPYC to pass`,
      offerAmount,
      action: 'initial_offer',
    });
    transcript.push(`[Agent ${contextA.agentId}] Initial offer: ${offerAmount} JPYC`);

    // ===== Round 2: Agent B が評価・応答 =====
    let currentOffer = offerAmount;
    let negotiationRound = 1;

    while (negotiationRound <= maxRounds) {
      transcript.push(`[System] Negotiation round ${negotiationRound}...`);

      // Agent Bがオファーを評価
      const evaluationPrompt = `You are Agent ${contextB.agentId} in a traffic negotiation.

Your situation:
- Mission: ${contextB.currentMission.type} (Priority: ${contextB.currentMission.priority})
- You have ${contextB.alternativeRoutes.length} alternative routes
- Minimum acceptable: ${contextB.strategy.minAcceptableOffer} JPYC

Agent ${contextA.agentId} has offered ${currentOffer} JPYC to purchase your position.

Options:
1. ACCEPT if the offer is >= your minimum
2. COUNTER-OFFER if too low (but close)
3. REJECT if way too low

Respond in this format:
- If accepting: "ACCEPT"
- If counter-offering: "COUNTER:<amount>" (example: "COUNTER:450")
- If rejecting: "REJECT"

Be strategic but reasonable.`;

      const response = await callAI(evaluationPrompt);
      
      if (response.includes('ACCEPT')) {
        // 合意！
        conversation.push({
          speaker: contextB.agentId,
          message: `I accept ${currentOffer} JPYC`,
          offerAmount: currentOffer,
          action: 'accept',
        });
        transcript.push(`[Agent ${contextB.agentId}] ✅ Accepted at ${currentOffer} JPYC`);
        
        // 決済実行
        await executePayment(contextA, contextB, currentOffer, locationId, transcript);

        return {
          success: true,
          finalPrice: currentOffer,
          conversation,
          transcript,
        };
      } else if (response.includes('COUNTER:')) {
        // カウンターオファー
        const counterAmount = extractNumber(response.replace('COUNTER:', ''));
        
        conversation.push({
          speaker: contextB.agentId,
          message: `Counter-offer: ${counterAmount} JPYC`,
          offerAmount: counterAmount,
          action: 'counter_offer',
        });
        transcript.push(`[Agent ${contextB.agentId}] Counter-offer: ${counterAmount} JPYC`);

        // Agent Aがカウンターオファーを評価
        const buyerResponsePrompt = `You are Agent ${contextA.agentId}.

You offered ${currentOffer} JPYC.
Agent ${contextB.agentId} counter-offered ${counterAmount} JPYC.

Your max budget: ${contextA.strategy.maxWillingToPay} JPYC.

Options:
1. ACCEPT if reasonable
2. COUNTER:<amount> if you want to negotiate further
3. REJECT if too high

Respond:`;

        const buyerResponse = await callAI(buyerResponsePrompt);

        if (buyerResponse.includes('ACCEPT')) {
          conversation.push({
            speaker: contextA.agentId,
            message: `I accept ${counterAmount} JPYC`,
            offerAmount: counterAmount,
            action: 'accept',
          });
          transcript.push(`[Agent ${contextA.agentId}] ✅ Accepted at ${counterAmount} JPYC`);

          await executePayment(contextA, contextB, counterAmount, locationId, transcript);

          return {
            success: true,
            finalPrice: counterAmount,
            conversation,
            transcript,
          };
        } else if (buyerResponse.includes('COUNTER:')) {
          currentOffer = extractNumber(buyerResponse.replace('COUNTER:', ''));
          conversation.push({
            speaker: contextA.agentId,
            message: `Counter-offer: ${currentOffer} JPYC`,
            offerAmount: currentOffer,
            action: 'counter_offer',
          });
          transcript.push(`[Agent ${contextA.agentId}] Counter-offer: ${currentOffer} JPYC`);
        } else {
          // Reject
          transcript.push(`[Agent ${contextA.agentId}] ❌ Rejected`);
          break;
        }
      } else {
        // Reject
        transcript.push(`[Agent ${contextB.agentId}] ❌ Rejected offer`);
        break;
      }

      negotiationRound++;
    }

    transcript.push('[System] ❌ No agreement reached after multiple rounds');
    return {
      success: false,
      finalPrice: null,
      conversation,
      transcript,
    };
  } catch (error) {
    console.error('[AI-to-AI] Negotiation error:', error);
    transcript.push(`[Error] ${error instanceof Error ? error.message : 'Unknown'}`);

    return {
      success: false,
      finalPrice: null,
      conversation,
      transcript,
    };
  }
}

/**
 * AIを呼び出してテキスト応答を取得
 */
async function callAI(prompt: string): Promise<string> {
  const result = await streamText({
    model: google(GEMINI_MODEL),
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.0,
    maxTokens: 100,
  });

  let response = '';
  for await (const chunk of result.textStream) {
    response += chunk;
  }

  console.log('[AI Call] Response:', response);
  return response.trim();
}

/**
 * テキストから数値を抽出
 */
function extractNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

/**
 * 決済実行
 */
async function executePayment(
  buyer: AgentContext,
  seller: AgentContext,
  amount: number,
  locationId: string,
  transcript: string[]
): Promise<void> {
  transcript.push(`[System] Executing payment: ${amount} JPYC...`);

  try {
    const buyerKey = buyer.agentId === 1 ? env.agentAPrivateKey : env.agentBPrivateKey;

    if (!buyerKey) {
      throw new Error('Buyer private key not available');
    }

    if (
      !env.jpycContractAddress ||
      env.jpycContractAddress === '0x0000000000000000000000000000000000000000'
    ) {
      transcript.push('[System] ⚠️ Simulated payment (contracts not deployed)');
    } else {
      const txHash = await executeEIP7702Bid(
        buyerKey as `0x${string}`,
        seller.wallet as Address,
        amount,
        locationId
      );

      transcript.push(`[System] ✅ Payment confirmed: ${txHash}`);
    }

    // 道を譲る
    const sellerAgentId = seller.agentId === 1 ? 'agent-1' : 'agent-2';
    resolveCollision(sellerAgentId);
    transcript.push('[System] Collision resolved. Traffic flowing.');
  } catch (error) {
    transcript.push(
      `[Error] Payment failed: ${error instanceof Error ? error.message : 'Unknown'}`
    );

    if (process.env.NODE_ENV === 'development') {
      transcript.push('[System] Continuing demo (development mode)');
      const sellerAgentId = seller.agentId === 1 ? 'agent-1' : 'agent-2';
      resolveCollision(sellerAgentId);
    }
  }
}

