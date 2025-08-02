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
      return await this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize(mapContainer, mapStyle);
    return await this.initializationPromise;
  }

  /**
   * Internal initialization method
   */
  async _doInitialize(mapContainer, _mapStyle) {
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

        container = element;
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
        attributionControl: false,
      });

      // Add attribution control
      this.map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

      // Add navigation controls
      this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

      await new Promise((resolve, reject) => {
        let resolved = false;

        this.map.on('load', () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        this.map.on('error', error => {
          console.warn('⚠️ Map style load error, trying fallback:', error);
          if (!resolved) {
            try {
              // Use fallback style when primary style fails
              const fallbackStyle = this.createFallbackStyle(this.currentTheme);
              this.map.setStyle(fallbackStyle);
              resolved = true;
              resolve();
            } catch (fallbackError) {
              console.error('❌ Fallback style also failed:', fallbackError);
              resolved = true;
              reject(fallbackError);
            }
          }
        });

        // Timeout after 10 seconds and try fallback
        setTimeout(() => {
          if (!resolved) {
            console.warn('⚠️ Map load timeout, trying fallback style...');
            try {
              const fallbackStyle = this.createFallbackStyle(this.currentTheme);
              this.map.setStyle(fallbackStyle);
              resolved = true;
              resolve();
            } catch (fallbackError) {
              console.error('❌ Fallback style failed:', fallbackError);
              resolved = true;
              reject(new Error('Map load timeout and fallback failed - check network connection'));
            }
          }
        }, 10000); // Reduced timeout to 10 seconds
      });

      // Set up theme observer
      this.setupThemeObserver();

      // Set up URL parameter updates for map interactions
      this.setupMapURLUpdates();

      this.isInitialized = true;

      // Trigger custom event for other components
      window.dispatchEvent(
        new CustomEvent('mapManagerReady', {
          detail: { mapManager: this },
        })
      );
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
    // Try OpenStreetMap tiles first as they're more reliable
    const osmTiles =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    return {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            osmTiles.replace('{s}', 'a'),
            osmTiles.replace('{s}', 'b'),
            osmTiles.replace('{s}', 'c'),
            osmTiles.replace('{s}', 'd'),
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }

  /**
   * Create a simple fallback style that doesn't require external resources
   */
  createFallbackStyle(theme) {
    const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#f8f9fa';

    return {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': backgroundColor,
          },
        },
      ],
    };
  }

  /**
   * Set up observer for theme changes
   */
  setupThemeObserver() {
    // Listen for themeChange events from UIManager (more reliable)
    document.addEventListener('themeChange', event => {
      const newTheme = event.detail.themeMode;
      if (newTheme && newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        this.updateMapTheme(newTheme);
      }
    });

    // Also keep MutationObserver as fallback
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newTheme = document.documentElement.classList.contains('dark-theme')
            ? 'dark'
            : 'light';
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
      attributeFilter: ['class'],
    });
  }

  /**
   * Set up URL parameter updates for map interactions
   */
  setupMapURLUpdates() {
    if (!this.map) {
      return;
    }

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
        const isCleanCatalogCollectionPath = /\/viewer\/[^/]+\/[^/]+/.test(url.pathname);
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
    if (!this.map) {
      return;
    }

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
      window.dispatchEvent(
        new CustomEvent('mapStyleUpdated', {
          detail: { mapCore: this },
        })
      );
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
