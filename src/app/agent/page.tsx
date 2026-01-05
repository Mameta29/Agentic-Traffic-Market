'use client';

import { useState, useEffect } from 'react';
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

  // 初期化
  useEffect(() => {
    simulation.initialize();
  }, []);

  // コリジョン検出時に自動ネゴシエーション開始（動的役割決定版）
  useEffect(() => {
    if (simulation.collisionDetected && simulation.collisionLocation && demoStep === 'running') {
      console.log('[Dashboard] Collision detected! Starting AI-to-AI negotiation...');
      setDemoStep('negotiating');
      
      // ネゴシエーションプロセスをストリーミング表示
      streamNegotiation(simulation.collisionLocation);
    }
  }, [simulation.collisionDetected, demoStep]);

  // ネゴシエーションをストリーミングで可視化
  const streamNegotiation = (locationId: string) => {
    const eventSource = new EventSource(
      `/api/negotiation/stream?agent1Id=1&agent2Id=2&locationId=${locationId}`
    );

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
      
      // ネゴシエーション結果を設定
      setNegotiationResult({
        success: data.success,
        buyer: { agentId: 1 }, // 会話から決定
        seller: { agentId: 2 },
        agreedPrice: data.finalPrice,
        transcript: data.transcript,
      });

      const systemMsg = {
        role: 'system',
        content: data.success
          ? `✅ Agreement reached: ${data.finalPrice} JPYC`
          : '❌ No agreement',
      };
      setAgent1Messages((prev) => [...prev, systemMsg]);
      setAgent2Messages((prev) => [...prev, systemMsg]);

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

  // フルデモシナリオ実行
  const handleStartFullDemo = async () => {
    console.log('[Dashboard] Starting full demo scenario...');
    setDemoStep('running');
    
    // シミュレーション開始（2秒後にコリジョン発生）
    await simulation.start();
  };

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
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleStartFullDemo}
            disabled={simulation.isRunning || simulation.isLoading}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Full Demo
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
                  <AgentCard agent={simulation.agents[0]} />
                  <AgentCard agent={simulation.agents[1]} />
                </>
              )}
            </div>

            {/* ネゴシエーション結果 */}
            {negotiationResult && <NegotiationResult result={negotiationResult} />}

            {/* ターミナル */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="min-h-[400px]">
                <ThinkingTerminal
                  messages={agent1Messages}
                  agentName="Agent A"
                  agentRole="buyer"
                />
              </div>
              <div className="min-h-[400px]">
                <ThinkingTerminal
                  messages={agent2Messages}
                  agentName="Agent B"
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
