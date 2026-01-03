import 'server-only';

import type { Agent, AgentState } from '@/types/agent';
import { setCongestion, clearCongestion } from '@/mcp-server/tools/evaluate-congestion';
import { getAgentInfo, agentExists } from '../lib/agent-registry';

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

      agents = [
        {
          id: 'agent-1',
          role: agent1Info.role,
          address: agent1Info.wallet,
          state: 'idle',
          position: { lat: 35.65, lng: 139.60 }, // 左下（大きく離す）
          destination: { lat: 35.75, lng: 139.85 }, // 右上へ
          balance: '5000',
        },
        {
          id: 'agent-2',
          role: agent2Info.role,
          address: agent2Info.wallet,
          state: 'idle',
          position: { lat: 35.75, lng: 139.85 }, // 右上からスタート
          destination: { lat: 35.65, lng: 139.60 }, // 左下へ
          balance: '3000',
        },
      ];

      console.log('[Simulation] Loaded agents from NFT:', {
        agent1: { id: 1, wallet: agent1Info.wallet, role: agent1Info.role },
        agent2: { id: 2, wallet: agent2Info.wallet, role: agent2Info.role },
      });
    } else {
      // Agent NFTが未登録の場合、デフォルト値を使用（開発時）
      console.warn('[Simulation] Agent NFTs not found, using default demo agents');
      
      agents = [
        {
          id: 'agent-a',
          role: 'buyer',
          address: '0x1234567890123456789012345678901234567890', // デモ用
          state: 'idle',
          position: { lat: 35.6762, lng: 139.6503 },
          destination: { lat: 35.6812, lng: 139.7671 },
          balance: '5000',
        },
        {
          id: 'agent-b',
          role: 'seller',
          address: '0x0987654321098765432109876543210987654321', // デモ用
          state: 'idle',
          position: { lat: 35.6812, lng: 139.7671 },
          destination: { lat: 35.6762, lng: 139.6503 },
          balance: '3000',
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
  state.isRunning = true;

  // Agent Aを移動開始
  updateAgentState('agent-a', { state: 'moving' });
  updateAgentState('agent-b', { state: 'idle' });

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

  // コリジョン地点（中間地点）- 2つの初期位置の中間
  const collisionPoint = { lat: 35.70, lng: 139.725 };

  // Agent Aを停止
  updateAgentState('agent-a', {
    state: 'blocked',
    position: collisionPoint,
  });

  // Agent Bも停止（ブロッカー）
  updateAgentState('agent-b', {
    state: 'idle',
    position: collisionPoint,
  });

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
export function resolveCollision(agentId: string): void {
  if (!state.collisionDetected) {
    console.log('[Simulation] No collision to resolve');
    return;
  }

  console.log(`[Simulation] ✅ Resolving collision - ${agentId} moves aside`);

  // Agent Bが移動
  if (agentId === 'agent-b') {
    updateAgentState('agent-b', {
      state: 'moving',
      position: { lat: 35.6787, lng: 139.7600 }, // 少し横にずれる
    });
  }

  // Agent Aが進行再開
  updateAgentState('agent-a', {
    state: 'moving',
  });

  // 混雑状態をクリア
  if (state.collisionLocation) {
    clearCongestion(state.collisionLocation);
  }

  state.collisionDetected = false;
  state.collisionLocation = null;

  console.log('[Simulation] Collision resolved. Agent A proceeding to destination.');

  // 5秒後に目的地到達
  setTimeout(() => {
    updateAgentState('agent-a', {
      state: 'idle',
      position: { lat: 35.6812, lng: 139.7671 },
    });
    console.log('[Simulation] ✅ Agent A reached destination');
    stopSimulation();
  }, 5000);
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
export function getSimulationState() {
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
