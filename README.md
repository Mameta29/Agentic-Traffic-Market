# Agentic Traffic Market (ATM)

AIエージェントがリアルタイムで物理的な「通行権」を交渉・取引するP2Pマーケットプレイス。

## プロジェクト概要

このプロジェクトは、以下の技術を使用しています:
- **AIエージェント**: Google Gemini 3 Flash Preview による自律的な意思決定
- **ブロックチェーン**: Avalanche Fuji Testnet上でマイクロペイメント
- **リアルタイム通信**: Socket.ioによる位置情報同期
- **AI SDK**: Vercel AI SDK (`ai` パッケージ) によるストリーミング統合

## デモURL

**Live Demo**: https://agentic-traffic-market-831529922100.us-central1.run.app

## Tech Stack

- **Frontend**: Next.js 16.1 (App Router), React 19
- **AI Provider**: Google Gemini 3 Flash Preview (`@ai-sdk/google`)
- **AI Framework**: Vercel AI SDK (`ai`) - `streamText`によるストリーミング & ツール統合
- **Blockchain**: Viem v2.x (Avalanche Fuji Testnet, Chain ID: 43113)
- **Smart Contracts**: Solidity 0.8.28, Foundry
- **Real-time**: Socket.io, Server-Sent Events
- **Styling**: Tailwind CSS (Cyberpunk Theme)
- **Deploy**: GCP Cloud Run, Docker

## プロジェクト構造

```
root/
├── src/
│   ├── app/                    # Next.js 16 App Router (UI)
│   │   ├── api/                # API Routes (10エンドポイント)
│   │   │   ├── agent/          # エージェントAI関連API
│   │   │   ├── simulation/     # シミュレーション制御API
│   │   │   ├── negotiation/    # ネゴシエーションAPI
│   │   │   └── test/           # ヘルスチェック & デバッグ
│   │   ├── agent/              # Dashboard Page
│   │   └── page.tsx            # Landing Page
│   ├── client/                 # クライアントコンポーネント
│   │   ├── features/agent/     # エージェントカード
│   │   ├── features/map/       # マップ可視化（Canvas-based）
│   │   └── features/terminal/  # サイバーパンクログ & チャット
│   ├── server/                 # サーバーロジック
│   │   ├── actions/            # Server Actions (streamAgentThinking)
│   │   ├── lib/                # Viem, EIP-7702, JPYC, Agent管理
│   │   ├── services/           # シミュレーション & ネゴシエーション
│   │   └── config/             # 環境変数管理
│   ├── mcp-server/             # AIツール定義（MCP風アーキテクチャ）
│   │   ├── tools/              # 5つの主要ツール
│   │   └── index.ts            # Vercel AI SDK用ツール変換
│   └── types/                  # 共有型定義
├── server.ts                   # カスタムサーバー (Socket.io + Next.js)
└── package.json
```

### フルデモシナリオの実行

ブラウザで `https://agentic-traffic-market-831529922100.us-central1.run.app/agent` を開き、2種類のデモから選択:

#### デモ1: Start Demo (Fuji) - 高速決済デモ
**ネットワーク**: Avalanche Fuji Testnet (Chain ID: 43113)  
**特徴**: 
- 高速トランザクション（1-2秒で確定）
- 従来型のEOA間決済（EIP-7702は不使用）
- シンプルなブロックチェーン統合デモ

**自動実行フロー:**
1. **0秒**: Agent A (Buyer) が移動開始
2. **2秒**: Agent A と Agent B が交差点でコリジョン
3. **AI自動起動**: Agent A が混雑評価 + オファー送信
4. **AI自動応答**: Agent B がオファー検討 → 受諾/拒否
5. **決済**: 受諾された場合、JPYC支払い実行（従来型トランザクション）
6. **解決**: Agent B が道を譲り、Agent A が目的地へ

#### デモ2: EIP-7702 Demo (Sepolia)
**ネットワーク**: Ethereum Sepolia Testnet (Chain ID: 11155111)  
**特徴**: 
- **EIP-7702対応** - EOAにスマートコントラクト機能を委譲
- ユーザー秘密鍵不要（事前署名されたAuthorizationを使用）
- AIエージェントが直接ユーザーEOAを操作
- 実際のEthereumメインネット仕様に準拠

