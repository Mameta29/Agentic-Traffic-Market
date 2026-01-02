'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

/**
 * Socket.ioクライアント接続フック
 * リアルタイムエージェント通信に使用
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Socket.ioクライアント初期化
    const socketInstance = io({
      path: '/socket.io',
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.io] Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket.io] Disconnected');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // エージェント位置を送信
  const emitAgentPosition = useCallback(
    (agentId: string, lat: number, lng: number) => {
      socket?.emit('agent:position', { agentId, lat, lng });
    },
    [socket]
  );

  // エージェント状態を送信
  const emitAgentState = useCallback(
    (agentId: string, state: string) => {
      socket?.emit('agent:state', { agentId, state });
    },
    [socket]
  );

  // ネゴシエーションメッセージを送信
  const emitAgentMessage = useCallback(
    (from: string, to: string, message: string) => {
      socket?.emit('agent:message', { from, to, message });
    },
    [socket]
  );

  return {
    socket,
    isConnected,
    emitAgentPosition,
    emitAgentState,
    emitAgentMessage,
  };
}

