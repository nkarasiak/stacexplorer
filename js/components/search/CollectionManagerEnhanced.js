/**
 * CollectionManagerEnhanced.js - Enhanced component for managing STAC collections from all sources
 * Automatically loads collections from all configured data sources with cookie-based caching
 */

import {
  // getEnabledCollectionIds, // unused
  getCollectionEndpoints,
  // loadCollections, // unused
  loadAllCollections,
  // getCollectionName, // unused
} from '../../utils/CollectionConfig.js';
import { cookieCache } from '../../utils/CookieCache.js';
import { CollectionDetailsModal } from './CollectionDetailsModal.js';

export class CollectionManagerEnhanced {
  /**
   * Create a new CollectionManagerEnhanced
   * @param {Object} apiClient - STAC API client
   * @param {Object} notificationService - Notification service
   * @param {Object} catalogSelector - Catalog selector component
   * @param {Object} config - Application configuration object
   */
  constructor(apiClient, notificationService, catalogSelector, config) {
    this.apiClient = apiClient;
    this.notificationService = notificationService;
    this.catalogSelector = catalogSelector;
    this.config = config; // Store config reference to avoid timing issues
    this.collections = [];
    this.allCollections = []; // Store all collections from all sources
    this.selectedCollection = '';
    this.isLoading = false;

    // Initialize collection details modal
    this.collectionDetailsModal = new CollectionDetailsModal(
      this.apiClient,
      this.notificationService
    );

    // Initialize event listeners
    this.initEventListeners();

    // Setup collection info button
    this.setupCollectionInfoButton();

    // Setup catalog toggle listener
    this.setupCatalogToggleListener();

    // Auto-load collections from all sources on startup - defer to manual call
    // this.loadAllCollectionsOnStartup();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Collection selection change
    const collectionSelect = document.getElementById('collection-select');
    if (collectionSelect) {
      collectionSelect.addEventListener('change', event => {
        this.handleCollectionSelection(event.target.value);
      });
    }

    // Listen for collections updated event (from catalog selector)
    document.addEventListener('collectionsUpdated', event => {
      if (event.detail?.collections) {
        // This is for backward compatibility with the old system
      }
    });

    // Listen for refresh collections event (from custom catalog addition)
    document.addEventListener('refreshCollections', async () => {
      await this.loadAllCollectionsOnStartup();
    });

    // Listen for settings changed event (from settings panel/page)
    document.addEventListener('settingsChanged', async _event => {
      await this.loadAllCollectionsOnStartup();
    });
  }

  /**
   * Setup catalog toggle listener to reload collections when settings change
   */
  setupCatalogToggleListener() {
    document.addEventListener('catalogToggled', _event => {
      // Reload collections with new settings
      this.loadAllCollectionsOnStartup();
    });
  }

  /**
   * Get collection display name for UI
   */
  getCollectionDisplayName(source) {
    const displayNames = {
      'cdse-stac': 'Copernicus Data Space',
      'earth-search-aws': 'AWS Earth Search',
      'microsoft-pc': 'Microsoft Planetary Computer',
      planetlabs: 'Planet Labs',
      gee: 'Google Earth Engine',
    };

    // Handle custom catalogs by checking localStorage
    if (source === 'custom-catalog') {
      try {
        const customCatalogData = localStorage.getItem('stacExplorer-customCatalog');
        if (customCatalogData) {
          const customCatalog = JSON.parse(customCatalogData);
          return customCatalog.name || 'Custom Catalog';
        }
      } catch (error) {
        console.warn('Error reading custom catalog name:', error);
      }
      return 'Custom Catalog';
    }

    return displayNames[source] || source;
  }

  /**
   * Get enabled catalogs from localStorage settings
   */
  async getEnabledCatalogs() {
    const collections = await loadAllCollections(); // Use loadAllCollections to include custom catalogs
    const enabledCatalogs = [];

    // Check if we have settings in the new format (stacExplorerSettings)
    let enabledProvidersFromSettings = null;
    try {
      const savedSettings = localStorage.getItem('stacExplorerSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.enabledProviders && Array.isArray(settings.enabledProviders)) {
          enabledProvidersFromSettings = settings.enabledProviders;
        }
      }
    } catch (error) {
      console.warn('Error parsing settings:', error);
    }

