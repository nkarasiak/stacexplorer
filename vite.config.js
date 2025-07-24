import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
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
        rewrite: (path) => path.replace(/^\/api\/stac/, '')
      },
      '/api/copernicus': {
        target: 'https://catalogue.dataspace.copernicus.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/copernicus/, '')
      }
    }
  },

  // Build configuration
  build: {
    outDir: '.',
    assetsDir: 'assets',
    sourcemap: true,
    
    // Code splitting configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-maps': ['@deck.gl/core', '@deck.gl/geo-layers', '@deck.gl/layers'],
          'vendor-loaders': ['@loaders.gl/core', '@loaders.gl/tiles'],
          
          // Large components that can be lazy loaded
          'visualization': [
            './js/components/visualization/VisualizationPanel.js',
            './js/components/visualization/RasterVisualizationManager.js',
            './js/components/visualization/BandCombinationEngine.js'
          ],
          
          // Performance utilities
          'performance': [
            './js/components/performance/CacheManager.js',
            './js/components/performance/MemoryManager.js',
            './js/components/performance/VirtualizedList.js'
          ]
        }
      }
    },
    
    // Bundle size limits
    chunkSizeWarningLimit: 1000
  },

  // Resolve configuration for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@components': resolve(__dirname, './js/components'),
      '@utils': resolve(__dirname, './js/utils'),
      '@css': resolve(__dirname, './css')
    }
  },

  // CSS configuration
  css: {
    preprocessorOptions: {
      // Add any CSS preprocessing if needed
    }
  },

  // Optimization settings
  optimizeDeps: {
    include: [
      '@deck.gl/core',
      '@deck.gl/geo-layers', 
      '@deck.gl/layers',
      '@loaders.gl/core',
      '@loaders.gl/tiles'
    ]
  }
})