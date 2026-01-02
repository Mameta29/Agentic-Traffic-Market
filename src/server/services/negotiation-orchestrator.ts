import 'server-only';

import { streamAgentThinking } from '../actions/agent';
import { resolveCollision } from './traffic-simulation';
import type { CoreMessage } from 'ai';

/**
 * 2つのAIエージェント間の自動ネゴシエーションを調整
 * 
 * フロー:
 * 1. Agent A (Buyer): 混雑評価 → オファー送信
 * 2. Agent B (Seller): オファー受信 → 思考 → 受諾/拒否
 * 3. Settlement: 支払い実行
 * 4. Resolution: 道を譲る
 */

interface NegotiationResult {
  success: boolean;
  finalOffer?: number;
  transcript: string[];
}

/**
 * ネゴシエーションプロセスを開始
 * 
 * @param buyerAddress Agent Aのアドレス
 * @param sellerAddress Agent Bのアドレス
 * @param locationId コリジョン発生地点
 */
export async function startNegotiation(
  buyerAddress: string,
  sellerAddress: string,
  locationId: string
): Promise<NegotiationResult> {
  console.log('[Negotiation] Starting negotiation between agents...');
  const transcript: string[] = [];

  try {
    // Step 1: Agent A (Buyer) - Assessment & Initial Offer
    console.log('[Negotiation] Step 1: Buyer evaluating congestion and making offer');
    transcript.push('[Agent A] Evaluating traffic situation...');

    const buyerMessages: CoreMessage[] = [
      {
        role: 'user',
        content: `You are at location ${locationId} and your path is blocked by another agent. Evaluate the congestion and make an initial offer to negotiate right-of-way. Check your JPYC balance first, then make a reasonable offer (300-500 JPYC).`,
      },
    ];

    const buyerStream = await streamAgentThinking('buyer', buyerMessages, buyerAddress);

    // ストリームを完全に読み取る
    let buyerResponse = '';
    for await (const chunk of buyerStream.textStream) {
      buyerResponse += chunk;
    }

    transcript.push(`[Agent A] ${buyerResponse.substring(0, 200)}...`);
    console.log('[Negotiation] Buyer offer made');

    // Step 2: Agent B (Seller) - Decision
    console.log('[Negotiation] Step 2: Seller considering offer');
    transcript.push('[Agent B] Analyzing offer...');

    const sellerMessages: CoreMessage[] = [
      {
        role: 'user',
        content: `Another agent (Buyer) has offered 400 JPYC to purchase your current right-of-way at location ${locationId}. You are not in a hurry. Evaluate if this offer is acceptable (minimum 400 JPYC). If yes, indicate acceptance. If not, make a counter-offer.`,
      },
    ];

    const sellerStream = await streamAgentThinking('seller', sellerMessages, sellerAddress);

    let sellerResponse = '';
    for await (const chunk of sellerStream.textStream) {
      sellerResponse += chunk;
    }

    transcript.push(`[Agent B] ${sellerResponse.substring(0, 200)}...`);

    // 簡易的な受諾判定（実際はAIの応答を解析）
    const accepted = sellerResponse.toLowerCase().includes('accept') || 
                     sellerResponse.toLowerCase().includes('yes') ||
                     sellerResponse.toLowerCase().includes('agree');

    if (accepted) {
      console.log('[Negotiation] ✅ Offer ACCEPTED by Seller');
      transcript.push('[System] Negotiation successful! Payment processing...');

      // Step 3: Settlement (ここでは簡略化、実際はtransfer_jpycを呼ぶ)
      console.log('[Negotiation] Step 3: Processing payment (simulated)');
      transcript.push('[System] 400 JPYC transferred from Agent A to Agent B');

      // Step 4: Resolution
      console.log('[Negotiation] Step 4: Resolving collision');
      resolveCollision('agent-b'); // Agent Bが道を譲る

      return {
        success: true,
        finalOffer: 400,
        transcript,
      };
    } else {
      console.log('[Negotiation] ❌ Offer REJECTED by Seller');
      transcript.push('[System] Negotiation failed. Further rounds needed.');

      return {
        success: false,
        transcript,
      };
    }
  } catch (error) {
    console.error('[Negotiation] Error:', error);
    transcript.push(`[Error] ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      success: false,
      transcript,
    };
  }
}

/**
 * ネゴシエーション履歴を記録
 */
const negotiationHistory: NegotiationResult[] = [];

export function recordNegotiation(result: NegotiationResult): void {
  negotiationHistory.push(result);
  console.log('[Negotiation] Recorded negotiation result');
}

export function getNegotiationHistory(): NegotiationResult[] {
  return negotiationHistory;
}

