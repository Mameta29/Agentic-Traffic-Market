import 'server-only';

import { streamText } from 'ai';
import { google, GEMINI_MODEL } from '../lib/vertex-ai';
import { getVercelAITools } from '@/mcp-server';
import { resolveCollision } from './traffic-simulation';
import { executeEIP7702Bid } from '../lib/eip-7702';
import { executeEIP7702BidCorrect } from '../lib/eip-7702-correct';
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
  locationId: string,
  network: 'fuji' | 'sepolia' = 'fuji'
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
  
  // ===== マーケット相場の設定 =====
  // 通行権の基準価格（マイクロペイメント形式）
  // 時間帯、混雑度、優先度などを考慮した動的価格
  const timeOfDay = new Date().getHours();
  const congestionFactor = 1.0; // 混雑度（1.0 = 通常、1.5 = 混雑）
  const basePriceRange = { min: 180, max: 280 }; // 基準価格帯
  
  // 相場価格を計算（マイクロペイメント形式で生成）
  const marketPrice = Number.parseFloat(
    (basePriceRange.min + 
     Math.random() * (basePriceRange.max - basePriceRange.min) * 
     congestionFactor
    ).toFixed(2)
  );
  
  console.log(`[AI-to-AI] Market price for ${locationId}: ${marketPrice} JPYC`);
  transcript.push(`[System] Market price: ${marketPrice} JPYC`);

  try {
    // ===== Round 1: Agent 1 が初回オファー =====
    // すぐに表示開始（AI応答を待たない）
    transcript.push('[System] Agent 1 thinking about initial offer...');
    transcript.push(`[Agent ${contextA.agentId}] [THINKING]`);
    
    const initialOfferPrompt = `You are Agent ${contextA.agentId}, a ${contextA.currentMission.type} vehicle in a traffic negotiation.

MARKET CONTEXT:
- Current market price for right-of-way at ${locationId}: ${marketPrice} JPYC
- This is the fair market value based on time, congestion, and demand
- You should use this as your anchor point for negotiation

Your situation:
- Mission: ${contextA.currentMission.type}
- Priority: ${contextA.currentMission.priority}
- Deadline: ${contextA.currentMission.deadline ? `${Math.floor((contextA.currentMission.deadline - Date.now()) / 60000)} minutes remaining` : 'No deadline'}
- Current balance: ${contextA.balance} JPYC
- Maximum you're willing to pay: ${contextA.strategy.maxWillingToPay} JPYC

NEGOTIATION STRATEGY (as Buyer):
As the buyer, you want to pay LESS than market price if possible:
- Market price: ${marketPrice} JPYC
- Suggested opening offer: ${(marketPrice * 0.70).toFixed(2)} - ${(marketPrice * 0.85).toFixed(2)} JPYC (70-85% of market)
- This gives room for negotiation while staying reasonable

IMPORTANT:
1. Start BELOW market price (around 75-80% of ${marketPrice})
2. Use PRECISE micropayment amounts (e.g., ${(marketPrice * 0.75).toFixed(2)}, ${(marketPrice * 0.80).toFixed(2)})
3. Your offer must be a decimal number with 2 decimal places
4. Contract maximum: 500 JPYC (but market price is much lower)

Example opening offers based on market price ${marketPrice}:
"${(marketPrice * 0.73).toFixed(2)}"
"${(marketPrice * 0.78).toFixed(2)}"
"${(marketPrice * 0.82).toFixed(2)}"

Your initial offer (number with 2 decimal places, around 75-80% of market price):`;

    const initialOffer = await callAI(initialOfferPrompt);
    console.log('[AI-to-AI] Agent 1 initial offer response:', initialOffer);
    
    let offerAmount = extractNumber(initialOffer);
    
    // フォールバック: AIが適切な値を返さなかった場合
    if (!offerAmount || offerAmount === 0) {
      // 相場の75-80%を初回オファーとする
      offerAmount = Number.parseFloat((marketPrice * (0.75 + Math.random() * 0.05)).toFixed(2));
      console.log('[AI-to-AI] Using fallback offer based on market price:', offerAmount);
    }
    
    // 相場価格を基準にした調整（極端な値を防ぐ）
    if (offerAmount > marketPrice * 1.5) {
      offerAmount = Number.parseFloat((marketPrice * (1.0 + Math.random() * 0.2)).toFixed(2));
      console.log('[AI-to-AI] Adjusted to reasonable range near market price:', offerAmount);
    }
    
    if (offerAmount < marketPrice * 0.5) {
      offerAmount = Number.parseFloat((marketPrice * (0.7 + Math.random() * 0.1)).toFixed(2));
      console.log('[AI-to-AI] Adjusted to reasonable minimum near market price:', offerAmount);
    }
    
    // 既に小数点形式の場合は2桁に丸める
    offerAmount = Math.round(offerAmount * 100) / 100;
    
    console.log('[AI-to-AI] Final micropayment offer:', offerAmount);
    
    conversation.push({
      speaker: contextA.agentId,
      message: `I offer ${offerAmount} JPYC to pass`,
      offerAmount,
      action: 'initial_offer',
    });
    transcript.push(`[Agent ${contextA.agentId}] Initial offer: ${offerAmount} JPYC`);

    // ===== Round 2: Agent 2 が評価・応答 =====
    let currentOffer = offerAmount;
    let negotiationRound = 1;

    while (negotiationRound <= maxRounds) {
      transcript.push(`[System] Negotiation round ${negotiationRound}...`);
      transcript.push(`[Agent ${contextB.agentId}] [THINKING]`);

      // Agent 2がオファーを評価
      const evaluationPrompt = `You are Agent ${contextB.agentId}, a ${contextB.currentMission.type} tourist vehicle.

MARKET CONTEXT:
- Current market price for right-of-way: ${marketPrice} JPYC
- This is the fair market value everyone knows
- Agent ${contextA.agentId} has offered ${currentOffer} JPYC

MARKET ANALYSIS:
- Their offer is ${((currentOffer / marketPrice) * 100).toFixed(1)}% of market price
- ${currentOffer < marketPrice * 0.85 ? 'Their offer is LOW - they are trying to get a bargain' : 
   currentOffer < marketPrice ? 'Their offer is slightly below market - reasonable but you can ask for more' :
   currentOffer < marketPrice * 1.15 ? 'Their offer is near or above market - good deal!' :
   'Their offer is HIGH - excellent deal!'}

Your situation:
- Mission: Leisure touring (NO urgency, you have time)
- Priority: LOW
- Alternative routes: ${contextB.alternativeRoutes.length} available
- Minimum acceptable: ${contextB.strategy.minAcceptableOffer} JPYC (but market price is ${marketPrice})
- Current balance: ${contextB.balance} JPYC

NEGOTIATION STRATEGY (as Seller):
You want to get ABOVE market price if possible:
- Market price: ${marketPrice} JPYC
- Ideal price: ${(marketPrice * 1.1).toFixed(2)} - ${(marketPrice * 1.2).toFixed(2)} JPYC (110-120% of market)
- Minimum: ${(marketPrice * 0.95).toFixed(2)} JPYC (95% of market is acceptable)

Decision Rules:
Round ${negotiationRound}/${maxRounds}:
1. If offer >= ${(marketPrice * 1.05).toFixed(2)} (105% of market): ACCEPT (great deal!)
2. If offer >= ${(marketPrice * 0.95).toFixed(2)} (95% of market) AND round >= 2: ACCEPT (fair enough)
3. If offer < ${(marketPrice * 0.95).toFixed(2)} (below 95% of market): COUNTER with ${(marketPrice * (1.05 + Math.random() * 0.10)).toFixed(2)}
4. Use precise micropayment amounts in your counter-offer

Current offer ${currentOffer} vs market ${marketPrice}:
${currentOffer >= marketPrice * 1.05 ? '✅ GREAT DEAL - Accept!' :
  currentOffer >= marketPrice * 0.95 && negotiationRound >= 2 ? '✅ FAIR PRICE - Accept!' :
  currentOffer >= marketPrice * 0.85 ? '⚠️ BELOW MARKET - Counter with higher price' :
  '❌ TOO LOW - Counter with market price or higher'}

Respond EXACTLY in one of these formats:
"ACCEPT" (if offer is >= 95% of market or excellent deal)
"COUNTER:XXX.XX" (where XXX.XX is your counter near or above market price, e.g., "COUNTER:${(marketPrice * 1.08).toFixed(2)}")
"REJECT" (only if offer is insultingly low AND no room for negotiation)

Your response:`;

      const response = await callAI(evaluationPrompt);
      console.log('[AI-to-AI] Agent 2 response:', response);
      
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
        await executePayment(contextA, contextB, currentOffer, locationId, transcript, network);

        return {
          success: true,
          finalPrice: currentOffer,
          conversation,
          transcript,
        };
      } else if (responseUpper.includes('COUNTER')) {
        // カウンターオファー
        let counterAmount = extractNumber(response);
        
        // カウンター額が抽出できない、または不正な場合
        if (!counterAmount || counterAmount < 100 || counterAmount > 1000) {
          console.warn('[AI-to-AI] Invalid counter amount, using market-based value');
          // フォールバック: 相場の105-115%
          counterAmount = Number.parseFloat((marketPrice * (1.05 + Math.random() * 0.10)).toFixed(2));
        } else {
          // 小数点2桁に丸める
          counterAmount = Math.round(counterAmount * 100) / 100;
        }
        
        transcript.push(`[Agent ${contextB.agentId}] Counter-offer: ${counterAmount} JPYC`);

        // Agent 1がカウンターオファーを評価
        transcript.push(`[Agent ${contextA.agentId}] [THINKING]`);
        
        const buyerResponsePrompt = `You are Agent ${contextA.agentId} (Buyer) continuing negotiation.

MARKET CONTEXT:
- Market price: ${marketPrice} JPYC
- Your initial offer: ${offerAmount} JPYC (${((offerAmount / marketPrice) * 100).toFixed(1)}% of market)
- Your last offer: ${currentOffer} JPYC
- Their counter: ${counterAmount} JPYC (${((counterAmount / marketPrice) * 100).toFixed(1)}% of market)

MARKET ANALYSIS:
- Price difference: ${(counterAmount - currentOffer).toFixed(2)} JPYC
- ${counterAmount <= marketPrice ? 'Their counter is AT OR BELOW market - great!' :
   counterAmount <= marketPrice * 1.1 ? 'Their counter is slightly above market - reasonable' :
   counterAmount <= marketPrice * 1.2 ? 'Their counter is above market - consider negotiating' :
   'Their counter is HIGH - definitely negotiate down'}

Your situation:
- Current balance: ${contextA.balance} JPYC
- Maximum budget: ${contextA.strategy.maxWillingToPay} JPYC
- Contract limit: 500 JPYC

NEGOTIATION STRATEGY:
Round ${negotiationRound}/${maxRounds}:
1. If counter <= ${(marketPrice * 1.05).toFixed(2)} (105% of market): ACCEPT (at or near market!)
2. If counter <= ${(marketPrice * 1.15).toFixed(2)} (115% of market): Consider ACCEPT or small COUNTER
3. If counter > ${(marketPrice * 1.15).toFixed(2)}: COUNTER with middle ground (e.g., ${((currentOffer + counterAmount) / 2).toFixed(2)})
4. If round >= ${maxRounds - 1}: ACCEPT if reasonable, or final COUNTER

Current counter ${counterAmount} vs market ${marketPrice}:
${counterAmount <= marketPrice * 1.05 ? '✅ EXCELLENT - At market price, accept!' :
  counterAmount <= marketPrice * 1.15 ? '✅ GOOD - Slightly above market but acceptable' :
  counterAmount <= marketPrice * 1.3 ? '⚠️ HIGH - Counter with compromise' :
  '❌ TOO HIGH - Counter with firm offer near market'}

Respond EXACTLY in one of these formats:
"ACCEPT" (agree to their price)
"COUNTER:XXX.XX" (where XXX.XX is your counter with 2 decimals, near market price)
"REJECT" (walk away from deal)

Your response:`;

        const buyerResponse = await callAI(buyerResponsePrompt);

        if (buyerResponse.includes('ACCEPT')) {
          conversation.push({
            speaker: contextA.agentId,
            message: `I accept ${counterAmount} JPYC`,
            offerAmount: counterAmount,
            action: 'accept',
          });
          transcript.push(`[Agent ${contextA.agentId}] ✅ Accepted at ${counterAmount} JPYC`);

          await executePayment(contextA, contextB, counterAmount, locationId, transcript, network);

          return {
            success: true,
            finalPrice: counterAmount,
            conversation,
            transcript,
          };
        } else if (buyerResponse.includes('COUNTER')) {
          // Agent 1からの新しいカウンターオファー
          let newOffer = extractNumber(buyerResponse);
          
          if (!newOffer || newOffer < 100 || newOffer > 1000) {
            // フォールバック: 相場に近い中間値
            newOffer = Number.parseFloat(((currentOffer + counterAmount) / 2).toFixed(2));
            console.warn('[AI-to-AI] Invalid counter from A, using middle ground:', newOffer);
          } else {
            // 小数点2桁に丸める
            newOffer = Math.round(newOffer * 100) / 100;
          }
          
          currentOffer = newOffer;
          
          conversation.push({
            speaker: contextA.agentId,
            message: `Counter-offer: ${currentOffer} JPYC`,
            offerAmount: currentOffer,
            action: 'counter_offer',
          });
          transcript.push(`[Agent ${contextA.agentId}] Counter-offer: ${currentOffer} JPYC`);
          negotiationRound++;
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
      temperature: 1.2, // 0.7→1.2：より創造的な応答
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
 * テキストから数値を抽出（小数点対応）
 */
function extractNumber(text: string): number {
  // パターン1: "COUNTER:450.25" から450.25を抽出
  const counterMatch = text.match(/COUNTER:\s*([\d.]+)/i);
  if (counterMatch) {
    return Number.parseFloat(counterMatch[1]);
  }

  // パターン2: 小数点付き数値（"342.50" or "I offer 342.18"）
  const decimalMatch = text.match(/\b(\d{2,3}\.\d{1,2})\b/);
  if (decimalMatch) {
    const num = Number.parseFloat(decimalMatch[1]);
    if (num >= 50 && num <= 1000) {
      return num;
    }
  }

  // パターン3: 整数（"450"）
  const intMatch = text.match(/\b(\d{3,4})\b/);
  if (intMatch) {
    return Number.parseInt(intMatch[1], 10);
  }

  // パターン4: 任意の数値
  const anyMatch = text.match(/([\d.]+)/);
  if (anyMatch) {
    const num = Number.parseFloat(anyMatch[1]);
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
  transcript: string[],
  network: 'fuji' | 'sepolia' = 'fuji'
): Promise<void> {
  transcript.push(`[System] Executing payment: ${amount} JPYC...`);
  transcript.push(`[System] Network: ${network}`);

  // Seller側のエージェントIDを特定（常に実行）
  const sellerAgentId = seller.agentId === 1 ? 'agent-1' : 'agent-2';

  try {
    // 正しい実装: Agent秘密鍵とUser EOAを使用
    const agentKey = buyer.agentId === 1 
      ? (env.agent1PrivateKey || env.agentAPrivateKey)
      : (env.agent2PrivateKey || env.agentBPrivateKey);
    
    const userEOA = buyer.wallet as Address;
    
    console.log(`[Payment] Selected network: ${network}`);

    if (!agentKey) {
      console.warn('[Payment] Agent private key not available, simulating payment');
      transcript.push('[System] Simulated payment (agent key not configured)');
      transcript.push(`[System] ${amount} JPYC: User ${buyer.agentId} → User ${seller.agentId}`);
    } else if (
      !env.jpycContractAddress ||
      env.jpycContractAddress === '0x0000000000000000000000000000000000000000'
    ) {
      transcript.push('[System] Simulated payment (contracts not deployed)');
      transcript.push(`[System] ${amount} JPYC: User ${buyer.agentId} → User ${seller.agentId}`);
    } else {
      if (network === 'sepolia') {
        // Phase 2: Ethereum Sepolia（EIP-7702完全実装）
        console.log('[Payment] Executing payment (Phase 2: Ethereum Sepolia - EIP-7702)');
        console.log('[Payment] Agent EOA → User EOA via authorizationList');
        
        const txHash = await executeEIP7702BidCorrect(
          agentKey as `0x${string}`,
          userEOA,
          seller.wallet as Address,
          amount,
          locationId,
          network
        );

        transcript.push(`[System] Payment confirmed (Sepolia): ${txHash}`);
        transcript.push(`[System] ${amount} JPYC: User EOA → User EOA (EIP-7702)`);
      } else {
        // Phase 1: Avalanche Fuji
        console.log('[Payment] Executing payment (Phase 1: Avalanche Fuji)');
        console.log('[Payment] Agent EOA → TrafficAgentContract');
        
        const txHash = await executeEIP7702Bid(
          agentKey as `0x${string}`,
          seller.wallet as Address,
          amount,
          locationId
        );

        transcript.push(`[System] Payment confirmed (Fuji): ${txHash}`);
        transcript.push(`[System] ${amount} JPYC sent via blockchain`);
      }
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
  await resolveCollision(sellerAgentId);
  transcript.push('[System] Collision resolved. Traffic flowing.');
}

