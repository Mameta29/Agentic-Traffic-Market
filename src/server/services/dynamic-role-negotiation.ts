import 'server-only';

import { streamText } from 'ai';
import { google, GEMINI_MODEL } from '../lib/vertex-ai';
import {
  generateNeutralSystemPrompt,
  generateRoleDeterminationPrompt,
} from '../lib/vertex-ai-dynamic';
import { getVercelAITools } from '@/mcp-server';
import { executeEIP7702Bid } from '../lib/eip-7702';
import { resolveCollision } from './traffic-simulation';
import { env } from '../config/env';
import type { AgentContext, SituationEvaluation, NegotiationMatch } from '@/types/agent-context';
import type { Address } from 'viem';

/**
 * 動的役割決定による完全なネゴシエーション
 * 
 * 両エージェントのコンテキストを分析し、AIが自律的に役割を決定
 */
export async function negotiateWithDynamicRoles(
  contextA: AgentContext,
  contextB: AgentContext,
  locationId: string
): Promise<{
  success: boolean;
  buyer: AgentContext | null;
  seller: AgentContext | null;
  agreedPrice: number | null;
  transcript: string[];
}> {
  console.log('[Dynamic Negotiation] Starting role-based negotiation...');
  const transcript: string[] = [];

  try {
    // ===== Phase 1: 両エージェントが状況を評価 =====
    transcript.push('[System] Both agents evaluating collision scenario...');

    const evaluationA = await evaluateSituation(contextA, contextB, locationId);
    const evaluationB = await evaluateSituation(contextB, contextA, locationId);

    transcript.push(`[Agent ${contextA.agentId}] ${evaluationA.reasoning}`);
    transcript.push(`[Agent ${contextB.agentId}] ${evaluationB.reasoning}`);

    // ===== Phase 2: マッチング =====
    const match = matchAgents(evaluationA, evaluationB, contextA, contextB);

    if (!match.success) {
      transcript.push('[System] ❌ No agreement reached');
      return {
        success: false,
        buyer: null,
        seller: null,
        agreedPrice: null,
        transcript,
      };
    }

    transcript.push(
      `[System] ✅ Match found: Agent ${match.buyer?.agentId} (Buyer) ↔ Agent ${match.seller?.agentId} (Seller)`
    );
    transcript.push(`[System] Agreed price: ${match.agreedPrice} JPYC`);

    // ===== Phase 3: 決済実行 =====
    if (match.buyer && match.seller && match.agreedPrice) {
      transcript.push('[System] Executing blockchain payment...');

      try {
        // Buyer の秘密鍵を取得（実運用ではEIP-7702 Authorizationから）
        const buyerPrivateKey = getBuyerPrivateKey(match.buyer);

        if (!buyerPrivateKey) {
          throw new Error('Buyer private key not available');
        }

        const txHash = await executeEIP7702Bid(
          buyerPrivateKey,
          match.seller.wallet as Address,
          match.agreedPrice,
          locationId
        );

        transcript.push(`[System] ✅ Payment confirmed: ${txHash}`);
        transcript.push(
          `[System] ${match.agreedPrice} JPYC: ${match.buyer.wallet} → ${match.seller.wallet}`
        );

        console.log(`[Dynamic Negotiation] Payment successful: ${txHash}`);
      } catch (error) {
        console.error('[Dynamic Negotiation] Payment error:', error);
        transcript.push(
          `[Error] Payment failed: ${error instanceof Error ? error.message : 'Unknown'}`
        );

        if (process.env.NODE_ENV !== 'development') {
          return {
            success: false,
            buyer: match.buyer,
            seller: match.seller,
            agreedPrice: match.agreedPrice,
            transcript,
          };
        }

        transcript.push('[System] Continuing demo (development mode)');
      }

      // ===== Phase 4: 解決 =====
      // Seller側のエージェントが道を譲る
      const sellerAgentId =
        match.seller === contextA ? 'agent-1' : 'agent-2';
      resolveCollision(sellerAgentId);

      transcript.push('[System] Collision resolved. Traffic flowing.');

      return {
        success: true,
        buyer: match.buyer,
        seller: match.seller,
        agreedPrice: match.agreedPrice,
        transcript,
      };
    }

    return {
      success: false,
      buyer: null,
      seller: null,
      agreedPrice: null,
      transcript,
    };
  } catch (error) {
    console.error('[Dynamic Negotiation] Error:', error);
    transcript.push(`[Error] ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      success: false,
      buyer: null,
      seller: null,
      agreedPrice: null,
      transcript,
    };
  }
}

/**
 * 1つのエージェントが状況を評価
 */
async function evaluateSituation(
  myContext: AgentContext,
  otherContext: AgentContext,
  locationId: string
): Promise<SituationEvaluation> {
  console.log(`[Evaluation] Agent ${myContext.agentId} evaluating situation...`);

  const prompt = generateRoleDeterminationPrompt(myContext, {
    priority: otherContext.currentMission.priority,
    hasDeadline: otherContext.currentMission.deadline !== null,
    alternativeRoutes: otherContext.alternativeRoutes.length,
  });

  try {
    console.log(`[Evaluation] Sending prompt to Gemini for Agent ${myContext.agentId}...`);
    
    // AIに状況判断を依頼（Gemini 3）
    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 1.0, // Gemini 3推奨値
      maxTokens: 500,
    });

    let fullResponse = '';
    try {
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
      }
    } catch (streamError) {
      console.error(`[Evaluation] Stream error for Agent ${myContext.agentId}:`, streamError);
      throw streamError;
    }

    console.log(`[Evaluation] Agent ${myContext.agentId} full response:`, fullResponse);

    if (!fullResponse || fullResponse.trim().length === 0) {
      console.warn(`[Evaluation] Empty response from AI for Agent ${myContext.agentId}, using fallback`);
      return fallbackEvaluation(myContext);
    }

    // AIの応答をパース
    const decision = parseAIDecision(fullResponse, myContext);

    return {
      agentId: myContext.agentId,
      willingToPay: decision.decision === 'pay_to_pass' ? decision.amount : null,
      willingToAccept: decision.decision === 'wait_for_payment' ? decision.amount : null,
      preferredAction: decision.decision,
      reasoning: decision.reasoning,
      urgencyScore: calculateUrgencyScore(myContext),
    };
  } catch (error) {
    console.error(`[Evaluation] Agent ${myContext.agentId} error:`, error);
    console.error(`[Evaluation] Error details:`, error instanceof Error ? error.message : error);

    // Fallback: ルールベースの判断
    console.log(`[Evaluation] Using fallback evaluation for Agent ${myContext.agentId}`);
    return fallbackEvaluation(myContext);
  }
}

/**
 * AIの応答をパース
 */
function parseAIDecision(
  response: string,
  context: AgentContext
): {
  decision: 'pay_to_pass' | 'wait_for_payment' | 'find_alternative';
  amount: number;
  reasoning: string;
} {
  try {
    // JSON形式の応答を探す
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        decision: parsed.decision,
        amount: parsed.amount || 0,
        reasoning: parsed.reasoning || response,
      };
    }
  } catch (error) {
    console.warn('[Parse] Failed to parse JSON, using text analysis');
  }

  // テキスト解析によるフォールバック
  const lowerResponse = response.toLowerCase();

  if (lowerResponse.includes('pay') && lowerResponse.includes('pass')) {
    // 金額を抽出
    const amountMatch = response.match(/(\d+)\s*jpyc/i);
    const amount = amountMatch ? Number.parseInt(amountMatch[1], 10) : context.strategy.maxWillingToPay;

    return {
      decision: 'pay_to_pass',
      amount,
      reasoning: response,
    };
  } else if (lowerResponse.includes('wait') || lowerResponse.includes('accept')) {
    const amountMatch = response.match(/(\d+)\s*jpyc/i);
    const amount = amountMatch ? Number.parseInt(amountMatch[1], 10) : context.strategy.minAcceptableOffer;

    return {
      decision: 'wait_for_payment',
      amount,
      reasoning: response,
    };
  } else {
    return {
      decision: 'find_alternative',
      amount: 0,
      reasoning: response,
    };
  }
}

/**
 * 緊急度スコアを計算
 */
function calculateUrgencyScore(context: AgentContext): number {
  let score = 0;

  // Priority (0-40点)
  if (context.currentMission.priority === 'high') score += 40;
  else if (context.currentMission.priority === 'medium') score += 20;

  // Deadline (0-30点)
  if (context.currentMission.deadline) {
    const timeRemaining = context.currentMission.deadline - Date.now();
    const minutesRemaining = timeRemaining / 60000;

    if (minutesRemaining < 10) score += 30;
    else if (minutesRemaining < 30) score += 20;
    else if (minutesRemaining < 60) score += 10;
  }

  // Alternatives (0-20点、逆転）
  if (context.alternativeRoutes.length === 0) score += 20;
  else if (context.alternativeRoutes.length === 1) score += 10;

  // Patience (0-10点、逆転）
  score += Math.max(0, 10 - context.strategy.patienceLevel);

  return Math.min(100, score);
}

/**
 * Fallback評価（AIが失敗した場合）
 */
function fallbackEvaluation(context: AgentContext): SituationEvaluation {
  const urgency = calculateUrgencyScore(context);

  if (urgency >= 60) {
    // 非常に急いでいる → 支払う意思あり
    return {
      agentId: context.agentId,
      willingToPay: context.strategy.maxWillingToPay,
      willingToAccept: null,
      preferredAction: 'pay_and_pass',
      reasoning: 'High urgency detected (fallback)',
      urgencyScore: urgency,
    };
  } else if (urgency <= 30) {
    // 急いでいない → 待つ意思あり
    return {
      agentId: context.agentId,
      willingToPay: null,
      willingToAccept: context.strategy.minAcceptableOffer,
      preferredAction: 'wait_for_payment',
      reasoning: 'Low urgency detected (fallback)',
      urgencyScore: urgency,
    };
  } else {
    // 中程度 → 代替ルートを探す
    return {
      agentId: context.agentId,
      willingToPay: null,
      willingToAccept: null,
      preferredAction: 'find_alternative',
      reasoning: 'Medium urgency, seeking alternative (fallback)',
      urgencyScore: urgency,
    };
  }
}

/**
 * 2つの評価をマッチング
 */
function matchAgents(
  evalA: SituationEvaluation,
  evalB: SituationEvaluation,
  contextA: AgentContext,
  contextB: AgentContext
): NegotiationMatch {
  console.log('[Matching] Attempting to match agents...');
  console.log(`  Agent A: ${evalA.preferredAction}, urgency: ${evalA.urgencyScore}`);
  console.log(`  Agent B: ${evalB.preferredAction}, urgency: ${evalB.urgencyScore}`);

  // Case 1: Agent A wants to pay, Agent B wants payment
  if (evalA.willingToPay !== null && evalB.willingToAccept !== null) {
    if (evalA.willingToPay >= evalB.willingToAccept) {
      // 合意可能
      const agreedPrice = Math.floor((evalA.willingToPay + evalB.willingToAccept) / 2);

      return {
        success: true,
        buyer: contextA,
        seller: contextB,
        agreedPrice,
        method: 'direct_match',
      };
    }
  }

  // Case 2: Agent B wants to pay, Agent A wants payment
  if (evalB.willingToPay !== null && evalA.willingToAccept !== null) {
    if (evalB.willingToPay >= evalA.willingToAccept) {
      const agreedPrice = Math.floor((evalB.willingToPay + evalA.willingToAccept) / 2);

      return {
        success: true,
        buyer: contextB,
        seller: contextA,
        agreedPrice,
        method: 'direct_match',
      };
    }
  }

  // Case 3: Both want to pay (競争入札)
  if (evalA.willingToPay !== null && evalB.willingToPay !== null) {
    // 高い方が勝つ
    if (evalA.willingToPay > evalB.willingToPay) {
      return {
        success: true,
        buyer: contextA,
        seller: contextB,
        agreedPrice: evalA.willingToPay,
        method: 'compromise',
      };
    } else {
      return {
        success: true,
        buyer: contextB,
        seller: contextA,
        agreedPrice: evalB.willingToPay,
        method: 'compromise',
      };
    }
  }

  // Case 4: Both want payment (誰も譲らない)
  if (evalA.willingToAccept !== null && evalB.willingToAccept !== null) {
    // 緊急度が高い方が支払う側になる
    if (evalA.urgencyScore > evalB.urgencyScore) {
      return {
        success: true,
        buyer: contextA,
        seller: contextB,
        agreedPrice: evalB.willingToAccept,
        method: 'compromise',
      };
    } else {
      return {
        success: true,
        buyer: contextB,
        seller: contextA,
        agreedPrice: evalA.willingToAccept,
        method: 'compromise',
      };
    }
  }

  // Case 5: 合意できない
  console.log('[Matching] No match found');
  return {
    success: false,
    buyer: null,
    seller: null,
    agreedPrice: null,
    method: 'failed',
  };
}

/**
 * Buyer秘密鍵取得（実運用ではEIP-7702 Authorizationから）
 */
function getBuyerPrivateKey(buyer: AgentContext): `0x${string}` | null {
  // 簡易実装: Agent IDから秘密鍵を特定
  if (buyer.agentId === 1 && env.agentAPrivateKey) {
    return env.agentAPrivateKey as `0x${string}`;
  } else if (buyer.agentId === 2 && env.agentBPrivateKey) {
    return env.agentBPrivateKey as `0x${string}`;
  }

  console.warn(`[Dynamic Negotiation] No private key for Agent ${buyer.agentId}`);
  return null;
}

