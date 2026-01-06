'use client';

import { Card, CardHeader, CardContent } from '@/client/components/Card';
import { Button } from '@/client/components/Button';
import { Bot, Navigation, Coins, Activity } from 'lucide-react';
import type { Agent } from '@/types/agent';

interface AgentCardProps {
  agent: Agent;
  onStartNegotiation?: () => void;
  liveBalance?: string; // リアルタイム残高 (Sepolia)
  liveBalanceFuji?: string; // リアルタイム残高 (Fuji)
}

/**
 * エージェント情報表示カード
 */
export function AgentCard({ agent, onStartNegotiation, liveBalance, liveBalanceFuji }: AgentCardProps) {
  // Agent IDからカラーと番号を決定
  const agentNumber = agent.id === 'agent-1' || agent.id === 'agent-a' ? '1' : '2';
  const roleColor = agentNumber === '1' ? 'green' : 'pink';
  const textColor = agentNumber === '1' ? 'text-green-400' : 'text-pink-400';

  const stateColors: Record<typeof agent.state, string> = {
    idle: 'text-gray-400',
    moving: 'text-blue-400',
    negotiating: 'text-yellow-400',
    blocked: 'text-red-400',
  };

  const stateLabels: Record<typeof agent.state, string> = {
    idle: 'Idle',
    moving: 'Moving',
    negotiating: 'Negotiating',
    blocked: 'Blocked',
  };

  return (
    <Card glow={roleColor} className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className={`w-6 h-6 ${textColor}`} />
          <div>
            <h3 className={`text-lg font-bold ${textColor} uppercase`}>
              Agent {agentNumber}
            </h3>
            <p className="text-xs text-gray-500">
              Role: Flexible (AI decides)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${stateColors[agent.state]}`} />
          <span className={`text-sm font-semibold ${stateColors[agent.state]}`}>
            {stateLabels[agent.state]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Position */}
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Position</p>
            <p className="text-sm text-gray-300 font-mono">
              {agent.position.lat.toFixed(4)}, {agent.position.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Balance（リアルタイム更新 - 両ネットワーク） */}
        {(liveBalance || agent.balance) && (
          <div className="space-y-2">
            {/* Sepolia Balance */}
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">JPYC Balance (Sepolia)</p>
                <p className="text-sm text-gray-300 font-mono">
                  {Number.parseFloat(liveBalance || agent.balance || '0').toFixed(2)} JPYC
                </p>
              </div>
            </div>
            
            {/* Fuji Balance */}
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-orange-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">JPYC Balance (Fuji)</p>
                <p className="text-sm text-gray-300 font-mono">
                  {Number.parseFloat(liveBalanceFuji || agent.balanceFuji || '0').toFixed(2)} JPYC
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
          <p className="text-xs text-gray-400 font-mono break-all bg-slate-800 p-2 rounded">
            {agent.address}
          </p>
        </div>

        {/* Action Button */}
        {onStartNegotiation && agent.state === 'blocked' && (
          <Button
            variant={agent.role === 'buyer' ? 'primary' : 'secondary'}
            size="sm"
            onClick={onStartNegotiation}
            className="w-full"
          >
            Start Negotiation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

