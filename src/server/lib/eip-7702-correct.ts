import 'server-only';

import { type Address, type Hash, parseUnits } from 'viem';
import { createAgentWalletClient, publicClient } from './viem';
import { env } from '../config/env';
import { createDemoAuthorization } from './authorization-store';

/**
 * 正しいEIP-7702実装
 * 
 * Agent が User EOA を呼び出す（User秘密鍵は不要）
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
] as const;

/**
 * 正しいEIP-7702フロー
 * 
 * @param agentPrivateKey Agent の秘密鍵（サーバーが保持）
 * @param userEOA User EOAアドレス（呼び出し先）
 * @param sellerAddress 支払い先
 * @param bidAmount 金額（JPYC、小数点対応）
 * @param locationId 場所
 */
export async function executeEIP7702BidCorrect(
  agentPrivateKey: `0x${string}`,
  userEOA: Address,
  sellerAddress: Address,
  bidAmount: number,
  locationId: string
): Promise<Hash> {
  console.log('[EIP-7702] Correct implementation executing...');
  console.log(`  Agent Private Key: ${agentPrivateKey.substring(0, 10)}...`);
  console.log(`  User EOA (target): ${userEOA}`);
  console.log(`  Seller: ${sellerAddress}`);
  console.log(`  Amount: ${bidAmount} JPYC`);

  if (!env.trafficAgentContract) {
    throw new Error('TRAFFIC_AGENT_CONTRACT not configured');
  }

  try {
    // Agent のウォレットクライアント作成
    const agentWalletClient = createAgentWalletClient(agentPrivateKey);
    const agentAccount = agentWalletClient.account;

    console.log(`  Agent EOA: ${agentAccount.address}`);

    // Authorization取得（デモ用: 自動作成）
    // 実運用では、Userがフロントエンドで署名したものを取得
    const authorization = createDemoAuthorization(userEOA, env.trafficAgentContract);
    console.log('[EIP-7702] Using demo authorization (User would sign this in production)');

    // 金額をWei形式に変換（小数点対応）
    const amountInWei = parseUnits(bidAmount.toFixed(2), 18);

    console.log('[EIP-7702] Transaction details:', {
      from: agentAccount.address,
      to: env.trafficAgentContract,
      amountWei: amountInWei.toString(),
    });

    // 現在のPhase: 直接コントラクト呼び出し
    // TODO Phase 2: User EOA を authorizationList で呼び出し
    const hash = await agentWalletClient.writeContract({
      address: env.trafficAgentContract,
      abi: trafficAgentAbi,
      functionName: 'bidForRightOfWay',
      args: [sellerAddress, amountInWei, locationId],
      // authorizationList: [authorization], // Phase 2で実装
    });

    console.log(`[EIP-7702] Transaction hash: ${hash}`);

    // トランザクション確認
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[EIP-7702] Transaction confirmed in block ${receipt.blockNumber}`);

    return hash;
  } catch (error) {
    console.error('[EIP-7702] Transaction failed:', error);
    throw error;
  }
}

