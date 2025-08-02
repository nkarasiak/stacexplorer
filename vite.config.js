import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(async () => ({
  base: process.env.NODE_ENV === 'production' ? '/stacexplorer/' : '/',

  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 3000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.element84\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stac-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
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

  server: {
    port: 3000,
    host: true,
    cors: true,
    proxy: {
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

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Optimize for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove all console logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.trace'],
        // Remove unused code more aggressively
        dead_code: true,
        unused: true,
      },
      mangle: {
        // Mangle all properties starting with underscore
        properties: {
          regex: /^_/,
        },
      },
    },

    // Enhanced code splitting
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // More granular chunking strategy
        manualChunks: {
          // Critical path - loaded immediately
          core: [
            './js/app.js',
            './js/config.js',
            './js/components/common/UIManager.js',
            './js/components/common/NotificationService.js',
          ],

          // Search functionality - lazy loaded
          search: [
            './js/components/search/CardSearchPanel.js',
            './js/components/search/CatalogSelector.js',
            './js/components/search/SearchForm.js',
            './js/components/search/FilterManager.js',
          ],

          // Collection management - lazy loaded
          collections: [
            './js/components/search/CollectionManagerEnhanced.js',
            './js/components/search/CollectionSelectorIntegration.js',
            './js/components/search/CatalogBrowserPanel.js',
            './js/components/search/CollectionBrowserModal.js',
          ],

          // Map functionality - lazy loaded
          mapping: [
            './js/components/map/MapManager.js',
            './js/components/map/SimpleDeckGLIntegration.js',
          ],

          // Results and visualization - lazy loaded
          visualization: [
            './js/components/visualization/VisualizationPanel.js',
            './js/components/visualization/RasterVisualizationManager.js',
            './js/components/visualization/BandCombinationEngine.js',
            './js/components/results/ResultsPanel.js',
          ],

          // UI components - can be lazy loaded
          'ui-components': [
            './js/components/ui/CommandPalette.js',
            './js/components/ui/InlineDropdownManager.js',
            './js/components/ui/SearchHistoryUI.js',
            './js/components/ui/ViewModeToggle.js',
            './js/components/ui/Modal.js',
            './js/components/ui/Button.js',
          ],

          // Utilities - shared across chunks
          utils: [
            './js/utils/UnifiedStateManager.js',
            './js/utils/UnifiedRouter.js',
            './js/utils/CookieCache.js',
            './js/utils/SearchHistoryManager.js',
            './js/utils/DateUtils.js',
            './js/utils/OfflineManager.js',
          ],

          // Performance utilities - lazy loaded
          performance: [
            './js/components/performance/CacheManager.js',
            './js/components/performance/MemoryManager.js',
            './js/components/performance/VirtualizedList.js',
          ],
        },

        // Optimize chunk names for better caching
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },

        // Optimize asset names
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },

      // External dependencies that should be loaded from CDN
      external: [
        // Only externalize if you plan to use CDN versions
        // 'leaflet' // Example: if using Leaflet from CDN
      ],
    },

    // Reduced bundle size limits
    chunkSizeWarningLimit: 500, // More aggressive limit
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@components': resolve(__dirname, './js/components'),
      '@utils': resolve(__dirname, './js/utils'),
      '@css': resolve(__dirname, './css'),
    },
  },

  css: {
    preprocessorOptions: {},
    devSourcemap: true,
    postcss: {
      plugins: [
        (await import('autoprefixer')).default,
        (await import('cssnano')).default({
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: false,
            },
          ],
        }),
      ],
    },
  },

  // Remove unused dependencies from optimization
  optimizeDeps: {
    include: [
      // Only include dependencies that are actually used
      'leaflet', // If you're using Leaflet
    ],
    exclude: [
      // Exclude heavy unused dependencies
      '@deck.gl/core',
      '@deck.gl/geo-layers',
      '@deck.gl/layers',
      '@loaders.gl/core',
      '@loaders.gl/tiles',
    ],
  },

  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VITE_VERSION__: JSON.stringify(process.env.npm_package_version || '2.12.5'),
  },
}));
