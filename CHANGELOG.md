# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
