/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TV UI Color Scheme - Modern Premium Light Theme
        tv: {
          bg: '#F8FAFC',           // Light gray-blue (main background)
          bgElevated: '#FFFFFF',   // Pure white (cards, sidebars)
          bgSoft: '#F1F5F9',       // Soft gray (hover states)
          bgHover: '#E2E8F0',      // Light blue-gray (active hover)
          text: '#0F172A',         // Dark slate (primary text)
          textSecondary: '#475569', // Medium gray (secondary text)
          textMuted: '#64748B',    // Light gray (muted text)
          borderSubtle: '#CBD5E1', // Light borders
          accent: '#3B82F6',       // Bright blue - vibrant accent
          accentHover: '#2563EB',  // Darker blue - hover
          accentLight: '#DBEAFE',  // Light blue - backgrounds
          success: '#10B981',      // Emerald - success
          error: '#EF4444',        // Red - errors
          warning: '#F59E0B',      // Amber - warnings
          info: '#06B6D4',         // Cyan - info
        },
        // Keep legacy colors for backward compatibility - updated to match light theme
        primary: {
          DEFAULT: '#3B82F6', // Bright blue
          light: '#60A5FA',   // Light blue
          dark: '#2563EB',    // Dark blue
        },
        secondary: {
          DEFAULT: '#F1F5F9', // Light gray
          dark: '#E2E8F0',    // Soft gray
        },
        background: {
          DEFAULT: '#F8FAFC', // Light background
          light: '#FFFFFF',   // White
          lighter: '#F1F5F9', // Soft gray
        },
        text: {
          DEFAULT: '#0F172A',      // Dark text
          secondary: '#475569',    // Medium gray
          muted: '#64748B',        // Light gray
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

