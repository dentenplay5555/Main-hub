/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep navy/charcoal design system
        studio: {
          'bg': 'rgb(var(--studio-bg) / <alpha-value>)',
          'surface': 'rgb(var(--studio-surface) / <alpha-value>)',
          'panel': 'rgb(var(--studio-panel) / <alpha-value>)',
          'border': 'rgb(var(--studio-border) / <alpha-value>)',
          'border-hover': 'rgb(var(--studio-border-hover) / <alpha-value>)',
          'text': 'rgb(var(--studio-text) / <alpha-value>)',
          'muted': 'rgb(var(--studio-muted) / <alpha-value>)',
          'accent': 'rgb(var(--studio-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--studio-accent-hover) / <alpha-value>)',
          'accent-dim': 'rgb(var(--studio-accent-dim) / <alpha-value>)',
          'success': 'rgb(var(--studio-success) / <alpha-value>)',
          'warning': 'rgb(var(--studio-warning) / <alpha-value>)',
          'error': 'rgb(var(--studio-error) / <alpha-value>)',
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
