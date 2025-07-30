/**
 * SimpleDeckGLIntegration - Basic Deck.gl integration for STAC Explorer
 * 
 * A simplified version that works reliably with CDN-loaded Deck.gl
 */

class SimpleDeckGLIntegration {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.deck = null;
        this.isInitialized = false;
        this.currentLayer = null;
        this.currentBlobUrl = null; // For cleanup of blob URLs
    }

    /**
     * Initialize simple Deck.gl integration
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Wait for Deck.gl to be fully loaded
            await this.waitForDeckGL();
            
            // Check if Deck.gl is available globally
            if (typeof window.deck === 'undefined') {
                throw new Error('Deck.gl not available - check CDN loading');
            }

            const map = this.mapManager.getMap();
            if (!map) {
                throw new Error('MapLibre GL map not available');
            }

            console.log('🎨 Initializing simple Deck.gl integration...');

            // Create simple Deck.gl instance
            this.deck = new window.deck.Deck({
                canvas: this.createOverlayCanvas(),
                width: '100%',
                height: '100%',
                initialViewState: this.getMapViewState(),
                controller: false, // Let MapLibre handle controls
                
                // Sync with MapLibre GL
                onViewStateChange: ({ viewState }) => {
                    // Optional: sync changes back to MapLibre if needed
                }
            });

            // Sync view state with MapLibre GL
            this.setupViewStateSync();

            this.isInitialized = true;
            console.log('✅ Simple Deck.gl integration initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize simple Deck.gl integration:', error);
            throw error;
        }
    }

    /**
     * Wait for Deck.gl to be fully loaded
     */
    async waitForDeckGL(timeout = 5000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (typeof window.deck !== 'undefined' && window.deck.Deck && window.deck.BitmapLayer) {
                console.log('✅ Deck.gl is ready');
                return true;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Timeout waiting for Deck.gl to load');
    }

    /**
     * Create overlay canvas for Deck.gl
     */
    createOverlayCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        
        // Append to map container
        const mapContainer = this.mapManager.getMap().getContainer();
        mapContainer.appendChild(canvas);
        
        return canvas;
    }

    /**
     * Get current view state from MapLibre GL
     */
    getMapViewState() {
        const map = this.mapManager.getMap();
        const center = map.getCenter();
        
        return {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
        };
    }

    /**
     * Setup bidirectional view state synchronization
     */
    setupViewStateSync() {
        const map = this.mapManager.getMap();

        // Sync from MapLibre to Deck.gl
        const syncToDeck = () => {
            if (this.deck) {
                this.deck.setProps({
                    viewState: this.getMapViewState()
                });
            }
        };

        // Listen to MapLibre events
        map.on('move', syncToDeck);
        map.on('zoom', syncToDeck);
        map.on('rotate', syncToDeck);
        map.on('pitch', syncToDeck);

        // Store cleanup function
        this.cleanupSync = () => {
            map.off('move', syncToDeck);
            map.off('zoom', syncToDeck);
            map.off('rotate', syncToDeck);
            map.off('pitch', syncToDeck);
        };
    }

    /**
     * Add STAC item as bitmap layer
     * @param {Object} item - STAC item
     * @param {string} assetKey - Asset key to visualize
     * @param {Object} options - Visualization options
     */
    async addStacItemLayer(item, assetKey = 'rendered_preview', options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log(`🎨 Adding STAC item layer: ${item.id} (${assetKey})`);

            // Remove existing layer
            this.removeStacLayer();

            const asset = item.assets?.[assetKey];
            if (!asset) {
                console.warn(`Asset '${assetKey}' not found in item ${item.id}`);
                return false;
            }

            // Get bounding box
            const bbox = this.mapManager.mapLayers.getBoundingBox(item);
            if (!bbox) {
                console.warn('No bounding box available for item');
                return false;
            }

            // Convert image URL to base64 to avoid CORS issues
            const imageData = await this.getImageAsBase64(asset.href);
            
            // Store blob URL for cleanup
            if (imageData && imageData.startsWith('blob:')) {
                this.currentBlobUrl = imageData;
            }

            // Create bitmap layer using global Deck.gl
            const layer = new window.deck.BitmapLayer({
                id: `stac-item-${item.id}`,
                image: imageData,
                bounds: [bbox[0], bbox[1], bbox[2], bbox[3]], // [west, south, east, north]
                
                // Enhanced rendering options
                opacity: options.opacity || 0.8,
                
                // Error handling
                onError: (error) => {
                    console.warn('🔄 Deck.gl image loading failed (CORS/network issue), falling back to MapLibre:', asset.href);
                    console.error('Error details:', error);
                    
                    // Remove the failed Deck.gl layer
                    this.removeStacLayer();
                    
                    // Fallback to MapLibre rendering
                    setTimeout(() => {
                        this.mapManager._displayItemOnMapLibre(item, assetKey);
                    }, 100);
                }
            });

            // Store current layer
            this.currentLayer = layer;

            // Update Deck.gl with the new layer
            this.deck.setProps({
                layers: [layer]
            });

            // Fit map to bounds (only if preserveViewport is not set)
            if (!options.preserveViewport) {
                this.mapManager.mapLayers.fitMapToBbox(bbox);
            } else {
                console.log('🔒 Preserving viewport - not centering/zooming to item');
            }

            console.log('✅ STAC layer added successfully with simple Deck.gl');
            return true;

        } catch (error) {
            console.error('❌ Failed to add STAC layer with simple Deck.gl:', error);
            // Fallback to MapLibre rendering
            return this.mapManager._displayItemOnMapLibre(item, assetKey);
        }
    }

    /**
     * Remove current STAC layer
     */
    removeStacLayer() {
        if (this.currentLayer) {
            // Clean up blob URLs to prevent memory leaks
            if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = null;
            }
            
            this.currentLayer = null;
            if (this.deck) {
                this.deck.setProps({ layers: [] });
            }
            console.log('🧹 Removed current STAC layer');
        }
    }

    /**
     * Set layer opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    setLayerOpacity(opacity) {
        if (this.currentLayer && this.deck) {
            const updatedLayer = this.currentLayer.clone({ opacity });
            this.currentLayer = updatedLayer;
            this.deck.setProps({ layers: [updatedLayer] });
        }
    }

    /**
     * Check if simple Deck.gl is available and initialized
     */
    isAvailable() {
        return this.isInitialized && this.deck && typeof window.deck !== 'undefined';
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        if (this.deck) {
            let webglContext = null;
            let isWebGL2 = false;
            
            try {
                // Try to get WebGL context if available
                if (this.deck.gl) {
                    webglContext = this.deck.gl;
                    isWebGL2 = webglContext instanceof WebGL2RenderingContext;
                } else if (this.deck.context && this.deck.context.gl) {
                    webglContext = this.deck.context.gl;
                    isWebGL2 = webglContext instanceof WebGL2RenderingContext;
                }
            } catch (error) {
                console.warn('Could not access WebGL context:', error);
            }
            
            return {
                layerCount: this.currentLayer ? 1 : 0,
                webglContext: webglContext,
                isWebGL2: isWebGL2,
                simple: true,
                deckInitialized: this.isInitialized,
                deckAvailable: typeof window.deck !== 'undefined'
            };
        }
        return {
            layerCount: 0,
            webglContext: null,
            isWebGL2: false,
            simple: true,
            deckInitialized: false,
            deckAvailable: typeof window.deck !== 'undefined'
        };
    }

    /**
     * Convert image URL to usable format for Deck.gl, avoiding CORS issues
     * @param {string} imageUrl - The image URL to convert
     * @returns {Promise<string|Blob>} Base64 data URL or blob URL
     */
    async getImageAsBase64(imageUrl) {
        try {
            console.log('🖼️ Converting image to avoid CORS:', imageUrl);
            
            // First try to fetch as blob (like LazyImageLoader does)
            const response = await fetch(imageUrl, {
                mode: 'cors',
                cache: 'force-cache'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                
                // Validate blob
                if (blob && blob.size > 0 && blob.type.startsWith('image/')) {
                    console.log('✅ Successfully fetched image as blob');
                    return URL.createObjectURL(blob);
                }
            }
            
            throw new Error('Fetch failed or invalid blob');
            
        } catch (fetchError) {
            console.warn('⚠️ Fetch failed, trying direct image loading with canvas conversion:', fetchError);
            
            // Fallback to canvas approach
            return new Promise((resolve) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        // Create canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Set canvas size to match image
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        
                        // Draw image to canvas
                        ctx.drawImage(img, 0, 0);
                        
                        // Convert to base64
                        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                        console.log('✅ Converted image to base64 via canvas');
                        resolve(dataURL);
                        
                    } catch (canvasError) {
                        console.warn('❌ Canvas conversion failed, using original URL:', canvasError);
                        resolve(imageUrl);
                    }
                };
                
                img.onerror = () => {
                    console.warn('❌ Direct image loading failed, using original URL');
                    resolve(imageUrl);
                };
                
                // Try without crossOrigin first
                img.src = imageUrl;
            });
        }
    }

    /**
     * Resize Deck.gl canvas
     */
    resize() {
        if (this.deck) {
            this.deck.setProps({
                width: '100%',
                height: '100%'
            });
        }
    }

    /**
     * Destroy simple Deck.gl integration
     */
    destroy() {
        if (this.cleanupSync) {
            this.cleanupSync();
        }

        // Clean up blob URLs
        if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }

        if (this.deck) {
            this.deck.finalize();
            this.deck = null;
        }

        this.currentLayer = null;
        this.isInitialized = false;

        console.log('🗑️ Simple Deck.gl integration destroyed');
    }
}

// Export for use in MapManager
export default SimpleDeckGLIntegration;