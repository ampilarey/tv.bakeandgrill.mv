import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // Ensure correct base path for production
  // Optimize build for lower memory usage
  build: {
    outDir: 'dist',
    // Reduce chunk size to avoid memory issues
    chunkSizeWarningLimit: 1000,
    // Disable sourcemaps to save memory
    sourcemap: false,
    rollupOptions: {
      output: {
        // Add timestamp to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks to split large dependencies and reduce memory usage
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'hls-vendor': ['hls.js']
        }
      }
    },
    // Use terser for better memory efficiency
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // Disable auto-inject - we handle registration manually in main.jsx
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'],
      manifest: {
        name: 'Bake & Grill TV',
        short_name: 'B&G TV',
        description: 'IPTV streaming platform for Bake and Grill',
        start_url: '/?source=pwa',
        display: 'standalone',
        background_color: '#FFF8EE', // Cream - matches tv-bg
        theme_color: '#B03A48',      // Maroon - matches tv-accent
        orientation: 'any',
        categories: ['entertainment', 'lifestyle'],
        lang: 'en',
        dir: 'ltr',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
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
        // Disable cache for JS/CSS during development
        cleanupOutdatedCaches: true,
        // Force update check on navigation (mobile PWA fix)
        navigationPreload: true,
        // Only precache critical assets, NOT JS/HTML to avoid stale cache issues
        globPatterns: ['**/*.{ico,png,svg,woff,woff2}'],
        // Exclude JS and HTML from precaching - they're handled by .htaccess
        globIgnores: ['**/*.js', '**/*.html', '**/*.m3u8', '**/*.ts'],
        runtimeCaching: [
          {
            // 🚨 CRITICAL: HLS Streams - NEVER CACHE
            urlPattern: /\.m3u8(\?.*)?$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'hls-bypass-m3u8'
            }
          },
          {
            // 🚨 CRITICAL: HLS Segments - NEVER CACHE
            urlPattern: /\.ts(\?.*)?$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'hls-bypass-ts'
            }
          },
          {
            // JS and CSS - Network only (never cache to force fresh updates)
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'js-css-network-only-v3' // Changed to force service worker update
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
  }
});

