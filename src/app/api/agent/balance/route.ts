import { getJpycBalance } from '@/server/lib/jpyc';
import type { Address } from 'viem';

/**
 * エージェントのJPYC残高を取得
 * GET /api/agent/balance?address=0x...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return Response.json({ error: 'Address required' }, { status: 400 });
    }

    const balance = await getJpycBalance(address as Address);

    return Response.json({
      address,
      balance,
      balanceNumber: Number.parseFloat(balance),
    });
  } catch (error) {
    console.error('[Balance API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


