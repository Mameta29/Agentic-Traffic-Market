import { z } from 'zod';
import { getJpycBalance } from '../../server/lib/jpyc';
import type { Address } from 'viem';

/**
 * ツール名
 */
export const toolName = 'get_jpyc_balance';

/**
 * ツール説明
 */
export const toolDescription = 'Get JPYC token balance for a given Ethereum address';

/**
 * 入力スキーマ（Zod）
 */
export const inputSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
});

/**
 * 型推論用
 */
export type GetJpycBalanceInput = z.infer<typeof inputSchema>;

/**
 * ツール実行ロジック
 */
export async function execute(input: GetJpycBalanceInput) {
  const { address } = input;

  console.log(`[TOOL] get_jpyc_balance called for address: ${address}`);

  try {
    const balance = await getJpycBalance(address as Address);

    return {
      success: true,
      balance,
      address,
      unit: 'JPYC',
    };
  } catch (error) {
    console.error('[TOOL] get_jpyc_balance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

