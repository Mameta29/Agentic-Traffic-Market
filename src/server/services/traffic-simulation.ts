import 'server-only';

import type { Agent, AgentState } from '@/types/agent';
import { setCongestion, clearCongestion } from '@/mcp-server/tools/evaluate-congestion';
import { getAgentInfo, agentExists } from '../lib/agent-registry';
import { getJpycBalance, getJpycBalanceFuji } from '../lib/jpyc';
import type { Address } from 'viem';

/**
 * エージェント移動シミュレーション
 * 東京の交差点でのコリジョンを模擬
 */

// シミュレーション状態
interface SimulationState {
  agents: Map<string, Agent>;
  isRunning: boolean;
  collisionDetected: boolean;
  collisionLocation: string | null;
}

const state: SimulationState = {
  agents: new Map(),
  isRunning: false,
  collisionDetected: false,
  collisionLocation: null,
};

/**
 * エージェントの初期化
 * Agent NFT (ERC-8004) から情報を取得
 */
export async function initializeAgents(): Promise<Agent[]> {
  console.log('[Simulation] Initializing agents from blockchain...');

  try {
    // Agent NFT #1 と #2 が登録済みか確認
    const agent1Exists = await agentExists(1);
    const agent2Exists = await agentExists(2);

    let agents: Agent[];

    if (agent1Exists && agent2Exists) {
      // ブロックチェーンからAgent情報を取得
      console.log('[Simulation] Loading agents from NFT Registry...');
      
      const agent1Info = await getAgentInfo(1);
      const agent2Info = await getAgentInfo(2);

      // 実際のJPYC残高を取得（両ネットワーク）
      const balance1Sepolia = await getJpycBalance(agent1Info.wallet as Address);
      const balance2Sepolia = await getJpycBalance(agent2Info.wallet as Address);
      const balance1Fuji = await getJpycBalanceFuji(agent1Info.wallet as Address);
      const balance2Fuji = await getJpycBalanceFuji(agent2Info.wallet as Address);

      console.log(`[Simulation] Agent A balance: ${balance1Sepolia} JPYC (Sepolia), ${balance1Fuji} JPYC (Fuji)`);
      console.log(`[Simulation] Agent B balance: ${balance2Sepolia} JPYC (Sepolia), ${balance2Fuji} JPYC (Fuji)`);

      agents = [
        {
          id: 'agent-1',
          role: (agent1Info.role as 'buyer' | 'seller') || 'buyer',
          address: agent1Info.wallet,
          state: 'idle',
          position: { lat: 35.65, lng: 139.60 }, // 左下（大きく離す）
          destination: { lat: 35.75, lng: 139.85 }, // 右上へ
          balance: balance1Sepolia, // Sepolia残高
          balanceFuji: balance1Fuji, // Fuji残高
        },
        {
          id: 'agent-2',
          role: (agent2Info.role as 'buyer' | 'seller') || 'seller',
          address: agent2Info.wallet,
          state: 'idle',
          position: { lat: 35.75, lng: 139.85 }, // 右上からスタート
          destination: { lat: 35.65, lng: 139.60 }, // 左下へ
          balance: balance2Sepolia, // Sepolia残高
          balanceFuji: balance2Fuji, // Fuji残高
        },
      ];

      console.log('[Simulation] Loaded agents from NFT:', {
        agent1: { 
          id: 1, 
          wallet: agent1Info.wallet, 
          role: agent1Info.role, 
          balanceSepolia: balance1Sepolia,
          balanceFuji: balance1Fuji
        },
        agent2: { 
          id: 2, 
          wallet: agent2Info.wallet, 
          role: agent2Info.role, 
          balanceSepolia: balance2Sepolia,
          balanceFuji: balance2Fuji
        },
      });
    } else {
      // Agent NFTが未登録の場合、デフォルト値を使用（開発時）
      console.warn('[Simulation] Agent NFTs not found, using default demo agents');
      
      const defaultAddress1 = '0xE2F2E032B02584e81437bA8Df18F03d6771F9d23' as Address; // User 1 EOA
      const defaultAddress2 = '0xF2431b618B5b02923922c525885DBfFcdb9DE853' as Address; // User 2 EOA

      // デフォルトアドレスの実際の残高を取得（両ネットワーク）
      const balance1Sepolia = await getJpycBalance(defaultAddress1);
      const balance2Sepolia = await getJpycBalance(defaultAddress2);
      const balance1Fuji = await getJpycBalanceFuji(defaultAddress1);
      const balance2Fuji = await getJpycBalanceFuji(defaultAddress2);

      console.log(`[Simulation] Default Agent A balance: ${balance1Sepolia} JPYC (Sepolia), ${balance1Fuji} JPYC (Fuji)`);
      console.log(`[Simulation] Default Agent B balance: ${balance2Sepolia} JPYC (Sepolia), ${balance2Fuji} JPYC (Fuji)`);
      
      agents = [
        {
          id: 'agent-a',
          role: 'buyer',
          address: defaultAddress1,
          state: 'idle',
          position: { lat: 35.65, lng: 139.60 },
          destination: { lat: 35.75, lng: 139.85 },
          balance: balance1Sepolia, // Sepolia残高
          balanceFuji: balance1Fuji, // Fuji残高
        },
        {
          id: 'agent-b',
          role: 'seller',
          address: defaultAddress2,
          state: 'idle',
          position: { lat: 35.75, lng: 139.85 },
          destination: { lat: 35.65, lng: 139.60 },
          balance: balance2Sepolia, // Sepolia残高
          balanceFuji: balance2Fuji, // Fuji残高
        },
      ];
    }

    // 状態に保存
    agents.forEach((agent) => state.agents.set(agent.id, agent));

    return agents;
  } catch (error) {
    console.error('[Simulation] Error initializing agents:', error);
    
    // エラー時はデフォルトエージェントを返す
    const defaultAgents: Agent[] = [
      {
        id: 'agent-a',
        role: 'buyer',
        address: '0x1234567890123456789012345678901234567890',
        state: 'idle',
        position: { lat: 35.6762, lng: 139.6503 },
        destination: { lat: 35.6812, lng: 139.7671 },
        balance: '5000',
      },
      {
        id: 'agent-b',
        role: 'seller',
        address: '0x0987654321098765432109876543210987654321',
        state: 'idle',
        position: { lat: 35.6812, lng: 139.7671 },
        destination: { lat: 35.6762, lng: 139.6503 },
        balance: '3000',
      },
    ];

    defaultAgents.forEach((agent) => state.agents.set(agent.id, agent));
    return defaultAgents;
  }
}

