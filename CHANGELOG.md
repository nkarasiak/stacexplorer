# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.4] - 2025-07-13

### Fixed
- **Location Search Integration**: Fixed search button not respecting selected location by updating bbox-input field when location is selected
- **Search Parameter Sync**: Ensured location selections from geocoding search and map drawing properly update SearchForm parameters

### Changed
- **Search Button**: Removed reset button, keeping only the search button for cleaner interface

### Technical Details
- Location selections now update the bbox-input field that SearchForm.getSearchParams() uses
- Fixed integration between InlineDropdownManager location selection and CardSearchPanel search execution
- All location selection methods (geocoding, drawing, map selection) now properly sync with search parameters

## [2.1.3] - 2025-07-13

### Added
- **Visible Search Buttons**: Added prominent search and reset buttons to the main search interface
- **Search Button Styling**: Modern styled search action buttons with proper hover effects and responsive design

### Fixed
- **Search Button Visibility**: Created visible search buttons (main-search-btn, main-reset-btn) in the search interface
- **Button Functionality**: Connected all search buttons (visible and hidden) to CardSearchPanel event handlers

## [2.1.2] - 2025-07-13

### Fixed
- **Search Button**: Fixed missing search button functionality by adding event listeners for both summary-search-btn and summary-reset-btn in CardSearchPanel
- **Application Initialization**: Fixed "settingsPanel is not defined" error by removing leftover reference in global scope

## [2.1.1] - 2025-07-13

### Fixed
- **GitHub CI/CD**: Simplified deployment workflow, removed failing test and Lighthouse jobs
- **Search Button**: Fixed broken search functionality by removing deleted script references
- **Settings Button**: Removed unused settings button and associated functionality
- **Development Cleanup**: Removed unused test files, debug scripts, and development artifacts
- **Package Dependencies**: Cleaned up package.json by removing unused Jest and ESLint dependencies

### Removed  
- Settings panel functionality and UI button
- GitHub Actions testing and Lighthouse auditing jobs
- Jest testing configuration and setup files
- ESLint configuration and linting scripts
- 69+ development artifact files (test HTML, debug JS, documentation files)
- Unused enhanced-app-init.js file

### Technical Details
- Simplified GitHub Actions to deploy-only workflow
- Reduced package.json complexity by removing test/lint scripts
- Fixed broken script references in index.html
- Maintained core functionality while removing development overhead

## [2.1.0] - 2025-07-13

### Added
- **Enhanced Dataset Details Modal**: Completely redesigned modal for individual STAC items with modern layout
- **Copy Item Information**: New button to copy item metadata (ID, collection, properties, geometry, assets) to clipboard
- **Show on Map Integration**: Enhanced "Show on Map" button for items with geometry data
- **Improved Modal Styling**: Modern glassmorphism design with organized sections and responsive layout
- **Leaflet Dependencies**: Added Leaflet CSS and JavaScript for mini map functionality
- **Enhanced Modal Footer**: Reorganized action buttons with proper left/right alignment

### Enhanced
- **Modal Content Layout**: Redesigned with structured sections for basic information, properties, and JSON data
- **JSON Viewer**: Collapsible JSON section with toggle functionality for better space utilization
- **Responsive Design**: Improved mobile and desktop layouts for dataset details modal
- **Visual Hierarchy**: Better organized content with icons, improved typography, and consistent spacing
- **Action Button Management**: Dynamic show/hide of action buttons based on item capabilities
- **CSS Grid Layout**: Modern grid system for information display with auto-fitting columns

### Changed
- **Dataset Content Height**: Increased minimum height to 80px to properly accommodate action buttons
- **Modal Structure**: Updated from simple layout to organized sections with clear visual hierarchy
- **Button Layout**: Reorganized modal footer with left and right action groups
- **Event Handling**: Enhanced event listeners for new modal features

### Improved
- **User Experience**: More intuitive modal interface with better information organization
- **Performance**: Optimized modal creation and cleanup processes
- **Accessibility**: Better keyboard navigation and screen reader support
- **Code Organization**: Cleaner separation of concerns in modal management

### Technical Details

#### Modal Enhancements
- Modern flex-based layout with organized sections
- Dynamic content generation based on item properties
- Improved event handling for new interactive elements
- Better CSS organization with specific modal styling
- Enhanced responsive design for various screen sizes

