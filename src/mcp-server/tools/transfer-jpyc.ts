import { z } from 'zod';
import { type Address } from 'viem';
import { getWalletByAddress } from '../../server/lib/viem';
import { parseJpycAmount } from '../../server/lib/jpyc';
import { erc20Abi, JPYC_CONTRACT_ADDRESS } from '../../server/lib/contracts';

/**
 * ツール名
 */
export const toolName = 'transfer_jpyc';

/**
 * ツール説明
 */
export const toolDescription =
  'Transfer JPYC tokens to another address on Avalanche Fuji Testnet';

/**
 * 入力スキーマ（Zod）
 */
export const inputSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid sender address'),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address'),
  amount: z.number().positive('Amount must be positive'),
});

/**
 * 型推論用
 */
export type TransferJpycInput = z.infer<typeof inputSchema>;

/**
 * ツール実行ロジック
 */
export async function execute(input: TransferJpycInput) {
  const { from, to, amount } = input;

  console.log(`[TOOL] transfer_jpyc called: ${amount} JPYC from ${from} to ${to}`);

  try {
    // 送信者のウォレットクライアント取得
    const walletClient = getWalletByAddress(from as Address);

    // JPYC金額をWei形式に変換
    const amountInWei = parseJpycAmount(amount);

    // トランザクション送信
    const hash = await walletClient.writeContract({
      address: JPYC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to as Address, amountInWei],
    });

    console.log(`[TOOL] transfer_jpyc transaction hash: ${hash}`);

    return {
      success: true,
      transactionHash: hash,
      from,
      to,
      amount,
      unit: 'JPYC',
    };
  } catch (error) {
    console.error('[TOOL] transfer_jpyc error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


