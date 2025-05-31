/**
 * MapManager.js - Handles map display and interactions using MapLibre GL
 */

export class MapManager {
    /**
     * Create a new MapManager
     * @param {string} mapElementId - ID of the map container element
     * @param {Object} config - Configuration settings
     */
    constructor(mapElementId, config) {
        this.mapElementId = mapElementId;
        this.config = config;
        this.map = null;
        this.currentLayer = null;
        this.currentLayerOverlay = null;
        this.currentAssetKey = null;
        this.mapReady = false;
        
        // Drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.currentBox = null;
        this.boxSourceId = 'bbox-source';
        this.boxLayerId = 'bbox-layer';
        this.boxOutlineLayerId = 'bbox-outline-layer';
        this.firstClickComplete = false; // Track if first click is done
        
        // Geometry display
        this.geometrySourceId = 'geometry-source';
        this.geometryLayerId = 'geometry-layer';
        this.geometryOutlineLayerId = 'geometry-outline-layer';
        
        // Initialize the map
        this.initMap();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize the map
     */
    initMap() {
        try {
            // Create map with default settings
            this.map = new maplibregl.Map({
                container: this.mapElementId,
                center: this.config.mapSettings.defaultCenter.reverse(), // MapLibre uses [lng, lat] format
                zoom: this.config.mapSettings.defaultZoom,
                style: this.getMapStyle(this.config.mapSettings.defaultBasemap)
            });
            
            // Add navigation control
            this.map.addControl(new maplibregl.NavigationControl({        visualizePitch: true,
        visualizeRoll: false,
        showZoom: true,
        showCompass: false
			}), 'top-right');
            
            // Initialize map after it loads
            this.map.on('load', () => {
                this.initDrawingSources();
                this.initGeometrySources();
                this.mapReady = true;
                console.log('Map is fully loaded and ready');
            });
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
    
    /**
     * Get the map style based on the basemap name
     * @param {string} basemapName - Name of the basemap
     * @returns {Object} - MapLibre style object
     */
    getMapStyle(basemapName) {
        // Get basemap config or use default if not found
        const basemapConfig = this.config.mapSettings.basemapOptions[basemapName] || 
                            this.config.mapSettings.basemapOptions.Dark;
        
        // Create a MapLibre style object
        return {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: [basemapConfig.url.replace('{s}', 'a')],
                    tileSize: 256,
                    attribution: basemapConfig.attribution
                }
            },
            layers: [
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        };
    }
    
    /**
     * Initialize drawing sources and layers
     */
    initDrawingSources() {
        try {
            // Add source for the bounding box
            this.map.addSource(this.boxSourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                }
            });
            
            // Add fill layer for the bounding box
            this.map.addLayer({
                id: this.boxLayerId,
                type: 'fill',
                source: this.boxSourceId,
                paint: {
                    'fill-color': '#2196F3',
                    'fill-opacity': 0.1
                }
            });
            
            // Add outline layer for the bounding box
            this.map.addLayer({
                id: this.boxOutlineLayerId,
                type: 'line',
                source: this.boxSourceId,
                paint: {
                    'line-color': '#2196F3',
                    'line-width': 2
                }
            });
            
            console.log('Drawing sources and layers initialized');
        } catch (error) {
            console.error('Error initializing drawing sources:', error);
        }
    }
    
    /**
     * Initialize sources and layers for displaying custom geometry
     */
    initGeometrySources() {
        try {
            // Add source for custom geometry
            this.map.addSource(this.geometrySourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                }
            });
            
            // Add fill layer for the geometry
            this.map.addLayer({
                id: this.geometryLayerId,
                type: 'fill',
                source: this.geometrySourceId,
                paint: {
                    'fill-color': '#4CAF50',
                    'fill-opacity': 0.1
                }
            });
            
            // Add outline layer for the geometry
            this.map.addLayer({
                id: this.geometryOutlineLayerId,
                type: 'line',
                source: this.geometrySourceId,
                paint: {
                    'line-color': '#4CAF50',
                    'line-width': 2
                }
            });
            
