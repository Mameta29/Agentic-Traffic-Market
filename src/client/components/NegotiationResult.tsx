'use client';

import { Card, CardContent } from './Card';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface NegotiationResultProps {
  result: {
    success: boolean;
    buyer: { agentId: number; wallet: string } | null;
    seller: { agentId: number; wallet: string } | null;
    agreedPrice: number | null;
    transcript: string[];
  };
}

/**
 * ネゴシエーション結果表示コンポーネント
 * AIによる動的役割決定の結果を可視化
 */
export function NegotiationResult({ result }: NegotiationResultProps) {
  // 常に表示（結果がない場合はプレースホルダー）
  return (
    <Card glow="cyan" className="w-full">
      <CardContent className="p-4">
        {result ? (
          result.success ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-green-400 font-bold">Negotiation Success</h3>
            </div>

            {/* AI決定の役割 */}
            <div className="bg-slate-800 p-3 rounded space-y-2">
              <p className="text-xs text-cyan-400 font-semibold uppercase">
                AI-Determined Roles:
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400 font-mono">
                  Agent {result.buyer?.agentId}
                </span>
                <span className="text-gray-400">(Buyer)</span>
                <ArrowRight className="w-4 h-4 text-yellow-400" />
                <span className="text-pink-400 font-mono">Agent {result.seller?.agentId}</span>
                <span className="text-gray-400">(Seller)</span>
              </div>
            </div>

            {/* 合意価格 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Agreed Price:</span>
              <span className="text-lg font-bold text-yellow-400">
                {result.agreedPrice} JPYC
              </span>
            </div>

            {/* トランザクションログ */}
            <div className="text-xs max-h-40 overflow-y-auto space-y-1">
              {result.transcript.map((line, i) => {
                const isError = line.includes('[Error]');
                const isSystem = line.includes('[System]');
                const isAgent = line.includes('[Agent');
                
                // トランザクションハッシュを検出してリンク化
                const txMatch = line.match(/0x[a-fA-F0-9]{64}/);
                
                if (txMatch) {
                  const txHash = txMatch[0];
                  return (
                    <p key={i} className="text-green-400">
                      [System] Payment confirmed:{' '}
                      <a
                        href={`https://testnet.snowtrace.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 underline"
                      >
                        {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                      </a>
                    </p>
                  );
                }
                
                return (
                  <p
                    key={i}
                    className={
                      isError
                        ? 'text-red-400'
                        : isSystem
                          ? 'text-cyan-400'
                          : isAgent
                            ? 'text-green-400'
                            : 'text-gray-500'
                    }
                  >
                    {line.length > 100 ? line.substring(0, 100) + '...' : line}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400 font-bold">No Agreement</h3>
            </div>
            <p className="text-sm text-gray-400">
              Both agents could not reach an agreement
            </p>
          </div>
        )
        ) : (
          // プレースホルダー（ネゴシエーション待機中）
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-gray-600 animate-pulse" />
              <h3 className="text-gray-500 font-bold">Negotiation Pending</h3>
            </div>

            <div className="bg-slate-800 p-3 rounded space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase">
                Waiting for collision...
              </p>
              <div className="text-sm text-gray-700">
                <span>Agent ? (Buyer) ↔ Agent ? (Seller)</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Agreed Price:</span>
              <span className="text-lg font-bold text-gray-700">--- JPYC</span>
            </div>

            <div className="text-xs text-gray-700 text-center py-2">
              Start demo to see AI negotiation in action
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

