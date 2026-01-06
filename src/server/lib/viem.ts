import 'server-only';

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { avalancheFuji, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from '../config/env';

/**
 * Avalanche Fuji Testnet用のパブリッククライアント
 * ブロックチェーンの読み取り専用操作に使用
 */
export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(env.avalancheRpcUrl),
});

/**
 * Ethereum Sepolia Testnet用のパブリッククライアント
 * EIP-7702実装とJPYC残高確認に使用
 */
export const publicClientSepolia = createPublicClient({
  chain: sepolia,
  transport: http(env.sepoliaRpcUrl),
});

/**
 * プライベートキーからウォレットクライアントを作成
 * トランザクション署名と送信に使用
 */
export function createAgentWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(env.avalancheRpcUrl),
  });
}

/**
 * エージェントAのウォレットクライアント（デモ用）
 */
export function getAgentAWallet() {
  if (!env.agentAPrivateKey) {
    throw new Error('AGENT_A_PRIVATE_KEY が設定されていません');
  }
  return createAgentWalletClient(env.agentAPrivateKey as `0x${string}`);
}

/**
 * エージェントBのウォレットクライアント（デモ用）
 */
export function getAgentBWallet() {
  if (!env.agentBPrivateKey) {
    throw new Error('AGENT_B_PRIVATE_KEY が設定されていません');
  }
  return createAgentWalletClient(env.agentBPrivateKey as `0x${string}`);
}

/**
 * アドレスからウォレット取得（エージェントID解決用）
 */
export function getWalletByAddress(address: Address) {
  const agentAAccount = env.agentAPrivateKey
    ? privateKeyToAccount(env.agentAPrivateKey as `0x${string}`)
    : null;
  const agentBAccount = env.agentBPrivateKey
    ? privateKeyToAccount(env.agentBPrivateKey as `0x${string}`)
    : null;

  if (agentAAccount?.address.toLowerCase() === address.toLowerCase()) {
    return getAgentAWallet();
  }
  if (agentBAccount?.address.toLowerCase() === address.toLowerCase()) {
    return getAgentBWallet();
  }

  throw new Error(`未知のアドレス: ${address}`);
}
