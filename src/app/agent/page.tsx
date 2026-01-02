/**
 * メインダッシュボード
 * マップビューとターミナルを統合したメイン画面
 */

export default function AgentDashboard() {
  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col">
      {/* ヘッダー */}
      <header className="h-16 border-b border-green-500/30 flex items-center px-6">
        <h1 className="text-xl font-bold text-green-400">
          Agentic Traffic Market - Live Demo
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <StatusBadge status="Connected" />
        </div>
      </header>

      {/* メインコンテンツ (次のステップでMapとTerminalを追加) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* マップエリア (2/3) */}
        <div className="lg:col-span-2 bg-slate-900 border border-green-500/30 rounded-lg p-4">
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-lg">マップビュー (次のステップで実装)</p>
          </div>
        </div>

        {/* ターミナル/ログエリア (1/3) */}
        <div className="bg-slate-900 border border-green-500/30 rounded-lg p-4 overflow-hidden">
          <h2 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wide">
            Agent Thinking Terminal
          </h2>
          <div className="space-y-2 text-xs font-mono text-gray-400">
            <p>[SYSTEM] 初期化中...</p>
            <p>[INFO] Socket.io接続待機中</p>
            <p className="text-green-400">[OK] 準備完了</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <span className="text-sm text-gray-400">{status}</span>
    </div>
  );
}

