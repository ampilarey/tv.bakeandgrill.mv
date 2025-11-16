/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TV UI Color Scheme - Soft Maroon + Gold + Cream Theme
        tv: {
          bg: '#FFF8EE',           // Cream background (main)
          bgElevated: '#FFFFFF',   // Pure white (cards, elevated)
          bgSoft: '#F2E6D0',       // Beige light (sidebars, hover)
          bgHover: '#E8D9C0',      // Beige hover state
          text: '#4A3F3F',         // Text primary (soft brown-gray)
          textSecondary: '#6A5A5A', // Text secondary
          textMuted: '#8A7A7A',    // Text muted
          borderSubtle: '#E0D4C4', // Subtle borders
          accent: '#B03A48',       // Soft maroon - primary accent
          accentHover: '#C64756',  // Brighter maroon - hover
          accentDark: '#9B2E3C',   // Darker maroon - pressed
          gold: '#DDAE5B',         // Gold accent - secondary
          goldHover: '#F5C87A',    // Light gold - hover (+10%)
          goldDark: '#C89A4A',     // Deep gold - active
          success: '#B03A48',      // Maroon for success states
          error: '#C64756',        // Brighter maroon for errors
          warning: '#DDAE5B',      // Gold for warnings
          info: '#B03A48',         // Maroon for info
        },
        // Legacy colors updated to match new maroon/gold theme
        primary: {
          DEFAULT: '#B03A48', // Soft maroon
          light: '#C64756',   // Brighter maroon
          dark: '#9B2E3C',    // Darker maroon
        },
        secondary: {
          DEFAULT: '#DDAE5B', // Gold accent
          light: '#F5C87A',   // Light gold
          dark: '#C89A4A',    // Deep gold
        },
        background: {
          DEFAULT: '#FFF8EE', // Cream background
          light: '#FFFFFF',   // White
          lighter: '#F2E6D0', // Beige light
        },
        text: {
          DEFAULT: '#4A3F3F',      // Text primary
          secondary: '#6A5A5A',    // Text secondary
          muted: '#8A7A7A',        // Text muted
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

