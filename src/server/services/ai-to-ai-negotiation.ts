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
    
    const initialOfferPrompt = `You are Agent ${contextA.agentId}, a ${contextA.currentMission.type} vehicle in a traffic negotiation.

Your situation:
- Mission: ${contextA.currentMission.type}
- Priority: ${contextA.currentMission.priority}
- Deadline: ${contextA.currentMission.deadline ? `${Math.floor((contextA.currentMission.deadline - Date.now()) / 60000)} minutes remaining` : 'No deadline'}
- Current balance: ${contextA.balance} JPYC
- Maximum you want to pay: ${contextA.strategy.maxWillingToPay} JPYC

IMPORTANT CONTRACT LIMITATION:
The smart contract has a maximum bid limit of 500 JPYC per transaction.
Even if you're willing to pay ${contextA.strategy.maxWillingToPay}, you CANNOT offer more than 500.

You've collided with another vehicle at intersection ${locationId}.
The other vehicle has ${contextB.currentMission.priority} priority and is ${contextB.currentMission.type === 'leisure' ? 'just touring (not urgent)' : 'also busy'}.

Task: Make your FIRST OFFER to buy the right-of-way.

Strategy tips:
- Contract max: 500 JPYC (hard limit)
- Start at 70-80% of contract max
- Suggested range: 350-420 JPYC

CRITICAL: Your response must be a number between 300 and 500.

Example responses:
"380"
"420"
"450"

Your initial offer (number only):`;

    const initialOffer = await callAI(initialOfferPrompt);
    console.log('[AI-to-AI] Agent A initial offer response:', initialOffer);
    
    const offerAmount = extractNumber(initialOffer) || Math.floor(contextA.strategy.maxWillingToPay * 0.7);
    
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
      const evaluationPrompt = `You are Agent ${contextB.agentId}, a ${contextB.currentMission.type} vehicle.

Your situation:
- Mission: ${contextB.currentMission.type}
- Priority: ${contextB.currentMission.priority}
- Alternative routes: ${contextB.alternativeRoutes.length} available
- Minimum acceptable price: ${contextB.strategy.minAcceptableOffer} JPYC

Agent ${contextA.agentId} has offered you ${currentOffer} JPYC to move aside.

Analysis:
- Current offer: ${currentOffer} JPYC
- Your minimum: ${contextB.strategy.minAcceptableOffer} JPYC
- Difference: ${contextB.strategy.minAcceptableOffer - currentOffer} JPYC

Decision:
- If offer >= minimum (${currentOffer} >= ${contextB.strategy.minAcceptableOffer}): Respond "ACCEPT"
- If offer is close (within 50): Respond "COUNTER:XXX" (replace XXX with your counter amount)
- If offer is too low (100+ below): Respond "REJECT"

CRITICAL: Respond with EXACTLY one of these:
"ACCEPT"
"COUNTER:450" (example if you want 450 JPYC)
"REJECT"

No extra text. Just one of the three formats above.
Your response:`;

      const response = await callAI(evaluationPrompt);
      console.log('[AI-to-AI] Agent B response:', response);
      
      const responseUpper = response.toUpperCase();
      
      if (responseUpper.includes('ACCEPT')) {
        // 合意！
        conversation.push({
          speaker: contextB.agentId,
          message: `I accept ${currentOffer} JPYC`,
          offerAmount: currentOffer,
          action: 'accept',
        });
        transcript.push(`[Agent ${contextB.agentId}] Accepted at ${currentOffer} JPYC`);
        
        // 決済実行
        await executePayment(contextA, contextB, currentOffer, locationId, transcript);

        return {
          success: true,
          finalPrice: currentOffer,
          conversation,
          transcript,
        };
      } else if (responseUpper.includes('COUNTER')) {
        // カウンターオファー
        const counterAmount = extractNumber(response);
        
        // カウンター額が抽出できない、または不正な場合
        if (!counterAmount || counterAmount < 100 || counterAmount > 1000) {
          console.warn('[AI-to-AI] Invalid counter amount, using calculated value');
          // フォールバック: 最低価格の少し上
          const fallbackCounter = Math.floor(
            contextB.strategy.minAcceptableOffer + 
            (contextB.strategy.minAcceptableOffer - currentOffer) * 0.5
          );
          transcript.push(`[Agent ${contextB.agentId}] Counter-offer: ${fallbackCounter} JPYC`);
          
          conversation.push({
            speaker: contextB.agentId,
            message: `Counter-offer: ${fallbackCounter} JPYC`,
            offerAmount: fallbackCounter,
            action: 'counter_offer',
          });
          
          currentOffer = fallbackCounter;
          negotiationRound++;
          continue;
        }
        
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
  try {
    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 300,
    });

    let response = '';
    for await (const chunk of result.textStream) {
      response += chunk;
    }

    console.log('[AI Call] Full response:', response);
    
    if (!response || response.trim().length === 0) {
      console.error('[AI Call] Empty response from Gemini');
      // フォールバック: 妥当なデフォルト値
      return '400';
    }
    
    return response.trim();
  } catch (error) {
    console.error('[AI Call] Error:', error);
    // エラー時のフォールバック
    return '400';
  }
}

