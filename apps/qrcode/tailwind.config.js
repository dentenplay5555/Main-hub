/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep navy/charcoal design system
        studio: {
          bg: '#0a0e1a',
          surface: '#111827',
          panel: '#1a2035',
          border: '#252d3f',
          'border-hover': '#3b4766',
          text: '#e8ecf4',
          muted: '#8896b3',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          'accent-dim': '#4f46e5',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '12px',
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'panel-lg': '0 10px 30px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
