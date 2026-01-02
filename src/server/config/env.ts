import 'server-only';

/**
 * サーバー側環境変数の型安全なアクセス
 */

export const env = {
  // Google Vertex AI
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || '',
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',

  // Avalanche
  avalancheRpcUrl:
    process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
  chainId: Number.parseInt(process.env.CHAIN_ID || '43113', 10),

  // Agent Private Keys (デモ用 - Phase 1)
  agentAPrivateKey: process.env.AGENT_A_PRIVATE_KEY || '',
  agentBPrivateKey: process.env.AGENT_B_PRIVATE_KEY || '',

  // Contract Addresses (Foundryデプロイ後に設定)
  jpycContractAddress: (process.env.JPYC_CONTRACT_ADDRESS || '') as `0x${string}`,
  agentIdentityRegistry: (process.env.AGENT_IDENTITY_REGISTRY || '') as `0x${string}`,
  trafficAgentContract: (process.env.TRAFFIC_AGENT_CONTRACT || '') as `0x${string}`,

  // Redis (オプション)
  redisUrl: process.env.REDIS_URL,
} as const;

// 必須環境変数のバリデーション (開発時)
if (process.env.NODE_ENV !== 'production') {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!env.googleApiKey && !env.googleCloudProject) {
    missing.push('GOOGLE_GENERATIVE_AI_API_KEY または GOOGLE_CLOUD_PROJECT');
  }

  // Phase 2では必須
  if (!env.agentIdentityRegistry) {
    warnings.push(
      'AGENT_IDENTITY_REGISTRY (Foundryでデプロイ後に設定してください)'
    );
  }

  if (!env.trafficAgentContract) {
    warnings.push(
      'TRAFFIC_AGENT_CONTRACT (Foundryでデプロイ後に設定してください)'
    );
  }

  if (!env.jpycContractAddress || env.jpycContractAddress === '0x0000000000000000000000000000000000000000') {
    warnings.push(
      'JPYC_CONTRACT_ADDRESS (MockJPYCデプロイ後に設定してください)'
    );
  }

  if (missing.length > 0) {
    console.warn(`⚠️  以下の環境変数が設定されていません: ${missing.join(', ')}`);
    console.warn('デモ機能が制限される可能性があります。');
  }

  if (warnings.length > 0) {
    console.warn(`💡 推奨: ${warnings.join(', ')}`);
  }
}
