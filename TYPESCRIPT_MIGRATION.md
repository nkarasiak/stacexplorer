# TypeScript Migration Plan

## Overview
Gradual migration from JavaScript to TypeScript for improved type safety, better IDE support, and reduced runtime errors.

## Phase 1: Setup & Configuration (Week 1)

### 1.1 Install TypeScript Dependencies
```bash
npm install --save-dev typescript @types/node @types/web
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 1.2 TypeScript Configuration
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": false,
    "allowJs": true,
    "checkJs": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./js/*"],
      "@components/*": ["./js/components/*"],
      "@utils/*": ["./js/utils/*"]
    }
  },
  "include": [
    "js/**/*",
    "*.ts",
    "*.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

### 1.3 Update Vite Configuration
```javascript
// Add to vite.config.js plugins
import { defineConfig } from 'vite'
// ... other imports

export default defineConfig(async () => ({
  // ... existing config
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@components': resolve(__dirname, './js/components'),
      '@utils': resolve(__dirname, './js/utils'),
      '@types': resolve(__dirname, './types')
    }
  },
  esbuild: {
    target: 'es2022'
  }
}))
```

## Phase 2: Type Definitions (Week 2)

### 2.1 Create Global Type Definitions
Create `types/global.d.ts`:
```typescript
// Global type definitions
declare global {
  interface Window {
    maplibregl?: any;
    deck?: any;
    L?: any;
    geocodingService?: any;
    initializeGeocodingService?: () => Promise<any>;
  }
}

// STAC Types
export interface STACItem {
  id: string;
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: STACProperties;
  assets: Record<string, STACAsset>;
  links: STACLink[];
  stac_version: string;
  stac_extensions?: string[];
}

export interface STACProperties {
  datetime: string | null;
  start_datetime?: string;
  end_datetime?: string;
  created?: string;
  updated?: string;
  platform?: string;
  instruments?: string[];
  constellation?: string;
  mission?: string;
  gsd?: number;
  'eo:cloud_cover'?: number;
  'proj:epsg'?: number;
  [key: string]: any;
}

export interface STACAsset {
  href: string;
  type?: string;
  title?: string;
  description?: string;
  roles?: string[];
  'eo:bands'?: EOBand[];
  'proj:shape'?: number[];
  'proj:transform'?: number[];
  [key: string]: any;
}

export interface STACLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface EOBand {
  name: string;
  common_name?: string;
  description?: string;
  center_wavelength?: number;
  full_width_half_max?: number;
}

// Component Types
export interface ComponentOptions {
  className?: string;
  [key: string]: any;
}

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
}

export interface MapManagerOptions {
  container: string | HTMLElement;
  style?: string;
  center?: [number, number];
  zoom?: number;
}

export {};
```

### 2.2 Create Component Base Types
Create `types/components.d.ts`:
```typescript
export interface BaseComponentState {
  [key: string]: any;
}

export interface BaseComponentOptions {
  className?: string;
  container?: string | HTMLElement;
  [key: string]: any;
}

export abstract class IBaseComponent {
  abstract render(): void;
  abstract destroy(): void;
}
```

## Phase 3: Utility Migration (Week 3)

### Priority Order:
1. `SecurityUtils.js` → `SecurityUtils.ts`
2. `DateUtils.js` → `DateUtils.ts`
3. `GeometryUtils.js` → `GeometryUtils.ts`
4. `CookieCache.js` → `CookieCache.ts`

### Example Migration: SecurityUtils.ts
```typescript
export class SecurityUtils {
  static sanitizeHtml(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }
    // ... rest of implementation
  }

  static sanitizeUrl(url: unknown): string | null {
    if (typeof url !== 'string') {
      return null;
    }
    // ... rest of implementation
  }

  static validateCoordinates(
    lat: number | string, 
    lon: number | string
  ): { lat: number; lon: number } | null {
    // ... implementation
  }
}
```

## Phase 4: API Layer Migration (Week 4)

### 4.1 STAC API Client
`STACApiClient.js` → `STACApiClient.ts`

```typescript
export interface STACEndpoints {
  root: string;
  collections: string;
  search: string;
}

export interface SearchParams {
  bbox?: number[];
  datetime?: string;
  collections?: string[];
  limit?: number;
  [key: string]: any;
}

export class STACApiClient {
  private endpoints: STACEndpoints;
  
  constructor(endpoints?: Partial<STACEndpoints>) {
    // ... implementation
  }

  async search(params: SearchParams): Promise<STACItem[]> {
    // ... implementation
  }

  async getCollection(id: string): Promise<STACCollection> {
    // ... implementation
  }
}
```

## Phase 5: Component Migration (Weeks 5-8)

### Week 5: Base Components
- `BaseUIComponent.js` → `BaseUIComponent.ts`
- `ErrorBoundary.js` → `ErrorBoundary.ts`

### Week 6: UI Components
- `NotificationService.js` → `NotificationService.ts`
- `UIManager.js` → `UIManager.ts`
- `Modal.js` → `Modal.ts`

### Week 7: Search Components
- `SearchForm.js` → `SearchForm.ts`
- `FilterManager.js` → `FilterManager.ts`
- `ResultsPanel.js` → `ResultsPanel.ts`

### Week 8: Visualization Components
- `MapManager.js` → `MapManager.ts`
- `VisualizationPanel.js` → `VisualizationPanel.ts`
- `BandCombinationEngine.js` → `BandCombinationEngine.ts`

## Phase 6: Main Application (Week 9)

### 6.1 App Entry Point
`app.js` → `app.ts`

### 6.2 Configuration
`config.js` → `config.ts`

## Phase 7: Strict Mode & Cleanup (Week 10)

### 7.1 Enable Strict Mode
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 7.2 Fix All Type Errors
- Add proper type annotations
- Handle null/undefined cases
- Fix any remaining `any` types

## Migration Scripts

### Package.json Updates
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist/types",
    "migrate:file": "node scripts/migrate-file.js"
  }
}
```

### Migration Helper Script
Create `scripts/migrate-file.js`:
```javascript
// Helper script to rename .js files to .ts and update imports
const fs = require('fs');
const path = require('path');

function migrateFile(filePath) {
  const jsPath = filePath;
  const tsPath = filePath.replace('.js', '.ts');
  
  // Rename file
  fs.renameSync(jsPath, tsPath);
  
  // Update imports in other files
  // ... implementation
}
```

## Testing Strategy

### 7.1 Type Testing
- Create `types/test.ts` with type-only tests
- Use `tsd` for type definition testing

### 7.2 Runtime Testing
- Ensure all existing functionality works
- Add type-specific tests

## Benefits After Migration

1. **Type Safety**: Catch errors at compile time
2. **Better IDE Support**: Autocomplete, refactoring, navigation
3. **Self-Documenting Code**: Types serve as documentation
4. **Easier Refactoring**: Confident code changes
5. **Better Error Messages**: More helpful debugging

## Rollback Plan

If issues arise:
1. Keep `.js` files as backups during migration
2. Use `allowJs: true` to mix JS and TS
3. Gradual rollback by renaming files back to `.js`

## Success Metrics

- [ ] Zero TypeScript compilation errors
- [ ] All tests passing
- [ ] Bundle size unchanged
- [ ] No runtime errors
- [ ] Team productivity improved

## Timeline: 10 Weeks Total

- **Weeks 1-2**: Setup & Type Definitions
- **Weeks 3-4**: Utilities & API Layer  
- **Weeks 5-8**: Component Migration
- **Weeks 9-10**: Main App & Strict Mode

Each phase can be done incrementally without breaking the application.