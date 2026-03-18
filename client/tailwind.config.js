/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Activate dark: variants when the .dark-theme class is on <html>
  darkMode: ['class', '.dark-theme'],
  theme: {
    extend: {
      colors: {
        // TV UI Color Scheme — token values come from CSS variables so dark mode
        // is handled in a single CSS block rather than per-component dark: prefixes.
        tv: {
          bg:            'var(--tv-bg)',
          bgElevated:    'var(--tv-bg-elevated)',
          bgSoft:        'var(--tv-bg-soft)',
          bgHover:       'var(--tv-bg-hover)',
          text:          'var(--tv-text)',
          textSecondary: 'var(--tv-text-secondary)',
          textMuted:     'var(--tv-text-muted)',
          borderSubtle:  'var(--tv-border-subtle)',
          accent:        'var(--tv-accent)',
          accentHover:   'var(--tv-accent-hover)',
          accentDark:    'var(--tv-accent-dark)',
          accentLight:   'var(--tv-accent-light)',
          gold:          'var(--tv-gold)',
          goldHover:     'var(--tv-gold-hover)',
          goldDark:      'var(--tv-gold-dark)',
          success:       'var(--tv-success)',
          error:         'var(--tv-error)',
          warning:       'var(--tv-warning)',
          info:          'var(--tv-info)',
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

