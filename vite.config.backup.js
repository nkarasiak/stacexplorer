import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages deployment configuration
  base: process.env.NODE_ENV === 'production' ? '/stacexplorer/' : '/',

  plugins: [
    // Bundle analyzer for optimization insights
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    // PWA for caching and offline support
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 3000000, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.element84\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stac-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'STAC Explorer',
        short_name: 'STAC Explorer',
        description: 'Modern STAC Catalog Explorer with ultra-fast browser mode',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        scope: process.env.NODE_ENV === 'production' ? '/stacexplorer/' : '/',
        start_url: process.env.NODE_ENV === 'production' ? '/stacexplorer/' : '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    cors: true,
    proxy: {
      // Proxy STAC API calls to avoid CORS issues
      '/api/stac': {
        target: 'https://earth-search.aws.element84.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/stac/, ''),
      },
      '/api/copernicus': {
        target: 'https://catalogue.dataspace.copernicus.eu',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/copernicus/, ''),
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Optimize for faster loading
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.error and console.warn
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.trace'], // Remove debug logs but keep errors/warnings
      },
    },

    // Code splitting configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-maps': ['@deck.gl/core', '@deck.gl/geo-layers', '@deck.gl/layers'],
          'vendor-loaders': ['@loaders.gl/core', '@loaders.gl/tiles'],

          // Browser mode components (for fast loading)
          'browser-core': [
            './js/components/search/CatalogBrowserPanel.js',
            './js/components/ui/ViewModeToggle.js',
            './js/utils/UnifiedRouter.js',
          ],

          // Search and map components (can be lazy loaded)
          'search-components': [
            './js/components/search/CardSearchPanel.js',
            './js/components/search/CollectionManagerEnhanced.js',
            './js/components/search/FilterManager.js',
            './js/components/map/MapManager.js',
          ],

          // Large components that can be lazy loaded
          visualization: [
            './js/components/visualization/VisualizationPanel.js',
            './js/components/visualization/RasterVisualizationManager.js',
            './js/components/visualization/BandCombinationEngine.js',
          ],

          // Performance utilities
          performance: [
            './js/components/performance/CacheManager.js',
            './js/components/performance/MemoryManager.js',
            './js/components/performance/VirtualizedList.js',
          ],
        },
      },
    },

    // Bundle size limits
    chunkSizeWarningLimit: 1000,
  },

  // Resolve configuration for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@components': resolve(__dirname, './js/components'),
      '@utils': resolve(__dirname, './js/utils'),
      '@css': resolve(__dirname, './css'),
      '@browser': resolve(__dirname, './js/components/search'),
      '@ui': resolve(__dirname, './js/components/ui'),
      '@api': resolve(__dirname, './js/components/api'),
    },
  },

  // CSS configuration
  css: {
    preprocessorOptions: {
      // Add any CSS preprocessing if needed
    },
    devSourcemap: true,
    postcss: {
      plugins: [
        // Add PostCSS plugins for optimization if needed
      ],
    },
  },

  // Optimization settings
  optimizeDeps: {
    include: [
      '@deck.gl/core',
      '@deck.gl/geo-layers',
      '@deck.gl/layers',
      '@loaders.gl/core',
      '@loaders.gl/tiles',
    ],

    // Pre-bundle browser mode dependencies for faster loading
    force: false,

    // Exclude heavy dependencies that should be lazy loaded
    exclude: ['visualization', 'performance'],
  },

  // Environment variables
  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VITE_VERSION__: JSON.stringify(process.env.npm_package_version || '2.8.0'),
  },

  // Enable experimental features for better performance
  experimental: {
    // renderBuiltUrl for CDN support if needed
  },
});
