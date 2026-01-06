import { negotiateAItoAI } from '@/server/services/ai-to-ai-negotiation';
import { buildAgentContext, createDemoContext } from '@/server/lib/agent-context';
import { agentExists } from '@/server/lib/agent-registry';
import type { Network } from '@/types/network';

/**
 * ネットワーク指定可能なネゴシエーションAPI
 * POST /api/simulation/negotiate-network
 * 
 * { agent1Id, agent2Id, locationId, network: 'fuji' | 'sepolia' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent1Id, agent2Id, locationId, network = 'fuji' } = body;

    if (!agent1Id || !agent2Id || !locationId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[API] Network-aware negotiation...');
    console.log(`  Network: ${network}`);
    console.log(`  Agents: ${agent1Id}, ${agent2Id}`);

    // コンテキスト構築
    let context1, context2;

    const nft1Exists = await agentExists(agent1Id);
    const nft2Exists = await agentExists(agent2Id);

    if (nft1Exists && nft2Exists) {
      context1 = await buildAgentContext(agent1Id, agent1Id);
      context2 = await buildAgentContext(agent2Id, agent2Id);
    } else {
      context1 = await createDemoContext(1);
      context2 = await createDemoContext(2);
    }

    // ネットワーク情報を追加
    (context1 as any).network = network;
    (context2 as any).network = network;

    // ネゴシエーション実行（network引数を渡す）
    const result = await negotiateAItoAI(context1, context2, locationId, network);

    return Response.json({
      success: result.success,
      finalPrice: result.finalPrice,
      conversation: result.conversation,
      transcript: result.transcript,
      rounds: result.conversation.length,
      network,
    });
  } catch (error) {
    console.error('[API] Network negotiation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


