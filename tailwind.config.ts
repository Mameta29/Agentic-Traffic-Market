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
  plugins: [
    // カスタムスクロールバー用プラグイン
    function ({ addUtilities }: any) {
      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
        '.scrollbar-thumb-green-500\\/30': {
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
          },
        },
        '.scrollbar-track-slate-800': {
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#1e293b',
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;

