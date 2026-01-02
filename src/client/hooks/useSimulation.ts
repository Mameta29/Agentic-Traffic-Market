'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent } from '@/types/agent';

interface SimulationState {
  isRunning: boolean;
  collisionDetected: boolean;
  collisionLocation: string | null;
  agents: Agent[];
}

/**
 * シミュレーション制御フック
 */
export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    collisionDetected: false,
    collisionLocation: null,
    agents: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // 状態を定期的にポーリング
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/simulation');
        const data = await response.json();
        setState(data);
      } catch (error) {
        console.error('[useSimulation] Polling error:', error);
      }
    }, 1000); // 1秒ごと

    return () => clearInterval(interval);
  }, []);

  // シミュレーション初期化
  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      });
      const data = await response.json();
      console.log('[useSimulation] Initialized:', data);
    } catch (error) {
      console.error('[useSimulation] Initialize error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // シミュレーション開始
  const start = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();
      console.log('[useSimulation] Started:', data);
    } catch (error) {
      console.error('[useSimulation] Start error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 自動ネゴシエーション開始
  const negotiate = useCallback(
    async (buyerAddress: string, sellerAddress: string, locationId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'negotiate',
            buyerAddress,
            sellerAddress,
            locationId,
          }),
        });
        const data = await response.json();
        console.log('[useSimulation] Negotiation result:', data);
        return data;
      } catch (error) {
        console.error('[useSimulation] Negotiate error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // リセット
  const reset = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await response.json();
      console.log('[useSimulation] Reset:', data);
    } catch (error) {
      console.error('[useSimulation] Reset error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    ...state,
    isLoading,
    initialize,
    start,
    negotiate,
    reset,
  };
}

