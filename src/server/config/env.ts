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

  // Multi-user Setup (User = Human, Agent = AI)
  user1Eoa: (process.env.USER_1_EOA || '') as `0x${string}`,
  user1PrivateKey: process.env.USER_1_PRIVATE_KEY || '',
  agent1Eoa: (process.env.AGENT_1_EOA || '') as `0x${string}`,
  agent1PrivateKey: process.env.AGENT_1_PRIVATE_KEY || '',

  user2Eoa: (process.env.USER_2_EOA || '') as `0x${string}`,
  user2PrivateKey: process.env.USER_2_PRIVATE_KEY || '',
  agent2Eoa: (process.env.AGENT_2_EOA || '') as `0x${string}`,
  agent2PrivateKey: process.env.AGENT_2_PRIVATE_KEY || '',

  // Legacy (backward compatibility)
  agentAPrivateKey: process.env.AGENT_A_PRIVATE_KEY || '',
  agentBPrivateKey: process.env.AGENT_B_PRIVATE_KEY || '',

  // Contract Addresses
  jpycContractAddress: (process.env.JPYC_CONTRACT_ADDRESS || '') as `0x${string}`,
  agentIdentityRegistry: (process.env.AGENT_IDENTITY_REGISTRY || '') as `0x${string}`,
  trafficAgentContract: (process.env.TRAFFIC_AGENT_CONTRACT || '') as `0x${string}`,

  // App URL (for tokenURI)
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Sepolia Network (EIP-7702 Full Implementation)
  sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  sepoliaChainId: Number.parseInt(process.env.SEPOLIA_CHAIN_ID || '11155111', 10),
  sepoliaJpycContract: (process.env.SEPOLIA_JPYC_CONTRACT || '') as `0x${string}`,
  sepoliaAgentRegistry: (process.env.SEPOLIA_AGENT_IDENTITY_REGISTRY || '') as `0x${string}`,
  sepoliaTrafficContract: (process.env.SEPOLIA_TRAFFIC_AGENT_CONTRACT || '') as `0x${string}`,

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
