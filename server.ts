/**
 * カスタムNode.jsサーバー
 * Next.js 16.1 + Socket.ioを統合し、リアルタイムエージェント通信を実現
 * HMR (Hot Module Replacement) との互換性を維持
 */

import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

console.log('Server configuration:', { dev, hostname, port, env: process.env.NODE_ENV });

// Next.jsアプリケーションの初期化
const nextApp = next({ dev, hostname, port });
const handler = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  // HTTPサーバーを作成
  const httpServer = createServer((req, res) => {
    handler(req, res);
  });

  // Socket.ioサーバーをHTTPサーバーに統合
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.ALLOWED_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io接続ハンドラー
  io.on('connection', (socket) => {
    console.log(`[Socket.io] クライアント接続: ${socket.id}`);

    // エージェント位置更新
    socket.on('agent:position', (data: { agentId: string; lat: number; lng: number }) => {
      // 他の全クライアントにブロードキャスト
      socket.broadcast.emit('agent:position:update', data);
    });

    // エージェント状態変更 (Idle, Negotiating, Moving)
    socket.on('agent:state', (data: { agentId: string; state: string }) => {
      socket.broadcast.emit('agent:state:update', data);
    });

    // ネゴシエーションメッセージ
    socket.on('agent:message', (data: { from: string; to: string; message: string }) => {
      socket.broadcast.emit('agent:message:received', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] クライアント切断: ${socket.id}`);
    });
  });

  // サーバー起動
  httpServer.listen(port, hostname, () => {
    console.log(`🚀 サーバー起動: http://${hostname}:${port}`);
    console.log(`⚡ 環境: ${dev ? '開発モード (HMR有効)' : '本番モード'}`);
    console.log(`🔌 Socket.io 準備完了`);
  });
}).catch((err) => {
  console.error('Server initialization failed:', err);
  process.exit(1);
});


