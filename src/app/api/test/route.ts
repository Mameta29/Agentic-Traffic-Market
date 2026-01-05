import { listTools } from '@/mcp-server';
import { env } from '@/server/config/env';

/**
 * システムヘルスチェックとMCPツールリスト
 * GET /api/test
 */
export async function GET() {
  try {
    const tools = listTools();

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        hasGoogleApiKey: !!env.googleApiKey,
        hasAgentAKey: !!env.agentAPrivateKey,
        hasAgentBKey: !!env.agentBPrivateKey,
        hasJpycContract: !!env.jpycContractAddress && env.jpycContractAddress !== '0x0000000000000000000000000000000000000000',
        chainId: env.chainId,
      },
      mcpTools: tools,
      message: 'Agentic Traffic Market - MCP Server Ready',
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



