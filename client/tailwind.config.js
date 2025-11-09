/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F59E0B', // Amber
          light: '#FCD34D',   // Golden
          dark: '#EA580C',    // Orange
        },
        secondary: {
          DEFAULT: '#92400E', // Rich Brown
          dark: '#78350F',    // Copper
        },
        background: {
          DEFAULT: '#0F172A', // Dark Charcoal
          light: '#1E293B',   // Slate
          lighter: '#334155', // Slate Light
        },
        text: {
          DEFAULT: '#F1F5F9', // White
          secondary: '#94A3B8', // Gray
          muted: '#64748B',   // Muted
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

