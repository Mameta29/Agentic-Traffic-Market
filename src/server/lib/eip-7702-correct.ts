import 'server-only';

import { type Address, type Hash, parseUnits, createPublicClient, createWalletClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from '../config/env';
import { getAuthorization } from './authorization-store';
import authorizationsSepolia from './authorizations-sepolia.json';

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
  locationId: string,
  network: 'fuji' | 'sepolia' = 'sepolia'
): Promise<Hash> {
  console.log('[EIP-7702] Correct implementation executing...');
  console.log(`  Network: ${network}`);
  console.log(`  Agent Private Key: ${agentPrivateKey.substring(0, 10)}...`);
  console.log(`  User EOA (target): ${userEOA}`);
  console.log(`  Seller: ${sellerAddress}`);
  console.log(`  Amount: ${bidAmount} JPYC`);

  // ネットワークに応じた設定
  const chain = network === 'sepolia' ? sepolia : avalancheFuji;
  const rpcUrl = network === 'sepolia' ? env.sepoliaRpcUrl : env.avalancheRpcUrl;
  const trafficContract = network === 'sepolia' ? env.sepoliaTrafficContract : env.trafficAgentContract;

  if (!trafficContract) {
    throw new Error(`${network.toUpperCase()}_TRAFFIC_AGENT_CONTRACT not configured`);
  }

  try {
    // Agent のウォレットクライアント作成（ネットワーク指定）
    const agentAccount = privateKeyToAccount(agentPrivateKey);
    const agentWalletClient = createWalletClient({
      account: agentAccount,
      chain,
      transport: http(rpcUrl),
    });

    console.log(`  Agent EOA: ${agentAccount.address}`);
    console.log(`  RPC URL: ${rpcUrl}`);

    // Authorization取得（ネットワーク別）
    const authorization = network === 'sepolia'
      ? (authorizationsSepolia.user1.userEOA.toLowerCase() === userEOA.toLowerCase()
          ? authorizationsSepolia.user1.authorization
          : authorizationsSepolia.user2.authorization)
      : getAuthorization(userEOA);

    if (!authorization) {
      throw new Error(`No authorization found for ${userEOA} on ${network}`);
    }

    console.log('[EIP-7702] Using pre-signed authorization');
    console.log('[EIP-7702] Authorization ChainID:', authorization.chainId);

    // 金額をWei形式に変換（小数点対応）
    const amountInWei = parseUnits(bidAmount.toFixed(2), 18);

    console.log('[EIP-7702] Transaction details:', {
      agentEOA: agentAccount.address,
      userEOA: userEOA,
      contract: trafficContract,
      amountWei: amountInWei.toString(),
    });

    // Phase 2実装: authorizationListで User EOA を呼び出し
    const hash = await agentWalletClient.writeContract({
      account: agentAccount,          // Agent EOA
      address: userEOA,               // User EOA（target!）
      abi: trafficAgentAbi,
      functionName: 'bidForRightOfWay',
      args: [sellerAddress, amountInWei, locationId],
      authorizationList: [authorization as any], // EIP-7702!
    });

    console.log(`[EIP-7702] Transaction hash: ${hash}`);

    // トランザクション確認（ネットワーク別クライアント）
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[EIP-7702] Transaction confirmed in block ${receipt.blockNumber}`);

    return hash;
  } catch (error) {
    console.error('[EIP-7702] Transaction failed:', error);
    throw error;
  }
}

