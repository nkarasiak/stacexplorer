/**
 * MapManager.js - Handles map display and interactions
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
        this.drawControl = null;
        this.drawnItems = null;
        this.currentLayer = null;
        this.currentLayerOverlay = null;
        this.currentAssetKey = null;
        
        // Initialize the map
        this.initMap();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize the map
     */
    initMap() {
        // Create map with default settings
        this.map = L.map(this.mapElementId).setView(
            this.config.mapSettings.defaultCenter,
            this.config.mapSettings.defaultZoom
        );
        
        // Add default basemap
        this.setBasemap(this.config.mapSettings.defaultBasemap);
        
        // Initialize draw control
        this.initDrawControl();
    }
    
    /**
     * Initialize draw control for bounding box selection
     */
    initDrawControl() {
        // Create feature group for drawn items
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        
        // Initialize draw control with rectangle only
        const drawOptions = {
            draw: {
                polyline: false,
                circle: false,
                polygon: false,
                marker: false,
                circlemarker: false,
                rectangle: {
                    shapeOptions: {
                        color: '#2196F3',
                        weight: 2
                    }
                }
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        };
        
        // Create draw control
        this.drawControl = new L.Control.Draw(drawOptions);
        
        // Don't add it yet, will be added when user clicks draw button
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
        
        // Map draw events
        this.map.on(L.Draw.Event.CREATED, (event) => {
            const layer = event.layer;
            
            // Add drawn layer to feature group
            this.drawnItems.addLayer(layer);
            
            // Get bounds and convert to STAC bbox format [west, south, east, north]
            const bounds = layer.getBounds();
            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ];
            
            // Dispatch event with bbox
            document.dispatchEvent(new CustomEvent('bboxDrawn', { detail: { bbox } }));
            
            // Remove draw control and revert to normal cursor
            this.map.removeControl(this.drawControl);
            this.map._container.style.cursor = '';
        });
        
        // Clear map drawings event
        document.addEventListener('clearMapDrawings', () => {
            this.clearDrawings();
        });
        
        // Expand tools panel event
        document.addEventListener('expandToolsPanel', () => {
            const toolsPanel = document.getElementById('tools-panel');
            if (toolsPanel.classList.contains('collapsed')) {
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
     * Set the basemap
     * @param {string} basemapName - Name of the basemap to use
     */
    setBasemap(basemapName) {
        // Remove current basemap if exists
        if (this.baseLayer) {
            this.map.removeLayer(this.baseLayer);
        }
        
        // Get basemap config or use default if not found
        const basemapConfig = this.config.mapSettings.basemapOptions[basemapName] || 
                            this.config.mapSettings.basemapOptions.Dark;
        
        // Create new basemap layer
        this.baseLayer = L.tileLayer(basemapConfig.url, {
            attribution: basemapConfig.attribution,
            maxZoom: 19
        });
        
        // Add to map
        this.baseLayer.addTo(this.map);
    }
    
    /**
     * Start the bounding box drawing mode
     */
    startDrawingBbox() {
        // Clear any existing drawings
        this.clearDrawings();
        
        // Add draw control to map
        this.map.addControl(this.drawControl);
        
        // Set cursor to crosshair
        this.map._container.style.cursor = 'crosshair';
        
        // Activate rectangle drawing
        new L.Draw.Rectangle(this.map, this.drawControl.options.draw.rectangle).enable();
    }
    
    /**
     * Clear all drawings from the map
     */
    clearDrawings() {
        // Clear feature group
        this.drawnItems.clearLayers();
        
        // Clear bbox input field
        document.getElementById('bbox-input').value = '';
        
        // Remove draw control if it's on the map
        try {
            this.map.removeControl(this.drawControl);
        } catch (e) {
            // Ignore if control is not on map
        }
        
        // Reset cursor
        this.map._container.style.cursor = '';
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
            this.drawnItems.clearLayers();
            
            // Create a rectangle for the bbox
            const bounds = L.latLngBounds(
                [bbox[1], bbox[0]], // Southwest corner [lat, lng]
                [bbox[3], bbox[2]]  // Northeast corner [lat, lng]
            );
            
            // Create rectangle layer
            const rectangle = L.rectangle(bounds, {
                color: '#2196F3',
                weight: 2
            });
            
            // Add to drawn items
            this.drawnItems.addLayer(rectangle);
            
            // Fit map to the bbox
            this.map.fitBounds(bounds);
        } catch (error) {
            console.error('Error updating bbox from input:', error);
        }
    }
    
    /**
     * Find assets with 'visual' roles in a STAC item
     * @param {Object} item - STAC item
     * @returns {Array} - Array of asset objects with links
     */
    findVisualAssets(item) {
        const visualAssets = [];
        
        if (!item.assets) {
            console.warn('Item has no assets:', item);
            return visualAssets;
        }
        
        // PRIORITY 1: First check if the thumbnail is already loaded in the results panel
        // This is the most reliable approach since it's already displayed in the browser
        try {
            const resultItem = document.querySelector(`.dataset-item[data-id="${item.id}"]`);
            if (resultItem) {
                const thumbnail = resultItem.querySelector('.dataset-thumbnail');
                if (thumbnail && thumbnail.complete && thumbnail.naturalHeight !== 0 && thumbnail.src && 
                    !thumbnail.src.includes('placeholder')) {
                    console.log('Using already loaded thumbnail from results panel:', thumbnail.src);
                    // Return immediately with just this asset to ensure it's used
                    return [{
                        key: 'loaded_thumbnail',
                        href: thumbnail.src,
                        type: 'image/jpeg',
                        roles: ['thumbnail']
                    }];
                }
            }
        } catch (error) {
            console.error('Error checking for loaded thumbnail:', error);
        }
        
        // Check if any assets are from CREODIAS - if so, don't even try to use them
        // as they will cause CORS errors
        const hasCreodiasAssets = Object.values(item.assets).some(asset => 
            asset.href && (
                asset.href.includes('datahub.creodias.eu') || 
                asset.href.endsWith('$value')
            )
        );
        
        if (hasCreodiasAssets) {
            console.log('Item has CREODIAS assets that would cause CORS issues - using only the results thumbnail');
            // Return an empty array so the code will fall back to using the results thumbnail
            return [];
        }
        
        // PRIORITY 2: Then check specifically for thumbnail asset
        if (item.assets.thumbnail && item.assets.thumbnail.href) {
            // Skip CREODIAS URLs that will cause CORS issues
            if (item.assets.thumbnail.href.includes('datahub.creodias.eu') || 
                item.assets.thumbnail.href.endsWith('$value')) {
                console.log('Skipping CREODIAS thumbnail that would cause CORS issues');
            } else {
                console.log('Found thumbnail asset:', item.assets.thumbnail);
                visualAssets.push({
                    key: 'thumbnail',
                    ...item.assets.thumbnail
                });
                // Return immediately to prioritize thumbnail
                return visualAssets;
            }
        }
        
        // Check each asset
        for (const [key, asset] of Object.entries(item.assets)) {
            // Skip assets that will cause CORS issues
            if (asset.href && (
                asset.href.includes('datahub.creodias.eu') || 
                asset.href.endsWith('$value')
            )) {
                console.log('Skipping CORS-problematic asset:', key, asset.href);
                continue;
            }
            
            console.log('Checking asset:', key, asset);
            
            // Check for visual role
            if (asset.roles && asset.roles.includes('visual')) {
                console.log('Found visual role asset:', key, asset);
                visualAssets.push({
                    key,
                    ...asset
                });
            }
            // Also check for common visual asset keys
            else if (['visual', 'rgb', 'preview', 'browse'].includes(key)) {
                console.log('Found visual key asset:', key, asset);
                visualAssets.push({
                    key,
                    ...asset
                });
            }
        }
        
        console.log('Found visual assets:', visualAssets);
        return visualAssets;
    }
    
    /**
     * Display a STAC item on the map
     * @param {Object} item - STAC item to display
     * @param {string} [preferredAssetKey] - Optional preferred asset key to display
     * @returns {Promise} - Promise that resolves when the item is displayed
     */
    async displayItemOnMap(item, preferredAssetKey = null) {
        try {
            console.log('displayItemOnMap called with item:', item.id, 'and preferredAssetKey:', preferredAssetKey);
            
            // Remove any existing layer
            this.removeCurrentLayer();
            
            // Check if item has a geometry
            if (!item.geometry) {
                console.error('Item has no geometry:', item);
                throw new Error('Item has no geometry');
            }
            
            // Create GeoJSON layer
            this.currentLayer = L.geoJSON(item.geometry, {
                style: {
                    color: '#4CAF50',
                    weight: 2,
                    fillOpacity: 0.2
                }
            });
            
            // Add to map
            this.currentLayer.addTo(this.map);
            console.log('Added GeoJSON layer to map for item:', item.id);
            
            // Fit map to layer bounds
            this.fitToLayerBounds();
            
            // If we have a preferred asset key, try to use it first
            if (preferredAssetKey && item.assets && item.assets[preferredAssetKey]) {
                console.log(`Using preferred asset: ${preferredAssetKey}`, item.assets[preferredAssetKey]);
                const asset = item.assets[preferredAssetKey];
                await this.addAssetOverlay(asset, item, preferredAssetKey);
                return true;
            }
            
            // SIMPLIFIED APPROACH: Try using the results thumbnail first
            console.log('Trying to use results thumbnail first');
            const thumbnailSuccess = this.useResultsThumbnail(item);
            console.log('useResultsThumbnail result:', thumbnailSuccess);
            
            // Only if that fails, try other methods
            if (!thumbnailSuccess) {
                console.log('Thumbnail not available, falling back to visual assets');
                // Find assets with 'visual' roles for preview
                const visualAssets = this.findVisualAssets(item);
                console.log('Found visual assets:', visualAssets);
                
                // If we have visual assets, try to add them as overlay
                if (visualAssets.length > 0) {
                    const asset = visualAssets[0];
                    const assetKey = Object.keys(item.assets).find(key => item.assets[key] === asset);
                    console.log('Using visual asset:', assetKey, asset);
                    await this.addAssetOverlay(asset, item, assetKey);
                } else {
                    console.warn('No visual assets found for item:', item);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error displaying item on map:', error);
            return false;
        }
    }
    
    /**
     * Use the thumbnail from the results panel as a quick preview
     * @param {Object} item - STAC item
     * @returns {boolean} - Whether the thumbnail was successfully used
     */
    useResultsThumbnail(item) {
        try {
            console.log('Using simplified thumbnail approach for item:', item.id);
            
            // Find the thumbnail in the results panel - try both data-id and dataset.id
            let resultItem = document.querySelector(`.dataset-item[data-id="${item.id}"]`);
            
            // If not found, try with the id attribute directly
            if (!resultItem) {
                console.log('Trying to find result item by iterating through all dataset items');
                const allItems = document.querySelectorAll('.dataset-item');
                for (const element of allItems) {
                    if (element.dataset.id === item.id) {
                        resultItem = element;
                        break;
                    }
                }
            }
            
            if (!resultItem) {
                console.warn('Could not find result item in the panel for:', item.id);
                return false;
            }
            
            const thumbnail = resultItem.querySelector('.dataset-thumbnail');
            if (!thumbnail || !thumbnail.src || thumbnail.src.includes('placeholder')) {
                console.warn('No valid thumbnail found for item:', item.id);
                return false;
            }
            
            console.log('Found thumbnail:', thumbnail.src);
            
            // Set the current asset key to 'thumbnail'
            this.currentAssetKey = 'thumbnail';
            
            // Get bounds from item
            let bounds;
            if (item.bbox && item.bbox.length === 4) {
                bounds = L.latLngBounds(
                    [item.bbox[1], item.bbox[0]], // Southwest corner [lat, lng]
                    [item.bbox[3], item.bbox[2]]  // Northeast corner [lat, lng]
                );
            } else if (item.geometry && item.geometry.type === 'Polygon') {
                // Extract bounds from polygon coordinates
                const coords = item.geometry.coordinates[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                coords.forEach(coord => {
                    minX = Math.min(minX, coord[0]);
                    minY = Math.min(minY, coord[1]);
                    maxX = Math.max(maxX, coord[0]);
                    maxY = Math.max(maxY, coord[1]);
                });
                
                bounds = L.latLngBounds(
                    [minY, minX], // Southwest corner [lat, lng]
                    [maxY, maxX]  // Northeast corner [lat, lng]
                );
            } else {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }
            
            // Create image overlay with the thumbnail's src directly
            const overlay = L.imageOverlay(thumbnail.src, bounds, {
                opacity: 1.0,
                interactive: false // Prevent interaction issues
            });
            
            // Add to map
            overlay.addTo(this.map);
            
            // Store as part of current layer
            this.currentLayerOverlay = overlay;
            
            console.log('Results thumbnail overlay created successfully');
            return true;
        } catch (error) {
            console.error('Error using results thumbnail:', error);
            return false;
        }
    }
    
    /**
     * Add an asset as an overlay on the map
     * @param {Object} asset - STAC asset to display
     * @param {Object} item - Parent STAC item
     * @param {string} assetKey - The key of the asset in the item's assets object
     * @returns {Promise} - Promise that resolves when the overlay is added
     */
    async addAssetOverlay(asset, item, assetKey) {
        try {
            // Store the asset key for state management
            this.currentAssetKey = assetKey;
            
            // Check if asset has a href
            if (!asset.href) {
                throw new Error('Asset has no href');
            }
            
            // Determine if this is a COG or other type of visual asset
            const isCOG = this.isCOGAsset(asset);
            
            if (isCOG) {
                // Handle COG assets with special rendering
                await this.addCOGOverlay(asset, item);
            } else {
                // Handle regular image assets
                await this.addImageOverlay(asset, item);
            }
            
            // Dispatch event that an item has been displayed with a specific asset
            document.dispatchEvent(new CustomEvent('assetDisplayed', {
                detail: {
                    itemId: item.id,
                    assetKey: assetKey
                }
            }));
            
            return true;
        } catch (error) {
            console.error('Error adding asset overlay:', error);
            return false;
        }
    }
    
    /**
     * Add a visual overlay to the map
     * @param {Object} asset - Asset object with href
     * @param {Object} item - Parent STAC item
     */
    async addVisualOverlay(asset, item) {
        try {
            console.log('Adding visual overlay for asset:',  asset);
            console.log('Item:', item);
            
            // Skip if no href
            if (!asset.href) {
                console.warn('Asset has no href:', asset);
                // Try using the thumbnail from results as fallback
                return this.useResultsThumbnail(item);
            }

            // Process the href - keep as is even if it ends with $value (it's still a valid JPG)
            let imageUrl = asset.href;
            console.log('Using image URL:', imageUrl);

            // Get bounds from item
            let bounds;
            if (item.bbox && item.bbox.length === 4) {
                console.log('Using bbox for bounds:', item.bbox);
                bounds = L.latLngBounds(
                    [item.bbox[1], item.bbox[0]], // Southwest corner [lat, lng]
                    [item.bbox[3], item.bbox[2]]  // Northeast corner [lat, lng]
                );
            } else if (item.geometry && item.geometry.type === 'Polygon') {
                console.log('Using geometry for bounds:', item.geometry);
                // Extract bounds from polygon coordinates
                const coords = item.geometry.coordinates[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                coords.forEach(coord => {
                    minX = Math.min(minX, coord[0]);
                    minY = Math.min(minY, coord[1]);
                    maxX = Math.max(maxX, coord[0]);
                    maxY = Math.max(maxY, coord[1]);
                });
                
                bounds = L.latLngBounds(
                    [minY, minX], // Southwest corner [lat, lng]
                    [maxY, maxX]  // Northeast corner [lat, lng]
                );
                console.log('Calculated bounds:', bounds);
            } else {
                console.warn('Item has no valid bbox or geometry for overlay');
                return this.useResultsThumbnail(item);
            }

            // Log the URL we're trying to load
            console.log('Attempting to load image from URL:', imageUrl);

            // Check for CREODIAS URLs or URLs with $value - these will likely have CORS issues
            if (imageUrl.includes('datahub.creodias.eu') || imageUrl.endsWith('$value')) {
                console.log('Detected CREODIAS or $value URL, using results thumbnail to avoid CORS issues');
                // For CREODIAS URLs, go straight to using the results thumbnail
                // as we know direct fetch will fail due to CORS
                return this.useResultsThumbnail(item);
            }

            // For URLs with $value but not from CREODIAS, try direct fetch
            if (imageUrl.includes('/$value')) {
                console.log('URL contains $value, trying direct fetch first');
                const fetchResult = await this.fetchImageDirectly(imageUrl, bounds, item);
                if (fetchResult) {
                    return true;
                }
                // If direct fetch fails, fall back to results thumbnail
                return this.useResultsThumbnail(item);
            }

            // For other URLs, try standard image overlay first
            // Create image overlay with appropriate options
            const overlayOptions = {
                opacity: 1.0,
                crossOrigin: true
            };

            // Create image overlay
            const overlay = L.imageOverlay(imageUrl, bounds, overlayOptions);

            // Add load event handler
            overlay.on('load', () => {
                console.log('Image overlay loaded successfully');
            });

            // Add error handling for the image load
            overlay.on('error', (error) => {
                console.error('Error loading image overlay:', error);
                console.error('Failed URL:', imageUrl);
                this.notificationService?.showNotification('Error loading image overlay. Trying alternative method...', 'warning');
                
                // Try using the results thumbnail first as it's most reliable
                if (!this.useResultsThumbnail(item)) {
                    // If that fails, try direct fetch
                    this.fetchImageDirectly(imageUrl, bounds, item);
                }
            });

            // Add to map
            overlay.addTo(this.map);
            
            // Store as part of current layer
            this.currentLayerOverlay = overlay;
            
            return true;
        } catch (error) {
            console.error('Error adding visual overlay:', error);
            console.error('Asset:', asset);
            console.error('Item:', item);
            this.notificationService?.showNotification('Error adding visual overlay to map', 'error');
            
            // Try using the results thumbnail as a last resort
            return this.useResultsThumbnail(item);
        }
    }
    
    /**
     * Add an image overlay to the map
     * @param {Object} asset - Asset object with href
     * @param {Object} item - Parent STAC item
     */
    async addImageOverlay(asset, item) {
        try {
            console.log('Adding image overlay for asset:', asset);
            console.log('Item:', item);

            // Skip if no href
            if (!asset.href) {
                console.warn('Asset has no href:', asset);
                return false;
            }

            // Process the href
            let imageUrl = asset.href;
            console.log('Using image URL:', imageUrl);

            // Get bounds from item
            let bounds;
            if (item.bbox && item.bbox.length === 4) {
                console.log('Using bbox for bounds:', item.bbox);
                bounds = L.latLngBounds(
                    [item.bbox[1], item.bbox[0]], // Southwest corner [lat, lng]
                    [item.bbox[3], item.bbox[2]]  // Northeast corner [lat, lng]
                );
            } else if (item.geometry && item.geometry.type === 'Polygon') {
                console.log('Using geometry for bounds:', item.geometry);
                // Extract bounds from polygon coordinates
                const coords = item.geometry.coordinates[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                coords.forEach(coord => {
                    minX = Math.min(minX, coord[0]);
                    minY = Math.min(minY, coord[1]);
                    maxX = Math.max(maxX, coord[0]);
                    maxY = Math.max(maxY, coord[1]);
                });

                bounds = L.latLngBounds(
                    [minY, minX], // Southwest corner [lat, lng]
                    [maxY, maxX]  // Northeast corner [lat, lng]
                );
                console.log('Calculated bounds:', bounds);
            } else {
                console.warn('Item has no valid bbox or geometry for overlay');
                return false;
            }

            // Create image overlay with appropriate options
            const overlayOptions = {
                opacity: 1.0,
                crossOrigin: true
            };

            // Create image overlay
            const overlay = L.imageOverlay(imageUrl, bounds, overlayOptions);

            // Add load event handler
            overlay.on('load', () => {
                console.log('Image overlay loaded successfully');
            });

            // Add error handling for the image load
            overlay.on('error', (error) => {
                console.error('Error loading image overlay:', error);
                console.error('Failed URL:', imageUrl);
                this.notificationService?.showNotification('Error loading image overlay. Trying alternative method...', 'warning');

                // Try using the results thumbnail first as it's most reliable
                if (!this.useResultsThumbnail(item)) {
                    // If that fails, try direct fetch
                    this.fetchImageDirectly(imageUrl, bounds, item);
                }
            });

            // Add to map
            overlay.addTo(this.map);

            // Store as part of current layer
            this.currentLayerOverlay = overlay;

            return true;
        } catch (error) {
            console.error('Error adding image overlay:', error);
            console.error('Asset:', asset);
            console.error('Item:', item);
            this.notificationService?.showNotification('Error adding image overlay to map', 'error');

            // Try using the results thumbnail as a last resort
            return this.useResultsThumbnail(item);
        }
    }
    
    /**
     * Create a canvas-based overlay as a fallback for CORS issues
     * @param {string} imageUrl - URL of the image
     * @param {L.LatLngBounds} bounds - Bounds for the overlay
     * @param {Object} item - STAC item
     */
    createCanvasOverlay(imageUrl, bounds, item) {
        try {
            console.log('Attempting canvas-based overlay as fallback for:', imageUrl);
            
            // For regular STAC items, try using the results thumbnail first as it's most reliable
            if (item.id !== 'direct-url-image' && this.useResultsThumbnail(item)) {
                console.log('Successfully used results thumbnail instead of canvas overlay');
                return true;
            }
            
            // For direct URL inputs, we need to try harder with the canvas approach
            // Create an image element to load the image
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            // Use the image URL directly
            let srcUrl = imageUrl;
            
            // For direct URL inputs, try to use a CORS proxy
            if (item.id === 'direct-url-image') {
                // Try using a different CORS proxy as a last resort
                srcUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
                console.log('Using AllOrigins proxy for canvas approach:', srcUrl);
            }
            
            img.onload = () => {
                // Create a canvas element
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw the image on the canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Convert canvas to data URL
                const dataUrl = canvas.toDataURL('image/jpeg');
                
                // Create image overlay with data URL
                const overlay = L.imageOverlay(dataUrl, bounds, {
                    opacity: 1.0
                });
                
                // Add to map
                overlay.addTo(this.map);
                
                // Store as part of current layer
                if (this.currentLayerOverlay) {
                    this.map.removeLayer(this.currentLayerOverlay);
                }
                this.currentLayerOverlay = overlay;
                
                console.log('Canvas overlay created successfully');
                
                // For direct URL inputs, show a success notification
                if (item.id === 'direct-url-image') {
                    this.notificationService?.showNotification('Image loaded successfully using canvas method', 'success');
                }
            };
            
            img.onerror = () => {
                console.error('Failed to load image for canvas overlay');
                
                if (item.id === 'direct-url-image') {
                    // For direct URL inputs, show an error notification
                    this.notificationService?.showNotification('Could not load image. The URL may be invalid or blocked by CORS policy.', 'error');
                    
                    // Try one more approach - using an iframe proxy
                    this.tryIframeProxy(imageUrl, bounds);
                } else {
                    // For regular STAC items, try to use the thumbnail from the results panel as a fallback
                    this.useResultsThumbnail(item);
                }
            };
            
            // Set the source to start loading
            img.src = srcUrl;
            return true;
        } catch (error) {
            console.error('Error creating canvas overlay:', error);
            
            // For direct URL inputs, show an error notification
            if (item.id === 'direct-url-image') {
                this.notificationService?.showNotification('Could not load image. The URL may be invalid or blocked by CORS policy.', 'error');
                return false;
            }
            
            // Try using the results thumbnail as a last resort
            return this.useResultsThumbnail(item);
        }
    }
    
    /**
     * Try using an iframe proxy as a last resort for direct URLs
     * @param {string} imageUrl - URL of the image
     * @param {L.LatLngBounds} bounds - Bounds for the overlay
     */
    tryIframeProxy(imageUrl, bounds) {
        try {
            console.log('Attempting iframe proxy as last resort for:', imageUrl);
            
            // Create a notification to inform the user
            this.notificationService?.showNotification('Trying alternative method to load image...', 'info');
            
            // Create a hidden iframe to load the image
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            // Create a simple HTML document with the image
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Image Proxy</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        img { max-width: 100%; }
                    </style>
                </head>
                <body>
                    <img src="${imageUrl}" id="proxyImage" crossorigin="anonymous">
                    <script>
                        const img = document.getElementById('proxyImage');
                        img.onload = function() {
                            window.parent.postMessage({
                                type: 'imageLoaded',
                                width: img.naturalWidth,
                                height: img.naturalHeight
                            }, '*');
                        };
                        img.onerror = function() {
                            window.parent.postMessage({
                                type: 'imageError'
                            }, '*');
                        };
                    </script>
                </body>
                </html>
            `;
            
            // Listen for messages from the iframe
            const messageHandler = (event) => {
                if (event.data && event.data.type === 'imageLoaded') {
                    console.log('Image loaded in iframe proxy');
                    
                    // Create a message to inform the user
                    this.notificationService?.showNotification('Image loaded in proxy frame. Using screenshot method.', 'success');
                    
                    // Clean up
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                } else if (event.data && event.data.type === 'imageError') {
                    console.error('Image failed to load in iframe proxy');
                    
                    // Create an error notification
                    this.notificationService?.showNotification('All methods failed to load the image. Please check the URL.', 'error');
                    
                    // Clean up
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Write the HTML to the iframe
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
            
            return true;
        } catch (error) {
            console.error('Error with iframe proxy:', error);
            this.notificationService?.showNotification('All methods failed to load the image. Please check the URL.', 'error');
            return false;
        }
    }
    
    /**
     * Remove the current layer from the map
     */
    removeCurrentLayer() {
        if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
            this.currentLayer = null;
        }
        
        if (this.currentLayerOverlay) {
            this.map.removeLayer(this.currentLayerOverlay);
            this.currentLayerOverlay = null;
        }
        
        // Reset the current asset key
        this.currentAssetKey = null;
        
        // Clean up any blob URLs
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }
    }
    
    /**
     * Fit the map view to the current layer bounds
     */
    fitToLayerBounds() {
        if (this.currentLayer) {
            const bounds = this.currentLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, {
                    padding: [50, 50]
                });
            }
        }
    }
    
    /**
     * Set the opacity of the current layer
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(opacity) {
        if (this.currentLayerOverlay) {
            this.currentLayerOverlay.setOpacity(opacity);
        }
    }
    
    /**
     * Fetch an image directly using fetch API
     * @param {string} url - URL of the image
     * @param {L.LatLngBounds} bounds - Bounds for the overlay
     * @param {Object} item - STAC item
     */
    async fetchImageDirectly(url, bounds, item) {
        try {
            console.log('Fetching image directly:', url);
            
            // Check if this is a CREODIAS URL
            const isCreodiasUrl = url.includes('datahub.creodias.eu');
            
            // For direct URL inputs, try a simpler approach first
            if (item.id === 'direct-url-image') {
                try {
                    console.log('Using direct image overlay for pasted URL');
                    
                    // Create image overlay with direct URL
                    const overlay = L.imageOverlay(url, bounds, {
                        opacity: 1.0,
                        crossOrigin: 'anonymous'
                    });
                    
                    // Add load event handler
                    overlay.on('load', () => {
                        console.log('Direct URL image overlay loaded successfully');
                    });
                    
                    // Add error handling for the image load
                    overlay.on('error', (error) => {
                        console.error('Error loading direct URL image overlay:', error);
                        throw new Error('Failed to load image directly');
                    });
                    
                    // Add to map
                    overlay.addTo(this.map);
                    
                    // Store as part of current layer
                    if (this.currentLayerOverlay) {
                        this.map.removeLayer(this.currentLayerOverlay);
                    }
                    this.currentLayerOverlay = overlay;
                    
                    return true;
                } catch (directError) {
                    console.error('Error with direct overlay approach:', directError);
                    // Continue to the fetch approach
                }
            }
            
            // First try with regular CORS mode
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Accept': 'image/jpeg,image/png,*/*'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Get the blob
                const blob = await response.blob();
                
                // Create a blob URL
                const blobUrl = URL.createObjectURL(blob);
                console.log('Created blob URL:', blobUrl);
                
                // Create image overlay with blob URL
                const overlay = L.imageOverlay(blobUrl, bounds, {
                    opacity: 1.0
                });
                
                // Add to map
                overlay.addTo(this.map);
                
                // Store as part of current layer
                if (this.currentLayerOverlay) {
                    this.map.removeLayer(this.currentLayerOverlay);
                }
                this.currentLayerOverlay = overlay;
                
                // Add cleanup for blob URL
                this.currentBlobUrl = blobUrl;
                
                console.log('Image overlay created successfully');
                return true;
            } catch (corsError) {
                console.error('CORS error fetching image:', corsError);
                
                // If this is a direct URL input, try no-cors mode
                if (item.id === 'direct-url-image') {
                    try {
                        console.log('Trying no-cors mode for direct URL');
                        
                        // Try using a proxy service if available
                        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                        console.log('Using proxy URL:', proxyUrl);
                        
                        const response = await fetch(proxyUrl, {
                            method: 'GET',
                            mode: 'cors',
                            credentials: 'omit',
                            headers: {
                                'Accept': 'image/jpeg,image/png,*/*',
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error with proxy! status: ${response.status}`);
                        }
                        
                        // Get the blob
                        const blob = await response.blob();
                        
                        // Create a blob URL
                        const blobUrl = URL.createObjectURL(blob);
                        console.log('Created blob URL from proxy:', blobUrl);
                        
                        // Create image overlay with blob URL
                        const overlay = L.imageOverlay(blobUrl, bounds, {
                            opacity: 1.0
                        });
                        
                        // Add to map
                        overlay.addTo(this.map);
                        
                        // Store as part of current layer
                        if (this.currentLayerOverlay) {
                            this.map.removeLayer(this.currentLayerOverlay);
                        }
                        this.currentLayerOverlay = overlay;
                        
                        // Add cleanup for blob URL
                        this.currentBlobUrl = blobUrl;
                        
                        console.log('Image overlay created successfully with proxy');
                        return true;
                    } catch (proxyError) {
                        console.error('Error with proxy approach:', proxyError);
                        // Fall back to canvas method
                    }
                }
                
                // If this is a CREODIAS URL, try using the results thumbnail as it's most reliable
                if (isCreodiasUrl) {
                    console.log('CREODIAS URL detected, using results thumbnail instead');
                    return this.useResultsThumbnail(item);
                }
                
                // For other URLs, try canvas method as a last resort
                return this.createCanvasOverlay(url, bounds, item);
            }
        } catch (error) {
            console.error('Error in fetchImageDirectly:', error);
            // Try using the results thumbnail as a fallback
            if (this.useResultsThumbnail(item)) {
                return true;
            }
            // If that fails, try canvas method as a last resort
            return this.createCanvasOverlay(url, bounds, item);
        }
    }
    
    /**
     * Load an image from a direct URL input
     */
    async loadImageFromDirectUrl() {
        try {
            // Get the URL from the input field
            const urlInput = document.getElementById('direct-image-url');
            const imageUrl = urlInput.value.trim();
            
            if (!imageUrl) {
                console.warn('No URL provided');
                this.notificationService?.showNotification('Please enter a valid image URL', 'warning');
                return;
            }
            
            console.log('Loading image from direct URL:', imageUrl);
            
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Remove any existing layer
            this.removeCurrentLayer();
            
            // Get the current map bounds
            const mapBounds = this.map.getBounds();
            
            // Create a dummy item with the current map bounds
            const dummyItem = {
                id: 'direct-url-image',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [mapBounds.getWest(), mapBounds.getSouth()],
                        [mapBounds.getEast(), mapBounds.getSouth()],
                        [mapBounds.getEast(), mapBounds.getNorth()],
                        [mapBounds.getWest(), mapBounds.getNorth()],
                        [mapBounds.getWest(), mapBounds.getSouth()]
                    ]]
                },
                bbox: [
                    mapBounds.getWest(),
                    mapBounds.getSouth(),
                    mapBounds.getEast(),
                    mapBounds.getNorth()
                ]
            };
            
            // Create GeoJSON layer for the bounds
            this.currentLayer = L.geoJSON(dummyItem.geometry, {
                style: {
                    color: '#4CAF50',
                    weight: 2,
                    fillOpacity: 0.2
                }
            });
            
            // Add to map
            this.currentLayer.addTo(this.map);
            
            // Try to fetch and display the image
            const success = await this.fetchImageDirectly(imageUrl, mapBounds, dummyItem);
            
            if (success) {
                console.log('Successfully loaded image from direct URL');
                this.notificationService?.showNotification('Image loaded successfully', 'success');
                
                // Set the current asset key
                this.currentAssetKey = 'direct-url';
                
                // Dispatch event that an asset has been displayed
                document.dispatchEvent(new CustomEvent('assetDisplayed', {
                    detail: {
                        itemId: 'direct-url-image',
                        assetKey: 'direct-url'
                    }
                }));
            } else {
                console.error('Failed to load image from direct URL');
                this.notificationService?.showNotification('Failed to load image. Please check the URL and try again.', 'error');
            }
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading image from direct URL:', error);
            this.notificationService?.showNotification(`Error loading image: ${error.message}`, 'error');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        }
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
}