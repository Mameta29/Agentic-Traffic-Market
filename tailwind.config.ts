import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/client/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // サイバーパンクテーマカラー
        neon: {
          green: '#00ff41',
          pink: '#ff006e',
          cyan: '#00f5ff',
          purple: '#b400ff',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ff41, 0 0 10px #00ff41' },
          '100%': { boxShadow: '0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

