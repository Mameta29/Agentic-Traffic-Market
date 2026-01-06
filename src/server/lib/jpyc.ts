import 'server-only';

import { type Address, formatUnits, parseUnits } from 'viem';
import { publicClient, publicClientSepolia } from './viem';
import { erc20Abi, JPYC_DECIMALS } from './contracts';
import { env } from '../config/env';

/**
 * JPYCバランスを取得（Sepolia）
 */
export async function getJpycBalance(address: Address): Promise<string> {
  try {
    const jpycAddress = env.sepoliaJpycContract;
    
    if (!jpycAddress || jpycAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[JPYC] Sepolia JPYC contract not configured');
      return '0';
    }

    const balance = await publicClientSepolia.readContract({
      address: jpycAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });

    return formatUnits(balance, JPYC_DECIMALS);
  } catch (error) {
    console.error(`[JPYC Sepolia] バランス取得エラー (${address}):`, error);
    return '0';
  }
}

/**
 * JPYCバランスを取得（Avalanche Fuji）
 */
export async function getJpycBalanceFuji(address: Address): Promise<string> {
  try {
    const jpycAddress = env.jpycContractAddress;
    
    if (!jpycAddress || jpycAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('[JPYC] Fuji JPYC contract not configured');
      return '0';
    }

    const balance = await publicClient.readContract({
      address: jpycAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });

    return formatUnits(balance, JPYC_DECIMALS);
  } catch (error) {
    console.error(`[JPYC Fuji] バランス取得エラー (${address}):`, error);
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



