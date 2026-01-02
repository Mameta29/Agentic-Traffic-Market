import {
  initializeAgents,
  startSimulation,
  stopSimulation,
  resetSimulation,
  getSimulationState,
} from '@/server/services/traffic-simulation';
import { startNegotiation } from '@/server/services/negotiation-orchestrator';

/**
 * シミュレーション制御API
 * GET  /api/simulation - 状態取得
 * POST /api/simulation - アクション実行
 */
export async function GET() {
  try {
    const state = getSimulationState();
    return Response.json(state);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        // シミュレーション開始
        await startSimulation();
        return Response.json({ success: true, message: 'Simulation started' });

      case 'stop':
        stopSimulation();
        return Response.json({ success: true, message: 'Simulation stopped' });

      case 'reset':
        resetSimulation();
        return Response.json({ success: true, message: 'Simulation reset' });

      case 'negotiate':
        // 自動ネゴシエーション開始
        const { buyerAddress, sellerAddress, locationId } = body;
        
        if (!buyerAddress || !sellerAddress || !locationId) {
          return Response.json(
            { error: 'Missing required fields: buyerAddress, sellerAddress, locationId' },
            { status: 400 }
          );
        }

        console.log('[API] Starting auto-negotiation...');
        const result = await startNegotiation(buyerAddress, sellerAddress, locationId);

        return Response.json({
          success: true,
          negotiationResult: result,
        });

      case 'initialize':
        const agents = initializeAgents();
        return Response.json({ success: true, agents });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Simulation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

