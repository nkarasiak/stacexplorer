# 🛰️ STAC Explorer

> A modern, interactive web application for exploring SpatioTemporal Asset Catalog (STAC) datasets with advanced search capabilities and beautiful visualizations.

![STAC Explorer](https://img.shields.io/badge/STAC-Explorer-blue?style=for-the-badge&logo=satellite)
![Version](https://img.shields.io/badge/version-2.3.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)

## ✨ Features

### 🔍 **Smart Search Interface**
- **AI-Enhanced Search**: Intelligent location and dataset discovery
- **Advanced Filters**: Date ranges, cloud cover, collections, and spatial filters
- **🆕 Modern Calendar**: Professional Flatpickr date range picker with presets
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

### 📊 **Dataset Management & Visualization** 🧪 *EXPERIMENTAL*
- **Enhanced Dataset Modals**: Detailed item information with copy functionality
- **Thumbnail Previews**: Visual dataset previews when available
- **Metadata Display**: Comprehensive dataset properties and JSON viewer
- **Export Capabilities**: Copy dataset information to clipboard
- **🆕 Raster Visualization**: Interactive band combination and color mapping
- **🆕 Sentinel Data Support**: Specialized visualization for Sentinel-2 imagery

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
   - **🆕 Custom date range**: Modern calendar with 1 day, 1 week, 1 month, 6 month presets
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

#### 🧪 Experimental Visualization Features
- **Raster Visualization**: Click "Visualize" on supported datasets to open the visualization panel
- **Band Combinations**: Choose from predefined combinations (True Color, False Color, NDVI) or create custom RGB mappings
- **Color Controls**: Adjust contrast, brightness, and color scaling for optimal display
- **Layer Management**: Control visualization layer opacity and blending with base maps
- **Note**: Visualization features are experimental and may have limitations with certain datasets

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

## 🌟 Recent Updates (v2.3.0)

### 🆕 Added - Modern Calendar System
- **📅 Flatpickr Integration**: Replaced clunky dual calendar with professional Flatpickr library
- **🎯 Standalone Date Picker**: Full-screen modal calendar for better user experience
- **⏰ Quick Presets**: 1 day, 1 week, 1 month, 6 months preset buttons
- **🛠️ Fixed Date Handling**: Resolved timezone conversion issues and -1 day offset
- **📅 Inclusive Date Ranges**: Proper start 00:00:00 to end 23:59:59 handling
- **🔗 URL State Restoration**: Fixed custom date loading from URLs
- **🧹 Improved UX**: Clean backdrop handling, no more stuck overlays

### 🔧 Technical Improvements
- **📦 Lightweight**: Flatpickr adds only ~20KB vs previous bulky implementation
- **📱 Mobile-Friendly**: Responsive calendar design for all devices
- **🌙 Dark Theme**: Native dark theme support
- **🚀 GitHub Pages Ready**: Static deployment workflow for easy hosting

### 🔧 Previous Updates (v2.2.x) 🧪 *EXPERIMENTAL*
- **🎨 Raster Visualization Panel**: Interactive visualization with band combinations
- **📡 Sentinel-2 Support**: Specialized band combinations (True Color, False Color, NDVI, etc.)
- **🔧 Band Combination Engine**: Flexible RGB band mapping for raster data
- **🎛️ Color Management**: Dynamic color scaling and enhancement controls
- **📊 Visualization Controls**: Layer opacity, contrast, and brightness adjustments
- **Location Search Integration**: Enhanced search with proper location handling
- **Enhanced Dataset Modals**: Beautiful modal redesign with copy functionality

### ⚠️ Known Issues & Limitations
- **🧪 Experimental Status**: Visualization features are in active development
- **📡 Limited Data Support**: Currently optimized for Sentinel-2 and similar datasets
- **🌐 CORS Limitations**: Some raster sources may require proxy configuration
- **📱 Mobile Performance**: Visualization panel may have reduced functionality on mobile
- **🔄 Browser Compatibility**: Advanced features require modern browsers with WebGL support

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