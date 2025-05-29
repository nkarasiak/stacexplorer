# STAC Explorer

A modern, high-performance web application for searching and visualizing Earth observation data using STAC APIs. This application provides an intuitive interface for discovering satellite imagery and related Earth observation datasets.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Python 3.8+
- Git

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/nkarasiak/stacexplorer.git
cd stacexplorer

# Install dependencies (for enhanced features)
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

#### Option 2: Node.js with CORS Proxy (Recommended)
```bash
npm start
# Open http://localhost:3000
```

#### Option 3: Static File Server
```bash
npx http-server -p 3000 -c-1 --cors
```

## ✨ Features

### 🗺️ Interactive Map Interface
- Visual area selection using drawing tools
- Real-time bounding box coordinate display
- Dynamic map updates based on search results

### 🔍 Advanced Search Capabilities
- Full-text search across titles and descriptions
- Date range filtering with calendar integration
- Cloud cover percentage filtering with slider control
- Bounding box spatial filtering
- Collection-specific searches

### 📊 Results Visualization
- Thumbnail previews of datasets
- Cloud cover indicators with intuitive icons
- Dataset metadata display
- Quick-view information modal

### 💫 Modern User Experience
- Responsive design
- Material Design styling
- Real-time search updates
- URL state management for shareable searches

### 🚄 Enhanced Performance (v2.0+)
- **Automatic retry logic** for failed API requests
- **Request caching** to reduce redundant calls
- **Performance monitoring** with Core Web Vitals
- **Enhanced error handling** with detailed feedback
- **Memory optimization** and leak prevention

## 🎯 Live Demo

Visit the live application: [https://nkarasiak.github.io/stacexplorer](https://nkarasiak.github.io/stacexplorer)

## 📖 Usage Guide

### Basic Search
1. Enter search terms in the search box to find datasets by title or description
2. Use the date picker to filter results by time range
3. Adjust the cloud cover slider to filter images based on cloud percentage

### Spatial Search
1. Use the drawing tools on the map to define a search area
2. The bounding box coordinates will automatically update
3. You can also manually enter coordinates in the format: `west,south,east,north`

### Managing Results
- Click the information icon (ℹ️) on any dataset to view detailed metadata
- Cloud cover percentage is displayed with intuitive icons:
  - ☀️ 0-10% clouds
  - 🌤️ 11-30% clouds
  - ⛅ 31-60% clouds
  - 🌥️ 61-90% clouds
  - ☁️ 91-100% clouds

### URL Parameters
The application supports URL parameters for sharing searches:
- `cloudCover`: Maximum cloud cover percentage
- `collections`: Comma-separated list of collection IDs
- `bbox`: Bounding box coordinates (west,south,east,north)
- `datetime`: Date range in ISO format

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Development server with hot reload
npm test             # Run test suite with coverage
npm run lint         # Check code style
npm run lint:fix     # Fix auto-fixable issues
npm run build        # Production build with quality checks
```

### Project Structure
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
│   ├── app.js            # Main application entry
│   └── config.js         # Configuration settings
├── tests/                # Test files
├── proxy.js              # CORS proxy server
└── README.md
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Watch mode for development
npm run test:watch
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
Configure additional STAC API endpoints in `js/config.js`:
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

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Write tests** for your changes
4. **Run the test suite**: `npm test`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [STAC Specification](https://stacspec.org/) contributors
- [MapLibre GL JS](https://maplibre.org/) community
- Earth observation data providers
- Open source community

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/nkarasiak/stacexplorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nkarasiak/stacexplorer/discussions)
- **Documentation**: [Enhanced README](README.enhanced.md)

---

**Made with ❤️ for the Earth observation community**
