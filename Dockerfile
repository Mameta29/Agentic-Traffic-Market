# ===================================
# Stage 1: Dependencies
# ===================================
FROM node:20-alpine AS deps

WORKDIR /app

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# パッケージマネージャーファイルをコピー
COPY package.json pnpm-lock.yaml* ./

# 依存関係のインストール
RUN pnpm install --frozen-lockfile

# ===================================
# Stage 2: Builder
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係を前のステージからコピー
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.jsのテレメトリーを無効化
ENV NEXT_TELEMETRY_DISABLED=1

# ビルド
RUN npm run build

# ===================================
# Stage 3: Runner
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティのため非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json

# tsxをインストール (server.ts実行用)
RUN corepack enable && pnpm add tsx

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# カスタムサーバーで起動
CMD ["npx", "tsx", "server.ts"]

