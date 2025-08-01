/**
 * MapManagerModular - Modular MapManager implementation
 *
 * Combines MapCore, MapDrawing, and MapLayers for complete map functionality
 * This is the new modular version that replaces the monolithic MapManager
 */

import { MapCore } from '../../core/map/MapCore.js';
import { MapDrawing } from '../../core/map/MapDrawing.js';
import { MapLayers } from '../../core/map/MapLayers.js';

export class MapManager {
  constructor(containerId, config) {
    this.config = config || {};

    // Initialize core modules
    this.mapCore = new MapCore(containerId, config);

    // Deck.gl integration
    this.deckGLIntegration = null;

    // Check user preference from localStorage, then config, default to true
    const userPreference = localStorage.getItem('stac-explorer-use-deckgl');
    if (userPreference !== null) {
      this.useDeckGL = userPreference === 'true';
    } else {
      this.useDeckGL = config?.performanceSettings?.useDeckGL !== false; // Default to true, check config
    }
  }

  /**
   * Initialize the map manager
   */
  async initialize(mapContainer, mapStyle) {
    await this.mapCore.initialize(mapContainer, mapStyle);

    // Initialize modules after core is ready
    this.mapDrawing = new MapDrawing(this.mapCore);
    this.mapLayers = new MapLayers(this.mapCore);

    // Initialize drawing functionality
    this.mapDrawing.initializeDrawing();
    this.mapDrawing.reinitializeAfterStyleChange();

    // Initialize Deck.gl integration if enabled
    if (this.useDeckGL) {
      await this.initializeDeckGL();
    }
  }

  /**
   * Initialize Deck.gl integration
   */
  async initializeDeckGL() {
    try {
      // Import SimpleDeckGLIntegration dynamically
      const { default: SimpleDeckGLIntegration } = await import('./SimpleDeckGLIntegration.js');

      // Create integration instance
      this.deckGLIntegration = new SimpleDeckGLIntegration(this);

      // Initialize
      await this.deckGLIntegration.initialize();
    } catch (error) {
      console.warn('⚠️ Failed to initialize Deck.gl, falling back to MapLibre only:', error);
      this.useDeckGL = false;
      this.deckGLIntegration = null;
    }
  }

  /**
   * Display item on map with Deck.gl acceleration (enhanced method)
   */
  async displayItemOnMap(item, preferredAssetKey = null, preserveViewport = false, options = {}) {
    // Check if map is initialized
    if (!this.mapLayers) {
      console.warn('MapManager not fully initialized yet');
      return;
    }

    // Pass preserveViewport in options for Deck.gl integration
    const deckOptions = { ...options, preserveViewport };

    // Try Deck.gl first if available
    if (this.deckGLIntegration?.isAvailable() && !options.forceMapLibre) {
      try {
        const success = await this.deckGLIntegration.addStacItemLayer(
          item,
          preferredAssetKey,
          deckOptions
        );

        if (success) {
          return;
        }
      } catch (error) {
        console.warn('⚠️ Deck.gl rendering failed, falling back to MapLibre:', error);
      }
    }

    // Fallback to MapLibre implementation
    await this._displayItemOnMapLibre(item, preferredAssetKey, preserveViewport);
  }

  /**
   * MapLibre display implementation with comprehensive CORS handling
   */
  async _displayItemOnMapLibre(item, preferredAssetKey = null, _preserveViewport = false) {
    try {
      // Check if mapLayers is initialized
      if (!this.mapLayers) {
        console.warn('MapLayers not initialized yet');
        return;
      }

      // Use the comprehensive displayItemOnMap method from MapLayers
      await this.mapLayers.displayItemOnMap(item, preferredAssetKey);
    } catch (error) {
      console.error('Error displaying item on map:', error);
    }
  }

