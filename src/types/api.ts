/**
 * API関連の型定義
 */

import type { CoreMessage } from 'ai';

/**
 * エージェントストリームリクエスト
 */
export interface AgentStreamRequest {
  role: 'buyer' | 'seller';
  messages: CoreMessage[];
  agentAddress: string;
}

/**
 * エージェントストリームレスポンス
 * （Vercel AI SDKのストリーミング形式）
 */
export interface AgentStreamChunk {
  type: 'text' | 'tool-call' | 'tool-result';
  content: string | object;
}


