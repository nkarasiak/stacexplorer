# Unified Clean URL Routing for STAC Explorer

This implementation provides a unified routing system with clear separation between search/visualization and catalog browsing modes.

## URL Structure

### Search/Visualization Mode (`/viewer/`)
```
/viewer                                                 # Default search interface
/viewer/search                                          # Search with filters
/viewer/collection/{collectionId}                      # Search within collection
/viewer/{catalogId}/{collectionId}                     # Search within collection from specific catalog
/viewer/item/{itemId}                                   # View specific item
```

### Catalog Browser Mode (`/browser/`)
```
/browser                                # Catalog selection view
/browser/{catalogId}                   # Browse a catalog
/browser/{catalogId}/{collectionId}    # Browse a collection  
/browser/{catalogId}/{collectionId}/{itemId}  # View an item
```

### Examples

**Search/Visualization:**
```
http://localhost:8000/viewer                           # Main search interface
http://localhost:8000/viewer/search                    # Search with parameters  
http://localhost:8000/viewer/collection/sentinel-2-l2a # Search within Sentinel-2
http://localhost:8000/viewer/microsoft-pc/sentinel-1-rtc # Search Sentinel-1 from Microsoft catalog
http://localhost:8000/viewer/item/LC08_L2SP_199024_20220101_20220101_02_T1  # View item
```

**Catalog Browser:**
```
http://localhost:8000/browser                          # Available catalogs
http://localhost:8000/browser/cdse-stac                # Browse Copernicus CDSE
http://localhost:8000/browser/earth-search-aws/sentinel-2-l2a  
http://localhost:8000/browser/microsoft-pc/landsat-c2-l2/LC08_L2SP_199024_20220101_20220101_02_T1
```

## Running the Server

### Python Static Server
```bash
# Start the server (recommended)
python server.py

# Custom port
python server.py --port 8080

# Custom directory
python server.py --directory /path/to/stac-explorer
```

### Alternative Servers
If you prefer other static servers, ensure they support SPA routing:

```bash
# Node.js http-server with fallback
npx http-server . -p 8000 --proxy http://localhost:8000?

# Python simple server (no SPA support)
python -m http.server 8000
```

## Features

### Unified Routing System
- **Clear separation** between search and browsing modes
- **Clean URLs** for both modes with intuitive paths
- **No conflicts** between different state management systems
- **Browser navigation** works correctly with back/forward buttons

### Mode-Specific Navigation

**Search/Visualization Mode (`/viewer/`):**
- Search interface with filters and parameters
- Item visualization and analysis
- Map-based exploration
- Query parameters for search state

**Catalog Browser Mode (`/browser/`):**
- Hierarchical catalog navigation
- Collection and item browsing
- Clean paths reflect navigation structure
- No query parameter conflicts

### Conflict Resolution
- **Eliminates URL conflicts** like the example you provided
- **Separate URL spaces** for different application modes  
- **Query parameters** only used within each mode's context
- **Legacy redirect** support for old `/catalog/` URLs

## Implementation Details

### Components Added
1. **UnifiedRouter.js** - Unified routing system handling both modes
2. **server.py** - Python static server with SPA routing support
3. **Event Integration** - CatalogBrowserPanel and ViewModeToggle emit events
4. **Updated UnifiedStateManager** - Works with new routing system

### URL Mapping
```javascript
// Search/Visualization routes
/viewer                                → Default search interface
/viewer/search                         → Search with filters
/viewer/collection/{id}                → Search within collection
/viewer/{catalogId}/{collectionId}     → Search within collection from specific catalog
/viewer/item/{id}                      → View specific item

// Catalog browser routes  
/browser                               → Catalog selection view
/browser/{catalogId}                   → Browse catalog
/browser/{catalogId}/{collectionId}    → Browse collection  
/browser/{catalogId}/{collectionId}/{itemId}  → View item
```

### Catalog IDs (Dynamic Detection)
The system automatically detects catalog IDs from STAC API endpoints:

```javascript
// Real STAC catalog IDs (fetched dynamically from /v1 endpoints)
cdse-stac        → Copernicus Data Space Ecosystem  
earth-search-aws → Earth Search by Element 84
microsoft-pc     → Microsoft Planetary Computer STAC API

// Legacy aliases (automatically redirected)  
copernicus  → detected real ID
element84   → detected real ID
planetary   → detected real ID
```

**How it works:**
- System fetches catalog metadata from each STAC `/v1` endpoint  
- Uses the actual `id` field for URLs and `title` field for display names
- Automatically adapts to new catalogs without code changes
- Legacy aliases redirect to real catalog IDs
- **Adding new catalogs**: Just add endpoint to config - ID and name auto-detected

## Usage

1. **Start the server:**
   ```bash
   python server.py
   ```

2. **Navigate using clean URLs:**
   
   **For Search/Visualization:**
   - Visit `http://localhost:8000/viewer` for the main search interface
   - Search parameters appear as query strings in `/viewer/search`
   - Item views use `/viewer/item/{itemId}` paths
   
   **For Catalog Browsing:**
   - Visit `http://localhost:8000/browser` to see available catalogs
   - Click on a catalog or visit `http://localhost:8000/browser/cdse-stac`
   - Navigate through collections and items with clean paths

3. **Share clean URLs:**
   - Copy URLs from the address bar
   - Share links that work directly
   - Bookmark specific catalog/collection/item views
   - **F5 refresh works** on all URLs

## ✅ Fixed Issues (Latest Update)

- **MIME Type Issues**: JavaScript modules serve with correct `application/javascript` headers
- **Resource Loading**: All CSS and JS files use absolute paths (no more 404s)
- **Deep URL Support**: Clean URLs like `/browser/microsoft-pc/sentinel-1-rtc` work perfectly
- **Page Refresh**: F5 refresh works on all URLs without errors
- **GeocodingService Loading**: Fixed relative import paths in inline JavaScript
- **Favicon Loading**: All static assets load correctly from any URL depth

## Development

### Adding New Catalogs
Update `PathRouter.js` and `CatalogBrowserPanel.js`:

```javascript
// In PathRouter.js getCatalogConfig()
'new-catalog': {
    id: 'new-catalog',
    name: 'New Catalog Name',
    endpoint: {
        root: 'https://api.example.com/v1',
        collections: 'https://api.example.com/v1/collections',
        search: 'https://api.example.com/v1/search'
    }
}
```

### Debugging
- Check browser console for routing logs
- Monitor `📍` prefixed messages for path changes
- Verify server logs for SPA route handling

The system maintains full backward compatibility while adding modern clean URL support.