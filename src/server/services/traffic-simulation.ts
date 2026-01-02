import 'server-only';

import type { Agent, AgentState } from '@/types/agent';
import { setCongestion, clearCongestion } from '@/mcp-server/tools/evaluate-congestion';

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
 */
export function initializeAgents(): Agent[] {
  const agents: Agent[] = [
    {
      id: 'agent-a',
      role: 'buyer',
      address: '0x1234567890123456789012345678901234567890', // デモ用
      state: 'idle',
      position: { lat: 35.6762, lng: 139.6503 }, // 東京駅
      destination: { lat: 35.6812, lng: 139.7671 }, // 目的地
      balance: '5000',
    },
    {
      id: 'agent-b',
      role: 'seller',
      address: '0x0987654321098765432109876543210987654321', // デモ用
      state: 'idle',
      position: { lat: 35.6812, lng: 139.7671 }, // 目的地（Agent Aと交差）
      destination: { lat: 35.6762, lng: 139.6503 },
      balance: '3000',
    },
  ];

  // 状態に保存
  agents.forEach((agent) => state.agents.set(agent.id, agent));

  return agents;
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

  // コリジョン地点（中間地点）
  const collisionPoint = { lat: 35.6787, lng: 139.7587 };

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