/**
 * エージェントの状態を取得
 */
export function getAgents(): Agent[] {
  return Array.from(state.agents.values());
}

/**
 * エージェントの状態を更新
 */
export function updateAgentState(agentId: string, updates: Partial<Agent>): Agent | null {
  const agent = state.agents.get(agentId);
  if (!agent) return null;

  const updated = { ...agent, ...updates };
  state.agents.set(agentId, updated);
  return updated;
}

/**
 * エージェント移動シミュレーションを開始
 */
export async function startSimulation(): Promise<void> {
  if (state.isRunning) {
    console.log('[Simulation] Already running');
    return;
  }

  console.log('[Simulation] Starting traffic simulation...');
  
  // エージェントが初期化されていない場合は初期化
  if (state.agents.size === 0) {
    console.log('[Simulation] Agents not initialized, initializing now...');
    await initializeAgents();
  }
  
  state.isRunning = true;

  // 実際のエージェントIDを取得して移動開始
  const agentIds = Array.from(state.agents.keys());
  if (agentIds.length >= 2) {
    updateAgentState(agentIds[0], { state: 'moving' });
    updateAgentState(agentIds[1], { state: 'idle' });
    console.log(`[Simulation] Started movement: ${agentIds[0]} moving, ${agentIds[1]} idle`);
  }

  // 2秒後にコリジョンを発生させる
  setTimeout(() => {
    triggerCollision();
  }, 2000);
}

/**
 * コリジョン（衝突）を発生させる
 * Agent AとAgent Bが同じ場所に到達
 */
function triggerCollision(): void {
  console.log('[Simulation] 🚨 COLLISION DETECTED at intersection LOC_001');

  // コリジョン地点（中間地点）
  const collisionPoint = { lat: 35.70, lng: 139.725 };

  // Agent A, BのIDを正しく使用
  const agent1 = state.agents.get('agent-1') || state.agents.get('agent-a');
  const agent2 = state.agents.get('agent-2') || state.agents.get('agent-b');

  if (agent1) {
    updateAgentState(agent1.id, {
      state: 'blocked',
      position: collisionPoint,
    });
  }

  if (agent2) {
    updateAgentState(agent2.id, {
      state: 'idle',
      position: collisionPoint,
    });
  }

  // 混雑状態を設定
  setCongestion('LOC_001', true, 'agent-b');

  state.collisionDetected = true;
  state.collisionLocation = 'LOC_001';

  console.log('[Simulation] Both agents stopped at collision point');
  console.log('[Simulation] Waiting for negotiation to start...');
}

/**
 * ネゴシエーション成立後の解決
 * Agent Bが道を譲る
 */
