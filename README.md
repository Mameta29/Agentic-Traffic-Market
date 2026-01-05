# Agentic Traffic Market (ATM)

AIエージェントがリアルタイムで物理的な「通行権」を交渉・取引する次世代P2Pマーケットプレイス。

## 🎯 プロジェクト概要

このプロジェクトは、以下の技術を統合した先進的な実装です:
- **AIエージェント**: Google Gemini 3 Flash Preview による自律的な意思決定
- **ブロックチェーン**: Avalanche Fuji Testnet上でマイクロペイメント（小数点対応）
- **リアルタイム通信**: Socket.ioによる位置情報同期
- **Agent Standard**: Model Context Protocol (MCP) SDKによる標準化
- **本番稼働**: GCP Cloud Runで公開中

## 🌐 デモURL

**Live Demo**: https://agentic-traffic-market-831529922100.us-central1.run.app

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1 (App Router), React 19
- **AI Brain**: Google Gemini 3 Flash Preview via `@ai-sdk/google`
- **Agent Standard**: Official MCP SDK (`@modelcontextprotocol/sdk`)
- **Blockchain**: Viem v2.x (Avalanche Fuji Testnet, Chain ID: 43113)
- **Smart Contracts**: Solidity 0.8.28, Foundry
- **Real-time**: Socket.io, Server-Sent Events
- **Styling**: Tailwind CSS (Cyberpunk Theme)
- **Deploy**: GCP Cloud Run, Docker
- **Tests**: 38/38 passing

## 📁 プロジェクト構造

```
root/
├── src/
│   ├── app/                    # Next.js 16 App Router (UI)
│   │   ├── api/                # API Routes
│   │   │   ├── agent/stream/   # AI Streaming Endpoint
│   │   │   └── test/           # Health Check
│   │   ├── agent/              # Dashboard Page
│   │   └── page.tsx            # Landing Page
│   ├── client/                 # クライアントコンポーネント
│   │   ├── features/map/       # Mapbox可視化
│   │   └── features/terminal/  # サイバーパンクログ & チャット
│   ├── server/                 # サーバーロジック
│   │   ├── actions/            # Server Actions (AI Stream)
│   │   ├── lib/                # Viem, Vertex AI, JPYC
│   │   └── config/             # 環境変数管理
│   ├── mcp-server/             # [CORE] MCP Tool Definitions
│   │   ├── tools/              # 5つの主要ツール
│   │   └── index.ts            # Tool Registry
│   └── types/                  # 共有型定義
├── server.ts                   # カスタムサーバー (Socket.io + Next.js)
└── package.json
```

## 🚀 セットアップ & 起動

**📖 詳細ガイド**: 
- **ローカル起動**: `QUICKSTART.md` （←ここから始めてください）
- 完全デプロイ: ローカルドキュメント参照

### クイックスタート（開発モード）

```bash
# 1. 依存関係のインストール
pnpm install

# 2. 環境変数設定（最小限）
cp .env.local.example .env.local
# .env.local を編集して最低限以下を設定:
# - GOOGLE_GENERATIVE_AI_API_KEY=your-key

# 3. 開発サーバー起動
pnpm dev
```

### 完全デプロイ（ブロックチェーン統合）

```bash
# 1. スマートコントラクトをデプロイ
cd contracts
forge script script/Deploy.s.sol --rpc-url avalanche_fuji --broadcast

# 2. デプロイされたアドレスを.env.localに設定
# 3. Agent NFT登録（詳細はDEPLOYMENT_GUIDE.md参照）
# 4. アプリ起動
pnpm dev
```

`http://localhost:3000`でアプリケーションが起動します。

## 🧪 動作確認

### ヘルスチェック
```bash
curl http://localhost:3000/api/test
```

レスポンス例:
```json
{
  "status": "ok",
  "mcpTools": [
    "get_jpyc_balance",
    "transfer_jpyc",
    "sign_traffic_intent",
    "evaluate_congestion",
    "negotiate_message"
  ],
  "environment": {
    "hasGoogleApiKey": true,
    "hasAgentAKey": true,
    "hasAgentBKey": true,
    "chainId": 43113
  }
}
```

