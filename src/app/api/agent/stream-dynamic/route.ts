import { streamText } from 'ai';
import { google, GEMINI_MODEL } from '@/server/lib/vertex-ai';
import { generateNeutralSystemPrompt, generateRoleDeterminationPrompt } from '@/server/lib/vertex-ai-dynamic';
import { createDemoContext } from '@/server/lib/agent-context';

/**
 * 動的役割決定用のAIストリーミングAPI
 * GET /api/agent/stream-dynamic?agentId=1&otherAgentId=2&locationId=LOC_001
 * 
 * フロントエンドのターミナルにAIの思考プロセスを表示するため
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = Number.parseInt(searchParams.get('agentId') || '1', 10);
    const otherAgentId = Number.parseInt(searchParams.get('otherAgentId') || '2', 10);
    const locationId = searchParams.get('locationId') || 'LOC_001';

    console.log('[Stream Dynamic] Starting stream for agent', agentId);

    // コンテキスト取得
    const myContext = await createDemoContext(agentId as 1 | 2);
    const otherContext = await createDemoContext(otherAgentId as 1 | 2);

    // プロンプト生成
    const prompt = generateRoleDeterminationPrompt(myContext, {
      priority: otherContext.currentMission.priority,
      hasDeadline: otherContext.currentMission.deadline !== null,
      alternativeRoutes: otherContext.alternativeRoutes.length,
    });

    // AI stream開始
    const result = streamText({
      model: google(GEMINI_MODEL),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 1.0,
      maxTokens: 500,
    });

    // ストリームをクライアントに返す
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[Stream Dynamic] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}



