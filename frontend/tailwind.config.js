/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0F',
        surface: '#14141A',
        'surface-2': '#1A1A24',
        primary: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        glow: '0 0 24px rgba(16,185,129,0.15)',
        'glow-lg': '0 0 48px rgba(16,185,129,0.2)',
        'glow-red': '0 0 24px rgba(239,68,68,0.15)',
        'glow-amber': '0 0 24px rgba(245,158,11,0.15)',
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.08)',
      },
      animation: {
        'in': 'in 0.15s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        in: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