#### Integration Features
- Seamless integration with main map for "Show on Map" functionality
- Clipboard API integration for copy functionality
- Event-driven architecture for modal interactions
- Proper cleanup and memory management

## [2.0.0] - 2025-05-29

### Added
- **CORS Proxy Server**: Complete proxy.js implementation to handle CORS issues when accessing external STAC APIs
- **Enhanced API Client**: Comprehensive improvements to StacApiClient with retry logic, caching, and better error handling
- **Performance Monitoring**: Core Web Vitals tracking, memory usage monitoring, and performance utilities
- **Testing Infrastructure**: Jest testing framework with comprehensive unit tests and code coverage reporting
- **Linting Configuration**: ESLint setup with modern JavaScript best practices and automated code quality checks
- **CI/CD Pipeline**: GitHub Actions workflow with automated testing, Lighthouse auditing, and deployment
- **Environment Configuration**: Development environment setup with configurable options
- **Enhanced Documentation**: Comprehensive README with setup instructions and development guidelines

### Enhanced
- **Request Handling**: Automatic retry mechanism with exponential backoff (up to 3 attempts)
- **Response Caching**: 5-minute TTL caching to reduce redundant API calls
- **Error Handling**: Detailed error messages and graceful failure handling
- **Performance Optimization**: Debounce/throttle utilities, lazy loading, and memory optimization
- **Development Workflow**: Hot reload, proper build scripts, and development tooling
- **Code Quality**: Modern ES2024 syntax, private class methods, and comprehensive JSDoc annotations

### Changed
- **Package Configuration**: Updated package.json with modern development scripts and dependencies
- **Module System**: Migrated to ES modules with proper type configuration
- **Development Scripts**: Added comprehensive npm scripts for development, testing, and building

### Fixed
- **Missing Dependencies**: Added all required development and runtime dependencies
- **CORS Issues**: Implemented proxy server to handle cross-origin requests
- **Request Reliability**: Added timeout handling and request cancellation capabilities
- **Performance Issues**: Implemented caching and optimization strategies

### Technical Details

#### API Client Improvements
- Retry logic with exponential backoff
- Request/response caching with configurable TTL
- Enhanced STAC catalog validation
- Better endpoint discovery from catalog links
- Request timeout and cancellation
- Comprehensive error handling

#### Performance Features
- Core Web Vitals monitoring (LCP, FID, CLS)
- Memory usage tracking in development
- Debounced search functionality
- Throttled map interactions
- Lazy loading utilities
- Network request optimization

#### Development Infrastructure
- ESLint configuration with modern rules
- Jest testing with jsdom environment
- GitHub Actions CI/CD pipeline
- Code coverage reporting (70% minimum)
- Lighthouse performance auditing
- Automated deployment to GitHub Pages

#### Testing Coverage
- Unit tests for core components
- API client comprehensive testing
- Mocked dependencies for isolated testing
- Coverage reporting with minimum thresholds
- Test utilities and setup configuration

## [1.0.0] - Previous Version

### Initial Features
- Basic STAC catalog exploration
- Interactive map interface with drawing tools
- Search functionality with date and cloud cover filtering
- Results visualization with thumbnails
- Collection management and switching
- URL state management for shareable searches
- Material Design UI with dark/light themes
- Responsive design for mobile and desktop

---

## Migration Guide

### From v1.x to v2.0

1. **Install New Dependencies**:
   ```bash
   npm install
   ```

2. **Update Import Usage** (if using enhanced API client):
   ```javascript
   // Old
   import { STACApiClient } from './js/components/api/StacApiClient.js';
   
   // New (enhanced version)
   import { STACApiClient } from './js/components/api/StacApiClient.enhanced.js';
   ```

3. **Run Tests**:
   ```bash
   npm test
   ```

4. **Use New Development Scripts**:
   ```bash
   npm run dev      # Development with hot reload
   npm run lint     # Code quality checks
   npm run build    # Production build
   ```

### Breaking Changes
- None - v2.0 maintains full backward compatibility with v1.x

### New Optional Features
- Enhanced error handling (automatic)
- Request caching (automatic)
- Performance monitoring (development mode)
- Retry logic (automatic)

All new features are backward compatible and enhance the existing functionality without breaking changes.
