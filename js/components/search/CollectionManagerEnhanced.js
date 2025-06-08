/**
 * CollectionManagerEnhanced.js - Enhanced component for managing STAC collections from all sources
 * Automatically loads collections from all configured data sources
 */

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
        this.collectionDetailsModal = new CollectionDetailsModal(this.apiClient, this.notificationService);
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Setup collection info button
        this.setupCollectionInfoButton();
        
        // Auto-load collections from all sources on startup
        this.loadAllCollectionsOnStartup();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Collection selection change
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            collectionSelect.addEventListener('change', (event) => {
                this.handleCollectionSelection(event.target.value);
            });
        }
        
        // Listen for collections updated event (from catalog selector)
        document.addEventListener('collectionsUpdated', (event) => {
            if (event.detail && event.detail.collections) {
                // This is for backward compatibility with the old system
                console.log('📡 Received collections from catalog selector (legacy)');
            }
        });
    }
    
    /**
     * Load collections from all sources on startup
     */
    async loadAllCollectionsOnStartup() {
        try {
            console.log('🚀 Auto-loading collections from all data sources...');
            this.showLoadingState();
            
            const allCollections = await this.loadAllCollections();
            
            if (allCollections.length > 0) {
                this.allCollections = allCollections;
                this.collections = allCollections; // For backward compatibility
                this.populateCollectionSelect(allCollections);
                
                // Group collections by source for the notification
                const groupedCollections = this.groupCollectionsBySource(allCollections);
                const sourceInfo = Object.keys(groupedCollections).map(source => {
                    const count = groupedCollections[source].length;
                    const label = source === 'copernicus' ? 'Copernicus' : 
                                 source === 'element84' ? 'Element84' :
                                 source === 'planetary' ? 'Microsoft Planetary Computer' : source;
                    return `${label}: ${count}`;
                }).join(', ');
                
                this.notificationService.showNotification(
                    `🎉 Loaded ${allCollections.length} collections! (${sourceInfo})`, 
                    'success'
                );
                
                console.log(`✅ Successfully loaded ${allCollections.length} collections from all sources`);
                console.log('Sources breakdown:', groupedCollections);
            } else {
                this.showNoCollectionsState();
                this.notificationService.showNotification(
                    '⚠️ No collections could be loaded from any data source - check console for details', 
                    'warning'
                );
            }
            
        } catch (error) {
            console.error('❌ Error auto-loading collections:', error);
            this.showErrorState();
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
        const allCollections = [];
        // Get enabled providers from config
        const dataSources = this.config?.appSettings?.enabledProviders || ['copernicus', 'element84'];
        const errors = [];
        
        console.log('🔄 Loading collections from all data sources...');
        console.log('📍 Available endpoints:', this.config?.stacEndpoints);
        console.log('🔍 Enabled providers:', dataSources);
        
        for (const source of dataSources) {
            try {
                console.log(`🔍 Loading collections from ${source}...`);
                
                // Get endpoints for this source
                const endpoints = this.config?.stacEndpoints?.[source];
                if (!endpoints) {
                    const error = `No endpoints configured for ${source}`;
                    console.warn(`⚠️ ${error}`);
                    console.warn('Available config:', this.config);
                    errors.push(error);
                    continue;
                }
                
                console.log(`🔗 ${source} endpoints:`, endpoints);
                
                // Test if endpoints are valid URLs
                try {
                    new URL(endpoints.collections);
                } catch (urlError) {
                    const error = `Invalid collections URL for ${source}: ${endpoints.collections}`;
                    console.error(`❌ ${error}`);
                    errors.push(error);
                    continue;
                }
                
                // Set API client to use this source
                this.apiClient.setEndpoints(endpoints);
                
                // Fetch collections from this source with increased limit
                console.log(`📡 Fetching collections from ${source} with limit 500...`);
                const collections = await this.apiClient.fetchCollections(500);
                
                console.log(`📊 Raw response from ${source}:`, {
                    type: typeof collections,
                    isArray: Array.isArray(collections),
                    length: collections?.length,
                    firstItem: collections?.[0]?.id
                });
                
                if (collections && collections.length > 0) {
                    // Add source information to each collection
                    const collectionsWithSource = collections.map(collection => ({
                        ...collection,
                        source: source,
                        sourceLabel: source === 'copernicus' ? 'Copernicus' : 
                                   source === 'element84' ? 'Element84' :
                                   source === 'planetary' ? 'Microsoft Planetary Computer' : source,
                        displayTitle: `${collection.title || collection.id} (${source === 'copernicus' ? 'Copernicus' : 
                                                                           source === 'element84' ? 'Element84' :
                                                                           source === 'planetary' ? 'Microsoft Planetary Computer' : source})`
                    }));
                    
                    allCollections.push(...collectionsWithSource);
                    console.log(`✅ Loaded ${collections.length} collections from ${source}`);
                    console.log(`📄 Sample collections:`, collections.slice(0, 3).map(c => ({id: c.id, title: c.title})));
                } else {
                    const error = `No collections returned from ${source} (got: ${JSON.stringify(collections)})`;
                    console.warn(`⚠️ ${error}`);
                    errors.push(error);
                }
                
            } catch (error) {
                const errorMsg = `${source}: ${error.message}`;
                console.error(`❌ Error loading collections from ${source}:`, error);
                console.error(`❌ Error details:`, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                errors.push(errorMsg);
                // Continue with other sources even if one fails
            }
        }
        
        console.log(`🗂️ Total collections loaded: ${allCollections.length}`);
        
        if (errors.length > 0) {
            console.error('❌ Collection loading errors:', errors);
        }
        
        if (allCollections.length === 0) {
            console.error('🚨 NO COLLECTIONS LOADED FROM ANY SOURCE!');
            console.error('🔍 Debug info:', {
                configExists: !!this.config,
                endpointsExist: !!this.config?.stacEndpoints,
                availableSources: Object.keys(this.config?.stacEndpoints || {}),
                errors: errors
            });
        }
        
        return allCollections;
    }
    
    /**
     * Handle collection selection
     * @param {string} collectionId - Selected collection ID
     */
    handleCollectionSelection(collectionId) {
        this.selectedCollection = collectionId;
        
        if (collectionId) {
            // Find the collection to get its source
            const collection = this.getCollectionById(collectionId);
            if (collection && collection.source) {
                // Automatically set the catalog selector to match the collection's source
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect && catalogSelect.value !== collection.source) {
                    console.log(`🔄 Auto-setting catalog to ${collection.source} for collection ${collectionId}`);
                    catalogSelect.value = collection.source;
                    
                    // Update the API client to use the correct endpoints
                    const endpoints = this.config.stacEndpoints[collection.source];
                    if (endpoints) {
                        this.apiClient.setEndpoints(endpoints);
                    }
                }
            }
        }
        
        console.log(`📋 Collection selected: ${collectionId}`);
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
            const sourceLabel = source === 'copernicus' ? 'Copernicus' : 
                              source === 'element84' ? 'Element84' : source;
            
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
        
        console.log(`✅ Populated collection dropdown with ${collections.length} collections`);
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
    setSelectedCollection(collectionId, source = null) {
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
                    const endpoints = this.config.stacEndpoints[source];
                    if (endpoints) {
                        this.apiClient.setEndpoints(endpoints);
                    }
                }
            }
            
            // Trigger change event
            select.dispatchEvent(new Event('change'));
            
            console.log(`✅ Set selected collection: ${collectionId} from ${source}`);
        }
    }
    
    /**
     * Get collection by ID
     * @param {string} collectionId - Collection ID
     * @returns {Object|null} Collection object or null if not found
     */
    getCollectionById(collectionId) {
        return this.allCollections.find(collection => collection.id === collectionId) || null;
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
            console.log('✅ Collection info button setup completed');
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
        
        const collection = this.getCollectionById(selectedCollectionId);
        if (collection) {
            this.collectionDetailsModal.showCollection(collection);
        } else {
            this.notificationService.showNotification('Collection details not available', 'error');
        }
    }
}
