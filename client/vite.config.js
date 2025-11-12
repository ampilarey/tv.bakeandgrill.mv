import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // Ensure correct base path for production
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Bake and Grill TV',
        short_name: 'B&G TV',
        description: 'IPTV streaming platform for Bake and Grill',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#F59E0B',
        orientation: 'any',
        categories: ['entertainment', 'lifestyle'],
        lang: 'en',
        dir: 'ltr',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
        ],
        screenshots: [
          {
            src: '/pwa-192x192.png',
            sizes: '540x720',
            type: 'image/png',
            label: 'Bake & Grill TV - Watch your favorite channels'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Only precache critical assets, NOT JS/HTML to avoid stale cache issues
        globPatterns: ['**/*.{ico,png,svg,woff,woff2}'],
        // Exclude JS and HTML from precaching - they're handled by .htaccess
        globIgnores: ['**/*.js', '**/*.html'],
        runtimeCaching: [
          {
            // JS and CSS - Network first (always get fresh files)
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-css-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            // HTML - Network only (never cache to avoid stale pages)
            urlPattern: /\.html$/i,
            handler: 'NetworkOnly'
          },
          {
            // API calls - Network first, fallback to cache
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Images and static assets - Cache first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            // Fonts - Cache first
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Add timestamp to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'hls': ['hls.js']
        }
      }
    }
  }
});

