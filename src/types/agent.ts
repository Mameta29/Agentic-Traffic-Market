/**
 * エージェント関連の型定義
 */

export type AgentRole = 'buyer' | 'seller';

export type AgentState = 'idle' | 'moving' | 'negotiating' | 'blocked';

export interface Agent {
  id: string;
  role: AgentRole;
  address: string; // Ethereum address
  state: AgentState;
  position: {
    lat: number;
    lng: number;
  };
  destination?: {
    lat: number;
    lng: number;
  };
  balance?: string; // JPYC balance (as string to handle BigInt)
}

export interface NegotiationMessage {
  id: string;
  from: string; // Agent ID
  to: string; // Agent ID
  message: string;
  timestamp: number;
  type: 'offer' | 'counter' | 'accept' | 'reject';
  amount?: number; // JPYC amount
}

export interface TrafficIntent {
  agentId: string;
  locationId: string;
  bidAmount: number;
  timestamp: number;
  signature?: string; // EIP-7702署名
}

