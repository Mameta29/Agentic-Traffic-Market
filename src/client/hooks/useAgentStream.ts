'use client';

import { useChat } from 'ai/react';
import { useCallback } from 'react';

/**
 * AIエージェントのストリーミング思考プロセスフック
 */
export function useAgentStream(agentId: string, role: 'buyer' | 'seller') {
  const { messages, append, isLoading, error } = useChat({
    api: '/api/agent/stream',
    body: {
      role,
      agentAddress: agentId,
    },
  });

  // エージェントに指示を送信
  const sendInstruction = useCallback(
    async (instruction: string) => {
      await append({
        role: 'user',
        content: instruction,
      });
    },
    [append]
  );

  return {
    messages,
    sendInstruction,
    isLoading,
    error,
  };
}



