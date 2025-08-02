/**
 * CatalogSelector.js - Component for selecting and connecting to STAC catalogs
 */

export class CatalogSelector {
  /**
   * Create a new CatalogSelector
   * @param {Object} apiClient - STAC API client
   * @param {Object} notificationService - Notification service
   * @param {Object} config - Configuration object with stacEndpoints
   */
  constructor(apiClient, notificationService, config = null) {
    this.apiClient = apiClient;
    this.notificationService = notificationService;
    this.config = config;
    this.currentCatalog = '';

    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Catalog selection change
    document.getElementById('catalog-select').addEventListener('change', event => {
      this.handleCatalogChange(event.target.value);
    });

    // Custom catalog connection
    document.getElementById('connect-catalog-btn').addEventListener('click', () => {
      this.connectToCustomCatalog();
    });

    // Show/hide custom catalog input based on selection
    document.getElementById('catalog-select').addEventListener('change', event => {
      const customCatalogContainer = document.getElementById('custom-catalog-container');
      customCatalogContainer.style.display = event.target.value === 'custom' ? 'block' : 'none';
    });
  }

  /**
   * Handle changing the STAC catalog
   * @param {string} catalogType - Type of catalog (local, copernicus, custom)
   * @param {number} retryCount - Internal retry counter to prevent infinite loops
   */
  async handleCatalogChange(catalogType, retryCount = 0) {
    try {
      // Show loading indicator
      document.getElementById('loading').style.display = 'flex';
      this.currentCatalog = catalogType;

      // If it's custom catalog, don't try to connect yet
      if (catalogType === 'custom') {
        document.getElementById('loading').style.display = 'none';
        return;
      }

      // Get endpoints from config - with defensive checks
      const config = window.stacExplorer?.config || this.config;
      if (!config || !config.stacEndpoints) {
        if (retryCount < 5) {
          console.warn(
            `Config not yet available for ${catalogType}, retrying in 100ms... (attempt ${retryCount + 1}/5)`
          );
          // Retry after a short delay to allow config to be set up
          setTimeout(() => this.handleCatalogChange(catalogType, retryCount + 1), 100);
          return;
        } else {
          throw new Error(
            'Configuration not available after multiple retries. Please refresh the page.'
          );
        }
      }

      const endpoints = config.stacEndpoints[catalogType];

      if (!endpoints) {
        throw new Error(`Unknown catalog type: ${catalogType}`);
      }

      // Check if this is a catalog type (like Planet) vs API type
      let collections;
      if (endpoints.type === 'catalog') {
        // For catalog types, use the root URL directly as a custom catalog
        await this.apiClient.connectToCustomCatalog(endpoints.root);
        collections = await this.apiClient.fetchCollections();
      } else {
        // For API types, use the traditional endpoints approach
        this.apiClient.setEndpoints(endpoints);
        collections = await this.apiClient.fetchCollections();
      }

      // Trigger collection updated event
      document.dispatchEvent(
        new CustomEvent('collectionsUpdated', {
          detail: { collections },
        })
      );

      // Show success notification
      this.notificationService.showNotification(`Connected to ${catalogType} catalog`, 'success');

      // Hide loading indicator
      document.getElementById('loading').style.display = 'none';

      // Dispatch catalog changed event to switch tabs
      document.dispatchEvent(
        new CustomEvent('catalogChanged', {
          detail: { catalogType },
        })
      );
    } catch (error) {
      console.error('Error changing catalog:', error);
      this.notificationService.showNotification(
        `Error connecting to ${catalogType} catalog: ${error.message}`,
        'error'
      );
      document.getElementById('loading').style.display = 'none';
    }
  }

  /**
   * Connect to a custom STAC catalog
   */
  async connectToCustomCatalog() {
    const customUrl = document.getElementById('custom-catalog-url').value.trim();

    if (!customUrl) {
      this.notificationService.showNotification('Please enter a valid STAC catalog URL', 'error');
      return;
    }

    try {
      // Show loading indicator
      document.getElementById('loading').style.display = 'flex';

      // Connect to custom catalog
      await this.apiClient.connectToCustomCatalog(customUrl);

      // Fetch collections
      const collections = await this.apiClient.fetchCollections();

      // Trigger collection updated event
      document.dispatchEvent(
        new CustomEvent('collectionsUpdated', {
          detail: { collections },
        })
      );

      // Show success notification
      this.notificationService.showNotification(
        `Connected to custom STAC catalog: ${customUrl}`,
        'success'
      );

      // Hide loading indicator
      document.getElementById('loading').style.display = 'none';

      // Dispatch catalog changed event to switch tabs
      document.dispatchEvent(
        new CustomEvent('catalogChanged', {
          detail: { catalogType: 'custom' },
        })
      );
    } catch (error) {
      console.error('Error connecting to custom catalog:', error);
      this.notificationService.showNotification(
        `Error connecting to custom catalog: ${error.message}`,
        'error'
      );
      document.getElementById('loading').style.display = 'none';
    }
  }

  /**
   * Get the current catalog type
   * @returns {string} Current catalog type
   */
  getCurrentCatalog() {
    return this.currentCatalog;
  }
}
