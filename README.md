# Agentic Traffic Market (ATM)

AIエージェントがリアルタイムで物理的な「通行権」を交渉・取引する次世代P2Pマーケットプレイス。

## 🎯 プロジェクト概要

このプロジェクトは、以下の技術を統合した先進的なデモンストレーションです:
- **AIエージェント**: Google Vertex AI (Gemini Pro) による自律的な意思決定
- **ブロックチェーン**: Avalanche Fuji Testnet上でJPYC決済
- **リアルタイム通信**: Socket.ioによる位置情報同期
- **Agent Standard**: Model Context Protocol (MCP) SDKによる標準化

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1 (App Router, Turbopack)
- **AI Brain**: Google Vertex AI (Gemini 3 Pro) via `@ai-sdk/google`
- **Agent Standard**: Official MCP SDK (`@modelcontextprotocol/sdk`)
- **Blockchain**: Viem v2.x (Avalanche Fuji Testnet, Chain ID: 43113)
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS (Cyberpunk Theme)
- **Tools**: Biome (Linter), TypeScript 5.x

## 📁 プロジェクト構造

```
root/
├── src/
│   ├── app/                    # Next.js 16 App Router (UI)
│   ├── client/                 # クライアントコンポーネント
│   │   ├── features/map/       # Mapbox可視化
│   │   └── features/terminal/  # サイバーパンクログ & チャット
│   ├── server/                 # サーバーロジック
│   │   ├── actions/            # Server Actions (エージェントエントリーポイント)
│   │   ├── services/           # シミュレーションロジック
│   │   └── lib/                # Vertex AI, Viem, Redis
│   ├── mcp-server/             # [CORE] 公式MCP実装
│   │   ├── index.ts            # MCPサーバーインスタンス
│   │   └── tools.ts            # ツール定義 (Zodスキーマ)
│   └── types/                  # 共有型定義
├── server.ts                   # カスタムサーバー (Socket.io + Next.js)
└── CURSOR_RULES.md             # 厳密なコーディングガイドライン
```

## 🚀 セットアップ & 起動

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーし、必要な値を設定:

```bash
# Google Vertex AI
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key

# Avalanche Fuji Testnet
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...
JPYC_CONTRACT_ADDRESS=0x...

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### 3. 開発サーバー起動

```bash
pnpm dev
```

`http://localhost:3000`でアプリケーションが起動します。

## 📖 開発ガイド

詳細な開発ルールについては、`CURSOR_RULES.md`を参照してください。

## 🎨 デザインシステム

サイバーパンクテーマカラー:
- **Primary**: Neon Green (`#00ff41`)
- **Secondary**: Neon Pink (`#ff006e`)
- **Accent**: Cyan (`#00f5ff`)
- **Background**: Slate 950 (`#020617`)

## 📜 ライセンス

MIT License

