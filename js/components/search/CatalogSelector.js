/**
 * CatalogSelector.js - Component for selecting and connecting to STAC catalogs
 */

export class CatalogSelector {
    /**
     * Create a new CatalogSelector
     * @param {Object} apiClient - STAC API client 
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, notificationService) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.currentCatalog = 'copernicus';
        
        // Initialize event listeners
        this.initEventListeners();

        // Trigger initial catalog load
        setTimeout(() => {
            this.handleCatalogChange('copernicus');
        }, 100);
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Catalog selection change
        document.getElementById('catalog-select').addEventListener('change', (event) => {
            this.handleCatalogChange(event.target.value);
        });
        
        // Custom catalog connection
        document.getElementById('connect-catalog-btn').addEventListener('click', () => {
            this.connectToCustomCatalog();
        });
        
        // Show/hide custom catalog input based on selection
        document.getElementById('catalog-select').addEventListener('change', (event) => {
            const customCatalogContainer = document.getElementById('custom-catalog-container');
            customCatalogContainer.style.display = event.target.value === 'custom' ? 'block' : 'none';
        });
    }
    
    /**
     * Handle changing the STAC catalog
     * @param {string} catalogType - Type of catalog (local, copernicus, custom)
     */
    async handleCatalogChange(catalogType) {
        try {
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            this.currentCatalog = catalogType;
            
            // If it's custom catalog, don't try to connect yet
            if (catalogType === 'custom') {
                document.getElementById('loading').style.display = 'none';
                return;
            }
            
            // Get endpoints from config
            let endpoints = window.stacExplorer.config.stacEndpoints[catalogType];
            
            if (!endpoints) {
                throw new Error(`Unknown catalog type: ${catalogType}`);
            }
            
            // Update API client endpoints
            this.apiClient.setEndpoints(endpoints);
            
            // Fetch collections
            const collections = await this.apiClient.fetchCollections();
            
            // Trigger collection updated event
            document.dispatchEvent(new CustomEvent('collectionsUpdated', { 
                detail: { collections }
            }));
            
            // Show success notification
            this.notificationService.showNotification(`Connected to ${catalogType} catalog`, 'success');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';

            // Dispatch catalog changed event to switch tabs
            document.dispatchEvent(new CustomEvent('catalogChanged', {
                detail: { catalogType }
            }));
        } catch (error) {
            console.error('Error changing catalog:', error);
            this.notificationService.showNotification(`Error connecting to ${catalogType} catalog: ${error.message}`, 'error');
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
            document.dispatchEvent(new CustomEvent('collectionsUpdated', { 
                detail: { collections }
            }));
            
            // Show success notification
            this.notificationService.showNotification(`Connected to custom STAC catalog: ${customUrl}`, 'success');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';

            // Dispatch catalog changed event to switch tabs
            document.dispatchEvent(new CustomEvent('catalogChanged', {
                detail: { catalogType: 'custom' }
            }));
        } catch (error) {
            console.error('Error connecting to custom catalog:', error);
            this.notificationService.showNotification(`Error connecting to custom catalog: ${error.message}`, 'error');
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