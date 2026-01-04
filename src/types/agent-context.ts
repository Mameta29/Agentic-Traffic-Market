/**
 * エージェントの動的コンテキスト型定義
 * 実運用での動的役割決定に使用
 */

export interface AgentMission {
  type: 'delivery' | 'patrol' | 'leisure' | 'emergency';
  deadline: number | null; // Unix timestamp, null = no deadline
  priority: 'high' | 'medium' | 'low';
  destinationImportance: number; // 1-10
  timeRemaining?: number; // seconds
}

export interface NegotiationStrategy {
  maxWillingToPay: number; // JPYC
  minAcceptableOffer: number; // JPYC
  patienceLevel: number; // 1-10 (1=very impatient, 10=very patient)
  preferredRole?: 'buyer' | 'seller' | 'flexible';
}

export interface AgentContext {
  agentId: number;
  nftId?: number;
  wallet: string;
  currentMission: AgentMission;
  balance: number; // JPYC
  alternativeRoutes: string[];
  negotiationHistory: NegotiationHistoryEntry[];
  strategy: NegotiationStrategy;
  currentPosition: { lat: number; lng: number };
}

export interface NegotiationHistoryEntry {
  timestamp: number;
  role: 'buyer' | 'seller';
  amount: number;
  success: boolean;
  locationId: string;
}

/**
 * AI評価結果
 */
export interface SituationEvaluation {
  agentId: number;
  willingToPay: number | null; // null = not willing to pay
  willingToAccept: number | null; // null = not willing to wait
  preferredAction: 'pay_and_pass' | 'wait_for_payment' | 'find_alternative';
  reasoning: string;
  urgencyScore: number; // 0-100
}

/**
 * マッチング結果
 */
export interface NegotiationMatch {
  success: boolean;
  buyer: AgentContext | null;
  seller: AgentContext | null;
  agreedPrice: number | null;
  method: 'direct_match' | 'compromise' | 'failed';
}


