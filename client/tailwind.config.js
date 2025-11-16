/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TV UI Color Scheme - Fresh Mint + Warm Gold Theme
        tv: {
          bg: '#FAF9F6',           // Soft cream (main background)
          bgElevated: '#FFFFFF',   // Pure white (cards, sidebars)
          bgSoft: '#F0F7F4',       // Light mint tint (hover states)
          bgHover: '#E1F5E8',      // Soft mint (active hover)
          text: '#3C5F56',         // Deep mint-green (primary text)
          textSecondary: '#6F8F89', // Medium sage (secondary text)
          textMuted: '#9FB3AE',    // Light sage (muted text)
          borderSubtle: '#D4E5DF', // Soft mint borders
          accent: '#A8E6CF',       // Fresh mint - main accent
          accentHover: '#66CDAA',  // Deep mint - hover
          accentDark: '#4DB89A',   // Darker mint - pressed
          gold: '#F4C95D',         // Warm gold - secondary accent
          goldHover: '#F7D98B',    // Light gold - hover
          goldDark: '#E6B54A',     // Deep gold - active
          success: '#66CDAA',      // Mint green - success
          error: '#EF8080',        // Soft red - errors
          warning: '#F4C95D',      // Gold - warnings
          info: '#A8E6CF',         // Mint - info
        },
        // Keep legacy colors for backward compatibility - updated to match mint/gold theme
        primary: {
          DEFAULT: '#A8E6CF', // Fresh mint
          light: '#C7F0DC',   // Light mint
          dark: '#66CDAA',    // Deep mint
        },
        secondary: {
          DEFAULT: '#F4C95D', // Warm gold
          light: '#F7D98B',   // Light gold
          dark: '#E6B54A',    // Deep gold
        },
        background: {
          DEFAULT: '#FAF9F6', // Soft cream
          light: '#FFFFFF',   // White
          lighter: '#F0F7F4', // Light mint tint
        },
        text: {
          DEFAULT: '#3C5F56',      // Deep mint-green
          secondary: '#6F8F89',    // Medium sage
          muted: '#9FB3AE',        // Light sage
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

