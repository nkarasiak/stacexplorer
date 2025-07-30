/**
 * MapCore - Core map initialization and management
 * Handles basic map setup, theme management, and lifecycle
 */

export class MapCore {
    constructor(containerId, config) {
        this.map = null;
        this.config = config || {};
        this.containerId = containerId;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.currentTheme = 'dark'; // Default theme
    }

    /**
     * Initialize the map manager
     */
    async initialize(mapContainer, mapStyle) {
        if (this.isInitialized) {
            return;
        }

        // If already initializing, return the same promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize(mapContainer, mapStyle);
        return this.initializationPromise;
    }

    /**
     * Internal initialization method
     */
    async _doInitialize(mapContainer, mapStyle) {
        try {
            // Ensure mapContainer is a string or element
            let container = mapContainer || this.containerId;
            if (typeof container === 'string') {
                const element = document.getElementById(container);
                if (!element) {
                    throw new Error(`Map container element '${container}' not found`);
                }
                
                // Check if this element already has a map and clean it up
                if (element._maplibregl_map) {
                    console.warn('🧽 Cleaning up existing map instance on container:', container);
                    const existingMap = element._maplibregl_map;
                    existingMap.remove();
                    // Small delay to ensure cleanup completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                container = container;
            }

            // Detect current theme - check saved preference first, then default to light
            const savedTheme = localStorage.getItem('stac-explorer-theme');
            if (savedTheme) {
                this.currentTheme = savedTheme;
            } else {
                // Default to light theme to match UIManager default
                this.currentTheme = 'light';
            }
            
            // Get the appropriate map style based on theme
            const styleUrl = this.getMapStyle(this.currentTheme);

            // Initialize MapLibre GL map with proper config defaults
            const defaultCenter = [52.5, 28.5]; // Middle East / Central Asia region
            const defaultZoom = 2.5;
            
            this.map = new maplibregl.Map({
                container: container,
                style: styleUrl,
                center: this.config.mapSettings?.defaultCenter || defaultCenter,
                zoom: this.config.mapSettings?.defaultZoom || defaultZoom,
                attributionControl: false
            });

            // Add attribution control
            this.map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

            // Add navigation controls
            this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

            await new Promise((resolve, reject) => {
                this.map.on('load', () => {
                    resolve();
                });
                this.map.on('error', (error) => {
                    console.error('❌ Map load error:', error);
                    reject(error);
                });
                
                // Timeout after 30 seconds with more descriptive error
                setTimeout(() => {
                    console.error('❌ Map load timeout - check network connection and map style URL');
                    reject(new Error('Map load timeout - check network connection and map style URL'));
                }, 30000);
            });

            // Set up theme observer
            this.setupThemeObserver();
            
            // Set up URL parameter updates for map interactions
            this.setupMapURLUpdates();

            this.isInitialized = true;
            
            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('mapManagerReady', { 
                detail: { mapManager: this } 
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize MapCore:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Get the map style URL based on theme
     */
    getMapStyle(theme) {
        // If using configuration with tile-based maps
        if (this.config.mapSettings?.basemapOptions) {
            // For tile-based maps, we need to create a MapLibre style object
            const basemapOption = theme === 'dark' 
                ? this.config.mapSettings.basemapOptions.Dark 
                : this.config.mapSettings.basemapOptions.Light;
            
            if (basemapOption) {
                return {
                    version: 8,
                    sources: {
                        'carto-tiles': {
                            type: 'raster',
                            tiles: [basemapOption.url.replace('{s}', 'a')],
                            tileSize: 256,
                            attribution: basemapOption.attribution
                        }
                    },
                    layers: [{
                        id: 'carto-tiles-layer',
                        type: 'raster',
                        source: 'carto-tiles',
                        minzoom: 0,
                        maxzoom: 22
                    }]
                };
            }
        }
        
        // Fallback to vector styles with backup options
        if (theme === 'dark') {
            return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
        } else {
            return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        }
    }

    /**
     * Create a simple fallback style that doesn't require external resources
     */
    createFallbackStyle(theme) {
        const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#f8f9fa';
        
        return {
            version: 8,
            sources: {},
            layers: [{
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': backgroundColor
                }
            }]
        };
    }

    /**
     * Set up observer for theme changes
     */
    setupThemeObserver() {
        // Listen for themeChange events from UIManager (more reliable)
        document.addEventListener('themeChange', (event) => {
            const newTheme = event.detail.themeMode;
            if (newTheme && newTheme !== this.currentTheme) {
                this.currentTheme = newTheme;
                this.updateMapTheme(newTheme);
            }
        });

        // Also keep MutationObserver as fallback
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const newTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
                    if (newTheme !== this.currentTheme) {
                        this.currentTheme = newTheme;
                        this.updateMapTheme(newTheme);
                    }
                }
            });
        });

        // Start observing
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    /**
     * Set up URL parameter updates for map interactions
     */
    setupMapURLUpdates() {
        if (!this.map) return;
        
        // Debounce URL updates to avoid too many calls
        let updateTimeout;
        const debounceMs = 300; // Wait 300ms after last interaction
        
        const updateMapURL = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const center = this.map.getCenter();
                const zoom = this.map.getZoom();
                
                // Update URL parameters
                const url = new URL(window.location);
                
                // Remove cn parameter if we're in catalog/collection view (clean URL structure)
                const isCleanCatalogCollectionPath = /\/viewer\/[^\/]+\/[^\/]+/.test(url.pathname);
                if (isCleanCatalogCollectionPath && url.searchParams.has('cn')) {
                    url.searchParams.delete('cn');
                }
                
                url.searchParams.set('mapCenter', `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
                url.searchParams.set('mapZoom', zoom.toFixed(2));
                
                // Update URL without refreshing the page
                window.history.replaceState({}, '', url);
                
            }, debounceMs);
        };
        
        // Listen for map move events (pan and zoom)
        this.map.on('moveend', updateMapURL);
        this.map.on('zoomend', updateMapURL);
    }

    /**
     * Update map theme
     */
    updateMapTheme(theme) {
        if (!this.map) return;
        
        const styleUrl = this.getMapStyle(theme);
        
        // Save current viewport
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const bearing = this.map.getBearing();
        const pitch = this.map.getPitch();
        
        // Update style
        this.map.setStyle(styleUrl);
        
        // Restore viewport after style loads
        this.map.once('style.load', () => {
            this.map.setCenter(center);
            this.map.setZoom(zoom);
            this.map.setBearing(bearing);
            this.map.setPitch(pitch);
            
            // Trigger event for other modules to reinitialize
            window.dispatchEvent(new CustomEvent('mapStyleUpdated', { 
                detail: { mapCore: this } 
            }));
        });
    }

    /**
     * Auto-initialize with common container names
     */
    async autoInitialize() {
        const commonContainerIds = ['map', 'mapContainer', 'main-map', 'stac-map'];
        
        for (const containerId of commonContainerIds) {
            const element = document.getElementById(containerId);
            if (element) {
                try {
                    await this.initialize(containerId);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Failed to initialize with container ${containerId}:`, error);
                    continue;
                }
            }
        }
        
        console.error('❌ No suitable map container found. Tried:', commonContainerIds);
        return false;
    }

    /**
     * Get the map instance
     */
    getMap() {
        return this.map;
    }

    /**
     * Check if map is ready
     */
    isMapReady() {
        return this.isInitialized && this.map && this.map.loaded();
    }

    /**
     * Resize the map
     */
    resize() {
        if (this.map && this.isInitialized) {
            this.map.resize();
        }
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.isInitialized = false;
            this.initializationPromise = null;
        }
    }
}