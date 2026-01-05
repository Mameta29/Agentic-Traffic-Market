import { z } from 'zod';

/**
 * ツール名
 */
export const toolName = 'evaluate_congestion';

/**
 * ツール説明
 */
export const toolDescription =
  'Evaluate traffic congestion level at a specific location to determine if negotiation is needed';

/**
 * 入力スキーマ（Zod）
 */
export const inputSchema = z.object({
  locationId: z.string().min(1, 'Location ID is required'),
});

/**
 * 型推論用
 */
export type EvaluateCongestionInput = z.infer<typeof inputSchema>;

/**
 * シミュレーション用の混雑状態ストア
 * 実際のアプリケーションではRedisやデータベースを使用
 */
const congestionStore = new Map<string, { blocked: boolean; agentId?: string }>();

/**
 * ツール実行ロジック
 */
export async function execute(input: EvaluateCongestionInput) {
  const { locationId } = input;

  console.log(`[TOOL] evaluate_congestion called for location: ${locationId}`);

  try {
    // 混雑状態の取得（シミュレーション）
    const congestion = congestionStore.get(locationId) || { blocked: false };

    const level = congestion.blocked ? 'high' : 'low';
    const needsNegotiation = congestion.blocked;

    return {
      success: true,
      locationId,
      congestionLevel: level,
      blocked: congestion.blocked,
      blockedBy: congestion.agentId,
      needsNegotiation,
      recommendation: needsNegotiation
        ? 'Path is blocked. Consider negotiating with the blocking agent.'
        : 'Path is clear. No negotiation needed.',
    };
  } catch (error) {
    console.error('[TOOL] evaluate_congestion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 混雑状態を設定（シミュレーション用ヘルパー）
 */
export function setCongestion(locationId: string, blocked: boolean, agentId?: string) {
  congestionStore.set(locationId, { blocked, agentId });
}

/**
 * 混雑状態をクリア
 */
export function clearCongestion(locationId: string) {
  congestionStore.delete(locationId);
}