**自動実行フロー:**
1. **0秒**: Agent A (Buyer) が移動開始
2. **2秒**: Agent A と Agent B が交差点でコリジョン
3. **AI自動起動**: Agent A が混雑評価 + オファー送信
4. **AI自動応答**: Agent B がオファー検討 → 受諾/拒否
5. **決済**: AIエージェントが**EIP-7702**を使用してユーザーEOAから直接支払い
6. **解決**: Agent B が道を譲り、Agent A が目的地へ

**全プロセスがAIによって自律的に実行されます！**

#### 技術的な違い

| 項目 | Fuji Demo | Sepolia Demo (EIP-7702) |
|------|-----------|-------------------------|
| ネットワーク | Avalanche Fuji | Ethereum Sepolia |
| トランザクション速度 | 1-2秒 | 15-30秒 |
| EIP-7702対応 | 非対応 | 対応 |
| 決済方式 | Agent EOA → 直接送金 | Agent → User EOA（委譲） |
| ユーザー秘密鍵 | サーバー保持が必要 | 不要（事前Authorization） |
| 実装 | `eip-7702.ts` | `eip-7702-correct.ts` |

## AIツール

実装済みの5つのツール（MCPアーキテクチャ）:

| ツール名 | 説明 | 入力 |
|---------|------|------|
| `get_jpyc_balance` | JPYCバランス取得 | `{ address: string }` |
| `transfer_jpyc` | JPYC送金 | `{ from, to, amount }` |
| `sign_traffic_intent` | EIP-7702インテント署名 | `{ agentAddress, bidAmount, locationId }` |
| `evaluate_congestion` | 混雑状況評価 | `{ locationId }` |
| `negotiate_message` | P2Pメッセージ送信 | `{ from, to, message, offerAmount? }` |

**技術詳細**: 
- ツール定義は `src/mcp-server/tools/` に配置
- Zodによる入力バリデーション
- Vercel AI SDKの`streamText`と統合（`getVercelAITools()`で変換）

## UI Components

### Cyberpunk Theme Components

- **ThinkingTerminal**: AI思考プロセスのリアルタイム可視化
- **AgentCard**: エージェント情報とステータス表示
- **MapView**: Canvas-based 2Dマップビュー（エージェント位置追跡）
- **Button, Card, Badge**: サイバーパンクデザインの基本コンポーネント

### Custom Hooks

- **useSocket**: Socket.ioクライアント接続管理
- **useAgentStream**: Vercel AI SDK (`useChat`) によるストリーミング統合
- **useSimulation**: トラフィックシミュレーション制御

## Simulation Architecture

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
- `/api/simulation`: シミュレーション制御（start/stop/reset）
- `/api/simulation/negotiate-ai-to-ai`: AIエージェント間の自動ネゴシエーション
- `/api/simulation/negotiate-dynamic`: 動的役割決定ネゴシエーション
- `/api/simulation/negotiate-network`: ネットワーク経由ネゴシエーション
- `/api/agent/stream`: AIストリーミング（固定役割）
- `/api/agent/stream-dynamic`: AIストリーミング（動的役割）
- `/api/agent/balance`: エージェントのJPYC残高取得
- `/api/negotiation/stream`: ネゴシエーションストリーミング
- `/api/test`: ヘルスチェック
- `/api/test-ai`: AI機能テスト

## アーキテクチャドキュメント

このプロジェクトのアーキテクチャドキュメントは`.gitignore`により非公開設定となっています（`docs/`ディレクトリ、および`*.md`ファイル（README.md除く）はgit管理外）。

## デザインシステム

サイバーパンクテーマカラー:
- **Primary**: Neon Green (`#00ff41`)
- **Secondary**: Neon Pink (`#ff006e`)
- **Accent**: Cyan (`#00f5ff`)
- **Background**: Slate 950 (`#020617`)

## デプロイ

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

## ライセンス

MIT License