export async function resolveCollision(agentId: string): Promise<void> {
  console.log('[Simulation] resolveCollision called with:', agentId);
  console.log('[Simulation] Current collision state:', {
    detected: state.collisionDetected,
    location: state.collisionLocation,
    agents: Array.from(state.agents.keys())
  });
  
  // エージェントが存在しない場合は再初期化を試みる
  if (state.agents.size === 0) {
    console.warn('[Simulation] WARNING: state.agents is empty! Attempting to re-initialize...');
    await initializeAgents();
    
    // 再初期化後も空の場合はスキップ
    if (state.agents.size === 0) {
      console.error('[Simulation] ERROR: Failed to initialize agents. Cannot execute animation.');
      return;
    }
    
    console.log('[Simulation] Successfully re-initialized agents:', Array.from(state.agents.keys()));
  }
  
  console.log(`[Simulation] ✅ Resolving collision - ${agentId} moves aside`);
  
  // agentIdをそのまま使用（agent-1, agent-2など）
  const sellerAgent = state.agents.get(agentId);
  
  // Buyerを特定（Sellerではない方）
  let buyerAgentId: string | undefined;
  for (const [id, agent] of state.agents.entries()) {
    if (id !== agentId) {
      buyerAgentId = id;
      break;
    }
  }
  
  console.log('[Simulation] Resolved IDs:', { 
    seller: agentId, 
    sellerFound: !!sellerAgent,
    buyer: buyerAgentId 
  });
  
  if (!sellerAgent) {
    console.error(`[Simulation] ERROR: Seller agent '${agentId}' not found in state.agents!`);
    console.error('[Simulation] Available agents:', Array.from(state.agents.keys()));
    return;
  }
  
  if (!buyerAgentId) {
    console.error('[Simulation] ERROR: Buyer agent not found!');
    return;
  }

  // 1. Sellerは少し横にずれて待機
  setTimeout(() => {
    updateAgentState(agentId, {
      state: 'idle',
      position: { lat: 35.70, lng: 139.76 },
    });
    console.log(`[Simulation] Seller (${agentId}) moved aside, waiting...`);
  }, 500);

  // 2. Buyerが通過（1秒後から開始）
  setTimeout(() => {
    const agent = state.agents.get(buyerAgentId);
    if (agent) {
      updateAgentState(buyerAgentId, {
        state: 'moving',
        position: { lat: 35.72, lng: 139.75 },
      });
      console.log(`[Simulation] Buyer (${buyerAgentId}) passing through...`);
    }
  }, 1000);

  // 3秒後: Buyerが目的地近くへ
  setTimeout(() => {
    const agent = state.agents.get(buyerAgentId);
    if (agent) {
      updateAgentState(buyerAgentId, {
        state: 'moving',
        position: { lat: 35.74, lng: 139.82 },
      });
    }
  }, 3000);

  // 5秒後: Buyerが目的地到達
  setTimeout(() => {
    const agent = state.agents.get(buyerAgentId);
    if (agent) {
      updateAgentState(buyerAgentId, {
        state: 'idle',
        position: agent.destination || { lat: 35.75, lng: 139.85 },
      });
      console.log(`[Simulation] ✅ Buyer (${buyerAgentId}) reached destination`);
    }
  }, 5000);

  // 6秒後: Sellerが目的地に向かう
  setTimeout(() => {
    if (sellerAgent?.destination) {
      updateAgentState(agentId, {
        state: 'moving',
        position: sellerAgent.destination,
      });
      console.log(`[Simulation] Seller (${agentId}) resuming journey`);
    }
  }, 6000);

  // 8秒後: シミュレーション停止
  setTimeout(() => {
    stopSimulation();
  }, 8000);

  // 混雑状態をクリア（アニメーション完了後）
  setTimeout(() => {
    if (state.collisionLocation) {
      clearCongestion(state.collisionLocation);
    }
    state.collisionDetected = false;
    state.collisionLocation = null;
    console.log('[Simulation] Collision state cleared.');
  }, 8500);

  console.log('[Simulation] Collision resolved. Traffic flowing.');
}

/**
 * シミュレーションを停止
 */
export function stopSimulation(): void {
  console.log('[Simulation] Stopping simulation');
  state.isRunning = false;
  state.collisionDetected = false;
  state.collisionLocation = null;
}

/**
 * シミュレーション状態を取得
 */
export async function getSimulationState() {
  // エージェントが初期化されていない場合は初期化
  if (state.agents.size === 0) {
    console.log('[Simulation] getSimulationState: Agents not initialized, initializing now...');
    await initializeAgents();
  }
  
  return {
    isRunning: state.isRunning,
    collisionDetected: state.collisionDetected,
    collisionLocation: state.collisionLocation,
    agents: getAgents(),
  };
}

/**
 * シミュレーションをリセット
 */
export function resetSimulation(): void {
  stopSimulation();
  state.agents.clear();
  initializeAgents();
  console.log('[Simulation] Reset complete');
}
