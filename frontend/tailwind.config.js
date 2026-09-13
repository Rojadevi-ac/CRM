/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'var(--color-brand-50, #eff6ff)',
          100: 'var(--color-brand-100, #dbeafe)',
          200: 'var(--color-brand-200, #bfdbfe)',
          300: 'var(--color-brand-300, #93c5fd)',
          400: 'var(--color-brand-400, #60a5fa)',
          500: 'var(--color-brand-500, #3b82f6)',
          600: 'var(--color-brand-600, #2563eb)',
          700: 'var(--color-brand-700, #1d4ed8)',
          800: 'var(--color-brand-800, #1e40af)',
          900: 'var(--color-brand-900, #1e3a8a)',
          950: 'var(--color-brand-950, #0b1329)',
        },
        studio: {
          lightBg: '#f8fafc',
          lightCard: '#ffffff',
          lightBorder: '#e2e8f0',
          darkBg: '#090d16',
          darkCard: '#101726',
          darkBorder: '#1e293b',
          darkPanel: '#151e30',
        },
        slate: {
          750: '#233044',
          850: '#111827',
          900: '#0b1120',
          950: '#060a12',
        }
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'md': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        'lg': '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        'xl': '0 20px 35px -8px rgba(15, 23, 42, 0.12), 0 10px 15px -5px rgba(15, 23, 42, 0.04)',
        'glow-brand': '0 0 20px -3px rgba(37, 99, 235, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.35)',
        'glow-rose': '0 0 20px -3px rgba(244, 63, 94, 0.35)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}


