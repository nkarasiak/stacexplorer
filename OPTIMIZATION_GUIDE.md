# Bundle Optimization Guide

## 🚀 Quick Wins (5-30% reduction)

### 1. Remove unused dependencies
```bash
npm uninstall @deck.gl/core @deck.gl/geo-layers @deck.gl/layers @loaders.gl/core @loaders.gl/tiles
# Save ~55MB in node_modules, ~200KB in bundle
```

### 2. Fix dynamic import conflict
In `js/app.js`, remove static import and keep only dynamic:
```javascript
// Remove this line:
// import { GeocodingService } from './utils/GeocodingService.js';

// Keep only dynamic import:
const { GeocodingService } = await import('./utils/GeocodingService.js');
```

### 3. CSS optimization
Install and configure PostCSS plugins:
```bash
npm install --save-dev cssnano autoprefixer
```

Add to `vite.config.js`:
```javascript
css: {
  postcss: {
    plugins: [
      require('autoprefixer'),
      require('cssnano')({
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: false
        }]
      })
    ]
  }
}
```

## 🎯 Medium Impact (30-50% reduction)

### 4. Implement lazy loading
Convert heavy components to dynamic imports:

```javascript
// In app.js, replace static imports with:
const loadVisualization = () => import('./components/visualization/VisualizationPanel.js');
const loadMapManager = () => import('./components/map/MapManager.js');

// Load only when needed:
document.getElementById('map-toggle').addEventListener('click', async () => {
  const { MapManager } = await loadMapManager();
  // Initialize map...
});
```

### 5. Tree shaking improvements
Add to `package.json`:
```json
{
  "sideEffects": [
    "*.css",
    "./js/app.js"
  ]
}
```

### 6. Image optimization
```bash
npm install --save-dev vite-plugin-imagemin
```

## 🔥 Advanced Optimizations (50%+ reduction)

### 7. Micro-frontend architecture
Split into separate entry points:
- `browser-mode.js` (minimal catalog browsing)
- `search-mode.js` (full search functionality)
- `visualization-mode.js` (advanced features)

### 8. CDN externalization
Move large libraries to CDN:

```javascript
// vite.config.js
build: {
  rollupOptions: {
    external: ['leaflet', 'maplibre-gl'],
    output: {
      globals: {
        'leaflet': 'L',
        'maplibre-gl': 'maplibregl'
      }
    }
  }
}
```

### 9. Service worker with smart caching
Implement intelligent pre-caching:
```javascript
// Only cache critical resources
workbox: {
  globPatterns: ['**/*.{js,css,html}'],
  globIgnores: ['**/visualization-*.js', '**/performance-*.js'],
  runtimeCaching: [
    {
      urlPattern: /\/assets\/visualization-/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'heavy-components'
      }
    }
  ]
}
```

## 📊 Expected Results

| Optimization | Bundle Size Reduction | Load Time Improvement |
|--------------|----------------------|----------------------|
| Remove unused deps | -15% | -20% |
| Fix dynamic imports | -5% | -10% |
| CSS optimization | -10% | -5% |
| Lazy loading | -30% | -40% |
| CDN externalization | -25% | -30% |
| **Total Potential** | **-60%** | **-70%** |

## 🔍 Monitoring

Use these commands to track improvements:
```bash
# Build and analyze
npm run build && ls -la dist/assets/
npm run build:analyze

# Lighthouse audit
npx lighthouse http://localhost:3000 --output=html
```

## 🚨 Critical Path Analysis

Current critical path (must load immediately):
1. `main.js` (323KB) - TOO LARGE
2. `main.css` (287KB) - TOO LARGE

Target critical path:
1. `core.js` (<100KB) - App shell only
2. `critical.css` (<50KB) - Above-fold styles only
3. Everything else lazy-loaded

## ⚡ Performance Budget

| Resource Type | Budget | Current | Status |
|---------------|--------|---------|--------|
| Initial JS | 150KB | 323KB | ❌ OVER |
| Initial CSS | 50KB | 287KB | ❌ OVER |
| Total Initial | 200KB | 610KB | ❌ OVER |
| Time to Interactive | 3s | ~5s | ❌ OVER |

Target: Reduce initial bundle to <200KB (90% reduction needed)