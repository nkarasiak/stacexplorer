/**
 * CollectionManager.js - Component for managing STAC collections
 */

export class CollectionManager {
    /**
     * Create a new CollectionManager
     * @param {Object} apiClient - STAC API client 
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, notificationService) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.collections = [];
        this.selectedCollection = '';
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Collection selection change
        document.getElementById('collection-select').addEventListener('change', (event) => {
            this.selectedCollection = event.target.value;
        });
        
        // Listen for collections updated event
        document.addEventListener('collectionsUpdated', (event) => {
            if (event.detail && event.detail.collections) {
                this.populateCollectionSelect(event.detail.collections);
            }
        });
    }
    
    /**
     * Populate collection select dropdown
     * @param {Array} collections - Array of collection objects
     */
    populateCollectionSelect(collections) {
        this.collections = collections;
        const select = document.getElementById('collection-select');
        select.innerHTML = '';
        
        if (collections.length === 0) {
            select.innerHTML = '<option value="">No collections available</option>';
            return;
        }
        
        select.innerHTML = '<option value="">All collections</option>';
        
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.title || collection.id;
            select.appendChild(option);
        });
        
        // Reset selection
        this.selectedCollection = '';
    }
    
    /**
     * Get the selected collection ID
     * @returns {string} Selected collection ID or empty string if none selected
     */
    getSelectedCollection() {
        // Always get the current value from the DOM to ensure accuracy
        const select = document.getElementById('collection-select');
        return select ? select.value : '';
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
            return this.collections.find(collection => 
                collection.id === collectionId && collection.source === source
            ) || null;
        } else {
            // Fallback to first match by ID only (for backward compatibility)
            return this.collections.find(collection => collection.id === collectionId) || null;
        }
    }
    
    /**
     * Reset collection selection
     */
    resetSelection() {
        this.selectedCollection = '';
        const select = document.getElementById('collection-select');
        select.value = '';
    }
}