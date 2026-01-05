import { negotiateAItoAI } from '@/server/services/ai-to-ai-negotiation';
import { createDemoContext } from '@/server/lib/agent-context';

/**
 * AI-to-AIネゴシエーションのストリーミングAPI
 * GET /api/negotiation/stream?agent1Id=1&agent2Id=2&locationId=LOC_001
 * 
 * Server-Sent Events (SSE) でリアルタイムに進捗を送信
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent1Id = Number.parseInt(searchParams.get('agent1Id') || '1', 10);
  const agent2Id = Number.parseInt(searchParams.get('agent2Id') || '2', 10);
  const locationId = searchParams.get('locationId') || 'LOC_001';

  console.log('[Negotiation Stream] Starting SSE stream...');

  // SSEストリームを作成
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // ヘルパー関数: イベント送信
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // コンテキスト作成
        const context1 = createDemoContext(agent1Id as 1 | 2);
        const context2 = createDemoContext(agent2Id as 1 | 2);

        sendEvent('start', {
          message: 'Negotiation started',
          agents: [context1.agentId, context2.agentId],
        });

        // 段階的に表示するため、transcriptを順次送信
        sendEvent('progress', { message: '[System] Agent A making initial offer...' });
        
        // ネットワーク指定（デフォルトはfuji）
        const network = searchParams.get('network') as 'fuji' | 'sepolia' || 'fuji';
        console.log(`[Negotiation Stream] Network: ${network}`);
        
        // ネゴシエーション実行（進捗を送信）
        const result = await negotiateAItoAI(context1, context2, locationId, network);

        // transcriptを1つずつ段階的に送信
        for (const log of result.transcript) {
          sendEvent('progress', { message: log });
          // 少し遅延を入れて段階的に表示
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 会話の各ターンを送信
        for (const turn of result.conversation) {
          sendEvent('turn', {
            speaker: turn.speaker,
            message: turn.message,
            offerAmount: turn.offerAmount,
            action: turn.action,
          });
        }

        // 最終結果を送信
        sendEvent('result', {
          success: result.success,
          finalPrice: result.finalPrice,
          transcript: result.transcript,
        });

        sendEvent('done', { message: 'Negotiation completed' });
        controller.close();
      } catch (error) {
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  // SSE レスポンスヘッダー
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

