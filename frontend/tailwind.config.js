/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#3A0A10',
          deep: '#2A070B',
        },
        surface: 'rgba(255, 255, 255, 0.04)',
        cream: {
          DEFAULT: '#EFE7DC',
          deep: '#E4D9CA',
        },
        ink: '#3A0A10',
        gold: '#C9A35B',
        status: {
          verified: '#3FA27A',
          tampered: '#E5484D',
          warning: '#D9A441',
        },
      },
      textColor: {
        'maroon-primary': '#FFFFFF',
        'maroon-secondary': 'rgba(255, 255, 255, 0.75)',
        'maroon-muted': 'rgba(255, 255, 255, 0.50)',
      },
      borderColor: {
        'surface-subtle': 'rgba(255, 255, 255, 0.10)',
        'maroon-border': 'rgba(255, 255, 255, 0.10)',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        pill: '9999px',
      },
      boxShadow: {
        cream: '0 8px 32px -4px rgba(42, 7, 11, 0.25), 0 4px 12px -2px rgba(42, 7, 11, 0.15)',
        gold: '0 0 20px -2px rgba(201, 163, 91, 0.35)',
      },
    },
  },
  plugins: [],
}
