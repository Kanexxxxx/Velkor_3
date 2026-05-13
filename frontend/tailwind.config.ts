import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/services/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        bg: '#0a0a0a',
        surface: '#111111',
        graphite: '#232323',
        text: '#f5f1ea',
        muted: '#6a6a6a',
        velkor: {
          red: '#ff1a3d',
          glow: '#ff3355',
          deep: '#c4112e'
        }
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        head: ['Syne', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        product: ['Poppins', 'sans-serif']
      },
      maxWidth: {
        velkor: '1440px'
      }
    }
  },
  plugins: []
};

export default config;
