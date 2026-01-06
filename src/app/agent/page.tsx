'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapViewEnhanced } from '@/client/features/map/MapViewEnhanced';
import { ThinkingTerminal } from '@/client/features/terminal/ThinkingTerminal';
import { AgentCard } from '@/client/features/agent/AgentCard';
import { Button } from '@/client/components/Button';
import { Badge } from '@/client/components/Badge';
import { NegotiationResult } from '@/client/components/NegotiationResult';
import { useSocket } from '@/client/hooks/useSocket';
import { useAgentStream } from '@/client/hooks/useAgentStream';
import { useSimulation } from '@/client/hooks/useSimulation';
import { Play, Radio, RotateCcw, Zap } from 'lucide-react';

/**
 * メインダッシュボード
 * 完全な自動デモシナリオを統合
 */
export default function AgentDashboard() {
  const { isConnected } = useSocket();
  const simulation = useSimulation();
  
  // AIストリーム用のカスタムフック
  const [agent1Messages, setAgent1Messages] = useState<any[]>([]);
  const [agent2Messages, setAgent2Messages] = useState<any[]>([]);

  const [demoStep, setDemoStep] = useState<string>('ready');
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'fuji' | 'sepolia'>('fuji');
  
  // JPYC残高をリアルタイム更新（両ネットワーク）
  const [agentBalances, setAgentBalances] = useState<Record<string, { sepolia: string; fuji: string }>>({});
  
  useEffect(() => {
    const interval = setInterval(async () => {
      if (simulation.agents.length >= 2) {
        try {
          // 両方のネットワークから残高を取得
          const promises = simulation.agents.map(async (agent) => {
            const [sepoliaRes, fujiRes] = await Promise.all([
              fetch(`/api/agent/balance?address=${agent.address}&network=sepolia`).then(r => r.json()).catch(() => ({ balance: '0' })),
              fetch(`/api/agent/balance?address=${agent.address}&network=fuji`).then(r => r.json()).catch(() => ({ balance: '0' }))
            ]);
            
            return {
              address: agent.address,
              sepolia: sepoliaRes.balance,
              fuji: fujiRes.balance
            };
          });
          
          const results = await Promise.all(promises);
          const balances: Record<string, { sepolia: string; fuji: string }> = {};
          
          for (const result of results) {
            balances[result.address] = {
              sepolia: result.sepolia,
              fuji: result.fuji
            };
          }
          
          setAgentBalances(balances);
          
          console.log('[Dashboard] Balances updated:', balances);
        } catch (error) {
          console.error('[Dashboard] Balance update error:', error);
        }
      }
    }, 5000); // 5秒ごと

    return () => clearInterval(interval);
  }, [simulation.agents]);

  // 初期化
  useEffect(() => {
    simulation.initialize();
  }, []);

  // コリジョン検出時に自動ネゴシエーション開始（動的役割決定版）
  useEffect(() => {
    if (simulation.collisionDetected && simulation.collisionLocation && demoStep === 'running') {
      console.log(`[Dashboard] Collision detected! Starting negotiation on ${selectedNetwork}...`);
      setDemoStep('negotiating');
      
      // ネゴシエーションプロセスをストリーミング表示のみ（ネットワーク指定）
      // streamNegotiation内で完結するため、startNetworkAwareNegotiationは不要
      streamNegotiation(simulation.collisionLocation, selectedNetwork);
    }
  }, [simulation.collisionDetected, demoStep]);

  // ネゴシエーションをストリーミングで可視化（段階的表示）
  const streamNegotiation = (locationId: string, network: 'fuji' | 'sepolia' = 'fuji') => {
    // ネゴシエーション開始時に状態を初期化（進行中フラグ付き）
    setNegotiationResult({
      isNegotiating: true,
      transcript: [],
    });
    
    // ターミナルにも即座に開始メッセージを表示
    const startMsg = { role: 'system', content: '[System] Negotiation starting...' };
    setAgent1Messages((prev) => [...prev, startMsg]);
    setAgent2Messages((prev) => [...prev, startMsg]);
    
    const eventSource = new EventSource(
      `/api/negotiation/stream?agent1Id=1&agent2Id=2&locationId=${locationId}&network=${network}`
    );

    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      
      // Negotiation Resultにも段階的に追加（isNegotiatingフラグを維持）
      setNegotiationResult((prev: any) => ({
        ...prev,
        isNegotiating: true,
        transcript: [...(prev?.transcript || []), data.message],
      }));
      
      // System/Agent メッセージを適切なターミナルに表示
      if (data.message.includes('[Agent 1]')) {
        setAgent1Messages((prev) => [...prev, {
          role: 'assistant',
          content: data.message
        }]);
      } else if (data.message.includes('[Agent 2]')) {
        setAgent2Messages((prev) => [...prev, {
          role: 'assistant',
          content: data.message
        }]);
      } else if (data.message.includes('[System]')) {
        // Systemメッセージは両方に表示
        const msg = { role: 'system', content: data.message };
        setAgent1Messages((prev) => [...prev, msg]);
        setAgent2Messages((prev) => [...prev, msg]);
      }
    });

    eventSource.addEventListener('turn', (event) => {
      const data = JSON.parse(event.data);
      const message = {
        role: 'assistant',
        content: `[Agent ${data.speaker}] ${data.message}`,
      };

      // Speaker によってメッセージを振り分け
      if (data.speaker === 1) {
        setAgent1Messages((prev) => [...prev, message]);
      } else {
        setAgent2Messages((prev) => [...prev, message]);
      }
    });

    eventSource.addEventListener('result', (event) => {
      const data = JSON.parse(event.data);
      
      // ネゴシエーション結果を設定（進行中フラグを解除し、最終結果を反映）
      setNegotiationResult((prev: any) => ({
        ...prev,
        isNegotiating: false,
        success: data.success,
        buyer: { agentId: 1 },
        seller: { agentId: 2 },
        agreedPrice: data.finalPrice,
        transcript: data.transcript, // 最終的な完全なtranscriptを使用
      }));

      if (data.success) {
        setDemoStep('completed');
      } else {
        setDemoStep('failed');
      }
    });

    eventSource.addEventListener('error', (event) => {
      console.error('[Stream] Error:', event);
      eventSource.close();
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
    });
  };

  // フルデモシナリオ実行（Avalanche Fuji）
  const handleStartFujiDemo = async () => {
    console.log('[Dashboard] Starting Fuji demo (Phase 1)...');
    setSelectedNetwork('fuji');
    setDemoStep('running');
    await simulation.start();
  };

  // Sepoliaデモ実行（EIP-7702完全実装）
  const handleStartSepoliaDemo = async () => {
    console.log('[Dashboard] Starting Sepolia demo (Phase 2 - EIP-7702)...');
    setSelectedNetwork('sepolia');
    setDemoStep('running');
    await simulation.start();
  };

  // ネゴシエーションをネットワーク対応で実行
  const startNetworkAwareNegotiation = useCallback((locationId: string, network: 'fuji' | 'sepolia') => {
    console.log(`[Dashboard] Starting negotiation on ${network}...`);
    
    if (simulation.agents.length >= 2) {
      simulation.negotiateAItoAI(1, 2, locationId, network).then((result) => {
        setNegotiationResult(result);
        
        if (result?.success) {
          console.log(`[Dashboard] Negotiation successful on ${network}!`);
          setDemoStep('completed');
        } else {
          console.log('[Dashboard] Negotiation failed');
          setDemoStep('failed');
        }
      });
    }
  }, [simulation]);

  // リセット
  const handleReset = async () => {
    console.log('[Dashboard] Resetting simulation...');
    await simulation.reset();
    setDemoStep('ready');
    setNegotiationResult(null);
    setAgent1Messages([]);
    setAgent2Messages([]);
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      {/* ヘッダー */}
      <header className="h-16 border-b border-green-500/30 flex items-center px-6 gap-4">
        <h1 className="text-xl font-bold text-green-400">
          Agentic Traffic Market - Live Demo
        </h1>
        
        {/* ステータスバッジ */}
        <div className="flex items-center gap-2">
          <StatusBadge status={isConnected ? 'Connected' : 'Disconnected'} />
          {simulation.isRunning && (
            <Badge variant="warning">Simulation Running</Badge>
          )}
          {simulation.collisionDetected && (
            <Badge variant="error">Collision Detected!</Badge>
          )}
          {demoStep === 'negotiating' && (
            <Badge variant="warning">
              <Zap className="w-3 h-3 mr-1 inline" />
              Negotiating...
            </Badge>
          )}
          {demoStep === 'completed' && (
            <Badge variant="success">Demo Complete</Badge>
          )}
        </div>

        {/* コントロールボタン */}
        <div className="ml-auto flex items-center gap-2">
          {/* Fujiデモボタン */}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleStartFujiDemo}
            disabled={simulation.isRunning || simulation.isLoading}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Demo (Fuji)
          </Button>
          
          {/* Sepoliaデモボタン */}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleStartSepoliaDemo}
            disabled={simulation.isRunning || simulation.isLoading}
          >
            <Zap className="w-4 h-4 mr-2" />
            EIP-7702 Demo (Sepolia)
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset}
            disabled={simulation.isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* 左: マップエリア (7/12) */}
        <div className="col-span-12 lg:col-span-7 h-full">
          <MapViewEnhanced agents={simulation.agents.length > 0 ? simulation.agents : []} />
        </div>

        {/* 右: サイドバー (5/12) - スクロール可能 */}
        <div className="col-span-12 lg:col-span-5 h-full overflow-y-auto">
          <div className="flex flex-col gap-4 pb-4">
            {/* エージェントカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {simulation.agents.length > 0 && (
              <>
                <AgentCard 
                  agent={simulation.agents[0]} 
                  liveBalance={agentBalances[simulation.agents[0].address]?.sepolia || simulation.agents[0].balance}
                  liveBalanceFuji={agentBalances[simulation.agents[0].address]?.fuji || simulation.agents[0].balanceFuji}
                />
                <AgentCard 
                  agent={simulation.agents[1]}
                  liveBalance={agentBalances[simulation.agents[1].address]?.sepolia || simulation.agents[1].balance}
                  liveBalanceFuji={agentBalances[simulation.agents[1].address]?.fuji || simulation.agents[1].balanceFuji}
                />
              </>
            )}
          </div>

          {/* ネゴシエーション結果（常に表示、段階的に埋まる） */}
          <NegotiationResult result={negotiationResult} />

            {/* ターミナル */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="min-h-[400px]">
                <ThinkingTerminal
                  messages={agent1Messages}
                  agentName="Agent 1"
                  agentRole="buyer"
                />
              </div>
              <div className="min-h-[400px]">
                <ThinkingTerminal
                  messages={agent2Messages}
                  agentName="Agent 2"
                  agentRole="seller"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isConnected = status === 'Connected';
  return (
    <div className="flex items-center gap-2">
      <Radio
        className={`w-4 h-4 ${isConnected ? 'text-green-400 animate-pulse' : 'text-red-400'}`}
      />
      <span className="text-sm text-gray-400">{status}</span>
    </div>
  );
}