### フルデモシナリオの実行

ブラウザで `http://localhost:3000/agent` を開き、**"Start Full Demo"** ボタンをクリック。

**自動実行フロー:**
1. ⏱️ **0秒**: Agent A (Buyer) が移動開始
2. ⏱️ **2秒**: Agent A と Agent B が交差点でコリジョン → 両者停止
3. 🤖 **AI自動起動**: Agent A が混雑評価 + オファー送信
4. 🤖 **AI自動応答**: Agent B がオファー検討 → 受諾/拒否
5. 💰 **決済**: 受諾された場合、JPYC支払い実行
6. ✅ **解決**: Agent B が道を譲り、Agent A が目的地へ

**全プロセスがAIによって自律的に実行されます！**

### AIエージェントのテスト（Buyer役）
```bash
curl -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "role": "buyer",
    "messages": [
      {
        "role": "user",
        "content": "Check my JPYC balance and evaluate congestion at location LOC_001"
      }
    ],
    "agentAddress": "0x..."
  }'
```

## 🎮 MCP Tools

実装済みの5つのMCPツール:

| ツール名 | 説明 | 入力 |
|---------|------|------|
| `get_jpyc_balance` | JPYCバランス取得 | `{ address: string }` |
| `transfer_jpyc` | JPYC送金 | `{ from, to, amount }` |
| `sign_traffic_intent` | EIP-7702インテント署名 | `{ agentAddress, bidAmount, locationId }` |
| `evaluate_congestion` | 混雑状況評価 | `{ locationId }` |
| `negotiate_message` | P2Pメッセージ送信 | `{ from, to, message, offerAmount? }` |

## 🎨 UI Components

### Cyberpunk Theme Components

- **ThinkingTerminal**: AI思考プロセスのリアルタイム可視化
- **AgentCard**: エージェント情報とステータス表示
- **MapView**: Canvas-based 2Dマップビュー（エージェント位置追跡）
- **Button, Card, Badge**: サイバーパンクデザインの基本コンポーネント

### Custom Hooks

- **useSocket**: Socket.ioクライアント接続管理
- **useAgentStream**: Vercel AI SDKによるストリーミング統合
- **useSimulation**: トラフィックシミュレーション制御

## 🎯 Simulation Architecture

### Traffic Simulation (`src/server/services/traffic-simulation.ts`)
- エージェント移動シミュレーション
- コリジョン（衝突）検出
- エージェント状態管理（idle, moving, blocked, negotiating）

### Negotiation Orchestrator (`src/server/services/negotiation-orchestrator.ts`)
- 2つのAIエージェント間の自動ネゴシエーション
- 6ステップのデモフロー実装:
  1. Collision: 交差点での衝突
  2. Assessment: 混雑評価
  3. Negotiation: オファー送信
  4. Decision: AI思考と決定
  5. Settlement: 支払い実行
  6. Resolution: 道を譲る

### API Routes
- `/api/simulation`: シミュレーション制御（start/stop/reset/negotiate）
- `/api/agent/stream`: AIストリーミング
- `/api/test`: ヘルスチェック

## 📖 開発ガイド

詳細な開発ルールについては、プロジェクトルートの内部ドキュメントを参照してください。

## 🎨 デザインシステム

サイバーパンクテーマカラー:
- **Primary**: Neon Green (`#00ff41`)
- **Secondary**: Neon Pink (`#ff006e`)
- **Accent**: Cyan (`#00f5ff`)
- **Background**: Slate 950 (`#020617`)

## 🚢 デプロイ

### Google Cloud Run
```bash
# Dockerイメージをビルド
docker build -t agentic-traffic-market .

# Cloud Runにデプロイ
gcloud run deploy agentic-traffic-market \
  --image agentic-traffic-market \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 📜 ライセンス

MIT License
