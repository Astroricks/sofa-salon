import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#e8c84a',
        cinema: {
          bg: '#0f0f0f',
          s1: '#161616',
          s2: '#1e1e1e',
          s3: '#252525',
          border: '#2a2a2a',
          text: '#e8e4dc',
          mid: '#888888',
          dim: '#444444',
          red: '#f87171',
          green: '#4ade80',
          purple: '#c084fc',
          floor: '#2a2218',
          floorLine: '#252015',
        },
      },
      borderRadius: {
        none: '0',
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'Zpix', 'monospace'],
        mono: ['var(--font-mono)', 'Zpix', 'monospace'],
        serif: ['var(--font-serif)', 'serif'],
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
