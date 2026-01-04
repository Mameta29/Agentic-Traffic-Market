import 'server-only';

import { type Address, formatUnits, parseUnits } from 'viem';
import { publicClient } from './viem';
import { erc20Abi, JPYC_CONTRACT_ADDRESS, JPYC_DECIMALS } from './contracts';

/**
 * JPYCバランスを取得（人間が読める形式）
 */
export async function getJpycBalance(address: Address): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: JPYC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });

    // BigIntを文字列に変換して返す
    return formatUnits(balance, JPYC_DECIMALS);
  } catch (error) {
    console.error(`[JPYC] バランス取得エラー (${address}):`, error);
    return '0';
  }
}

/**
 * JPYC金額を人間が読める形式からWei形式に変換
 */
export function parseJpycAmount(amount: number): bigint {
  return parseUnits(amount.toString(), JPYC_DECIMALS);
}

/**
 * JPYC金額をWei形式から人間が読める形式に変換
 */
export function formatJpycAmount(amount: bigint): string {
  return formatUnits(amount, JPYC_DECIMALS);
}


