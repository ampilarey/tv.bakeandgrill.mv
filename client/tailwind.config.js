/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TV UI Color Scheme - Modern Premium Dark Theme
        tv: {
          bg: '#0A0E17',           // Deep navy black (main background)
          bgElevated: '#141B2B',   // Elevated surfaces (cards, sidebars)
          bgSoft: '#1E2739',       // Hover states and secondary surfaces
          bgHover: '#2A3447',      // Active hover state
          text: '#F8FAFC',         // Primary text (bright, high contrast)
          textSecondary: '#CBD5E1', // Secondary text (clear but softer)
          textMuted: '#94A3B8',    // Muted text (labels, hints)
          borderSubtle: '#334155', // Borders and dividers
          accent: '#3B82F6',       // Blue 500 - modern, vibrant accent
          accentHover: '#60A5FA',  // Blue 400 - hover state
          accentLight: '#DBEAFE',  // Blue 100 - subtle backgrounds
          success: '#10B981',      // Emerald 500 - success
          error: '#EF4444',        // Red 500 - errors
          warning: '#F59E0B',      // Amber 500 - warnings
          info: '#06B6D4',         // Cyan 500 - info
        },
        // Keep legacy colors for backward compatibility - updated to match new theme
        primary: {
          DEFAULT: '#3B82F6', // Blue - matches tv-accent
          light: '#60A5FA',   // Blue light
          dark: '#2563EB',    // Blue dark
        },
        secondary: {
          DEFAULT: '#1E2739', // Navy
          dark: '#141B2B',    // Dark navy
        },
        background: {
          DEFAULT: '#0A0E17', // Deep navy - matches tv-bg
          light: '#141B2B',   // Matches tv-bgElevated
          lighter: '#1E2739', // Matches tv-bgSoft
        },
        text: {
          DEFAULT: '#F8FAFC',      // Bright - matches tv-text
          secondary: '#CBD5E1',    // Clear secondary - matches tv-textSecondary
          muted: '#94A3B8',        // Muted - matches tv-textMuted
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

