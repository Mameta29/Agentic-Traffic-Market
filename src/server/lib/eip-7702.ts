import 'server-only';

import { type Address, type Hash, parseUnits } from 'viem';
import { createAgentWalletClient, publicClient } from './viem';
import { env } from '../config/env';

/**
 * TrafficAgentContract ABI（EIP-7702で使用）
 */
const trafficAgentAbi = [
  {
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'locationId', type: 'string' },
    ],
    name: 'bidForRightOfWay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRemainingDailyLimit',
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'isAgentWhitelisted',
    outputs: [{ name: 'isWhitelisted', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * EIP-7702 Authorization情報の型
 */
export interface EIP7702Authorization {
  chainId: number;
  address: Address;
  nonce: bigint;
  yParity: number;
  r: string;
  s: string;
}

/**
 * EIP-7702を使用して制約付きでJPYC送金を実行
 * 
 * @param userPrivateKey ユーザーの秘密鍵（EIP-7702でコードを設定するEOA）
 * @param sellerAddress 支払い先（売り手エージェント）
 * @param bidAmount 支払い額（JPYC、数値）
 * @param locationId 通行権の場所ID
 * @returns トランザクションハッシュ
 */
export async function executeEIP7702Bid(
  userPrivateKey: `0x${string}`,
  sellerAddress: Address,
  bidAmount: number,
  locationId: string
): Promise<Hash> {
  console.log('[EIP-7702] Executing constrained bid...');
  console.log(`  Seller: ${sellerAddress}`);
  console.log(`  Amount: ${bidAmount} JPYC`);
  console.log(`  Location: ${locationId}`);

  if (!env.trafficAgentContract) {
    throw new Error('TRAFFIC_AGENT_CONTRACT が設定されていません');
  }

  try {
    // ユーザーのウォレットクライアント作成
    const walletClient = createAgentWalletClient(userPrivateKey);
    const userAccount = walletClient.account;

    console.log(`  User EOA: ${userAccount.address}`);

    // ⚠️ 注意: viem v2.xの実験的機能を使用
    // 現時点ではviemのEIP-7702サポートが限定的なため、
    // まずは通常のコントラクト呼び出しとして実装
    // TODO: viemの正式サポート後に signAuthorization を使用

    // JPYC金額をWei形式に変換
    const amountInWei = parseUnits(bidAmount.toString(), 18);

    // TrafficAgentContractのbidForRightOfWayを呼び出す
    // （Phase 2では、ここでEIP-7702 authorizationListを含める）
    const hash = await walletClient.writeContract({
      address: env.trafficAgentContract,
      abi: trafficAgentAbi,
      functionName: 'bidForRightOfWay',
      args: [sellerAddress, amountInWei, locationId],
      // authorizationList: [authorization], // TODO: EIP-7702完全実装時
    });

    console.log(`[EIP-7702] Transaction hash: ${hash}`);

    // トランザクション確認待ち
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[EIP-7702] Transaction confirmed in block ${receipt.blockNumber}`);

    return hash;
  } catch (error) {
    console.error('[EIP-7702] Transaction failed:', error);
    throw error;
  }
}

/**
 * 残りの日次制限額を取得
 */
export async function getRemainingDailyLimit(userAddress: Address): Promise<string> {
  if (!env.trafficAgentContract) {
    return '0';
  }

  try {
    // TrafficAgentContractから取得
    // Note: EIP-7702が完全実装されたら、userAddressに設定されたコントラクトを読む
    const remaining = await publicClient.readContract({
      address: env.trafficAgentContract,
      abi: trafficAgentAbi,
      functionName: 'getRemainingDailyLimit',
    });

    return (Number(remaining) / 10 ** 18).toString();
  } catch (error) {
    console.error('[EIP-7702] Error getting remaining limit:', error);
    return '0';
  }
}

/**
 * AIエージェントがホワイトリストに登録されているか確認
 */
export async function isAgentWhitelisted(agentAddress: Address): Promise<boolean> {
  if (!env.trafficAgentContract) {
    return false;
  }

  try {
    const isWhitelisted = await publicClient.readContract({
      address: env.trafficAgentContract,
      abi: trafficAgentAbi,
      functionName: 'isAgentWhitelisted',
      args: [agentAddress],
    });

    return isWhitelisted;
  } catch (error) {
    console.error('[EIP-7702] Error checking whitelist:', error);
    return false;
  }
}