    collections.forEach(collection => {
      const catalogKey = collection.id;

      let isEnabled;

      // Check settings in priority order:
      // 1. New format (stacExplorerSettings.enabledProviders)
      // 2. Old format (individual catalog-${catalogKey}-enabled keys)
      // 3. Default state from collection config
      if (enabledProvidersFromSettings !== null) {
        // Use new settings format - this overrides any config defaults
        isEnabled = enabledProvidersFromSettings.includes(catalogKey);
      } else {
        // Fall back to old format
        const savedState = localStorage.getItem(`catalog-${catalogKey}-enabled`);
        const defaultState = collection.enabled !== false;
        isEnabled = savedState !== null ? savedState === 'true' : defaultState;
      }

      if (isEnabled) {
        enabledCatalogs.push(catalogKey);
      }
    });

    return enabledCatalogs;
  }

  /**
   * Load collections from all sources on startup with caching
   */
  async loadAllCollectionsOnStartup() {
    try {
      this.showLoadingState();

      // Debug: Check localStorage contents

      // Generate cache key based on enabled catalogs from settings
      const dataSources = await this.getEnabledCatalogs();

      // If no catalogs are enabled, clear collections and return
      if (dataSources.length === 0) {
        this.allCollections = [];
        this.notificationService.showNotification(
          'ℹ️ No catalogs enabled - collections cleared',
          'info'
        );
        this.hideLoadingState();
        return [];
      }

      const cacheKey = `collections_cache_${dataSources.sort().join('_')}`;

      // Try to load from cache first
      const cachedCollections = cookieCache.get(cacheKey);

      if (cachedCollections && Array.isArray(cachedCollections) && cachedCollections.length > 0) {
        this.allCollections = cachedCollections;
        this.collections = cachedCollections; // For backward compatibility
        this.populateCollectionSelect(cachedCollections);

        const groupedCollections = this.groupCollectionsBySource(cachedCollections);
        const sourceInfo = Object.keys(groupedCollections)
          .map(source => {
            const count = groupedCollections[source].length;
            const label = this.getCollectionDisplayName(source);
            return `${label}: ${count}`;
          })
          .join(', ');

        this.notificationService.showNotification(
          `📦 Loaded ${cachedCollections.length} collections from cache! (${sourceInfo})`,
          'success'
        );

        // Emit collections loaded event
        document.dispatchEvent(
          new CustomEvent('collectionsLoaded', {
            detail: { collections: cachedCollections, fromCache: true },
          })
        );

        this.hideLoadingState();

        // Optional: Load fresh data in background to update cache
        // Temporarily disabled to ensure cache loading works properly
        // this.refreshCacheInBackground(cacheKey);
        return;
      }

      // Cache miss - load fresh data
      const allCollections = await this.loadAllCollections();

      if (allCollections.length > 0) {
        // Cache only essential collection data to avoid size issues
        const minimalCollections = allCollections.map(collection => ({
          id: collection.id,
          title: collection.title,
          source: collection.source,
          sourceLabel: collection.sourceLabel,
          displayTitle: collection.displayTitle, // Include displayTitle for UI compatibility
        }));
        cookieCache.set(cacheKey, minimalCollections, 30);

        this.allCollections = allCollections;
        this.collections = allCollections; // For backward compatibility
        this.populateCollectionSelect(allCollections);

        // Group collections by source for the notification
        const groupedCollections = this.groupCollectionsBySource(allCollections);
        const sourceInfo = Object.keys(groupedCollections)
          .map(source => {
            const count = groupedCollections[source].length;
            const label = this.getCollectionDisplayName(source);
            return `${label}: ${count}`;
          })
          .join(', ');

        this.notificationService.showNotification(
          `🎉 Loaded ${allCollections.length} collections! (${sourceInfo})`,
          'success'
        );

        // Emit collections loaded event
        document.dispatchEvent(
          new CustomEvent('collectionsLoaded', {
            detail: { collections: allCollections, fromCache: false },
          })
        );

        this.hideLoadingState();
      } else {
        this.showNoCollectionsState();
        this.hideLoadingState();
        this.notificationService.showNotification(
          '⚠️ No collections could be loaded from any data source - check console for details',
          'warning'
        );
      }
    } catch (error) {
      console.error('❌ Error auto-loading collections:', error);
      this.showErrorState();
      this.hideLoadingState();
      this.notificationService.showNotification(
        `Error loading collections: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * Load collections from all available data sources
   * @returns {Promise<Array>} Combined collections from all sources
   */
  async loadAllCollections() {
    // Get enabled catalogs from settings
    const dataSources = await this.getEnabledCatalogs();

    // If no catalogs are enabled, return empty array
    if (dataSources.length === 0) {
      return [];
    }

    const errors = [];

    // Create loading promises for all sources in parallel to avoid race conditions
    const loadingPromises = dataSources.map(async source => {
      try {
        // Get endpoints for this source from collections.json
        const endpoints = await getCollectionEndpoints(source);
        if (!endpoints) {
          const error = `No endpoints configured for ${source}`;
          console.warn(`⚠️ ${error}`);
          errors.push(error);
          return { source, collections: [], error };
        }

        // Test if endpoints are valid URLs (skip for catalog-type collections)
        if (endpoints.type !== 'catalog' && endpoints.collections) {
          try {
            new URL(endpoints.collections);
          } catch {
            const error = `Invalid collections URL for ${source}: ${endpoints.collections}`;
            console.error(`❌ ${error}`);
            errors.push(error);
            return { source, collections: [], error };
          }
        }

        // Create a new API client instance for this source to avoid conflicts
        const sourceApiClient = Object.create(this.apiClient);
        sourceApiClient.setEndpoints(endpoints);

        // For catalog-type collections, connect to catalog first
        if (endpoints.type === 'catalog') {
          await sourceApiClient.connectToCustomCatalog(endpoints.root);
        }

        // Fetch collections from this source with increased limit
        const collections = await sourceApiClient.fetchCollections(500);

        if (collections && collections.length > 0) {
          // Add source information to each collection
          const collectionsWithSource = collections.map(collection => ({
            ...collection,
            source: source,
            sourceLabel: this.getCollectionDisplayName(source),
            displayTitle: `${collection.title || collection.id} (${this.getCollectionDisplayName(source)})`,
          }));

          return { source, collections: collectionsWithSource, error: null };
        } else {
          const error = `No collections returned from ${source} (got: ${JSON.stringify(collections)})`;
          console.warn(`⚠️ ${error}`);
          errors.push(error);
          return { source, collections: [], error };
        }
      } catch (error) {
        const errorMsg = `${source}: ${error.message}`;
        console.error(`❌ Error loading collections from ${source}:`, error);
        console.error(`❌ Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
        errors.push(errorMsg);
        return { source, collections: [], error: errorMsg };
      }
    });

    // Wait for all sources to complete before processing results
    const results = await Promise.allSettled(loadingPromises);

    // Combine all successful results
    const allCollections = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.collections.length > 0) {
        allCollections.push(...result.value.collections);
      } else if (result.status === 'rejected') {
        const source = dataSources[index];
        console.error(`❌ Failed to load collections from ${source}:`, result.reason);
        errors.push(`${source}: ${result.reason.message}`);
      }
    });

    if (errors.length > 0) {
      console.error('❌ Collection loading errors:', errors);
    }

    if (allCollections.length === 0) {
      console.error('🚨 NO COLLECTIONS LOADED FROM ANY SOURCE!');
      console.error('🔍 Debug info:', {
        configExists: !!this.config,
        endpointsExist: !!this.config?.stacEndpoints,
        availableSources: Object.keys(this.config?.stacEndpoints || {}),
        errors: errors,
      });
    }

    return allCollections;
  }

  /**
   * Handle collection selection
   * @param {string} collectionId - Selected collection ID
   */
  async handleCollectionSelection(collectionId) {
    this.selectedCollection = collectionId;

    // Trigger tutorial event for collection selection
    document.dispatchEvent(
      new CustomEvent('collection-selected', {
        detail: { collectionId },
      })
    );

    let source = null;

    if (collectionId) {
      // Get the source from the selected option
      const collectionSelect = document.getElementById('collection-select');
      const selectedOption = collectionSelect?.selectedOptions[0];
      source = selectedOption?.dataset.source;

      // Find the collection by ID and source
      const collection = this.getCollectionById(collectionId, source);
      if (collection?.source) {
        // Automatically set the catalog selector to match the collection's source
        const catalogSelect = document.getElementById('catalog-select');
        if (catalogSelect && catalogSelect.value !== collection.source) {
          catalogSelect.value = collection.source;

          // Update the API client to use the correct endpoints
          const endpoints = await getCollectionEndpoints(collection.source);
          if (endpoints) {
            this.apiClient.setEndpoints(endpoints);
          }
        }

        // Check if this is a DEM collection and auto-set time to "Anytime"
        this.checkAndSetDEMTimeSettings(collection);
      }
    }
  }

  /**
   * Check if the selected collection is a DEM and automatically set time to "Anytime"
   * @param {Object} collection - The selected collection object
   */
  checkAndSetDEMTimeSettings(collection) {
    if (!collection) {
      return;
    }

    // Check if this is a DEM collection based on ID, title, or keywords
    const isDEM = this.isDEMCollection(collection);

    if (isDEM) {
      // Clear date inputs to set "Anytime"
      const startInput = document.getElementById('date-start');
      const endInput = document.getElementById('date-end');

      if (startInput) {
        startInput.value = '';
      }
      if (endInput) {
        endInput.value = '';
      }

      // Update the search summary interface to show "Anytime"
      const timeValue = document.querySelector('#summary-date .search-summary-value');
      if (timeValue) {
        timeValue.textContent = '🕐 Anytime';
      }

      // Update inline dropdown manager state if available
      if (window.inlineDropdownManager?.aiSearchHelper) {
        window.inlineDropdownManager.aiSearchHelper.selectedDate = {
          type: 'anytime',
          start: null,
          end: null,
        };
      }

      // Trigger change events to update any dependent UI components
      if (startInput) {
        startInput.dispatchEvent(new Event('change'));
      }
      if (endInput) {
        endInput.dispatchEvent(new Event('change'));
      }
    }
  }

  /**
   * Determine if a collection is a DEM (Digital Elevation Model) based on its metadata
   * @param {Object} collection - The collection object
   * @returns {boolean} True if this is a DEM collection
   */
  isDEMCollection(collection) {
    if (!collection) {
      return false;
    }

    const id = collection.id?.toLowerCase() || '';
    const title = collection.title?.toLowerCase() || '';
    const description = collection.description?.toLowerCase() || '';
    const keywords = collection.keywords ? collection.keywords.join(' ').toLowerCase() : '';

    // Common DEM identifiers
    const demKeywords = [
      'dem',
      'elevation',
      'altitude',
      'height',
      'topography',
      'terrain',
      'digital elevation model',
      'dtm',
      'dsm',
      'digital terrain model',
      'digital surface model',
      'srtm',
      'aster gdem',
      'copernicus dem',
      'alos palsar',
      'tandem-x',
    ];

    // Check if any DEM keywords match the collection metadata
    return demKeywords.some(
      keyword =>
        id.includes(keyword) ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        keywords.includes(keyword)
    );
  }

  /**
   * Populate collection select dropdown with all collections
   * @param {Array} collections - Array of collection objects
   */
  populateCollectionSelect(collections) {
    const select = document.getElementById('collection-select');
    if (!select) {
      console.error('❌ Collection select element not found');
      return;
    }

    select.innerHTML = '';

    if (collections.length === 0) {
      select.innerHTML = '<option value="">No collections available</option>';
      return;
    }

    // Add default option
    select.innerHTML = '<option value="">All collections</option>';

    // Group collections by source for better organization
    const groupedCollections = this.groupCollectionsBySource(collections);

    // Add collections grouped by source
    Object.keys(groupedCollections).forEach(source => {
      const sourceLabel =
        source === 'copernicus' ? 'Copernicus' : source === 'element84' ? 'Element84' : source;

      // Create optgroup for this source
      const optgroup = document.createElement('optgroup');
      optgroup.label = `📡 ${sourceLabel}`;

      // Add collections for this source
      groupedCollections[source].forEach(collection => {
        const option = document.createElement('option');
        option.value = collection.id;
        option.textContent = collection.title || collection.id;
        option.dataset.source = collection.source;
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });

    // Reset selection
    this.selectedCollection = '';

    // Notify filter system of collection changes
    document.dispatchEvent(
      new CustomEvent('collectionsChanged', {
        detail: {
          collections: collections,
          count: collections.length,
        },
      })
    );
  }

  /**
   * Group collections by source
   * @param {Array} collections - Array of collections
   * @returns {Object} Collections grouped by source
   */
  groupCollectionsBySource(collections) {
    return collections.reduce((groups, collection) => {
      const source = collection.source || 'unknown';
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(collection);
      return groups;
    }, {});
  }

  /**
   * Show loading state in the dropdown
   */
  showLoadingState() {
    const select = document.getElementById('collection-select');
    if (select) {
      select.innerHTML = '<option value="">🔄 Loading collections from all sources...</option>';
    }
    this.isLoading = true;

    // Emit loading started event
    document.dispatchEvent(new CustomEvent('collectionsLoadingStarted'));
  }

  /**
   * Show no collections state
   */
  showNoCollectionsState() {
    const select = document.getElementById('collection-select');
    if (select) {
      select.innerHTML = '<option value="">⚠️ No collections available</option>';
    }
    this.isLoading = false;
  }

  /**
   * Show error state
   */
  showErrorState() {
    const select = document.getElementById('collection-select');
    if (select) {
      select.innerHTML = '<option value="">❌ Error loading collections</option>';
    }
    this.isLoading = false;
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    this.isLoading = false;

    // Emit loading finished event
    document.dispatchEvent(new CustomEvent('collectionsLoadingFinished'));
  }

  /**
   * Get the selected collection ID
   * @returns {string} Selected collection ID or empty string if none selected
   */
  getSelectedCollection() {
    const select = document.getElementById('collection-select');
    return select ? select.value : '';
  }

  /**
   * Set the selected collection (for integration with AI Smart Search)
   * @param {string} collectionId - Collection ID to select
   * @param {string} source - Source of the collection
   */
  async setSelectedCollection(collectionId, source = null) {
    const select = document.getElementById('collection-select');
    if (select) {
      select.value = collectionId;
      this.selectedCollection = collectionId;

      // If source is provided, also set the catalog selector
      if (source) {
        const catalogSelect = document.getElementById('catalog-select');
        if (catalogSelect) {
          catalogSelect.value = source;

          // Update API client endpoints
          const endpoints = await getCollectionEndpoints(source);
          if (endpoints) {
            this.apiClient.setEndpoints(endpoints);
          }
        }
      }

      // Trigger change event
      select.dispatchEvent(new Event('change'));
    }
  }

  /**
   * Get collection by ID and optionally by source
   * @param {string} collectionId - Collection ID
   * @param {string} source - Optional source to filter by
   * @returns {Object|null} Collection object or null if not found
   */
  getCollectionById(collectionId, source = null) {
    if (source) {
      // Find collection by both ID and source
      return (
        this.allCollections.find(
          collection => collection.id === collectionId && collection.source === source
        ) || null
      );
    } else {
      // Fallback to first match by ID only (for backward compatibility)
      return this.allCollections.find(collection => collection.id === collectionId) || null;
    }
  }

  /**
   * Reset collection selection
   */
  resetSelection() {
    this.selectedCollection = '';
    const select = document.getElementById('collection-select');
    if (select) {
      select.value = '';
    }
  }

  /**
   * Get all collections from all sources
   * @returns {Array} All collections
   */
  getAllCollections() {
    return this.allCollections;
  }

  /**
   * Check if collections are currently loading
   * @returns {boolean} True if loading
   */
  isLoadingCollections() {
    return this.isLoading;
  }

  /**
   * Setup the collection info button event listener
   */
  setupCollectionInfoButton() {
    const infoBtn = document.getElementById('collection-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        this.showSelectedCollectionDetails();
      });
    } else {
      console.warn('⚠️ Collection info button not found');
    }
  }

  /**
   * Show details for the currently selected collection
   */
  showSelectedCollectionDetails() {
    const selectedCollectionId = this.getSelectedCollection();

    if (!selectedCollectionId) {
      this.notificationService.showNotification('Please select a collection first', 'info');
      return;
    }

    // Get the source from the selected option to ensure correct collection
    const collectionSelect = document.getElementById('collection-select');
    const selectedOption = collectionSelect?.selectedOptions[0];
    const source = selectedOption?.dataset.source;

    const collection = this.getCollectionById(selectedCollectionId, source);
    if (collection) {
      this.collectionDetailsModal.showCollection(collection);
    } else {
      this.notificationService.showNotification('Collection details not available', 'error');
    }
  }

  /**
   * Refresh cache in background without blocking UI
   * @param {string} cacheKey - Cache key to refresh
   */
  refreshCacheInBackground(cacheKey) {
    try {
      // Load fresh data with a longer timeout to avoid conflicts
      setTimeout(async () => {
        try {
          const freshCollections = await this.loadAllCollections();
          if (freshCollections.length > 0) {
            // Update cache with minimal fresh data
            const minimalCollections = freshCollections.map(collection => ({
              id: collection.id,
              title: collection.title,
              source: collection.source,
              sourceLabel: collection.sourceLabel,
              displayTitle: collection.displayTitle,
            }));
            cookieCache.set(cacheKey, minimalCollections, 30);

            // Optionally update in-memory collections if they differ significantly
            if (Math.abs(freshCollections.length - this.allCollections.length) > 5) {
              this.allCollections = freshCollections;
              this.collections = freshCollections;
              this.populateCollectionSelect(freshCollections);
            }
          }
        } catch (error) {
          console.warn('⚠️ Background refresh failed:', error.message);
        }
      }, 5000); // Wait 5 seconds before background refresh
    } catch (error) {
      console.warn('⚠️ Error setting up background refresh:', error);
    }
  }

  /**
   * Clear collections cache (useful for debugging or forced refresh)
   */
  clearCache() {
    try {
      const dataSources = this.config?.appSettings?.enabledProviders || ['copernicus', 'element84'];
      const cacheKey = `collections_cache_${dataSources.sort().join('_')}`;

      cookieCache.remove(cacheKey);

      this.notificationService.showNotification(
        'Collections cache cleared - will reload fresh data on next visit',
        'info'
      );
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return cookieCache.getStats();
  }

  /**
   * Debug cache status - helps understand why cache might not be loading
   */
  debugCacheStatus() {
    const dataSources = this.config?.appSettings?.enabledProviders || ['copernicus', 'element84'];
    const cacheKey = `collections_cache_${dataSources.sort().join('_')}`;

    const cached = cookieCache.get(cacheKey);

    return cached;
  }

  /**
   * Force refresh collections (bypass cache)
   */
  async forceRefresh() {
    try {
      this.clearCache();

      this.showLoadingState();
      await this.loadAllCollectionsOnStartup();
    } catch (error) {
      console.error('❌ Error during force refresh:', error);
      this.notificationService.showNotification(`Error during refresh: ${error.message}`, 'error');
    }
  }
}
