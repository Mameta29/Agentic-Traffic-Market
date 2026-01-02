'use client';

import { useState, useEffect } from 'react';
import { MapView } from '@/client/features/map/MapView';
import { ThinkingTerminal } from '@/client/features/terminal/ThinkingTerminal';
import { AgentCard } from '@/client/features/agent/AgentCard';
import { Button } from '@/client/components/Button';
import { Badge } from '@/client/components/Badge';
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
  
  // AIストリーム（実際のエージェントアドレスを使用）
  const buyerStream = useAgentStream(
    simulation.agents[0]?.address || 'agent-a', 
    'buyer'
  );
  const sellerStream = useAgentStream(
    simulation.agents[1]?.address || 'agent-b', 
    'seller'
  );

  const [demoStep, setDemoStep] = useState<string>('ready');

  // 初期化
  useEffect(() => {
    simulation.initialize();
  }, []);

  // コリジョン検出時に自動ネゴシエーション開始
  useEffect(() => {
    if (simulation.collisionDetected && simulation.collisionLocation && demoStep === 'running') {
      console.log('[Dashboard] Collision detected! Starting auto-negotiation...');
      setDemoStep('negotiating');
      
      // 自動ネゴシエーション実行
      const buyer = simulation.agents.find(a => a.role === 'buyer');
      const seller = simulation.agents.find(a => a.role === 'seller');
      
      if (buyer && seller) {
        simulation.negotiate(
          buyer.address,
          seller.address,
          simulation.collisionLocation
        ).then((result) => {
          if (result?.success) {
            console.log('[Dashboard] Negotiation successful!');
            setDemoStep('completed');
          } else {
            console.log('[Dashboard] Negotiation failed');
            setDemoStep('failed');
          }
        });
      }
    }
  }, [simulation.collisionDetected, demoStep]);

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
          <MapView agents={simulation.agents.length > 0 ? simulation.agents : []} />
        </div>

        {/* 右: サイドバー (5/12) */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-4 overflow-hidden">
          {/* エージェントカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {simulation.agents.length > 0 && (
              <>
                <AgentCard agent={simulation.agents[0]} />
                <AgentCard agent={simulation.agents[1]} />
              </>
            )}
          </div>

          {/* ターミナル */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 overflow-hidden">
            <div className="h-full min-h-[300px]">
              <ThinkingTerminal
                messages={buyerStream.messages}
                agentName="Agent A"
                agentRole="buyer"
              />
            </div>
            <div className="h-full min-h-[300px]">
              <ThinkingTerminal
                messages={sellerStream.messages}
                agentName="Agent B"
                agentRole="seller"
              />
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
