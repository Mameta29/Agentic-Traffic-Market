import { z } from 'zod';

/**
 * ツール名
 */
export const toolName = 'negotiate_message';

/**
 * ツール説明
 */
export const toolDescription =
  'Send a negotiation message to another agent for traffic right-of-way purchase';

/**
 * 入力スキーマ（Zod）
 */
export const inputSchema = z.object({
  from: z.string().min(1, 'Sender agent ID is required'),
  to: z.string().min(1, 'Recipient agent ID is required'),
  message: z.string().min(1, 'Message cannot be empty'),
  offerAmount: z.number().positive().optional(),
});

/**
 * 型推論用
 */
export type NegotiateMessageInput = z.infer<typeof inputSchema>;

/**
 * メッセージストア（シミュレーション用）
 * 実際のアプリケーションではSocket.ioやRedis Pub/Subを使用
 */
interface StoredMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  offerAmount?: number;
  timestamp: number;
  status: 'pending' | 'read' | 'accepted' | 'rejected';
}

const messageStore = new Map<string, StoredMessage[]>();

/**
 * ツール実行ロジック
 */
export async function execute(input: NegotiateMessageInput) {
  const { from, to, message, offerAmount } = input;

  console.log(`[TOOL] negotiate_message from ${from} to ${to}: "${message}"`);

  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const storedMessage: StoredMessage = {
      id: messageId,
      from,
      to,
      message,
      offerAmount,
      timestamp: Date.now(),
      status: 'pending',
    };

    // メッセージを保存
    const agentMessages = messageStore.get(to) || [];
    agentMessages.push(storedMessage);
    messageStore.set(to, agentMessages);

    console.log(`[TOOL] negotiate_message stored with ID: ${messageId}`);

    return {
      success: true,
      messageId,
      from,
      to,
      message,
      offerAmount,
      status: 'sent',
      timestamp: storedMessage.timestamp,
    };
  } catch (error) {
    console.error('[TOOL] negotiate_message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * エージェントのメッセージを取得（ヘルパー関数）
 */
export function getMessagesForAgent(agentId: string): StoredMessage[] {
  return messageStore.get(agentId) || [];
}

/**
 * メッセージステータスを更新
 */
export function updateMessageStatus(
  messageId: string,
  status: StoredMessage['status']
): boolean {
  for (const messages of messageStore.values()) {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      message.status = status;
      return true;
    }
  }
  return false;
}