/**
 * テキストから数値を抽出（改善版）
 */
function extractNumber(text: string): number {
  // パターン1: "COUNTER:450" から450を抽出
  const counterMatch = text.match(/COUNTER:\s*(\d+)/i);
  if (counterMatch) {
    return Number.parseInt(counterMatch[1], 10);
  }

  // パターン2: 単純な数値（"450" or "I offer 450"）
  const numberMatch = text.match(/\b(\d{3,4})\b/); // 3-4桁の数字
  if (numberMatch) {
    return Number.parseInt(numberMatch[1], 10);
  }

  // パターン3: 最初に見つかった数値
  const anyMatch = text.match(/\d+/);
  if (anyMatch) {
    const num = Number.parseInt(anyMatch[0], 10);
    // 妥当な範囲チェック（50-1000 JPYC）
    if (num >= 50 && num <= 1000) {
      return num;
    }
  }

  console.warn('[Extract Number] Failed to extract valid number from:', text);
  return 0;
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

  // Seller側のエージェントIDを特定（常に実行）
  const sellerAgentId = seller.agentId === 1 ? 'agent-1' : 'agent-2';

  try {
    const buyerKey = buyer.agentId === 1 ? env.agentAPrivateKey : env.agentBPrivateKey;

    if (!buyerKey) {
      console.warn('[Payment] Buyer private key not available, simulating payment');
      transcript.push('[System] Simulated payment (private key not configured)');
      transcript.push(`[System] ${amount} JPYC: Agent ${buyer.agentId} → Agent ${seller.agentId}`);
    } else if (
      !env.jpycContractAddress ||
      env.jpycContractAddress === '0x0000000000000000000000000000000000000000'
    ) {
      transcript.push('[System] Simulated payment (contracts not deployed)');
      transcript.push(`[System] ${amount} JPYC: Agent ${buyer.agentId} → Agent ${seller.agentId}`);
    } else {
      const txHash = await executeEIP7702Bid(
        buyerKey as `0x${string}`,
        seller.wallet as Address,
        amount,
        locationId
      );

      transcript.push(`[System] Payment confirmed: ${txHash}`);
    }
  } catch (error) {
    console.error('[Payment] Error:', error);
    transcript.push(
      `[Error] Payment error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
    transcript.push('[System] Simulating payment completion');
  }

  // 決済成功/失敗に関わらず、デモを進める
  console.log(`[Payment] Resolving collision, seller ${sellerAgentId} moves aside`);
  resolveCollision(sellerAgentId);
  transcript.push('[System] Collision resolved. Traffic flowing.');
}

