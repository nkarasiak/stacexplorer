# 🛰️ STAC Explorer

> A modern, interactive web application for exploring SpatioTemporal Asset Catalog (STAC) datasets with advanced search capabilities and beautiful visualizations.

![STAC Explorer](https://img.shields.io/badge/STAC-Explorer-blue?style=for-the-badge&logo=satellite)
![Version](https://img.shields.io/badge/version-2.12.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)

## ✨ Features

### 🔍 **Smart Search Interface**
- **AI-Enhanced Search**: Intelligent location and dataset discovery
- **🆕 Search History**: Recent searches dropdown for quick re-execution
- **Advanced Filters**: Date ranges, cloud cover, collections, and spatial filters  
- **🆕 Modern Date Picker**: Custom YYYY-MM-DD inputs with locale-independent display
- **✨ Stylized Presets**: Beautiful gradient-icon dropdown for quick date selection
- **Enhanced Collection Selection**: Taller dropdown for easier browsing
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
- **Microsoft Planetary Computer**: Enhanced support with fixed presigning API
- **🆕 Terrascope**: Belgian Earth observation platform (https://stac.terrascope.be/)
- **🆕 Static Catalog Support**: Automatic detection and handling of static STAC catalogs (*.json)
- **🆕 Google Earth Engine**: Support for GEE STAC catalog with specialized collection handling
- **🆕 Planet Labs**: Enhanced catalog traversal for Planet Labs STAC catalog
- **🆕 Custom STAC Catalogs**: Full integration for user-defined STAC catalogs with localStorage persistence
- **🆕 Dynamic Provider Management**: Toggle custom catalogs on/off in settings alongside built-in providers
- **Cross-Catalog Search**: Search across multiple data sources

### 📊 **Dataset Management & Visualization** 🧪 *EXPERIMENTAL*
- **Enhanced Dataset Modals**: Detailed item information with copy functionality
- **Thumbnail Previews**: Visual dataset previews when available
- **Metadata Display**: Comprehensive dataset properties and JSON viewer
- **Export Capabilities**: Copy dataset information to clipboard
- **Raster Visualization**: Interactive band combination and color mapping
- **SAR Data Support**: Optimized Sentinel-1 SAR visualization
- **Sentinel Data Support**: Specialized visualization for Sentinel-2 imagery

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

## 🎯 Usage Guide

### Basic Search

1. **Select Collection**: Choose from Copernicus, Element84, or custom catalogs
2. **Choose Location**: Search by place name, draw area on map, or enter WKT geometry
3. **Set Time Range**: Use the modern calendar with quick presets (1 day, 1 week, 1 month, 6 months)
4. **Apply Filters**: Cloud cover, collections, etc.
5. **Search**: Click the search button to find datasets

### New Features (v2.8.0)

#### 🛰️ Enhanced Satellite Animation & Offline Mode
- **Improved Satellite Animation**: Restored visibility with better CSS positioning
- **Offline Connectivity Detection**: Smart offline mode with satellite indicator
- **SEO Optimization**: Enhanced metadata and search engine optimization

#### 🕒 Search History (Previous)
- **Recent Searches**: Access your recent searches from the header dropdown
- **Smart Restoration**: Automatically restores exact collection selections
- **One-Click Re-execution**: Quickly repeat previous searches

## 🛠️ Development

### Project Structure

```
stacexplorer/
├── 📁 js/
│   ├── 📁 components/     # React-like components
│   ├── 📁 utils/          # Utility functions
│   ├── 📄 app.js          # Main application
│   └── 📄 config.js       # Configuration
├── 📁 css/               # Styling
├── 📄 index.html         # Main HTML
├── 📄 proxy.js           # CORS proxy server
└── 📄 package.json       # Dependencies
```

### Available Scripts

```bash
npm run dev    # Development with hot reload
npm start      # Production server
npm run serve  # Serve static files
npm run proxy  # Development proxy only
```

## 🌟 What's New in v2.11.0

### 🛰️ Static Catalog Support
- **Automatic Detection**: Smart detection of static STAC catalogs by URL pattern (*.json)
- **Google Earth Engine**: Full support for GEE STAC catalog with specialized collection traversal
- **Planet Labs Enhancement**: Improved catalog handling for Planet Labs STAC structure
- **Generic Static Catalogs**: Universal support for any STAC-compliant static catalog
- **Fixed 404 Errors**: Resolved issues with catalog-type endpoints trying to access API routes

### 🔧 Technical Improvements
- **Enhanced Endpoint Detection**: Improved logic to distinguish between APIs and static catalogs
- **Better Error Handling**: More graceful handling of catalog connection failures
- **Configuration Priority**: Fixed localStorage override issues for disabled catalogs
- **Catalog Traversal**: Robust child link following for complex catalog structures

### 🐛 Bug Fixes
- **Fixed GEE 404 Error**: Resolved HTTP 404 errors when trying to load Google Earth Engine collections
- **Catalog Override Fix**: Fixed issue where connectToCustomCatalog was overriding correct empty endpoints
- **localStorage Conflicts**: Resolved conflicts between configuration file and browser storage settings

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

**[📖 STAC Spec](https://stacspec.org/) • [🛰️ Copernicus](https://dataspace.copernicus.eu/)**

*Made with ❤️ for the Earth observation community*

</div>