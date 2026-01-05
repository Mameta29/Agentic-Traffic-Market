import { negotiateAItoAI } from '@/server/services/ai-to-ai-negotiation';
import { buildAgentContext, createDemoContext } from '@/server/lib/agent-context';
import { agentExists } from '@/server/lib/agent-registry';

/**
 * 本物のAI-to-AIネゴシエーションAPI
 * POST /api/simulation/negotiate-ai-to-ai
 * 
 * 2つのAIが会話を通じて価格を交渉する
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent1Id, agent2Id, locationId } = body;

    if (!agent1Id || !agent2Id || !locationId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[API] Starting AI-to-AI negotiation...');

    // コンテキスト構築
    let context1, context2;

    const nft1Exists = await agentExists(agent1Id);
    const nft2Exists = await agentExists(agent2Id);

    if (nft1Exists && nft2Exists) {
      context1 = await buildAgentContext(agent1Id, agent1Id);
      context2 = await buildAgentContext(agent2Id, agent2Id);
    } else {
      context1 = createDemoContext(1);
      context2 = createDemoContext(2);
    }

    // 実際のネゴシエーション実行
    const result = await negotiateAItoAI(context1, context2, locationId);

    return Response.json({
      success: result.success,
      finalPrice: result.finalPrice,
      conversation: result.conversation,
      transcript: result.transcript,
      rounds: result.conversation.length,
    });
  } catch (error) {
    console.error('[API] AI-to-AI negotiation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