  /**
   * Display item geometry/boundaries on map
   */
  displayItemGeometry(item) {
    if (!this.mapCore.isMapReady()) {
      throw new Error('Map not initialized');
    }

    try {
      // Clear any existing layers first
      this.mapLayers.removeCurrentLayer();
      this.mapLayers.clearAllThumbnails();

      // Get bounding box
      const bbox = this.mapLayers.getBoundingBox(item);
      if (!bbox) {
        console.warn('Item has no valid bbox or geometry');
        throw new Error('No geometry available for this item');
      }

      // Display the geometry
      this.mapLayers.addGeoJsonLayerWithoutTooltip(bbox, item);
      this.mapLayers.fitMapToBbox(bbox);
    } catch (error) {
      console.error('Error displaying item geometry:', error);
      throw error;
    }
  }

  // Delegate methods to appropriate modules

  /**
   * Start drawing a polygon
   */
  startDrawingPolygon(callback) {
    return this.mapDrawing.startDrawingPolygon(callback);
  }

  /**
   * Stop drawing mode
   */
  stopDrawing() {
    return this.mapDrawing.stopDrawing();
  }

  /**
   * Clear current drawing
   */
  clearDrawing() {
    return this.mapDrawing.clearDrawing();
  }

  /**
   * Clear all thumbnails
   */
  clearAllThumbnails() {
    return this.mapLayers.clearAllThumbnails();
  }

  /**
   * Remove current layer
   */
  removeCurrentLayer() {
    return this.mapLayers.removeCurrentLayer();
  }

  /**
   * Clear search bbox (used for location display)
   */
  clearSearchBbox() {
    if (this.mapLayers) {
      this.mapLayers.removeCurrentLayer();
    }
  }

  /**
   * Display bounding box on map with optional label
   */
  displayBboxOnMap(bbox, label = 'Location') {
    if (!this.mapCore.isMapReady()) {
      console.warn('⚠️ Map not ready for bbox display, waiting for initialization...');
      // Wait for map to be ready and retry
      const waitForMap = () => {
        if (this.mapCore.isMapReady()) {
          this.displayBboxOnMap(bbox, label);
        } else {
          setTimeout(waitForMap, 100);
        }
      };
      setTimeout(waitForMap, 100);
      return;
    }

    if (!bbox || bbox.length !== 4) {
      console.error('❌ Invalid bbox provided:', bbox);
      return;
    }

    try {
      // Clear any existing layers
      this.mapLayers.removeCurrentLayer();

      // Create a mock item with the bbox for the layer method
      const mockItem = {
        id: 'location-preview',
        properties: {
          title: label,
          description: 'Location preview',
        },
        bbox: bbox,
      };

      // Add the boundary visualization
      this.mapLayers.addGeoJsonLayerWithoutTooltip(bbox, mockItem);

      // Fit map to the bbox
      this.mapLayers.fitMapToBbox(bbox);
    } catch (error) {
      console.error('❌ Error displaying bbox on map:', error);
    }
  }

  /**
   * Fit map to layer bounds
   */
  fitToLayerBounds() {}

  /**
   * Get the map instance
   */
  getMap() {
    return this.mapCore.getMap();
  }

  /**
   * Check if map is ready
   */
  isMapReady() {
    return this.mapCore.isMapReady();
  }

  /**
   * Auto-initialize with common container names
   */
  autoInitialize() {
    return this.mapCore.autoInitialize();
  }

  /**
   * Resize the map
   */
  resize() {
    return this.mapCore.resize();
  }

  /**
   * Start drawing bounding box
   */
  startDrawingBbox(callback) {
    if (this.mapDrawing) {
      return this.mapDrawing.startDrawingBbox(callback);
    } else {
      console.warn('MapDrawing not initialized');
    }
  }

  /**
   * Destroy the map instance
   */
  destroy() {
    if (this.mapDrawing) {
      this.mapDrawing.stopDrawing();
    }
    if (this.mapLayers) {
      this.mapLayers.clearAllThumbnails();
    }
    return this.mapCore.destroy();
  }
}

// Singleton instance for global access (maintaining backward compatibility)
let mapManagerInstance = null;

export function getMapManager() {
  return mapManagerInstance;
}

export function setMapManager(instance) {
  mapManagerInstance = instance;
}
