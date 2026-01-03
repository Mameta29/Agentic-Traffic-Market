'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/client/components/Card';
import { MapPin, Loader2 } from 'lucide-react';
import type { Agent } from '@/types/agent';

interface MapViewProps {
  agents: Agent[];
}

/**
 * エージェント位置を可視化するマップビュー
 * 
 * Note: Mapbox統合は環境変数NEXT_PUBLIC_MAPBOX_ACCESS_TOKENが必要
 * ここではシンプルな2Dグリッドビューとして実装
 */
export function MapView({ agents }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド描画
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // エージェントを描画
    agents.forEach((agent, index) => {
      // 緯度経度をキャンバス座標に変換（簡易版）
      const x = ((agent.position.lng + 180) / 360) * canvas.width;
      const y = ((90 - agent.position.lat) / 180) * canvas.height;

      // エージェントの色（IDベース、役割ベースではない）
      const agentLetter = agent.id === 'agent-1' || agent.id === 'agent-a' || index === 0 ? 'A' : 'B';
      const color = agentLetter === 'A' ? '#00ff41' : '#ff006e'; // green / pink

      // グロー効果
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;

      // エージェント円
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      // リング（状態表示）
      if (agent.state === 'negotiating') {
        ctx.strokeStyle = '#fbbf24'; // yellow-400
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (agent.state === 'blocked') {
        ctx.strokeStyle = '#ef4444'; // red-500
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ラベル
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(agent.role === 'buyer' ? 'A' : 'B', x - 4, y + 35);
    });
  }, [agents]);

  return (
    <Card glow="cyan" className="h-full">
      <div className="p-4 border-b border-gray-700 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
          Traffic Map
        </h3>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span>Buyer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>Seller</span>
          </div>
        </div>
      </div>

      <div className="p-4 h-[calc(100%-4rem)] flex items-center justify-center bg-slate-950">
        {agents.length === 0 ? (
          <div className="text-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Waiting for agents...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="border border-cyan-500/30 rounded"
          />
        )}
      </div>
    </Card>
  );
}

