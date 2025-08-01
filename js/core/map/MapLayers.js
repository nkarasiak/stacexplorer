/**
 * MapLayers - Layer management for maps
 * Handles thumbnail overlays, asset layers, and layer lifecycle
 * Enhanced with comprehensive CORS handling from v2.4.0
 */

export class MapLayers {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.map = mapCore.getMap();
        this.thumbnailSources = new Map();
        this.thumbnailLayers = new Map();
        this.currentLayer = null;
        this.currentLayerOverlay = null;
        this.currentAssetKey = null;
    }

    /**
     * Clear all thumbnails from the map
     */
    clearAllThumbnails() {
        
        // Remove all thumbnail layers and sources
        this.thumbnailLayers.forEach((layerId, itemId) => {
            try {
                if (this.map.getLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
                
                const sourceId = this.thumbnailSources.get(itemId);
                if (sourceId && this.map.getSource(sourceId)) {
                    this.map.removeSource(sourceId);
                }
            } catch (error) {
                console.warn(`Warning: Could not remove layer/source for ${itemId}:`, error);
            }
        });
        
        // Clear the tracking maps
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        
    }

    /**
     * Remove the current active layer (enhanced with CORS layer support)
     */
    removeCurrentLayer() {
        try {
            console.log('🧹 [CLEAR-DEBUG] Starting layer removal...');
            console.log('🧹 [CLEAR-DEBUG] Current layer state:', this.currentLayer);
            
            // Remove specific known layer IDs that might exist
            const layersToRemove = [
                'stac-item-layer',
                'stac-item-outline', 
                'stac-bounds-layer',
                'stac-bounds-outline',
                'current-item-layer',
                'current-item-outline',
                'item-geometry-layer',
                'item-geometry-layer-stroke',
                'item-bbox-layer',
                'item-bbox-layer-stroke',
                'thumbnail-layer',
                'image-overlay-layer'
            ];
            
            layersToRemove.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common layer: ${layerId}`);
                    this.map.removeLayer(layerId);
                }
            });
            
            // Remove corresponding sources
            const sourcesToRemove = [
                'stac-item-source',
                'stac-bounds-source',
                'current-item-source',
                'item-geometry',
                'item-bbox',
                'thumbnail-source',
                'image-overlay-source'
            ];
            
            sourcesToRemove.forEach(sourceId => {
                if (this.map.getSource(sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing common source: ${sourceId}`);
                    this.map.removeSource(sourceId);
                }
            });
            
            // If we have a current layer, remove it
            if (this.currentLayer) {
                console.log('🧹 [CLEAR-DEBUG] Removing tracked current layer...');
                
                // Handle new structure with layerIds array
                if (this.currentLayer.layerIds && Array.isArray(this.currentLayer.layerIds)) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by ID array:', this.currentLayer.layerIds);
                    this.currentLayer.layerIds.forEach(layerId => {
                        if (this.map.getLayer(layerId)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer: ${layerId}`);
                            this.map.removeLayer(layerId);
                        } else {
                            console.log(`🧹 [CLEAR-DEBUG] Layer not found: ${layerId}`);
                        }
                    });
                }
                // Handle old structure or remaining layers by source
                else if (this.currentLayer.sourceId) {
                    console.log('🧹 [CLEAR-DEBUG] Removing layers by source:', this.currentLayer.sourceId);
                    const layers = this.map.getStyle().layers.filter(layer => 
                        layer.source === this.currentLayer.sourceId
                    );
                    
                    console.log('🧹 [CLEAR-DEBUG] Found layers to remove:', layers.map(l => l.id));
                    layers.forEach(layer => {
                        if (this.map.getLayer(layer.id)) {
                            console.log(`🧹 [CLEAR-DEBUG] Removed layer by source: ${layer.id}`);
                            this.map.removeLayer(layer.id);
                        }
                    });
                }
                
                // Remove the source
                if (this.currentLayer.sourceId && this.map.getSource(this.currentLayer.sourceId)) {
                    console.log(`🧹 [CLEAR-DEBUG] Removing source: ${this.currentLayer.sourceId}`);
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
                console.log('🧹 [CLEAR-DEBUG] Cleared current layer tracking');
            } else {
                console.log('🧹 [CLEAR-DEBUG] No tracked current layer to remove');
            }
            
            // Final verification - list all remaining layers
            const remainingLayers = this.map.getStyle().layers.map(l => l.id);
            console.log('🧹 [CLEAR-DEBUG] Remaining layers after cleanup:', remainingLayers);
            
        } catch (error) {
            console.error('❌ [CLEAR-DEBUG] Error removing current layer:', error);
        }
    }

    /**
     * Fit map to bounding box
     */
    fitMapToBbox(bbox) {
        if (!bbox || bbox.length !== 4) {
            console.warn('Invalid bbox for fitting map');
            return;
        }
        
        try {
            // Convert bbox to LngLatBounds format: [west, south, east, north]
            const bounds = [
                [bbox[0], bbox[1]], // southwest corner
                [bbox[2], bbox[3]]  // northeast corner
            ];
            
            this.map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                maxZoom: 14 // Don't zoom in too much
            });
            
        } catch (error) {
            console.error('Error fitting map to bbox:', error);
        }
    }

    /**
     * Get bounding box from STAC item
     */
    getBoundingBox(item) {
        // Try bbox property first
        if (item.bbox && Array.isArray(item.bbox) && item.bbox.length >= 4) {
            return item.bbox.slice(0, 4); // Take first 4 values [west, south, east, north]
        }
        
        // Try geometry if bbox is not available
        if (item.geometry && item.geometry.type === 'Polygon' && item.geometry.coordinates) {
            const coordinates = item.geometry.coordinates[0]; // First ring of polygon
            if (coordinates && coordinates.length > 0) {
                const lngs = coordinates.map(coord => coord[0]);
                const lats = coordinates.map(coord => coord[1]);
                
                return [
                    Math.min(...lngs), // west
                    Math.min(...lats), // south
                    Math.max(...lngs), // east
                    Math.max(...lats)  // north
                ];
            }
        }
        
        return null;
    }

    /**
     * Add GeoJSON layer without tooltip (for simple boundary display)
     */
    addGeoJsonLayerWithoutTooltip(bbox, item) {
        try {
            // Remove any existing layers first
            this.removeCurrentLayer();
            
            // Create polygon from bbox
            const geojson = {
                type: 'Feature',
                properties: {
                    title: item.properties?.title || item.title || item.id,
                    description: 'STAC Item Boundary'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [bbox[0], bbox[1]], // sw
                        [bbox[2], bbox[1]], // se
                        [bbox[2], bbox[3]], // ne
                        [bbox[0], bbox[3]], // nw
                        [bbox[0], bbox[1]]  // close
                    ]]
                }
            };
            
            // Remove existing layers and source if they exist
            if (this.map.getLayer('stac-bounds-layer')) {
                this.map.removeLayer('stac-bounds-layer');
            }
            if (this.map.getLayer('stac-bounds-outline')) {
                this.map.removeLayer('stac-bounds-outline');
            }
            if (this.map.getSource('stac-bounds-source')) {
                this.map.removeSource('stac-bounds-source');
            }
            
            // Add source
            this.map.addSource('stac-bounds-source', {
                type: 'geojson',
                data: geojson
            });
            
            // Add fill layer
            this.map.addLayer({
                id: 'stac-bounds-layer',
                type: 'fill',
                source: 'stac-bounds-source',
                paint: {
                    'fill-color': '#2196F3',
                    'fill-opacity': 0.2
                }
            });
            
            // Add outline layer
            this.map.addLayer({
                id: 'stac-bounds-outline',
                type: 'line',
                source: 'stac-bounds-source',
                paint: {
                    'line-color': '#2196F3',
                    'line-width': 2
                }
            });
            
            
        } catch (error) {
            console.error('Error adding GeoJSON layer:', error);
        }
    }

    /**
     * Check if asset is a preview/thumbnail type (enhanced)
     */
    isPreviewAsset(asset) {
        if (!asset) return false;
        
        // Check by asset roles first
        if (asset.roles && (
            asset.roles.includes('thumbnail') || 
            asset.roles.includes('preview') || 
            asset.roles.includes('overview') ||
            asset.roles.includes('rendered_preview')
        )) {
            return true;
        }
        
        // Check by media type
        if (asset.type) {
            const previewTypes = [
                'image/jpeg',
                'image/jpg', 
                'image/png',
                'image/gif',
                'image/webp'
            ];
            
            if (previewTypes.includes(asset.type.toLowerCase())) {
                return true;
            }
        }
        
        // Check by file extension in href
        if (asset.href) {
            const lowerHref = asset.href.toLowerCase();
            if (lowerHref.includes('.png') || lowerHref.includes('.jpg') || 
                lowerHref.includes('.jpeg') || lowerHref.includes('.gif') || 
                lowerHref.includes('.webp')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Find visual assets in STAC item
     */
    findVisualAssets(item) {
        const visualAssets = [];
        
        if (!item.assets) return visualAssets;
        
        Object.entries(item.assets).forEach(([key, asset]) => {
            if (this.isVisualAsset(asset)) {
                visualAssets.push({ key, asset });
            }
        });
        
        return visualAssets;
    }

    /**
     * Check if asset is visual
     */
    isVisualAsset(asset) {
        if (!asset || !asset.type) return false;
        
        const visualTypes = [
            'image/tiff',
            'image/tif', 
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/x-hdf5',
            'application/x-netcdf4'
        ];
        
        return visualTypes.some(type => 
            asset.type.toLowerCase().includes(type) ||
            (asset.href && asset.href.toLowerCase().includes(type.split('/')[1]))
        );
    }

    /**
     * Reapply thumbnails after style change (placeholder)
     */
    reapplyThumbnails() {
        // Store current thumbnails
        const thumbnails = new Map(this.thumbnailSources);
        
        // Clear references
        this.thumbnailSources.clear();
        this.thumbnailLayers.clear();
        
        // Re-add each thumbnail (simplified implementation)
        thumbnails.forEach((sourceId, itemId) => {
            // This would need more implementation based on stored thumbnail data
        });
    }

    /**
     * Display item on map with comprehensive CORS handling
     * @param {Object} item - STAC item to display
     * @param {string} preferredAssetKey - Preferred asset key to display
     */
    async displayItemOnMap(item, preferredAssetKey = null) {
        try {
            console.log('Displaying item on map:', item.id);
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Get bounding box
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry');
                return;
            }
            
            // Fit map to item bounds
            this.fitMapToBbox(bbox);
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Strongly prioritize preview/thumbnail assets (JPG, PNG, etc.) to avoid CORS issues
            const previewAssets = ['rendered_preview', 'thumbnail', 'preview', 'overview'];
            
            // For Planetary Computer items, check rendered_preview first (usually works)
            if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                await this.addAssetOverlay(item.assets.rendered_preview, item, 'rendered_preview');
                return;
            }
            
            // Try all preview assets first (these are usually JPG/PNG and work better)
            for (const assetKey of previewAssets) {
                if (item.assets && item.assets[assetKey]) {
                    const asset = item.assets[assetKey];
                    // Prefer preview images (JPG/PNG) over anything else
                    if (this.isPreviewAsset(asset)) {
                        console.log(`Using preview asset: ${assetKey} (${asset.type || 'unknown type'})`);
                        await this.addAssetOverlay(asset, item, assetKey);
                        return;
                    }
                }
            }
            
            // If we have a preferred asset key and it's a preview, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                const asset = item.assets[preferredAssetKey];
                if (this.isPreviewAsset(asset)) {
                    console.log(`Using preferred preview asset: ${preferredAssetKey}`);
                    await this.addAssetOverlay(asset, item, preferredAssetKey);
                    return;
                }
            }
            
            // Try any remaining preview assets, even if they might have CORS issues
            for (const assetKey of previewAssets) {
                if (item.assets && item.assets[assetKey]) {
                    console.log(`Trying preview asset (may have CORS): ${assetKey}`);
                    await this.addAssetOverlay(item.assets[assetKey], item, assetKey);
                    return;
                }
            }
            
            // If no preview assets, try the preferred asset anyway
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey);
                return;
            }
            
            // Last resort: try any visual assets but expect them to fail with CORS
            const visualAssets = this.findVisualAssets(item);
            if (visualAssets.length > 0) {
                console.log('No preview assets found, trying visual assets (may fail with CORS)');
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key);
                return;
            }
            
            // If we have a thumbnail in the results panel, use it
            if (this.useResultsThumbnail(item)) {
                return;
            }
            
            // If all else fails, just show the bounding box
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Error displaying item on map:', error);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Add asset overlay to map with comprehensive CORS handling
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key
     * @param {Object|Array} geometryOrBounds - Either GeoJSON geometry or bbox array
     */
    async addAssetOverlay(asset, item, assetKey, geometryOrBounds = null) {
        try {
            console.log(`Adding asset overlay for ${assetKey}:`, asset);
            
            // Store current asset key
            this.currentAssetKey = assetKey;
            
            // Check if asset has href
            if (!asset.href) {
                console.warn('Asset has no href');
                return false;
            }
            
            // Add visual overlay
            await this.addVisualOverlay(asset, item, geometryOrBounds);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return true;
        } catch (error) {
            console.error('Error adding asset overlay:', error);
            
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return false;
        }
    }

    /**
     * Add visual overlay to map with CORS handling (v2.4.0 approach)
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     * @param {Object|Array} geometryOrBounds - Either GeoJSON geometry or bbox array
     */
    async addVisualOverlay(asset, item, geometryOrBounds = null) {
        try {
            console.log('Adding visual overlay for asset:', asset);
            
            // Get image URL
            const imageUrl = asset.href;
            
            // For raster data, show geometry only
            if (this.isRasterAsset(asset)) {
                console.log('Raster asset detected, showing geometry only:', imageUrl);
                this.addGeometryOverlay(item);
                return true;
            }
            
            // Use provided geometry/bounds or get from item
            let bbox;
            if (geometryOrBounds) {
                // If geometry object is provided, extract bounds from it
                if (geometryOrBounds.type && geometryOrBounds.coordinates) {
                    console.log('Using provided geometry for overlay bounds');
                    bbox = this.getGeometryBounds(geometryOrBounds);
                } else if (Array.isArray(geometryOrBounds) && geometryOrBounds.length === 4) {
                    // If bounds array is provided directly
                    console.log('Using provided bounds for overlay');
                    bbox = geometryOrBounds;
                }
            }
            
            // Fallback to item bounds if no geometry/bounds provided
            if (!bbox) {
                bbox = this.getBoundingBox(item);
            }
            
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Try to add image to map with CORS bypass, fallback to geometry if it fails
            try {
                await this.addImageOverlay(imageUrl, bbox, item);
                return true;
            } catch (imageError) {
                console.warn('Failed to load image overlay, showing geometry instead:', imageError);
                this.addGeometryOverlay(item);
                return true;
            }
            
        } catch (error) {
            console.error('Error adding visual overlay:', error);
            // Always fallback to geometry
            this.addGeometryOverlay(item);
            return false;
        }
    }

    /**
     * Check if a URL might have CORS issues
     * @param {string} url - URL to check
     * @returns {boolean} True if URL might have CORS issues
     */
    hasCORSIssues(url) {
        const corsProblematicDomains = [
            'datahub.creodias.eu',
            'catalogue.dataspace.copernicus.eu',
            'scihub.copernicus.eu',
            's3.us-west-2.amazonaws.com',
            's3.amazonaws.com',
            'sentinel-cogs.s3.us-west-2.amazonaws.com',
            'earth-search-aws'
        ];
        
        return corsProblematicDomains.some(domain => url.includes(domain));
    }

    /**
     * Check if an asset is raster data (COG, GeoTIFF, etc.)
     * @param {Object} asset - STAC asset
     * @returns {boolean} True if asset is raster data
     */
    isRasterAsset(asset) {
        const rasterTypes = [
            'image/tiff',
            'image/geotiff',
            'application/geotiff',
            'image/tiff; application=geotiff',
            'image/tiff; application=geotiff; profile=cloud-optimized'
        ];
        
        // Check by media type
        if (asset.type && rasterTypes.includes(asset.type)) {
            return true;
        }
        
        // Check by file extension
        if (asset.href && (asset.href.includes('.tif') || asset.href.includes('.tiff'))) {
            return true;
        }
        
        // Check by asset roles
        if (asset.roles && asset.roles.includes('data')) {
            return true;
        }
        
        return false;
    }

    /**
     * Add geometry overlay (outline) for an item
     * @param {Object} item - STAC item
     */
    addGeometryOverlay(item) {
        console.log('Adding geometry overlay for item:', item.id);
        
        // Remove existing layers
        this.removeCurrentLayer();
        
        if (item.geometry) {
            // Add geometry as a GeoJSON source and layer
            const sourceId = 'item-geometry';
            const layerId = 'item-geometry-layer';
            
            // Remove existing geometry source if it exists
            if (this.map.getSource(sourceId)) {
                this.map.removeLayer(layerId);
                this.map.removeSource(sourceId);
            }
            
            // Add the geometry source
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: item.geometry
            });
            
            // Add fill layer
            this.map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#4f46e5',
                    'fill-opacity': 0.1
                }
            });
            
            // Add stroke layer
            this.map.addLayer({
                id: layerId + '-stroke',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#4f46e5',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });
            
            // Store current layer info for cleanup
            this.currentLayer = {
                sourceId: sourceId,
                layerIds: [layerId, layerId + '-stroke']
            };
            
            // Fit map to geometry bounds
            const bounds = this.getGeometryBounds(item.geometry);
            if (bounds) {
                this.fitMapToBbox(bounds);
            }
            
        } else if (item.bbox) {
            // If no geometry, use bbox
            const bbox = item.bbox;
            
            // Create a rectangle geometry from bbox
            const rectangleGeometry = {
                type: 'Polygon',
                coordinates: [[
                    [bbox[0], bbox[1]], // sw
                    [bbox[2], bbox[1]], // se
                    [bbox[2], bbox[3]], // ne
                    [bbox[0], bbox[3]], // nw
                    [bbox[0], bbox[1]]  // close
                ]]
            };
            
            const sourceId = 'item-bbox';
            const layerId = 'item-bbox-layer';
            
            // Remove existing bbox source if it exists
            if (this.map.getSource(sourceId)) {
                this.map.removeLayer(layerId);
                this.map.removeSource(sourceId);
            }
            
            // Add the bbox source
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: rectangleGeometry
            });
            
            // Add fill layer
            this.map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#4f46e5',
                    'fill-opacity': 0.1
                }
            });
            
            // Add stroke layer
            this.map.addLayer({
                id: layerId + '-stroke',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#4f46e5',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });
            
            // Store current layer info for cleanup
            this.currentLayer = {
                sourceId: sourceId,
                layerIds: [layerId, layerId + '-stroke']
            };
            
            // Fit map to bbox
            this.fitMapToBbox(bbox);
        }
    }

    /**
     * Get bounds from any geometry type
     * @param {Object} geometry - GeoJSON geometry
     * @returns {Array} Bounding box [west, south, east, north]
     */
    getGeometryBounds(geometry) {
        if (!geometry || !geometry.coordinates) {
            return null;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        const updateBounds = (coord) => {
            minX = Math.min(minX, coord[0]);
            minY = Math.min(minY, coord[1]);
            maxX = Math.max(maxX, coord[0]);
            maxY = Math.max(maxY, coord[1]);
        };
        
        const processCoords = (coords, depth = 0) => {
            if (typeof coords[0] === 'number') {
                // This is a coordinate pair
                updateBounds(coords);
            } else {
                // This is an array of coordinates
                coords.forEach(coord => processCoords(coord, depth + 1));
            }
        };
        
        processCoords(geometry.coordinates);
        
        return [minX, minY, maxX, maxY];
    }

    /**
     * Add image overlay to map with CORS handling (v2.4.0 approach)
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     */
    async addImageOverlay(imageUrl, bbox, item) {
        try {
            console.log('Adding image overlay:', imageUrl);
            
            // Remove existing overlay if any
            this.removeCurrentLayer();

            // Ensure proper URL handling
            let absoluteUrl = this.ensureAbsoluteUrl(imageUrl);
            console.log('Absolute URL:', absoluteUrl);
            
            // Create a unique ID for this image source
            const sourceId = `image-overlay-${Date.now()}`;
            
            // **KEY v2.4.0 APPROACH**: Always try canvas conversion first for CORS bypass
            try {
                console.log('🎨 Trying canvas-based CORS bypass approach...');
                const success = await this.addImageWithValidation(absoluteUrl, bbox, item);
                if (success) {
                    return true;
                }
            } catch (canvasError) {
                console.warn('Canvas approach failed, trying direct MapLibre:', canvasError);
            }
            
            // Fallback: Try direct MapLibre approach
            try {
                console.log('🗺️ Trying direct MapLibre approach...');
                
                // Apply coordinates directly
                const coordinates = [
                    [bbox[0], bbox[3]], // top-left (northwest)
                    [bbox[2], bbox[3]], // top-right (northeast)
                    [bbox[2], bbox[1]], // bottom-right (southeast)
                    [bbox[0], bbox[1]]  // bottom-left (southwest)
                ];
                
                // Add source without pre-validation
                this.map.addSource(sourceId, {
                    type: 'image',
                    url: absoluteUrl,
                    coordinates: coordinates
                });
                
                // Add image layer
                this.map.addLayer({
                    id: `${sourceId}-layer`,
                    type: 'raster',
                    source: sourceId,
                    paint: {
                        'raster-opacity': 1.0,
                        'raster-resampling': 'linear'
                    }
                });
                
                // Store as current layer
                this.currentLayer = {
                    sourceId,
                    layerIds: [`${sourceId}-layer`],
                    getBounds: () => {
                        return [
                            [bbox[0], bbox[1]], // Southwest
                            [bbox[2], bbox[3]]  // Northeast
                        ];
                    }
                };
                
                // Store overlay for opacity control
                this.currentLayerOverlay = {
                    setOpacity: (opacity) => {
                        this.map.setPaintProperty(`${sourceId}-layer`, 'raster-opacity', opacity);
                    }
                };
                
                console.log('✅ Direct MapLibre image placement successful');
                
                // Register error handler for post-adding errors
                this.map.once('error', (e) => {
                    if (e.sourceId === sourceId) {
                        console.error('❌ Error with direct image overlay, trying fallback:', e);
                        this.handleImageError(sourceId, absoluteUrl, bbox, item);
                    }
                });
                
                return true;
            } catch (directError) {
                console.error('❌ Direct MapLibre approach failed:', directError);
                throw directError;
            }
        } catch (error) {
            console.error('❌ All image overlay approaches failed:', error);
            throw error; // Let the caller handle the fallback to geometry
        }
    }

    /**
     * Add image with pre-validation and canvas conversion
     * @param {string} url - Image URL
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     * @returns {Promise<boolean>} - Success status
     */
    async addImageWithValidation(url, bbox, item) {
        // Create a unique ID for this image source
        const sourceId = `image-overlay-validated-${Date.now()}`;
        
        try {
            // Pre-load and validate the image
            const imageData = await this.loadAndValidateImage(url);
            console.log('Image validated successfully:', imageData);
            
            // If we have a data URL from validation, use it instead
            const finalUrl = imageData.dataUrl || url;
            
            // Calculate optimal coordinates based on image dimensions
            const coordinates = await this.calculateOptimalCoordinates(
                imageData, 
                bbox
            );
            
            // Add image source
            this.map.addSource(sourceId, {
                type: 'image',
                url: finalUrl,
                coordinates: coordinates
            });
            
            // Add image layer
            this.map.addLayer({
                id: `${sourceId}-layer`,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': 1.0,
                    'raster-resampling': 'linear'
                }
            });
            
            // Store as current layer
            this.currentLayer = {
                sourceId,
                layerIds: [`${sourceId}-layer`],
                getBounds: () => {
                    return [
                        [bbox[0], bbox[1]], // Southwest
                        [bbox[2], bbox[3]]  // Northeast
                    ];
                }
            };
            
            // Store overlay for opacity control
            this.currentLayerOverlay = {
                setOpacity: (opacity) => {
                    this.map.setPaintProperty(`${sourceId}-layer`, 'raster-opacity', opacity);
                }
            };
            
            console.log('Validated image placement successful');
            return true;
        } catch (error) {
            console.error('Error with validated image placement:', error);
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return false;
        }
    }

    /**
     * Load and validate image with CORS proxy fallback (v2.4.0 approach)
     * @param {string} url - Image URL
     * @returns {Promise<Object>} - Image data with dimensions and optional dataUrl
     */
    async loadAndValidateImage(url) {
        console.log('🎨 Loading and validating image:', url);
        
        // Try multiple approaches in sequence
        const urlsToTry = [
            url, // Original URL first
            `https://corsproxy.io/?${encodeURIComponent(url)}`, // CORS proxy
            `https://cors-anywhere.herokuapp.com/${url}`, // Alternative proxy
        ];
        
        for (const urlToTry of urlsToTry) {
            try {
                console.log(`🔄 Trying URL: ${urlToTry}`);
                const result = await this.loadImageWithUrl(urlToTry);
                console.log('✅ Image loaded successfully with:', urlToTry);
                return result;
            } catch (error) {
                console.warn(`❌ Failed to load with ${urlToTry}:`, error.message);
                continue;
            }
        }
        
        throw new Error(`Failed to load image with all attempted URLs: ${url}`);
    }

    /**
     * Load image with specific URL and convert to data URL if possible
     * @param {string} url - Image URL to try
     * @returns {Promise<Object>} - Image data with dimensions and optional dataUrl
     */
    async loadImageWithUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log(`🎨 Image loaded successfully: ${img.width}x${img.height}`);
                
                // For images that might have CORS issues, try to convert to data URL
                try {
                    // Create a canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image to canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Try to get data URL (will fail if tainted by CORS)
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        console.log('✅ Successfully created data URL for CORS bypass');
                        resolve({
                            width: img.width,
                            height: img.height,
                            aspectRatio: img.width / img.height,
                            dataUrl: dataUrl
                        });
                    } catch (corsError) {
                        // If we can't get data URL due to CORS, just return dimensions
                        console.warn('⚠️ Could not create data URL due to CORS, using original URL');
                        resolve({
                            width: img.width,
                            height: img.height, 
                            aspectRatio: img.width / img.height
                        });
                    }
                } catch (canvasError) {
                    console.warn('⚠️ Error using canvas:', canvasError);
                    resolve({
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    });
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            // Set crossOrigin to anonymous to avoid CORS issues if possible
            img.crossOrigin = "anonymous";
            img.src = url;
            
            // Set a timeout in case the image hangs
            setTimeout(() => {
                reject(new Error(`Timeout loading image: ${url}`));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Calculate optimal coordinates based on image dimensions
     * @param {Object} imageData - Image data with dimensions
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {Array} - Array of coordinate pairs
     */
    async calculateOptimalCoordinates(imageData, bbox) {
        // If we don't have image dimensions, use the bbox directly
        if (!imageData || !imageData.width || !imageData.height) {
            return [
                [bbox[0], bbox[3]], // top-left (northwest)
                [bbox[2], bbox[3]], // top-right (northeast)
                [bbox[2], bbox[1]], // bottom-right (southeast)
                [bbox[0], bbox[1]]  // bottom-left (southwest)
            ];
        }
        
        // Calculate aspect ratios
        const imgAspectRatio = imageData.width / imageData.height;
        const bboxWidth = Math.abs(bbox[2] - bbox[0]);
        const bboxHeight = Math.abs(bbox[3] - bbox[1]);
        const bboxAspectRatio = bboxWidth / bboxHeight;
        
        // If aspects are very close, no need to adjust
        if (Math.abs(imgAspectRatio - bboxAspectRatio) < 0.1) {
            return [
                [bbox[0], bbox[3]], // top-left
                [bbox[2], bbox[3]], // top-right
                [bbox[2], bbox[1]], // bottom-right
                [bbox[0], bbox[1]]  // bottom-left
            ];
        }
        
        // Adjust coordinates to match image aspect ratio while centering in bbox
        let adjustedBbox;
        
        if (imgAspectRatio > bboxAspectRatio) {
            // Image is wider than bbox
            const adjustedHeight = bboxWidth / imgAspectRatio;
            const heightDiff = bboxHeight - adjustedHeight;
            const midY = (bbox[1] + bbox[3]) / 2;
            
            adjustedBbox = [
                bbox[0],
                midY - (adjustedHeight / 2),
                bbox[2],
                midY + (adjustedHeight / 2)
            ];
        } else {
            // Image is taller than bbox
            const adjustedWidth = bboxHeight * imgAspectRatio;
            const widthDiff = bboxWidth - adjustedWidth;
            const midX = (bbox[0] + bbox[2]) / 2;
            
            adjustedBbox = [
                midX - (adjustedWidth / 2),
                bbox[1],
                midX + (adjustedWidth / 2),
                bbox[3]
            ];
        }
        
        return [
            [adjustedBbox[0], adjustedBbox[3]], // top-left
            [adjustedBbox[2], adjustedBbox[3]], // top-right
            [adjustedBbox[2], adjustedBbox[1]], // bottom-right
            [adjustedBbox[0], adjustedBbox[1]]  // bottom-left
        ];
    }

    /**
     * Use thumbnail from results panel
     * @param {Object} item - STAC item
     * @returns {boolean} - True if successful, false otherwise
     */
    useResultsThumbnail(item) {
        try {
            console.log('Trying to use results thumbnail for item:', item.id);
            
            // Find the item in the results panel using multiple strategies
            let resultItem = this.findResultItemByMultipleStrategies(item.id);
            
            if (!resultItem) {
                console.warn('Could not find item in results panel');
                return false;
            }
            
            // Find the thumbnail
            const thumbnail = resultItem.querySelector('.dataset-thumbnail, img');
            if (!thumbnail) {
                console.warn('No thumbnail element found in results panel');
                return false;
            }
            
            if (!thumbnail.src || thumbnail.src.includes('placeholder')) {
                console.warn('No valid thumbnail source found in results panel');
                return false;
            }
            
            // Ensure we have an absolute URL
            const absoluteUrl = this.ensureAbsoluteUrl(thumbnail.src);
            console.log('Found thumbnail in results panel:', absoluteUrl);
            
            // Get bounds
            let bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Add image to map
            this.addImageOverlay(absoluteUrl, bbox, item);
            
            return true;
        } catch (error) {
            console.error('Error using results thumbnail:', error);
            return false;
        }
    }

    /**
     * Find result item by trying multiple strategies
     * @param {string} itemId - Item ID to find
     * @returns {Element|null} - Found element or null
     */
    findResultItemByMultipleStrategies(itemId) {
        console.log('Finding result item for ID:', itemId);
        
        // Strategy 1: Direct query with data-id
        let resultItem = document.querySelector(`.dataset-item[data-id="${itemId}"]`);
        if (resultItem) {
            console.log('Found item using data-id selector');
            return resultItem;
        }
        
        // Strategy 2: Look for item with matching ID attribute
        resultItem = document.querySelector(`[id="${itemId}"]`);
        if (resultItem) {
            console.log('Found item using id attribute selector');
            return resultItem;
        }
        
        // Strategy 3: Check all dataset items
        const allItems = document.querySelectorAll('.dataset-item');
        for (const element of allItems) {
            if (element.dataset.id === itemId || element.id === itemId) {
                console.log('Found item by iterating through dataset items');
                return element;
            }
        }
        
        // Strategy 4: Look for any elements that contain the ID in their text
        const elements = document.querySelectorAll('.results-container div, .item-container div');
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(itemId)) {
                // Found an element that mentions the ID, check if it has or is near an image
                const nearbyImg = element.querySelector('img') || 
                                  element.parentElement.querySelector('img') ||
                                  element.closest('.dataset-item, .item');
                if (nearbyImg) {
                    console.log('Found item by text content and proximity to image');
                    return nearbyImg.closest('.dataset-item, .item') || element;
                }
            }
        }
        
        console.warn('Could not find item using any strategy');
        return null;
    }

    /**
     * Handle image loading error
     * @param {string} sourceId - Source ID
     * @param {string} url - Image URL 
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     */
    async handleImageError(sourceId, url, bbox, item) {
        // Cleanup failed attempt
        try {
            if (this.map.getLayer(`${sourceId}-layer`)) {
                this.map.removeLayer(`${sourceId}-layer`);
            }
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }
        } catch (removeError) {
            console.warn('Error cleaning up failed layer:', removeError);
        }
        
        // Try again with the validated approach
        try {
            await this.addImageWithValidation(url, bbox, item);
        } catch (validationError) {
            console.error('Validation approach also failed:', validationError);
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
        }
    }

    /**
     * Ensure a URL is absolute
     * @param {string} url - URL to process
     * @returns {string} - Absolute URL
     */
    ensureAbsoluteUrl(url) {
        if (!url) return url;
        
        // If the URL is already absolute, return it
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        
        // If it's a root-relative URL, add the origin
        if (url.startsWith('/')) {
            return window.location.origin + url;
        }
        
        // If it's a relative URL, resolve it against the current page
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        return new URL(url, baseUrl).href;
    }
}