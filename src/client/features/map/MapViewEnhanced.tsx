'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/client/components/Card';
import { MapPin, Loader2 } from 'lucide-react';
import type { Agent } from '@/types/agent';

interface MapViewEnhancedProps {
  agents: Agent[];
}

/**
 * エージェント位置を可視化する高度なマップビュー
 * 
 * 機能:
 * - スムーズな移動アニメーション
 * - 道路ネットワークの表示
 * - 軌跡の描画
 */
export function MapViewEnhanced({ agents }: MapViewEnhancedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions] = useState({ width: 800, height: 600 });

  // アニメーション用の現在位置（補間）
  const [animatedPositions, setAnimatedPositions] = useState<
    Map<string, { x: number; y: number; targetX: number; targetY: number }>
  >(new Map());

  // 軌跡記録
  const [trails, setTrails] = useState<Map<string, Array<{ x: number; y: number }>>>(
    new Map()
  );

  // 道路ネットワーク（東京の主要道路を簡易的に表現）
  const roadNetwork = [
    // 環状線（横）
    { from: { lat: 35.68, lng: 139.6 }, to: { lat: 35.68, lng: 139.9 } },
    { from: { lat: 35.72, lng: 139.6 }, to: { lat: 35.72, lng: 139.9 } },
    // 縦の道路
    { from: { lat: 35.6, lng: 139.7 }, to: { lat: 35.8, lng: 139.7 } },
    { from: { lat: 35.6, lng: 139.75 }, to: { lat: 35.8, lng: 139.75 } },
    // 対角線
    { from: { lat: 35.65, lng: 139.6 }, to: { lat: 35.75, lng: 139.85 } },
  ];

  // 座標変換関数
  const transformCoords = (lat: number, lng: number) => {
    const minLat = 35.6;
    const maxLat = 35.8;
    const minLng = 139.5;
    const maxLng = 139.9;

    const normalizedX = (lng - minLng) / (maxLng - minLng);
    const normalizedY = (lat - minLat) / (maxLat - minLat);

    const margin = 50;
    const x = margin + normalizedX * (dimensions.width - margin * 2);
    const y = margin + (1 - normalizedY) * (dimensions.height - margin * 2);

    return { x, y };
  };

  // アニメーション更新
  useEffect(() => {
    const animationFrame = requestAnimationFrame(animate);

    function animate() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // キャンバスをクリア
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // グリッド描画
      drawGrid(ctx, canvas.width, canvas.height);

      // 道路ネットワーク描画
      drawRoads(ctx);

      // 軌跡描画
      drawTrails(ctx);

      // エージェント描画（アニメーション付き）
      drawAgentsAnimated(ctx);

      requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [agents, animatedPositions, trails]);

  // エージェント位置が変わったら、アニメーション開始
  useEffect(() => {
    agents.forEach((agent) => {
      const target = transformCoords(agent.position.lat, agent.position.lng);
      const current = animatedPositions.get(agent.id);

      if (!current) {
        // 初回: 即座に配置
        setAnimatedPositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(agent.id, {
            x: target.x,
            y: target.y,
            targetX: target.x,
            targetY: target.y,
          });
          return newMap;
        });
      } else if (current.targetX !== target.x || current.targetY !== target.y) {
        // 位置が変わった: 新しいターゲットを設定
        setAnimatedPositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(agent.id, {
            x: current.x,
            y: current.y,
            targetX: target.x,
            targetY: target.y,
          });
          return newMap;
        });

        // 軌跡に追加
        setTrails((prev) => {
          const newMap = new Map(prev);
          const agentTrail = newMap.get(agent.id) || [];
          agentTrail.push({ x: current.x, y: current.y });
          // 最大50ポイント
          if (agentTrail.length > 50) agentTrail.shift();
          newMap.set(agent.id, agentTrail);
          return newMap;
        });
      }
    });
  }, [agents]);

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawRoads(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]); // 破線

    roadNetwork.forEach((road) => {
      const from = transformCoords(road.from.lat, road.from.lng);
      const to = transformCoords(road.to.lat, road.to.lng);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    ctx.setLineDash([]); // リセット
  }

  function drawTrails(ctx: CanvasRenderingContext2D) {
    trails.forEach((trail, agentId) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;

      const agentLetter =
        agent.id === 'agent-1' || agent.id === 'agent-a' || agent.id.includes('1')
          ? 'A'
          : 'B';
      const color = agentLetter === 'A' ? '#00ff41' : '#ff006e';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;

      ctx.beginPath();
      trail.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      ctx.globalAlpha = 1.0;
    });
  }

  function drawAgentsAnimated(ctx: CanvasRenderingContext2D) {
    const speed = 0.05; // 補間速度（0.05 = 5%ずつ移動）

    agents.forEach((agent) => {
      const pos = animatedPositions.get(agent.id);
      if (!pos) return;

      // 現在位置からターゲットに向かって補間
      const dx = pos.targetX - pos.x;
      const dy = pos.targetY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        // まだ移動中
        const newX = pos.x + dx * speed;
        const newY = pos.y + dy * speed;

        setAnimatedPositions((prev) => {
          const newMap = new Map(prev);
          newMap.set(agent.id, {
            ...pos,
            x: newX,
            y: newY,
          });
          return newMap;
        });
      }

      // エージェント描画
      const agentLetter =
        agent.id === 'agent-1' || agent.id === 'agent-a' || agent.id.includes('1')
          ? 'A'
          : 'B';
      const color = agentLetter === 'A' ? '#00ff41' : '#ff006e';

      // グロー効果
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;

      // エージェント円
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // 外側のリング
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
      ctx.stroke();

      // 状態表示リング
      if (agent.state === 'negotiating') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      } else if (agent.state === 'blocked') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ラベル
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(agentLetter, pos.x, pos.y + 40);

      // 移動方向の矢印（moving状態の時）
      if (agent.state === 'moving' && agent.destination) {
        const dest = transformCoords(agent.destination.lat, agent.destination.lng);
        const angle = Math.atan2(dest.y - pos.y, dest.x - pos.x);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x + Math.cos(angle) * 25, pos.y + Math.sin(angle) * 25);
        ctx.lineTo(
          pos.x + Math.cos(angle) * 40,
          pos.y + Math.sin(angle) * 40
        );
        ctx.stroke();

        // 矢印の先端
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(
          pos.x + Math.cos(angle) * 40,
          pos.y + Math.sin(angle) * 40
        );
        ctx.lineTo(
          pos.x + Math.cos(angle - 0.5) * 32,
          pos.y + Math.sin(angle - 0.5) * 32
        );
        ctx.moveTo(
          pos.x + Math.cos(angle) * 40,
          pos.y + Math.sin(angle) * 40
        );
        ctx.lineTo(
          pos.x + Math.cos(angle + 0.5) * 32,
          pos.y + Math.sin(angle + 0.5) * 32
        );
        ctx.stroke();
      }
    });
  }

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
            <span>Agent A</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>Agent B</span>
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


