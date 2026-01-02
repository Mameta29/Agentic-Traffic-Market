import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // カスタムサーバーを使用するため、output設定は不要
  reactStrictMode: true,
  // Socket.ioとの統合のため、standalone出力は使用しない
  poweredByHeader: false,
  // Mapbox用の外部画像ドメイン
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
      },
    ],
  },
};

export default nextConfig;

