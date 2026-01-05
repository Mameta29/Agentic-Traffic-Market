import 'server-only';

import { type Address, createPublicClient, http, getContract } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { env } from '../config/env';

/**
 * AgentIdentityRegistry ABI（必要な関数のみ）
 */
const agentRegistryAbi = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'exists',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAgents',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'key', type: 'string' },
    ],
    name: 'getMetadata',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Agent Card JSON の型定義
 */
export interface AgentCard {
  type: string;
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
  endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
    capabilities?: {
      tools: Array<{
        name: string;
        description: string;
        parameters?: Record<string, string>;
      }>;
    };
  }>;
  metadata: {
    role?: 'buyer' | 'seller' | 'flexible';
    rolePreference?: 'buyer' | 'seller';
    agentType: string;
    maxBidPerTransaction?: string;
    dailyLimit?: string;
    [key: string]: any;
  };
  currentContext?: {
    mission?: {
      type: string;
      priority: string;
      destinationImportance: number;
      deadline?: number | null;
    };
    negotiationStrategy?: {
      maxWillingToPay: number;
      minAcceptableOffer: number;
      patienceLevel: number;
      preferredRole?: string;
    };
  };
  constraints: {
    maxBidPerTransaction: number;
    maxDailySpend: number;
    allowedMethods: string[];
    authorizationRequired: boolean;
    eip7702Enabled: boolean;
  };
}

/**
 * Agent Registry コントラクトクライアント
 */
export function getAgentRegistryContract() {
  if (!env.agentIdentityRegistry) {
    throw new Error('AGENT_IDENTITY_REGISTRY が設定されていません');
  }

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(env.avalancheRpcUrl),
  });

  return getContract({
    address: env.agentIdentityRegistry as Address,
    abi: agentRegistryAbi,
    client: publicClient,
  });
}

/**
 * Agent NFTの所有者（ウォレットアドレス）を取得
 */
export async function getAgentWallet(agentId: number): Promise<Address> {
  const contract = getAgentRegistryContract();
  const owner = await contract.read.ownerOf([BigInt(agentId)]);
  return owner as Address;
}

/**
 * Agent Card JSON を取得
 */
export async function fetchAgentCard(agentId: number): Promise<AgentCard> {
  const contract = getAgentRegistryContract();
  const tokenURI = await contract.read.tokenURI([BigInt(agentId)]);

  console.log(`[Agent Registry] Fetching Agent Card for ID ${agentId}: ${tokenURI}`);

  // tokenURIからJSONを取得
  let cardUrl = tokenURI;

  // ローカル開発の場合、public/agent-cards/ を使用
  if (tokenURI.startsWith('ipfs://')) {
    // 本番: IPFSゲートウェイ経由
    cardUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
  } else if (tokenURI.startsWith('http://localhost') || tokenURI.startsWith('/')) {
    // ローカル開発: そのまま使用
    cardUrl = tokenURI;
  }

  try {
    const response = await fetch(cardUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent card: ${response.statusText}`);
    }
    const card = (await response.json()) as AgentCard;
    return card;
  } catch (error) {
    console.error(`[Agent Registry] Error fetching agent card:`, error);
    throw error;
  }
}

/**
 * Agent の完全な情報を取得
 */
export async function getAgentInfo(agentId: number) {
  const wallet = await getAgentWallet(agentId);
  const card = await fetchAgentCard(agentId);

  return {
    agentId,
    wallet,
    card,
    role: card.metadata.role,
    name: card.name,
    constraints: card.constraints,
  };
}

/**
 * Agent NFTが存在するか確認
 */
export async function agentExists(agentId: number): Promise<boolean> {
  try {
    const contract = getAgentRegistryContract();
    return await contract.read.exists([BigInt(agentId)]);
  } catch {
    return false;
  }
}

/**
 * 登録済みAgent数を取得
 */
export async function getTotalAgents(): Promise<number> {
  const contract = getAgentRegistryContract();
  const total = await contract.read.totalAgents();
  return Number(total);
}


