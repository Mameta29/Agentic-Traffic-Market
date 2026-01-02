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

  // Agent Private Keys (デモ用)
  agentAPrivateKey: process.env.AGENT_A_PRIVATE_KEY || '',
  agentBPrivateKey: process.env.AGENT_B_PRIVATE_KEY || '',

  // JPYC Contract
  jpycContractAddress: (process.env.JPYC_CONTRACT_ADDRESS || '') as `0x${string}`,

  // Redis (オプション)
  redisUrl: process.env.REDIS_URL,
} as const;

// 必須環境変数のバリデーション (開発時)
if (process.env.NODE_ENV !== 'production') {
  const missing: string[] = [];

  if (!env.googleApiKey && !env.googleCloudProject) {
    missing.push('GOOGLE_GENERATIVE_AI_API_KEY または GOOGLE_CLOUD_PROJECT');
  }

  if (missing.length > 0) {
    console.warn(`⚠️  以下の環境変数が設定されていません: ${missing.join(', ')}`);
    console.warn('デモ機能が制限される可能性があります。');
  }
}

