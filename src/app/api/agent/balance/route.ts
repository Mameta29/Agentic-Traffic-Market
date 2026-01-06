import { getJpycBalance, getJpycBalanceFuji } from '@/server/lib/jpyc';
import type { Address } from 'viem';

/**
 * エージェントのJPYC残高を取得（ネットワーク指定可能）
 * GET /api/agent/balance?address=0x...&network=sepolia|fuji
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const network = searchParams.get('network') || 'sepolia'; // デフォルトはSepolia

    if (!address) {
      return Response.json({ error: 'Address required' }, { status: 400 });
    }

    // ネットワークに応じて残高を取得
    const balance = network === 'fuji' 
      ? await getJpycBalanceFuji(address as Address)
      : await getJpycBalance(address as Address);

    return Response.json({
      address,
      network,
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