            console.log('Geometry sources and layers initialized');
        } catch (error) {
            console.error('Error initializing geometry sources:', error);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Theme change event
        document.addEventListener('themeChange', (event) => {
            if (event.detail && event.detail.theme) {
                this.setBasemap(event.detail.theme);
            }
        });
        
        // Map drawing events
        if (this.map) {
            // Mouse down event - start or complete drawing
            this.map.on('click', (e) => {
                if (!this.isDrawing) return;
                
                if (!this.firstClickComplete) {
                    // First click - begin drawing
                    this.startPoint = [e.lngLat.lng, e.lngLat.lat];
                    this.firstClickComplete = true;
                    
                    // Initialize the box with the starting point
                    this.updateBox(this.startPoint, this.startPoint);
                    
                    console.log('First click at:', this.startPoint);
                } else {
                    // Second click - complete drawing
                    const endPoint = [e.lngLat.lng, e.lngLat.lat];
                    
                    // Update the box with final coordinates
                    this.updateBox(this.startPoint, endPoint);
                    
                    // Calculate the bounding box
                    const minX = Math.min(this.startPoint[0], endPoint[0]);
                    const minY = Math.min(this.startPoint[1], endPoint[1]);
                    const maxX = Math.max(this.startPoint[0], endPoint[0]);
                    const maxY = Math.max(this.startPoint[1], endPoint[1]);
                    
                    const bbox = [minX, minY, maxX, maxY];
                    
                    // Dispatch event with bbox
                    document.dispatchEvent(new CustomEvent('bboxDrawn', { 
                        detail: { 
                            bbox,
                            bounds: [[minX, minY], [maxX, maxY]]
                        } 
                    }));
                    
                    // Reset drawing state
                    this.isDrawing = false;
                    this.firstClickComplete = false;
                    this.map.getCanvas().style.cursor = '';
                    
                    // Log the bbox for debugging
                    console.log('Drawn bbox:', bbox);
                    
                    // Call the callback function if provided
                    if (typeof this.drawingCallback === 'function') {
                        this.drawingCallback(bbox);
                        this.drawingCallback = null; // Reset after use
                    }
                    
                    // Clear any custom geometry when drawing a new bbox
                    this.clearGeometry();
                }
            });
            
            // Mouse move event - update drawing preview
            this.map.on('mousemove', (e) => {
                if (!this.isDrawing || !this.firstClickComplete) return;
                
                // Update the box preview with current mouse position
                this.updateBox(this.startPoint, [e.lngLat.lng, e.lngLat.lat]);
            });
            
            // Key press event - cancel drawing with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isDrawing) {
                    this.clearDrawings();
                    this.isDrawing = false;
                    this.firstClickComplete = false;
                    this.startPoint = null;
                    this.map.getCanvas().style.cursor = '';
                }
            });
        }
        
        // Clear map drawings event
        document.addEventListener('clearMapDrawings', () => {
            this.clearDrawings();
            this.clearGeometry();
        });
        
        // Expand tools panel event
        document.addEventListener('expandToolsPanel', () => {
            const toolsPanel = document.getElementById('tools-panel');
            if (toolsPanel && toolsPanel.classList.contains('collapsed')) {
                document.getElementById('tools-header').click();
            }
        });
        
        // Direct image URL loading
        const loadImageBtn = document.getElementById('load-image-btn');
        if (loadImageBtn) {
            loadImageBtn.addEventListener('click', () => {
                this.loadImageFromDirectUrl();
            });
            
            // Also allow pressing Enter in the input field
            const directUrlInput = document.getElementById('direct-image-url');
            if (directUrlInput) {
                directUrlInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        this.loadImageFromDirectUrl();
                    }
                });
            }
        }
    }
    
    /**
     * Display a GeoJSON geometry on the map
     * 
     * @param {Object} geojson - GeoJSON object to display
     * @param {Array} bbox - Bounding box to fit map to [west, south, east, north]
     */
    displayGeometry(geojson, bbox) {
        try {
            console.log('Displaying geometry:', geojson);
            
            if (!this.map || !this.map.getSource(this.geometrySourceId)) {
                console.error('Map or geometry source not initialized');
                return;
            }
            
            // Update geometry source with new GeoJSON
            this.map.getSource(this.geometrySourceId).setData(geojson);
            
            // Fit map to the bounding box
            if (bbox && bbox.length === 4) {
                this.fitMapToBbox(bbox);
            }
            
            // Clear any existing bbox drawings
            this.clearDrawings();
        } catch (error) {
            console.error('Error displaying geometry:', error);
        }
    }
    
    /**
     * Clear the custom geometry from the map
     */
    clearGeometry() {
        try {
            if (this.map && this.map.getSource(this.geometrySourceId)) {
                // Reset geometry to empty
                this.map.getSource(this.geometrySourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                });
            }
        } catch (error) {
            console.error('Error clearing geometry:', error);
        }
    }
    
    /**
     * Update the bounding box on the map
     * @param {Array} start - Start point [lng, lat]
     * @param {Array} end - End point [lng, lat]
     */
    updateBox(start, end) {
        if (!this.map || !this.map.getSource(this.boxSourceId)) return;
        
        // Create a rectangle from the start and end points
        const coordinates = [
            [start[0], start[1]],
            [end[0], start[1]],
            [end[0], end[1]],
            [start[0], end[1]],
            [start[0], start[1]] // Close the polygon
        ];
        
        // Update the source data
        this.map.getSource(this.boxSourceId).setData({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
            }
        });
    }
    
    /**
     * Set the basemap
     * @param {string} basemapName - Name of the basemap to use
     */
    setBasemap(basemapName) {
        // Get the new style
        const newStyle = this.getMapStyle(basemapName);
        
        // Update the map style
        this.map.setStyle(newStyle);
        
        // Re-initialize drawing sources after style change
        this.map.once('styledata', () => {
            this.initDrawingSources();
            this.initGeometrySources();
        });
    }
    
    /**
     * Start the bounding box drawing mode
     * @param {Function} callback - Optional callback function to call after drawing is complete
     */
    startDrawingBbox(callback) {
        try {
            // Check if map is ready
            if (!this.map) {
                console.error('Map is not initialized');
                return;
            }
            
            if (!this.mapReady) {
                console.error('Map is not fully loaded yet');
                alert('The map is still loading. Please try again in a moment.');
                return;
            }
            
            // Store the callback
            this.drawingCallback = callback;
            
            // Clear any existing drawings
            this.clearDrawings();
            
            // Clear any custom geometry
            this.clearGeometry();
            
            // Set drawing state
            this.isDrawing = true;
            this.startPoint = null;
            this.firstClickComplete = false;
            
            // Set cursor to crosshair
            this.map.getCanvas().style.cursor = 'crosshair';
            
            console.log('Drawing mode activated in MapManager');
        } catch (error) {
            console.error('Error starting drawing mode:', error);
            alert('An error occurred while activating drawing mode. Please try again.');
        }
    }
    
    /**
     * Clear all drawings from the map
     */
    clearDrawings() {
        try {
            // Reset drawing state
            this.isDrawing = false;
            this.startPoint = null;
            this.firstClickComplete = false;
            
            // Clear the bounding box
            if (this.map && this.map.getSource(this.boxSourceId)) {
                this.map.getSource(this.boxSourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[]]
                    }
                });
            }
            
            // Clear bbox input field
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = '';
            }
            
            // Reset cursor
            if (this.map && this.map.getCanvas()) {
                this.map.getCanvas().style.cursor = '';
            }
            
            console.log('Cleared all drawings');
        } catch (error) {
            console.error('Error clearing drawings:', error);
        }
    }
    
    /**
     * Update the map view from a bounding box input
     * @param {string} bboxString - Comma-separated bounding box string (west,south,east,north)
     */
    updateBBoxFromInput(bboxString) {
        try {
            // Parse the bbox string
            const bbox = bboxString.split(',').map(Number);
            
            // Validate
            if (bbox.length !== 4 || bbox.some(isNaN)) {
                throw new Error('Invalid bbox format');
            }
            
            // Clear existing drawings
            this.clearDrawings();
            
            // Create a rectangle for the bbox
            const coordinates = [
                [bbox[0], bbox[3]], // Northwest
                [bbox[2], bbox[3]], // Northeast
                [bbox[2], bbox[1]], // Southeast
                [bbox[0], bbox[1]], // Southwest
                [bbox[0], bbox[3]]  // Close the polygon
            ];
            
            // Update the source data
            if (this.map && this.map.getSource(this.boxSourceId)) {
                this.map.getSource(this.boxSourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                });
            }
            
            // Fit map to the bbox
            this.fitMapToBbox(bbox);
            
            console.log('Updated bbox from input:', bbox);
            
            // Dispatch event with bbox
            document.dispatchEvent(new CustomEvent('bboxDrawn', { 
                detail: { 
                    bbox,
                    bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
                } 
            }));
        } catch (error) {
            console.error('Error updating bbox from input:', error);
        }
    }
    
    /**
     * Find assets with 'visual' roles in a STAC item
     * @param {Object} item - STAC item
     * @returns {Array} - Array of visual assets
     */
    findVisualAssets(item) {
        const visualAssets = [];
        
        if (item && item.assets) {
            // Check each asset
            for (const [key, asset] of Object.entries(item.assets)) {
                // Check if asset has visual role
                if (asset.roles && asset.roles.includes('visual')) {
                    visualAssets.push({ key, asset });
                }
            }
        }
        
        return visualAssets;
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
     * Display item geometry/bounding box on the map (without loading images)
     * @param {Object} item - STAC item to display
     * @returns {Promise<boolean>} - Success status
     */
    async displayItemGeometry(item) {
        try {
            console.log('Displaying item geometry on map:', item.id);
            
            // Remove any existing layers
            this.removeCurrentLayer();
            
            // Get bounding box or geometry
            const bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry');
                return false;
            }
            
            // Create GeoJSON for the item geometry
            let geojson;
            
            if (item.geometry && item.geometry.type === 'Polygon') {
                // Use the actual geometry if available
                geojson = {
                    type: 'Feature',
                    properties: {
                        title: item.properties?.title || item.id,
                        description: item.properties?.description || '',
                        id: item.id
                    },
                    geometry: item.geometry
                };
            } else {
                // Create a polygon from the bounding box
                geojson = {
                    type: 'Feature',
                    properties: {
                        title: item.properties?.title || item.id,
                        description: item.properties?.description || '',
                        id: item.id
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [bbox[0], bbox[3]], // Northwest
                            [bbox[2], bbox[3]], // Northeast
                            [bbox[2], bbox[1]], // Southeast
                            [bbox[0], bbox[1]], // Southwest
                            [bbox[0], bbox[3]]  // Close the polygon
                        ]]
                    }
                };
            }
            
            // Display the geometry
            this.displayGeometry(geojson, bbox);
            
            console.log('Item geometry displayed successfully');
            return true;
        } catch (error) {
            console.error('Error displaying item geometry:', error);
            return false;
        }
    }
    
    /**
     * Display an item on the map
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
            
            // Try to find visual assets
            const visualAssets = this.findVisualAssets(item);
            
            // If we have a preferred asset key and it exists, use it
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                await this.addAssetOverlay(item.assets[preferredAssetKey], item, preferredAssetKey);
                return;
            }
            
            // If we have visual assets, use the first one
            if (visualAssets.length > 0) {
                await this.addAssetOverlay(visualAssets[0].asset, item, visualAssets[0].key);
                return;
            }
            
            // If we have a thumbnail, use it
            if (item.assets && item.assets.thumbnail) {
                await this.addAssetOverlay(item.assets.thumbnail, item, 'thumbnail');
                return;
            }
            
            // If we have a preview, use it
            if (item.assets && item.assets.preview) {
                await this.addAssetOverlay(item.assets.preview, item, 'preview');
                return;
            }
            
            // If we have an overview, use it
            if (item.assets && item.assets.overview) {
                await this.addAssetOverlay(item.assets.overview, item, 'overview');
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
     * Get bounding box from item
     * @param {Object} item - STAC item
     * @returns {Array|null} - Bounding box [west, south, east, north] or null
     */
    getBoundingBox(item) {
        // If item has bbox, use it
        if (item.bbox && item.bbox.length === 4) {
            return item.bbox;
        }
        
        // If item has geometry, calculate bbox
        if (item.geometry && item.geometry.type === 'Polygon') {
            // Extract bounds from polygon coordinates
            const coords = item.geometry.coordinates[0];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            coords.forEach(coord => {
                minX = Math.min(minX, coord[0]);
                minY = Math.min(minY, coord[1]);
                maxX = Math.max(maxX, coord[0]);
                maxY = Math.max(maxY, coord[1]);
            });
            
            return [minX, minY, maxX, maxY];
        }
        
        return null;
    }
    
    /**
     * Fit map to bounding box
     * @param {Array} bbox - Bounding box [west, south, east, north]
     */
    fitMapToBbox(bbox) {
        if (bbox && bbox.length === 4) {
            this.map.fitBounds([
                [bbox[0], bbox[1]], // Southwest
                [bbox[2], bbox[3]]  // Northeast
            ], { padding: 50 });
        }
    }
    
    /**
     * Add asset overlay to map
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key
     */
    async addAssetOverlay(asset, item, assetKey) {
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
            await this.addVisualOverlay(asset, item);
            
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
     * Add visual overlay to map
     * @param {Object} asset - Asset object
     * @param {Object} item - STAC item
     */
    async addVisualOverlay(asset, item) {
        try {
            console.log('Adding visual overlay for asset:', asset);
            
            // Get image URL
            const imageUrl = asset.href;
            
            // Get bounds
            let bbox = this.getBoundingBox(item);
            if (!bbox) {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Add image to map
            await this.addImageOverlay(imageUrl, bbox, item);
            
            return true;
        } catch (error) {
            console.error('Error adding visual overlay:', error);
            return false;
        }
    }
    
    /**
     * Add GeoJSON layer without tooltip
     * @param {Array} bbox - Bounding box
     * @param {Object} item - STAC item
     */
    addGeoJsonLayerWithoutTooltip(bbox, item) {
        // Just show the bounding box outline without any tooltip
        this.addGeoJsonLayer({
            type: 'Feature',
            properties: {
                title: item.title || item.id || 'Unknown Item',
                description: item.description || ''
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]],
                    [bbox[0], bbox[3]]
                ]]
            }
        });
    }
    
    /**
     * Try alternative methods to display an image if the primary method fails
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     * @returns {boolean} - True if successful, false otherwise
     */
    tryAlternativeImageDisplay(imageUrl, bbox, item) {
        try {
            console.log('Trying alternative image display method');
            
            // Show GeoJSON without any tooltip
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return true;
        } catch (error) {
            console.error('Error in alternative image display:', error);
            return false;
        }
    }
    
    /**
     * Add GeoJSON layer to map
     * @param {Object} geojson - GeoJSON object
     * @param {string} sourceId - Source ID
     */
    addGeoJsonLayer(geojson, sourceId = 'item-geometry') {
        // Remove existing source and layers if they exist
        if (this.map.getSource(sourceId)) {
            // First remove any layers that use this source
            this.map.getStyle().layers.forEach(layer => {
                if (layer.source === sourceId) {
                    this.map.removeLayer(layer.id);
                }
            });
            
            // Then remove the source
            this.map.removeSource(sourceId);
        }
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: geojson
        });
        
        // Add fill layer
        this.map.addLayer({
            id: `${sourceId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': '#2196F3',
                'fill-opacity': 0.1
            }
        });
        
        // Add line layer
        this.map.addLayer({
            id: `${sourceId}-line`,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#2196F3',
                'line-width': 2
            }
        });
        
        // Store as current layer
        this.currentLayer = {
            sourceId,
            getBounds: () => {
                // Calculate bounds from GeoJSON
                if (geojson.type === 'Feature' && geojson.geometry) {
                    if (geojson.geometry.type === 'Polygon') {
                        const coords = geojson.geometry.coordinates[0];
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        
                        coords.forEach(coord => {
                            minX = Math.min(minX, coord[0]);
                            minY = Math.min(minY, coord[1]);
                            maxX = Math.max(maxX, coord[0]);
                            maxY = Math.max(maxY, coord[1]);
                        });
                        
                        return [[minX, minY], [maxX, maxY]];
                    }
                }
                return null;
            }
        };
    }
    
    /**
     * Remove current layer from map
     */
    removeCurrentLayer() {
        try {
            // If we have a current layer, remove it
            if (this.currentLayer && this.currentLayer.sourceId) {
                // Get all layers that use this source
                const layers = this.map.getStyle().layers.filter(layer => 
                    layer.source === this.currentLayer.sourceId
                );
                
                // Remove each layer
                layers.forEach(layer => {
                    if (this.map.getLayer(layer.id)) {
                        this.map.removeLayer(layer.id);
                    }
                });
                
                // Remove the source
                if (this.map.getSource(this.currentLayer.sourceId)) {
                    this.map.removeSource(this.currentLayer.sourceId);
                }
                
                // Clear current layer
                this.currentLayer = null;
                this.currentLayerOverlay = null;
                this.currentAssetKey = null;
            }
        } catch (error) {
            console.error('Error removing current layer:', error);
        }
    }
    
    /**
     * Fit the map view to the current layer bounds
     */
    fitToLayerBounds() {
        if (this.currentLayer && this.currentLayer.getBounds) {
            const bounds = this.currentLayer.getBounds();
            if (bounds) {
                this.map.fitBounds(bounds, {
                    padding: 50
                });
            }
        }
    }
    
    /**
     * Set the opacity of the current layer
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(opacity) {
        if (this.currentLayerOverlay && this.currentLayerOverlay.setOpacity) {
            this.currentLayerOverlay.setOpacity(opacity);
        }
    }
    
    /**
     * Load image from direct URL
     */
    async loadImageFromDirectUrl() {
        try {
            // Get URL from input
            const urlInput = document.getElementById('direct-image-url');
            if (!urlInput || !urlInput.value) {
                console.warn('No URL provided');
                return;
            }
            
            const imageUrl = urlInput.value.trim();
            console.log('Loading image from direct URL:', imageUrl);
            
            // Get bounds from input
            const boundsInput = document.getElementById('direct-image-bounds');
            if (!boundsInput || !boundsInput.value) {
                console.warn('No bounds provided');
                return;
            }
            
            // Parse bounds
            const boundsString = boundsInput.value.trim();
            const bounds = boundsString.split(',').map(Number);
            
            if (bounds.length !== 4 || bounds.some(isNaN)) {
                console.warn('Invalid bounds format');
                return;
            }
            
            // Show loading indicator
            document.getElementById('loading').style.display = 'block';
            
            // Add image overlay
            await this.addImageOverlay(imageUrl, bounds, { id: 'direct-url-image' });
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading image from direct URL:', error);
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
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
    
    /**
     * Check if an asset is a Cloud Optimized GeoTIFF (COG)
     * @param {Object} asset - Asset object
     * @returns {boolean} - True if the asset is a COG, false otherwise
     */
    isCOGAsset(asset) {
        // Check if the asset type is 'image/tiff; application=geotiff; profile=cloud-optimized'
        return asset.type === 'image/tiff; application=geotiff; profile=cloud-optimized';
    }
    
    /**
     * Add image overlay to map
     * @param {string} imageUrl - Image URL
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {Object} item - STAC item
     */
    async addImageOverlay(imageUrl, bbox, item) {
        try {
            console.log('🖼️ Adding image overlay:', imageUrl);
            console.log('📍 Using full bounding box:', bbox);
            
            // Remove existing overlay if any
            this.removeCurrentLayer();

            // Try to use the already-loaded thumbnail from results panel first (avoids CORS)
            console.log('🔄 Attempting to get thumbnail from results panel...');
            const thumbnailDataUrl = await this.getThumbnailFromResultsPanel(item.id);
            
            let finalUrl;
            if (thumbnailDataUrl) {
                console.log('✅ Using preloaded thumbnail from results panel');
                finalUrl = thumbnailDataUrl;
            } else {
                console.log('⚠️ Could not convert preloaded thumbnail, trying direct URL...');
                
                // Use the direct thumbnail URL - MapLibre might be able to handle it
                // even if canvas conversion fails due to CORS
                const absoluteUrl = this.ensureAbsoluteUrl(imageUrl);
                console.log('🌐 Trying direct thumbnail URL:', absoluteUrl);
                finalUrl = absoluteUrl;
            }
            
            // Create a unique ID for this image source
            const sourceId = `image-overlay-${Date.now()}`;
            
            // Use the FULL bounding box coordinates without aspect ratio adjustments
            // This ensures the image covers 100% of the geographic extent
            const coordinates = [
                [bbox[0], bbox[3]], // top-left (northwest)
                [bbox[2], bbox[3]], // top-right (northeast)
                [bbox[2], bbox[1]], // bottom-right (southeast)
                [bbox[0], bbox[1]]  // bottom-left (southwest)
            ];
            
            console.log('📐 Using full bbox coordinates:', coordinates);
            
            // Add source with full bounding box coverage
            this.map.addSource(sourceId, {
                type: 'image',
                url: finalUrl,
                coordinates: coordinates
            });
            
            // Add image layer with error handling
            this.map.addLayer({
                id: `${sourceId}-layer`,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': 1.0,
                    'raster-resampling': 'linear'
                }
            });
            
            // Wait a moment to see if the layer loads successfully
            setTimeout(() => {
                // Check if the source actually loaded
                const source = this.map.getSource(sourceId);
                if (source && this.map.getLayer(`${sourceId}-layer`)) {
                    console.log('✅ Image layer appears to have loaded successfully');
                } else {
                    console.warn('⚠️ Image layer may have failed to load, checking...');
                }
            }, 2000);
            
            // Store as current layer
            this.currentLayer = {
                sourceId,
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
            
            console.log('✅ Image overlay added successfully with full bbox coverage');
            
            // Register error handler for post-adding errors
            this.map.once('error', (e) => {
                if (e.sourceId === sourceId) {
                    console.log('❌ Image failed to load, showing bounding box instead');
                    this.handleImageError(sourceId, finalUrl, bbox, item);
                }
            });
            
            // Also listen for source data events to catch loading failures
            this.map.once('sourcedata', (e) => {
                if (e.sourceId === sourceId && e.isSourceLoaded === false) {
                    console.warn('⚠️ Image source failed to load, using fallback');
                    this.handleImageError(sourceId, finalUrl, bbox, item);
                }
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error in addImageOverlay:', error);
            
            // Use GeoJSON fallback without tooltip
            this.addGeoJsonLayerWithoutTooltip(bbox, item);
            return false;
        }
    }
    
    /**
     * Check if a URL is likely to be blocked by CORS
     * @param {string} url - URL to check
     * @returns {boolean} - True if likely to be CORS blocked
     */
    isLikelyCORSBlocked(url) {
        if (!url) return true;
        
        // If it's the same origin, it should be fine
        if (url.startsWith(window.location.origin)) {
            return false;
        }
        
        // If it's a data URL, it should be fine
        if (url.startsWith('data:')) {
            return false;
        }
        
        // Known highly problematic domains/patterns that rarely work
        const highlyProblematicPatterns = [
            '/$value',  // OData $value endpoints rarely support CORS
            '/odata/v1/Assets',  // Specific OData asset endpoints
            'datahub.creodias.eu',  // This domain generally blocks CORS
            'earthdata.nasa.gov',   // NASA domain blocks CORS
            'ladsweb.modaps.eosdis.nasa.gov',  // NASA MODAPS blocks CORS
            'archive.usgs.gov',     // USGS archive blocks CORS
        ];
        
        // Check if URL contains highly problematic patterns
        const hasHighlyProblematicPattern = highlyProblematicPatterns.some(pattern => 
            url.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (hasHighlyProblematicPattern) {
            console.log('🚫 URL contains highly problematic pattern, will block:', url);
            return true;
        }
        
        // Only block URLs with known problematic patterns
        // Most external URLs should be allowed to try loading
        console.log('🌐 External URL detected, will attempt to load:', url);
        return false; // Allow external URLs to be attempted
    }
    
    /**
     * Get thumbnail from results panel and try to convert to data URL
     * @param {string} itemId - Item ID to look for
     * @returns {Promise<string|null>} - Data URL of the thumbnail or null (CORS usually prevents this)
     */
    async getThumbnailFromResultsPanel(itemId) {
        try {
            console.log('🔍 Looking for preloaded thumbnail for item:', itemId);
            
            // Find the item in the results panel
            const resultItem = this.findResultItemByMultipleStrategies(itemId);
            if (!resultItem) {
                console.log('❌ Item not found in results panel');
                return null;
            }
            
            // Find the thumbnail image element
            const thumbnailImg = resultItem.querySelector('.dataset-thumbnail');
            if (!thumbnailImg) {
                console.log('❌ No thumbnail image element found in results panel');
                return null;
            }
            
            // Check if the image is loaded and has a valid source
            console.log('📊 Thumbnail status:', {
                src: thumbnailImg.src,
                complete: thumbnailImg.complete,
                naturalWidth: thumbnailImg.naturalWidth,
                naturalHeight: thumbnailImg.naturalHeight
            });
            
            if (!thumbnailImg.src || thumbnailImg.src.includes('placeholder')) {
                console.log('❌ Thumbnail has no valid source or is placeholder');
                return null;
            }
            
            if (!thumbnailImg.complete || thumbnailImg.naturalWidth === 0) {
                console.log('❌ Thumbnail not fully loaded yet');
                return null;
            }
            
            // Try to convert the loaded image to a data URL
            // This will fail with CORS, but that's OK - MapLibre can still use the direct URL
            console.log('🐈 Attempting to convert thumbnail to data URL (will likely fail with CORS)...');
            
            const dataUrl = await this.imageToDataUrl(thumbnailImg);
            if (dataUrl && dataUrl.length > 1000) {
                console.log('✅ Successfully converted thumbnail to data URL (length:', dataUrl.length, ')');
                return dataUrl;
            } else {
                console.log('❌ Failed to convert thumbnail to data URL due to CORS - this is expected');
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting thumbnail from results panel:', error);
            return null;
        }
    }
    
    /**
     * Convert an image element to a data URL
     * @param {HTMLImageElement} imgElement - Image element to convert
     * @returns {Promise<string|null>} - Data URL or null if conversion fails
     */
    async imageToDataUrl(imgElement) {
        return new Promise((resolve) => {
            try {
                // Create a canvas element
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to match image
                canvas.width = imgElement.naturalWidth || imgElement.width || 300;
                canvas.height = imgElement.naturalHeight || imgElement.height || 200;
                
                console.log('🎨 Converting image to canvas:', {
                    width: canvas.width,
                    height: canvas.height,
                    imgSrc: imgElement.src?.substring(0, 100) + '...'
                });
                
                // Draw the image onto the canvas
                ctx.drawImage(imgElement, 0, 0);
                
                // Try to convert canvas to data URL
                let dataUrl;
                try {
                    dataUrl = canvas.toDataURL('image/png', 0.8); // Slightly compressed
                    console.log('✅ Successfully converted to data URL, size:', dataUrl.length);
                } catch (corsError) {
                    console.warn('❌ Canvas tainted by CORS - this is expected for external images:', corsError.message);
                    canvas.remove();
                    resolve(null);
                    return;
                }
                
                // Clean up
                canvas.remove();
                
                resolve(dataUrl);
                
            } catch (error) {
                console.warn('❌ Could not convert image to data URL:', error.message);
                resolve(null);
            }
        });
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
        
        console.log('Image failed to load, showing bounding box outline instead');
        
        // Show the bounding box outline as fallback
        this.addGeoJsonLayerWithoutTooltip(bbox, item);
    }
    
    /**
     * Try to get a proxy URL for CORS issues
     * @param {string} url - Original URL
     * @returns {string} - Proxy URL or original URL
     */
    getProxyUrl(url) {
        // Check if we're on the same origin
        if (url.startsWith(window.location.origin)) {
            return url; // No need for proxy
        }
        
        // For external URLs, we can try a CORS proxy if available
        // This is a simple implementation - you might want to add more sophisticated proxy logic
        
        // Option: Use relative path if image is on the server
        if (url.startsWith('http') && url.includes('/') && !url.startsWith(window.location.origin)) {
            // Extract just the filename and try as relative
            const filename = url.substring(url.lastIndexOf('/') + 1);
            return `./images/${filename}`;
        }
        
        // No proxy available, return original
        return url;
    }
}