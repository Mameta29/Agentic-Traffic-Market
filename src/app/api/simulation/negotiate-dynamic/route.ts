import { negotiateWithDynamicRoles } from '@/server/services/dynamic-role-negotiation';
import { buildAgentContext, createDemoContext } from '@/server/lib/agent-context';
import { agentExists } from '@/server/lib/agent-registry';

/**
 * 動的役割決定ネゴシエーションAPI
 * POST /api/simulation/negotiate-dynamic
 * 
 * 両エージェントのコンテキストを分析し、AIが自律的に役割を決定
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent1Id, agent2Id, locationId } = body;

    if (!agent1Id || !agent2Id || !locationId) {
      return Response.json(
        { error: 'Missing required fields: agent1Id, agent2Id, locationId' },
        { status: 400 }
      );
    }

    console.log('[API] Starting dynamic role negotiation...');
    console.log(`  Agent 1 ID: ${agent1Id}`);
    console.log(`  Agent 2 ID: ${agent2Id}`);
    console.log(`  Location: ${locationId}`);

    // コンテキスト構築
    let context1, context2;

    // NFTが存在するか確認
    const nft1Exists = await agentExists(agent1Id);
    const nft2Exists = await agentExists(agent2Id);

    if (nft1Exists && nft2Exists) {
      // ブロックチェーンから取得
      console.log('[API] Loading contexts from blockchain...');
      context1 = await buildAgentContext(agent1Id, agent1Id);
      context2 = await buildAgentContext(agent2Id, agent2Id);
    } else {
      // デモコンテキスト使用
      console.log('[API] Using demo contexts...');
      context1 = createDemoContext(1);
      context2 = createDemoContext(2);
    }

    // 動的ネゴシエーション実行
    const result = await negotiateWithDynamicRoles(context1, context2, locationId);

    return Response.json({
      success: result.success,
      buyer: result.buyer
        ? { agentId: result.buyer.agentId, wallet: result.buyer.wallet }
        : null,
      seller: result.seller
        ? { agentId: result.seller.agentId, wallet: result.seller.wallet }
        : null,
      agreedPrice: result.agreedPrice,
      transcript: result.transcript,
    });
  } catch (error) {
    console.error('[API] Dynamic negotiation error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
      }
    );
  }
}


