# STAC Explorer - Enhanced Version

A modern, high-performance web application for searching and visualizing Earth observation data using STAC APIs. This enhanced version includes improved development workflow, better performance, comprehensive testing, and modern JavaScript features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Python 3.8+
- Git

### Installation & Setup

```bash
git clone <your-repo-url>
cd stacexplorer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Alternative Setup Options

#### Option 1: Python HTTP Server (Simplest)
```bash
python -m http.server 8000
# Open http://localhost:8000
```

#### Option 2: Node.js with CORS Proxy
```bash
npm start
# Open http://localhost:3000
```

#### Option 3: Static File Server
```bash
npx http-server -p 3000 -c-1 --cors
```

## ✨ New Features & Improvements

### 🔧 Enhanced Development Workflow
- **Modern build system** with ES modules and proper Node.js configuration
- **ESLint configuration** with modern JavaScript best practices
- **Jest testing framework** with comprehensive test coverage
- **GitHub Actions CI/CD** pipeline with automated testing and deployment
- **Performance monitoring** with Core Web Vitals tracking

### 🚄 Performance Optimizations
- **Retry logic** for failed API requests with exponential backoff
- **Request caching** to reduce redundant API calls
- **Debounced/throttled** event handlers for better UX
- **Lazy loading** utilities for images and content
- **Memory usage monitoring** in development mode

### 🛡️ Improved Error Handling
- **Comprehensive error boundaries** for graceful failure handling
- **Enhanced validation** for STAC catalog connections
- **Better user feedback** with detailed error messages
- **Request cancellation** to prevent memory leaks

### 🧪 Testing & Quality Assurance
- **Unit tests** for core components
- **Integration tests** for API interactions
- **Code coverage reporting** with minimum thresholds
- **Lighthouse CI** for performance auditing

## 📁 Project Structure

```
stacexplorer/
├── .github/workflows/     # CI/CD pipelines
├── css/                   # Stylesheets
├── js/
│   ├── components/        # Modular UI components
│   │   ├── api/          # API client modules
│   │   ├── common/       # Shared utilities
│   │   ├── map/          # Map-related components
│   │   ├── results/      # Results display components
│   │   └── search/       # Search functionality
│   ├── utils/            # Utility functions
│   │   ├── performance.js # Performance monitoring
│   │   ├── StateManager.js
│   │   └── ShareManager.js
│   ├── app.js            # Main application entry
│   └── config.js         # Configuration settings
├── tests/                # Test files
├── proxy.js              # CORS proxy server
├── package.json          # Dependencies and scripts
├── eslint.config.js      # Linting configuration
├── jest.config.js        # Testing configuration
└── README.md
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run serve        # Simple static file server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Quality Assurance
npm run lint         # Check code style
npm run lint:fix     # Fix auto-fixable linting issues

# Build & Deploy
npm run build        # Production build with quality checks
```

## 🎯 Performance Features

### Request Optimization
- **Automatic retry** for failed requests (up to 3 attempts)
- **Request timeout** handling (10-second default)
- **Response caching** with configurable TTL
- **Request cancellation** for better resource management

### UI Performance
- **Debounced search** to reduce unnecessary API calls
- **Throttled map interactions** for smooth panning/zooming
- **Lazy loading** for dataset thumbnails
- **Memory usage monitoring** in development mode

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test StacApiClient.test.js

# Watch mode for development
npm run test:watch
```

### Test Coverage Goals
- **Branches**: 70% minimum
- **Functions**: 70% minimum  
- **Lines**: 70% minimum
- **Statements**: 70% minimum

## 🚀 Deployment

### GitHub Pages (Automated)
The project includes automated deployment to GitHub Pages via GitHub Actions:

1. Push to `main` branch
2. Tests run automatically
3. Lighthouse performance audit
4. Deploy to GitHub Pages if all checks pass

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy static files to your hosting service
# (All files except node_modules, tests, config files)
```

## 🔧 Configuration

### Environment Variables
Create `.env.development` for local development:

```env
NODE_ENV=development
PORT=3000
DEFAULT_STAC_ENDPOINT=copernicus
ENABLE_PROXY=true
ENABLE_DEBUG=true
```

### STAC Endpoints
Configure STAC API endpoints in `js/config.js`:

```javascript
stacEndpoints: {
    copernicus: {
        root: 'https://stac.dataspace.copernicus.eu/v1',
        collections: 'https://stac.dataspace.copernicus.eu/v1/collections',
        search: 'https://stac.dataspace.copernicus.eu/v1/search'
    },
    // Add your custom endpoints here
}
```

## 📈 Performance Monitoring

### Core Web Vitals
The application automatically monitors:
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms  
- **Cumulative Layout Shift (CLS)**: < 0.1

### Memory Usage
In development mode, memory usage is logged to help identify potential leaks.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Write tests** for your changes
4. **Run the test suite**: `npm test`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Commit Message Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## 📋 TODO / Roadmap

### Immediate Improvements
- [ ] Add service worker for offline functionality
- [ ] Implement virtual scrolling for large result sets
- [ ] Add data export functionality (GeoJSON, CSV)
- [ ] Enhanced filtering with advanced query builder

### Future Enhancements
- [ ] TypeScript migration for better type safety
- [ ] PWA features (install prompt, app icons)
- [ ] WebGL-based visualization for large datasets
- [ ] Integration with additional STAC catalogs

## 🐛 Known Issues

1. **CORS limitations** when connecting to some STAC catalogs - use the proxy server
2. **Large result sets** may cause performance issues - pagination helps
3. **Some STAC catalogs** may have non-standard implementations

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- STAC specification contributors
- MapLibre GL JS community
- Earth observation data providers

---

**Made with ❤️ for the Earth observation community**
