import 'server-only';

import { getAgentInfo } from './agent-registry';
import { getJpycBalance } from './jpyc';
import type { AgentContext, AgentMission, NegotiationStrategy } from '@/types/agent-context';
import type { Address } from 'viem';

/**
 * Agent NFTとAgent Cardから完全なコンテキストを構築
 */
export async function buildAgentContext(
  agentId: number,
  nftId?: number
): Promise<AgentContext> {
  console.log(`[Context] Building context for Agent ${agentId}...`);

  try {
    // Agent NFTから基本情報を取得
    const agentInfo = nftId ? await getAgentInfo(nftId) : null;

    let wallet: string;
    let mission: AgentMission;
    let strategy: NegotiationStrategy;

    if (agentInfo) {
      wallet = agentInfo.wallet;

      // Agent Cardから currentContext を取得
      const card = agentInfo.card;
      const context = card.currentContext || {};

      mission = {
        type: context.mission?.type || 'patrol',
        deadline: context.mission?.deadline || null,
        priority: context.mission?.priority || 'medium',
        destinationImportance: context.mission?.destinationImportance || 5,
      };

      strategy = {
        maxWillingToPay: context.negotiationStrategy?.maxWillingToPay || 500,
        minAcceptableOffer: context.negotiationStrategy?.minAcceptableOffer || 400,
        patienceLevel: context.negotiationStrategy?.patienceLevel || 5,
        preferredRole: context.negotiationStrategy?.preferredRole || 'flexible',
      };
    } else {
      // Fallback: デフォルト値
      wallet = agentId === 1 
        ? '0x1234567890123456789012345678901234567890'
        : '0x0987654321098765432109876543210987654321';

      mission = agentId === 1
        ? { type: 'delivery', deadline: Date.now() + 1800000, priority: 'high', destinationImportance: 9 }
        : { type: 'patrol', deadline: null, priority: 'low', destinationImportance: 3 };

      strategy = agentId === 1
        ? { maxWillingToPay: 500, minAcceptableOffer: 300, patienceLevel: 2 }
        : { maxWillingToPay: 150, minAcceptableOffer: 400, patienceLevel: 8 };
    }

    // JPYC残高を取得
    let balance = 0;
    try {
      const balanceStr = await getJpycBalance(wallet as Address);
      balance = Number.parseFloat(balanceStr);
    } catch (error) {
      console.warn(`[Context] Failed to get balance for ${wallet}, using 0`);
    }

    // 代替ルート（シミュレーション）
    const alternativeRoutes = agentId === 1 ? [] : ['ROUTE_ALT_1', 'ROUTE_ALT_2'];

    return {
      agentId,
      nftId,
      wallet,
      currentMission: mission,
      balance,
      alternativeRoutes,
      negotiationHistory: [],
      strategy,
      currentPosition: { lat: 0, lng: 0 }, // 実際はsimulationから取得
    };
  } catch (error) {
    console.error(`[Context] Error building context for Agent ${agentId}:`, error);
    throw error;
  }
}

/**
 * デモ用のコンテキストを生成（NFTなしでも動作）
 */
export function createDemoContext(agentId: 1 | 2): AgentContext {
  if (agentId === 1) {
    // Agent A: 急いでいる配送ドローン
    return {
      agentId: 1,
      wallet: '0x1234567890123456789012345678901234567890',
      currentMission: {
        type: 'delivery',
        deadline: Date.now() + 1800000, // 30分後
        priority: 'high',
        destinationImportance: 9,
      },
      balance: 5000,
      alternativeRoutes: [],
      negotiationHistory: [],
      strategy: {
        maxWillingToPay: 500,
        minAcceptableOffer: 300,
        patienceLevel: 2,
        preferredRole: 'flexible',
      },
      currentPosition: { lat: 35.6762, lng: 139.6503 },
    };
  } else {
    // Agent B: のんびりパトロール車
    return {
      agentId: 2,
      wallet: '0x0987654321098765432109876543210987654321',
      currentMission: {
        type: 'patrol',
        deadline: null,
        priority: 'low',
        destinationImportance: 3,
      },
      balance: 3000,
      alternativeRoutes: ['ROUTE_ALT_1', 'ROUTE_ALT_2'],
      negotiationHistory: [],
      strategy: {
        maxWillingToPay: 150,
        minAcceptableOffer: 400,
        patienceLevel: 8,
        preferredRole: 'flexible',
      },
      currentPosition: { lat: 35.6812, lng: 139.7671 },
    };
  }
}


