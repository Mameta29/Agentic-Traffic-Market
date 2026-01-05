import { z } from 'zod';
import { type Address } from 'viem';
import { getWalletByAddress } from '../../server/lib/viem';

/**
 * ツール名
 */
export const toolName = 'sign_traffic_intent';

/**
 * ツール説明
 */
export const toolDescription =
  'Sign a traffic right-of-way intent using EIP-7702/ERC-8004 delegation pattern';

/**
 * 入力スキーマ（Zod）
 */
export const inputSchema = z.object({
  agentAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid agent address'),
  bidAmount: z.number().positive('Bid amount must be positive'),
  locationId: z.string().min(1, 'Location ID is required'),
});

/**
 * 型推論用
 */
export type SignTrafficIntentInput = z.infer<typeof inputSchema>;

/**
 * ツール実行ロジック
 * 注: これはEIP-7702/ERC-8004のデモ実装です
 * 実際の実装では、適切なメッセージ形式と署名検証が必要です
 */
export async function execute(input: SignTrafficIntentInput) {
  const { agentAddress, bidAmount, locationId } = input;

  console.log(
    `[TOOL] sign_traffic_intent called: ${bidAmount} JPYC for location ${locationId}`
  );

  try {
    // エージェントのウォレット取得
    const walletClient = getWalletByAddress(agentAddress as Address);

    // EIP-7702インテントメッセージの構築
    const message = {
      type: 'TrafficIntent',
      agent: agentAddress,
      location: locationId,
      bidAmount,
      timestamp: Date.now(),
      chainId: 43113, // Avalanche Fuji
    };

    // メッセージのハッシュ化と署名
    const messageString = JSON.stringify(message);
    const signature = await walletClient.signMessage({
      message: messageString,
    });

    console.log(`[TOOL] sign_traffic_intent signature created`);

    return {
      success: true,
      signature,
      intent: message,
      message: `Traffic intent signed for location ${locationId} with bid ${bidAmount} JPYC`,
    };
  } catch (error) {
    console.error('[TOOL] sign_traffic_intent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}



