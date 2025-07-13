# 🛰️ STAC Explorer

> A modern, interactive web application for exploring SpatioTemporal Asset Catalog (STAC) datasets with advanced search capabilities and beautiful visualizations.

![STAC Explorer](https://img.shields.io/badge/STAC-Explorer-blue?style=for-the-badge&logo=satellite)
![Version](https://img.shields.io/badge/version-2.1.4-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)

## ✨ Features

### 🔍 **Smart Search Interface**
- **AI-Enhanced Search**: Intelligent location and dataset discovery
- **Advanced Filters**: Date ranges, cloud cover, collections, and spatial filters
- **Multiple Search Methods**: Text search, map drawing, WKT geometry input
- **Real-time Results**: Instant feedback with modern UI components

### 🗺️ **Interactive Mapping**
- **Dynamic Map Visualization**: Leaflet-based interactive maps
- **Geometry Display**: View dataset footprints and boundaries
- **Drawing Tools**: Draw bounding boxes directly on the map
- **Multiple Basemaps**: CartoDB Dark/Light themes

### 📱 **Modern User Experience**
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Themes**: Automatic theme switching
- **Glassmorphism UI**: Modern, beautiful interface design
- **Card-Based Layout**: Intuitive search and results organization

### 🌐 **Multi-Source Support**
- **Copernicus Data Space**: European Space Agency satellite data
- **Element84 Earth Search**: Comprehensive Earth observation datasets
- **Custom STAC Catalogs**: Connect to any STAC-compliant API
- **Cross-Catalog Search**: Search across multiple data sources

### 📊 **Dataset Management**
- **Enhanced Dataset Modals**: Detailed item information with copy functionality
- **Thumbnail Previews**: Visual dataset previews when available
- **Metadata Display**: Comprehensive dataset properties and JSON viewer
- **Export Capabilities**: Copy dataset information to clipboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with ES2022 support

### Installation

```bash
# Clone the repository
git clone https://github.com/nkarasiak/stacexplorer.git
cd stacexplorer

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Deployment

```bash
# Start production server
npm start

# Or serve static files
npm run serve
```

## 🛠️ Development

### Project Structure

```
stacexplorer/
├── 📁 js/
│   ├── 📁 components/
│   │   ├── 📁 api/          # STAC API client
│   │   ├── 📁 map/          # Map management
│   │   ├── 📁 results/      # Results display
│   │   ├── 📁 search/       # Search components
│   │   ├── 📁 ui/           # UI components
│   │   └── 📁 utils/        # Utility functions
│   ├── 📄 app.js            # Main application
│   └── 📄 config.js         # Configuration
├── 📁 css/
│   └── 📄 styles.modern.css # Modern styling
├── 📄 index.html            # Main HTML
├── 📄 proxy.js              # CORS proxy server
└── 📄 package.json          # Dependencies
```

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Production server
npm start

# Serve static files
npm run serve

# Development proxy only
npm run proxy
```

### Configuration

The application supports multiple STAC catalogs configured in `js/config.js`:

```javascript
export const CONFIG = {
    // Default STAC endpoints
    STAC_ENDPOINTS: {
        'copernicus': 'https://catalogue.dataspace.copernicus.eu/stac',
        'element84': 'https://earth-search.aws.element84.com/v1',
        // Add custom endpoints here
    }
};
```

## 🎯 Usage Guide

### Basic Search

1. **Select Data Source**: Choose from Copernicus, Element84, or custom catalogs
2. **Choose Location**: 
   - Search by place name (e.g., "Paris, France")
   - Draw area on map
   - Enter WKT geometry
3. **Set Time Range**: 
   - Anytime (default)
   - Last 30 days
   - Custom date range
4. **Apply Filters**: Cloud cover, collections, etc.
5. **Search**: Click the search button to find datasets

### Advanced Features

#### Location Search
- **Geocoding**: Type any location name for automatic geocoding
- **Map Drawing**: Use drawing tools to select precise areas
- **WKT Input**: Paste Well-Known Text geometry directly

#### Dataset Exploration
- **Dataset Details**: Click info button for comprehensive metadata
- **Map Visualization**: View dataset footprints on the interactive map
- **Copy Information**: Export dataset metadata to clipboard

#### Multi-Source Search
- Enable "Everything" mode to search across all configured catalogs
- Results are aggregated and deduplicated automatically

## 🔧 Technical Details

### Architecture

- **Frontend**: Vanilla JavaScript ES2022 modules
- **Styling**: Modern CSS with CSS variables and glassmorphism
- **Mapping**: Leaflet.js with custom styling
- **API**: STAC-compliant REST APIs
- **Deployment**: Static files with optional Node.js proxy

### Key Components

- **CardSearchPanel**: Main search interface with card-based layout
- **MapManager**: Interactive map with drawing tools
- **InlineDropdownManager**: Smart search dropdowns with autocomplete
- **ResultsPanel**: Paginated results with enhanced modals
- **StacApiClient**: STAC API communication with error handling

### Performance Features

- **Efficient Rendering**: Virtual scrolling for large result sets
- **Caching**: API response caching for better performance  
- **Lazy Loading**: On-demand component loading
- **Responsive Images**: Optimized thumbnail loading

## 🌟 Recent Updates (v2.1.4)

### ✅ Fixed
- **Location Search Integration**: Search now properly respects selected locations
- **Enhanced Dataset Modals**: Beautiful modal redesign with copy functionality
- **UI Improvements**: Removed clutter, added visible search button
- **GitHub CI**: Simplified deployment workflow

### 🆕 Added  
- **Visible Search Button**: Prominent search interface
- **Copy Dataset Info**: One-click metadata copying
- **Show on Map**: Direct dataset-to-map integration
- **Modern Styling**: Glassmorphism design improvements

### 🗑️ Removed
- **Development Artifacts**: Cleaned up 69+ test and debug files
- **Unused Dependencies**: Simplified package.json
- **Settings Panel**: Streamlined interface

## 📋 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [STAC Specification](https://stacspec.org/) - SpatioTemporal Asset Catalog standard
- [Copernicus Data Space](https://dataspace.copernicus.eu/) - European satellite data
- [Element84](https://www.element84.com/) - Earth Search API
- [Leaflet](https://leafletjs.com/) - Interactive mapping library
- [Material Design Icons](https://material.io/icons/) - Beautiful iconography

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/nkarasiak/stacexplorer/issues)
- 📧 **Contact**: Create an issue for questions and support
- 📖 **Documentation**: See inline code documentation

---

<div align="center">

**[🚀 Live Demo](https://nkarasiak.github.io/stacexplorer/) • [📖 STAC Spec](https://stacspec.org/) • [🛰️ Copernicus](https://dataspace.copernicus.eu/)**

*Made with ❤️ for the Earth observation community*

</div>