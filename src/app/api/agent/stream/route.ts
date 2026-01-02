import { streamAgentThinking } from '@/server/actions/agent';
import type { CoreMessage } from 'ai';

/**
 * エージェントAI思考プロセスのストリーミングAPI
 * POST /api/agent/stream
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, messages, agentAddress } = body;

    // バリデーション
    if (!role || !messages || !agentAddress) {
      return new Response('Missing required fields: role, messages, agentAddress', {
        status: 400,
      });
    }

    if (role !== 'buyer' && role !== 'seller') {
      return new Response('Invalid role. Must be "buyer" or "seller"', { status: 400 });
    }

    // AI思考プロセスをストリーミング
    const result = await streamAgentThinking(
      role,
      messages as CoreMessage[],
      agentAddress
    );

    // ストリームレスポンスを返す
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[API] /api/agent/stream error:', error);
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

