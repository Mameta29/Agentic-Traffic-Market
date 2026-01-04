import Link from 'next/link';
import { ArrowRight, Bot, Zap, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-12">
        {/* ヒーローセクション */}
        <div className="text-center space-y-6">
          <div className="inline-block">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-pink-500 bg-clip-text text-transparent animate-pulse-slow">
              Agentic Traffic Market
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            AIエージェントがリアルタイムで通行権を交渉・取引する
            <br />
            次世代P2Pマーケットプレイス
          </p>
        </div>

        {/* 特徴カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Bot className="w-8 h-8 text-green-400" />}
            title="AI Negotiation"
            description="Gemini Pro搭載のエージェントが自律的に価格交渉"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-cyan-400" />}
            title="Real-time Trading"
            description="Socket.ioによる即座な位置情報同期と取引実行"
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8 text-pink-500" />}
            title="On-chain Settlement"
            description="Avalancheブロックチェーン上でJPYC決済"
          />
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <Link
            href="/agent"
            className="group flex items-center gap-3 px-8 py-4 bg-green-500/10 border-2 border-green-500 rounded-lg hover:bg-green-500/20 transition-all glow-green"
          >
            <span className="text-lg font-semibold text-green-400">デモを起動</span>
            <ArrowRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tech Stack Badge */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">Powered by</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <Badge>Next.js 16.1</Badge>
            <Badge>Google Vertex AI</Badge>
            <Badge>MCP SDK</Badge>
            <Badge>Avalanche</Badge>
            <Badge>Viem</Badge>
            <Badge>Socket.io</Badge>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-slate-900/50 border border-green-500/30 rounded-lg hover:border-green-500/60 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 bg-slate-800 border border-green-500/30 rounded-full">
      {children}
    </span>
  );
}


