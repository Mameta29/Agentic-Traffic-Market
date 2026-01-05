'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/client/components/Card';
import { Terminal, Cpu, MessageSquare, Wallet } from 'lucide-react';
import type { Message } from 'ai';

interface ThinkingTerminalProps {
  messages: Message[];
  agentName: string;
  agentRole: 'buyer' | 'seller';
}

/**
 * AIエージェントの思考プロセスを可視化するターミナル
 * サイバーパンクスタイル
 */
export function ThinkingTerminal({ messages, agentName, agentRole }: ThinkingTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const roleColor = agentRole === 'buyer' ? 'text-green-400' : 'text-pink-400';
  const roleIcon = agentRole === 'buyer' ? <Cpu className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;

  return (
    <Card glow={agentRole === 'buyer' ? 'green' : 'pink'} className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3">
        <Terminal className={`w-5 h-5 ${roleColor}`} />
        <div className="flex-1">
          <h3 className={`text-sm font-bold ${roleColor} uppercase tracking-wide`}>
            {agentName}
          </h3>
          <p className="text-xs text-gray-500">
            Role: Flexible (AI decides)
          </p>
        </div>
        {roleIcon}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-slate-800"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              <p>待機中...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBlock key={index} message={message} role={agentRole} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBlock({ message, role }: { message: Message; role: 'buyer' | 'seller' }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'data'; // 'tool' → 'data' (Vercel AI SDK v4)

  if (isUser) {
    return (
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-cyan-400 font-semibold mb-1">[INSTRUCTION]</p>
          <p className="text-sm text-gray-300">{message.content}</p>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    const thinkingColor = role === 'buyer' ? 'text-green-400' : 'text-pink-400';
    return (
      <div className="flex items-start gap-2">
        <Cpu className={`w-4 h-4 ${thinkingColor} mt-1 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-xs ${thinkingColor} font-semibold mb-1`}>[THINKING]</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (isTool && message.content) {
    try {
      const toolData = JSON.parse(message.content as string);
      return (
        <div className="flex items-start gap-2">
          <Terminal className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-yellow-400 font-semibold mb-1">[TOOL RESULT]</p>
            <pre className="text-xs text-gray-400 bg-slate-800 p-2 rounded overflow-x-auto">
              {JSON.stringify(toolData, null, 2)}
            </pre>
          </div>
        </div>
      );
    } catch {
      return null;
    }
  }

  return null;
}

