/**
 * AISmartSearchEnhanced.js - Enhanced minimalist sentence-based search interface
 * Provides a streamlined "I want {collections} over {location} at {date} with {parameters}" interface
 * With improved popup positioning and minimalist design
 */

import { defaultGeocodingService } from '../../utils/GeocodingService.js';
import { isWKT, isGeoJSON, wktToGeoJSON, parseGeoJSON, geojsonToBbox } from '../../utils/GeometryUtils.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { CollectionDetailsModal } from './CollectionDetailsModal.js';

export class AISmartSearchEnhanced {
    // Static property to track if an instance is currently open (fix multiple windows bug)
    static isOpen = false;
    
    /**
     * Create a new AISmartSearchEnhanced component
     * @param {Object} apiClient - STAC API client
     * @param {Object} searchPanel - Search panel for executing searches
     * @param {Object} collectionManager - Collection manager for accessing collections
     * @param {Object} mapManager - Map manager for location handling
     * @param {Object} notificationService - Notification service
     */
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        this.apiClient = apiClient;
        this.searchPanel = searchPanel;
        this.collectionManager = collectionManager;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        this.geocodingService = defaultGeocodingService;
        
        this.fullscreenElement = null;
        this.escapeListener = null;
        this.currentDropdown = null; // Track current open dropdown
        
        this.locationSearchResults = [];
        this.selectedLocationResult = null;
        this.locationSearchTimeout = null;
        
        // Track current location layer for cleanup
        this.currentLocationLayerId = null;
        
        // Initialize with default values
        this.selectedCollection = null;
        this.selectedLocation = 'everywhere';
        this.selectedDate = {
            type: 'anytime',
            start: null,
            end: null
        };
        this.cloudCover = null;
        this.allAvailableCollections = [];
        
        this.activeField = null;
        
        // Collections loaded from all data sources
        this.selectedCollectionSource = null;
        this.showAllCollections = false; // Track show all state
        
        // Initialize collection details modal
        this.collectionDetailsModal = new CollectionDetailsModal(this.apiClient, this.notificationService);
        
        this.initAIButton();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    /**
     * Clean up resources when component is destroyed
     */
    cleanup() {
        if (this.fullscreenElement && document.body.contains(this.fullscreenElement)) {
            document.body.removeChild(this.fullscreenElement);
            this.fullscreenElement = null;
        }
        
        // 🔧 FIX: Mark as closed when cleaning up
        AISmartSearchEnhanced.isOpen = false;
        
        // Reset open options
        this.openOptions = null;
        
        // Remove all event listeners
        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }
        
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler);
            this.globalClickHandler = null;
        }
        
        if (this.pasteHandler) {
            document.removeEventListener('paste', this.pasteHandler);
            this.pasteHandler = null;
        }
    }
    
    /**
     * Focus on a specific field in the AI search interface
     * @param {string} fieldType - Type of field to focus ('collection', 'location', 'date')
     */
    async focusSpecificField(fieldType) {
        try {
            console.log(`🎯 Focusing on field: ${fieldType}`);
            
            let fieldElement = null;
            let dropdownContent = null;
            
            switch (fieldType) {
                case 'collection':
                    fieldElement = document.getElementById('ai-field-collection');
                    // Ensure collections are loaded before creating dropdown
                    await this.ensureDataSourceSelected();
                    dropdownContent = this.createCollectionDropdown();
                    break;
                case 'location':
                    fieldElement = document.getElementById('ai-field-location');
                    dropdownContent = this.createLocationDropdown();
                    break;
                case 'date':
                    fieldElement = document.getElementById('ai-field-date');
                    dropdownContent = this.createDateDropdown();
                    break;
                default:
                    console.warn(`Unknown field type: ${fieldType}`);
                    return;
            }
            
            if (fieldElement && dropdownContent) {
                // Highlight the field
                fieldElement.style.animation = 'pulse 0.5s ease-in-out';
                
                // Open the dropdown after a short delay
                setTimeout(() => {
                    this.showMinimalistDropdown(fieldType, fieldElement, dropdownContent);
                }, 200);
                
                console.log(`✨ Focused and opened dropdown for: ${fieldType}`);
            } else {
                console.error(`❌ Could not find field element for: ${fieldType}`);
            }
            
        } catch (error) {
            console.error(`❌ Error focusing field ${fieldType}:`, error);
        }
    }
    
    /**
     * Update the sidebar search summary display
     * @param {string} fieldType - Type of field to update
     * @param {string} value - New value to display
     */
    updateSidebarSummary(fieldType, value) {
        try {
            let summaryElement = null;
            
            switch (fieldType) {
                case 'collection':
                    summaryElement = document.querySelector('#summary-source .search-summary-value');
                    break;
                case 'location':
                    summaryElement = document.querySelector('#summary-location .search-summary-value');
                    break;
                case 'date':
                    summaryElement = document.querySelector('#summary-date .search-summary-value');
                    break;
            }
            
            if (summaryElement) {
                summaryElement.textContent = value;
                
                // Add a brief highlight animation
                summaryElement.style.animation = 'highlight 0.3s ease-in-out';
                setTimeout(() => {
                    summaryElement.style.animation = '';
                }, 300);
                
                console.log(`🔄 Updated sidebar summary ${fieldType}: ${value}`);
            }
            
        } catch (error) {
            console.error(`❌ Error updating sidebar summary:`, error);
        }
    }
    
    /**
     * Initialize AI button event listener
     */
    initAIButton() {
        const aiButton = document.getElementById('ai-search-btn');
        if (aiButton) {
            aiButton.addEventListener('click', () => {
                this.showMinimalistSearch();
            });
            console.log('🤖 Enhanced AI Smart Search button initialized');
        } else {
            console.error('❌ AI Smart Search button not found');
        }
    }
    
    /**
     * Load collections from all available data sources
     * @returns {Promise<Array>} Combined collections from all sources
     */
    async loadAllCollections() {
        try {
            console.log('🔄 Loading collections from all sources...');
            
            // Get available data sources from config
            const dataSources = this.getAvailableDataSources();
            console.log('📡 Available data sources:', dataSources);
            
            if (!dataSources || dataSources.length === 0) {
                console.warn('⚠️ No data sources configured');
                return;
            }
            
            // Initialize collections array
            this.allAvailableCollections = [];
            
            // Load collections from each source
            const loadPromises = dataSources.map(async (source) => {
                try {
                    console.log(`📥 Loading collections from ${source}...`);
                    
                    // Get endpoints for this source
                    const endpoints = window.stacExplorer.config.stacEndpoints[source];
                    if (!endpoints) {
                        console.warn(`⚠️ No endpoints configured for ${source}`);
                        return { source, success: false, error: 'No endpoints configured' };
                    }
                    
                    // Set API client to use this source's endpoints
                    this.apiClient.setEndpoints(endpoints);
                    
                    // Fetch collections
                    const collections = await this.apiClient.fetchCollections();
                    console.log(`✅ Loaded ${collections.length} collections from ${source}`);
                    
                    // Add source information to each collection
                    const collectionsWithSource = collections.map(collection => ({
                        ...collection,
                        source: source,
                        sourceLabel: source === 'copernicus' ? 'Copernicus' : 
                                   source === 'element84' ? 'Element84' :
                                   source === 'planetary' ? 'Microsoft Planetary Computer' : source,
                        displayTitle: `${collection.title || collection.id}`
                    }));
                    
                    // Add to our collections array
                    this.allAvailableCollections.push(...collectionsWithSource);
                    
                    return { source, success: true, count: collections.length };
                } catch (error) {
                    console.error(`❌ Error loading collections from ${source}:`, error);
                    return { source, success: false, error: error.message };
                }
            });
            
            // Wait for all sources to load
            const results = await Promise.all(loadPromises);
            
            // Log results
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`📊 Collection loading results:
                - Total sources: ${results.length}
                - Successful: ${successful.length}
                - Failed: ${failed.length}
                - Total collections loaded: ${this.allAvailableCollections.length}`);
            
            if (failed.length > 0) {
                const failedDetails = failed.map(f => `${f.source}: ${f.error}`).join(', ');
                console.warn('⚠️ Some sources had errors:', failedDetails);
                this.notificationService.showNotification(
                    `Loaded ${this.allAvailableCollections.length} collections (${failed.length} sources had errors)`,
                    'warning'
                );
            } else {
                this.notificationService.showNotification(
                    `Successfully loaded ${this.allAvailableCollections.length} collections`,
                    'success'
                );
            }
            
            // Sort collections by source and title
            this.allAvailableCollections.sort((a, b) => {
                // First sort by source
                if (a.source !== b.source) {
                    const sourcePriority = {
                        'element84': 1,
                        'copernicus': 2,
                        'planetary': 3
                    };
                    return (sourcePriority[a.source] || 999) - (sourcePriority[b.source] || 999);
                }
                // Then sort by title
                return (a.title || a.id).localeCompare(b.title || b.id);
            });
            
        } catch (error) {
            console.error('❌ Error loading collections:', error);
            this.notificationService.showNotification('Error loading collections', 'error');
        }
    }
    
    /**
     * Get all available data sources from configuration
     * @returns {Array} Array of available data source keys
     */
    getAvailableDataSources() {
        try {
            const config = window.stacExplorer?.config;
            if (!config?.stacEndpoints) {
                console.warn('⚠️ No STAC endpoints configuration found');
                return [];
            }
            
            // Get enabled providers from settings
            const enabledProviders = config.appSettings?.enabledProviders || [];
            
            // Get all configured data sources except 'custom' and 'local' unless they're properly configured
            const allSources = Object.keys(config.stacEndpoints);
            const validSources = allSources.filter(source => {
                // Skip if not in enabled providers
                if (!enabledProviders.includes(source)) {
                    return false;
                }
                
                const endpoints = config.stacEndpoints[source];
                
                // Skip if no endpoints defined
                if (!endpoints) return false;
                
                // For custom and local, require proper URL configuration
                if (source === 'custom' || source === 'local') {
                    return endpoints.collections && 
                           endpoints.collections.startsWith('http') && 
                           endpoints.search && 
                           endpoints.search.startsWith('http');
                }
                
                // For other sources, just check if collections URL exists
                return endpoints.collections && endpoints.collections.startsWith('http');
            });
            
            console.log(`🔍 Found ${validSources.length} valid data sources:`, validSources);
            return validSources;
            
        } catch (error) {
            console.error('❌ Error getting available data sources:', error);
            return [];
        }
    }

    /**
     * Ensure collections are available from all data sources
     * @returns {Promise<boolean>} True if collections are available
     */
    async ensureDataSourceSelected() {
        try {
            if (this.allAvailableCollections && this.allAvailableCollections.length > 0) {
                console.log(`🗂️ Using cached collections: ${this.allAvailableCollections.length}`);
                return true;
            }
            
            console.log('🔄 Loading collections from all data sources for AI Search...');
            this.allAvailableCollections = await this.loadAllCollections();
            
            if (this.collectionManager) {
                this.collectionManager.collections = this.allAvailableCollections;
            }
            
            const hasCollections = this.allAvailableCollections && this.allAvailableCollections.length > 0;
            
            if (hasCollections) {
                console.log(`✅ Successfully loaded ${this.allAvailableCollections.length} collections from all sources`);
            } else {
                console.warn('⚠️ No collections could be loaded from any data source');
            }
            
            return hasCollections;
            
        } catch (error) {
            console.error('❌ Error ensuring collections are loaded:', error);
            return false;
        }
    }
    
    /**
     * Create and show the minimalist search interface
     * @param {Object} options - Options for opening the search
     * @param {boolean} options.hideMenuOnOpen - Whether to hide the sidebar menu when opening
     */
    async showMinimalistSearch(options = {}) {
        try {
            // 🔧 FIX: Prevent multiple instances from opening
            if (AISmartSearchEnhanced.isOpen) {
                console.log('🚫 AI Smart Search is already open, bringing existing instance to front');
                
                // If already open, just bring it to front and show notification
                if (this.fullscreenElement) {
                    this.fullscreenElement.style.zIndex = '1100';
                    this.fullscreenElement.focus();
                }
                
                this.notificationService.showNotification('AI Smart Search is already open', 'info');
                return;
            }
            
            console.log('🤖 Showing Enhanced AI Smart Search...', options);
            
            // Mark as open
            AISmartSearchEnhanced.isOpen = true;
            
            // Store options for later use
            this.openOptions = options;
            
            // Hide sidebar if requested
            if (options.hideMenuOnOpen) {
                this.hideSidebar();
            }
            
            // Show interface immediately
            this.createAndShowInterface();
            
            // Focus specific field if requested
            if (options.focusField) {
                setTimeout(() => {
                    this.focusSpecificField(options.focusField);
                }, 300);
            }
            
            // Load collections in background
            this.loadCollectionsInBackground();
            
        } catch (error) {
            console.error('❌ Error showing AI minimalist search:', error);
            AISmartSearchEnhanced.isOpen = false; // Reset flag on error
            this.notificationService.showNotification('Error showing AI search interface', 'error');
        }
    }
    
    /**
     * Create and show the interface immediately
     */
    createAndShowInterface() {
        // Create fullscreen element
        this.fullscreenElement = document.createElement('div');
        this.fullscreenElement.className = 'ai-fullscreen';
        
        // Build minimalist interface
        this.fullscreenElement.innerHTML = `
            <div class="ai-fullscreen-header">
                <button class="ai-fullscreen-close" aria-label="Close search">
                    <i class="material-icons">close</i>
                </button>
            </div>
            
            <div class="ai-fullscreen-content">
                <div class="ai-sentence-container">
                    I want 
                    <span class="ai-field ${this.selectedCollection ? '' : 'empty'}" 
                          id="ai-field-collection" 
                          data-placeholder="📂 Everything">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : '📂 Everything'}</span>
                    over 
                    <span class="ai-field ${this.selectedLocation === 'everywhere' ? 'empty' : ''}" 
                          id="ai-field-location" 
                          data-placeholder="THE WORLD">${this.selectedLocation === 'everywhere' ? 'THE WORLD' : 'Custom Location'}</span>
                    at 
                    <span class="ai-field ${this.selectedDate.type === 'anytime' ? 'empty' : ''}" 
                          id="ai-field-date" 
                          data-placeholder="🕐 Anytime">${this.getEnhancedDateDisplayText()}</span>
                    with 
                    <span class="ai-field" 
                          id="ai-field-params" 
                          data-placeholder="PARAMETERS">≤${this.cloudCover}% CLOUDS</span>
                </div>
                
                <div class="ai-execute-container">
                    <button class="ai-execute-btn" id="ai-execute-search">
                        <i class="material-icons">search</i> Search
                    </button>
                </div>
            </div>
        `;
        
        // Add fullscreen to document
        document.body.appendChild(this.fullscreenElement);
        
        // Set up event listeners
        this.setupEnhancedEventListeners();
        
        console.log('🤖 Enhanced AI Smart Search interface shown');
    }
    
    /**
     * Load collections in the background and update interface
     */
    async loadCollectionsInBackground() {
        try {
            console.log('🔄 AI Smart Search: Checking for collections...');
            
            // First, check if the enhanced collection manager already has collections
            if (this.collectionManager && typeof this.collectionManager.getAllCollections === 'function') {
                // Wait a bit for the collection manager to finish loading
                let attempts = 0;
                const maxAttempts = 10; // Wait up to 5 seconds
                
                while (attempts < maxAttempts) {
                    const existingCollections = this.collectionManager.getAllCollections();
                    
                    if (existingCollections && existingCollections.length > 0) {
                        console.log(`🚀 AI Smart Search: Using ${existingCollections.length} collections from CollectionManagerEnhanced`);
                        this.allAvailableCollections = existingCollections;
                        this.notificationService.showNotification(`🎉 AI Smart Search ready with ${existingCollections.length} collections!`, 'success');
                        return;
                    }
                    
                    // Check if collection manager is still loading
                    if (typeof this.collectionManager.isLoadingCollections === 'function' && 
                        this.collectionManager.isLoadingCollections()) {
                        console.log(`⏳ AI Smart Search: Waiting for CollectionManagerEnhanced to finish loading... (attempt ${attempts + 1}/${maxAttempts})`);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    } else {
                        // Collection manager is not loading, break out of the loop
                        break;
                    }
                }
                
                // If we still don't have collections after waiting, show a warning
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ AI Smart Search: Timeout waiting for CollectionManagerEnhanced');
                    this.notificationService.showNotification('Collections are still loading, please wait...', 'info');
                    return;
                }
            }
            
            // Fallback: load collections ourselves (for backward compatibility)
            console.log('🔄 AI Smart Search: Loading collections as fallback...');
            const hasCollections = await this.ensureDataSourceSelected();
            
            if (hasCollections && this.fullscreenElement) {
                this.notificationService.showNotification(`🎉 AI Smart Search loaded ${this.allAvailableCollections.length} collections!`, 'success');
            } else {
                this.notificationService.showNotification('AI Smart Search: You can still search by typing collection names.', 'info');
            }
            
        } catch (error) {
            console.error('❌ AI Smart Search: Error loading collections:', error);
            this.notificationService.showNotification('AI Smart Search: You can still search by typing collection names.', 'info');
        }
    }
    
    /**
     * Get display name for a collection from all available collections
     * @param {string} collectionId - Collection ID
     * @returns {string} Display name
     */
    getCollectionDisplayName(collectionId) {
        if (this.allAvailableCollections) {
            const collection = this.allAvailableCollections.find(c => c.id === collectionId);
            if (collection) {
                return collection.displayTitle || collection.title || collectionId;
            }
        }
        
        const collection = this.collectionManager.getCollectionById(collectionId);
        return collection ? (collection.title || collectionId) : collectionId;
    }

    /**
     * Get enhanced display text for the date field using DateUtils
     * @returns {string} Display text for date
     */
    getEnhancedDateDisplayText() {
        return DateUtils.getDateDisplayText(this.selectedDate);
    }
    
    /**
     * Set up enhanced event listeners with improved positioning
     */
    setupEnhancedEventListeners() {
        // Close button
        const closeButton = this.fullscreenElement.querySelector('.ai-fullscreen-close');
        closeButton.addEventListener('click', () => this.closeFullscreen());
        
        // Set up field click handlers with enhanced positioning
        this.setupEnhancedFieldHandlers();
        
        // Execute Search button
        const executeSearchBtn = document.getElementById('ai-execute-search');
        executeSearchBtn.addEventListener('click', () => {
            this.executeSearch();
        });
        
        // Global click handler to close dropdowns
        this.globalClickHandler = (event) => {
            if (this.fullscreenElement && !event.target.closest('.ai-field') && !event.target.closest('.ai-dropdown-enhanced')) {
                this.closeAllDropdowns();
            }
        };
        document.addEventListener('click', this.globalClickHandler);
        
        // Global escape key handler
        this.escapeListener = (event) => {
            if (event.key === 'Escape') {
                if (this.currentDropdown) {
                    this.closeAllDropdowns();
                } else if (this.fullscreenElement) {
                    this.closeFullscreen();
                }
            }
        };
        document.addEventListener('keydown', this.escapeListener);
        
        // Global paste detection for WKT/GeoJSON
        this.setupGlobalPasteDetection();
    }
    
    /**
     * Set up enhanced field handlers with dynamic positioning
     */
    setupEnhancedFieldHandlers() {
        // DATA field - collections dropdown
        const collectionField = document.getElementById('ai-field-collection');
        collectionField.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMinimalistDropdown('collection', collectionField, this.createCollectionDropdown());
        });
        
        // LOCATION field - location dropdown
        const locationField = document.getElementById('ai-field-location');
        locationField.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMinimalistDropdown('location', locationField, this.createLocationDropdown());
        });
        
        // DATE field - date dropdown
        const dateField = document.getElementById('ai-field-date');
        dateField.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMinimalistDropdown('date', dateField, this.createDateDropdown());
        });
        
        // PARAMETERS field - parameters dropdown
        const paramsField = document.getElementById('ai-field-params');
        paramsField.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMinimalistDropdown('params', paramsField, this.createParametersDropdown());
        });
    }
    
    /**
     * Show minimalist dropdown with dynamic positioning
     * @param {string} type - Type of dropdown
     * @param {HTMLElement} field - Field element that was clicked
     * @param {HTMLElement} dropdownContent - Content to show in dropdown
     */
    showMinimalistDropdown(type, field, dropdownContent) {
        try {
            // Close any existing dropdown
            this.closeAllDropdowns();
            
            // Create and show the dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'ai-dropdown-container';
            
            // For collection dropdown, ensure we have the content
            if (type === 'collection') {
                if (!dropdownContent) {
                    dropdownContent = this.createCollectionDropdown();
                }
            }
            
            dropdown.appendChild(dropdownContent);
            
            // Position the dropdown
            this.positionDropdownNearField(dropdown, field);
            
            // Add to DOM
            document.body.appendChild(dropdown);
            
            // Store reference
            this.currentDropdown = dropdown;
            
            // Add click outside handler
            this.globalClickHandler = (event) => {
                if (!dropdown.contains(event.target) && !field.contains(event.target)) {
                    this.closeAllDropdowns();
                }
            };
            document.addEventListener('click', this.globalClickHandler);
            
            // Add escape key handler
            this.escapeListener = (event) => {
                if (event.key === 'Escape') {
                    this.closeAllDropdowns();
                }
            };
            document.addEventListener('keydown', this.escapeListener);
            
            // Setup specific dropdown events
            switch (type) {
                case 'collection':
                    this.setupCollectionDropdownEvents(dropdown);
                    break;
                case 'location':
                    this.setupLocationDropdownEvents(dropdown);
                    break;
                case 'date':
                    this.setupDateDropdownEvents(dropdown);
                    break;
                case 'parameters':
                    this.setupParametersDropdownEvents(dropdown);
                    break;
            }
            
            console.log(`✨ Showing dropdown for ${type}`);
            
        } catch (error) {
            console.error(`❌ Error showing dropdown for ${type}:`, error);
        }
    }
    
    /**
     * Position dropdown near the clicked field with smart collision detection
     * Show the sidebar/menu
     */
    showSidebar() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) {
                console.warn('⚠️ Sidebar element not found');
                return;
            }
            
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // On mobile, open the mobile sidebar
                if (window.mobileSidebarManager && typeof window.mobileSidebarManager.openSidebar === 'function') {
                    window.mobileSidebarManager.openSidebar();
                } else {
                    sidebar.classList.add('mobile-open');
                    document.body.classList.add('sidebar-open');
                }
            } else {
                // On desktop, show the sidebar
                sidebar.classList.remove('hidden');
                // Update toggle button icon
                const toggleIcon = document.querySelector('.sidebar-toggle i');
                if (toggleIcon) {
                    toggleIcon.textContent = 'chevron_left';
                }
            }
            
            console.log('😎 Sidebar shown with search results');
            
        } catch (error) {
            console.error('❌ Error showing sidebar:', error);
        }
    }
    
    /**
     * Execute search with the selected parameters
     */
    executeSearch() {
        try {
            // Collect parameters
            const params = {
                cloudCover: this.cloudCover
            };
            
            // Handle collection selection - EVERYTHING mode vs specific collection
            if (this.selectedCollection) {
                // Specific collection selected
                // Ensure collection ID is properly formatted
                const collectionId = this.selectedCollection.trim();
                if (collectionId) {
                    params.collections = [collectionId];
                    console.log(`🎯 Searching specific collection: ${collectionId}`);
                } else {
                    console.log('🌍 No collection selected, searching across all available collections');
                }
            } else {
                // EVERYTHING mode - search across all available collections
                console.log('🌍 EVERYTHING mode: Searching across all available collections');
                // Don't set collections parameter - this will search all collections
            }
            
            // Add date range if not "anytime"
            if (this.selectedDate.type !== 'anytime' && this.selectedDate.start && this.selectedDate.end) {
                params.dateRange = {
                    start: this.selectedDate.start,
                    end: this.selectedDate.end
                };
            }
            
            // Add location if not "everywhere"
            if (this.selectedLocation && this.selectedLocation !== 'everywhere') {
                if (Array.isArray(this.selectedLocation) && this.selectedLocation.length === 4) {
                    // Convert bbox to the format expected by the API [west, south, east, north]
                    params.bbox = this.selectedLocation;
                    console.log(`📍 Using location bbox: ${params.bbox.join(', ')}`);
                } else if (this.selectedLocationResult && this.selectedLocationResult.bbox) {
                    // Use bbox from location result if available
                    params.bbox = this.selectedLocationResult.bbox;
                    console.log(`📍 Using location result bbox: ${params.bbox.join(', ')}`);
                }
            }
            
            // Execute the search
            console.log('🔍 Executing search with parameters:', params);
            this.searchPanel.performMultiSourceSearch(params);
            
        } catch (error) {
            console.error('❌ Error executing search:', error);
            this.notificationService.showNotification(`Error executing search: ${error.message}`, 'error');
        }
    }
    
    /**
     * Ensure sidebar is visible after AI search execution
     * Handles both mobile and desktop scenarios
     */
    ensureSidebarVisible() {
        try {
            console.log('🔄 Ensuring sidebar is visible after AI search...');
            
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) {
                console.warn('⚠️ Sidebar element not found');
                return;
            }
            
            // Check if we're on mobile (using the same breakpoint as the CSS)
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // On mobile, use the mobile sidebar manager to show the sidebar
                if (window.mobileSidebarManager && typeof window.mobileSidebarManager.openSidebar === 'function') {
                    window.mobileSidebarManager.openSidebar();
                    console.log('📱 Mobile sidebar opened via mobileSidebarManager');
                } else {
                    // Fallback: manually show mobile sidebar
                    sidebar.classList.add('mobile-open');
                    document.body.classList.add('sidebar-open');
                    console.log('📱 Mobile sidebar opened via fallback');
                }
            } else {
                // On desktop, ensure sidebar is visible (not hidden)
                if (sidebar.classList.contains('hidden')) {
                    sidebar.classList.remove('hidden');
                    console.log('💻 Desktop sidebar shown');
                } else {
                    console.log('💻 Desktop sidebar already visible');
                }
            }
            
            // Add a slight delay to ensure smooth transition and then scroll results into view
            setTimeout(() => {
                const resultsCard = document.getElementById('results-card');
                if (resultsCard) {
                    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    console.log('📜 Scrolled to results section');
                }
            }, 300);
            
        } catch (error) {
            console.error('❌ Error ensuring sidebar visibility:', error);
        }
    }
    
    /**
     * Apply search parameters to the search form
     * @param {Object} params - Search parameters
     */
    applySearchParameters(params) {
        try {
            console.log('🔧 Applying search parameters:', params);
            // Reset form first to clear previous selections
            this.resetSearchForm();

            // If we have a selected collection, always look up its source
            let collectionSource = this.selectedCollectionSource;
            let collectionId = null;
            if (params.collections && params.collections.length > 0) {
                collectionId = params.collections[0];
                // Look up the collection in allAvailableCollections
                if (this.allAvailableCollections && collectionId) {
                    const found = this.allAvailableCollections.find(c => c.id === collectionId);
                    if (found && found.source) {
                        collectionSource = found.source;
                        this.selectedCollectionSource = collectionSource;
                    }
                }
            }

            // If we have a selected collection with source info, set the API client accordingly
            if (collectionSource && collectionId) {
                console.log(`🔌 Setting API client to use ${collectionSource} for collection ${collectionId}`);
                const endpoints = window.stacExplorer.config.stacEndpoints[collectionSource];
                if (endpoints) {
                    this.apiClient.setEndpoints(endpoints);
                    // Also update the catalog selector to reflect the current source
                    const catalogSelect = document.getElementById('catalog-select');
                    if (catalogSelect) {
                        catalogSelect.value = collectionSource;
                        // Trigger change event to update UI
                        catalogSelect.dispatchEvent(new Event('change'));
                        console.log(`✅ Set catalog selector to: ${collectionSource}`);
                    }
                }
            }

            // Apply date range if provided
            if (params.dateRange && params.dateRange.start && params.dateRange.end) {
                const dateStart = document.getElementById('date-start');
                const dateEnd = document.getElementById('date-end');
                if (dateStart && dateEnd) {
                    dateStart.value = params.dateRange.start;
                    dateEnd.value = params.dateRange.end;
                    console.log(`✅ Set date range: ${params.dateRange.start} to ${params.dateRange.end}`);
                }
            }

            // Apply collection if provided and exists
            if (collectionId) {
                // Use the enhanced collection manager's method to set both collection and source
                if (this.collectionManager && typeof this.collectionManager.setSelectedCollection === 'function') {
                    // Set collection and source together
                    this.collectionManager.setSelectedCollection(collectionId, collectionSource);
                    console.log(`✅ Set collection via CollectionManagerEnhanced: ${collectionId} from ${collectionSource}`);
                } else {
                    // Fallback to manual setting
                    const collectionSelect = document.getElementById('collection-select');
                    if (collectionSelect) {
                        // Wait a bit for collections to load if needed
                        setTimeout(() => {
                            collectionSelect.value = collectionId;
                            // Trigger change event to update the UI
                            collectionSelect.dispatchEvent(new Event('change'));
                            console.log(`✅ Set collection via fallback: ${collectionId}`);
                        }, 100);
                    }
                }
            } else {
                // EVERYTHING mode - clear collection selection to search all
                console.log('🌍 EVERYTHING mode: Clearing collection selection to search all');
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect) {
                    collectionSelect.value = ''; // Set to "All collections" option
                    collectionSelect.dispatchEvent(new Event('change'));
                }
                if (this.collectionManager && typeof this.collectionManager.resetSelection === 'function') {
                    this.collectionManager.resetSelection();
                }
            }

            // Apply cloud cover if provided
            if (params.cloudCover !== null && params.cloudCover !== undefined) {
                const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
                const cloudCoverInput = document.getElementById('cloud-cover');
                const cloudCoverValue = document.getElementById('cloud-cover-value');
                if (cloudCoverEnabled && cloudCoverInput && cloudCoverValue) {
                    cloudCoverEnabled.checked = true;
                    cloudCoverInput.value = params.cloudCover;
                    cloudCoverValue.textContent = `${params.cloudCover}%`;
                    cloudCoverInput.disabled = false;
                    // Show controls if they're hidden
                    const cloudCoverControls = document.getElementById('cloud-cover-controls');
                    if (cloudCoverControls) {
                        cloudCoverControls.style.display = 'block';
                        cloudCoverControls.classList.add('enabled');
                    }
                    console.log(`✅ Set cloud cover to: ${params.cloudCover}%`);
                }
            }

            // Apply bbox if provided
            if (params.bbox) {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) {
                    bboxInput.value = params.bbox.join(',');
                    console.log(`✅ Set bbox to: ${params.bbox.join(',')}`);
                }
                // If we have map manager and bbox, update the map
                if (this.mapManager && params.bbox && params.bbox.length === 4) {
                    try {
                        // 🔧 FIX: If we have stored geometry from paste, display it properly
                        if (this.selectedLocationResult && 
                            this.selectedLocationResult.geojson && 
                            this.selectedLocationResult.category === 'pasted') {
                            console.log('🗺️ Re-displaying pasted geometry during search execution');
                            // Display the actual geometry, not just bbox
                            if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                                this.mapManager.addBeautifulGeometryLayer(
                                    this.selectedLocationResult.geojson, 
                                    `search-geometry-${Date.now()}`
                                );
                            }
                            // Zoom to the geometry
                            if (typeof this.mapManager.fitToBounds === 'function') {
                                this.mapManager.fitToBounds(params.bbox);
                            }
                        } else {
                            // Regular bbox handling
                            this.mapManager.setBboxFromCoordinates(params.bbox);
                        }
                        console.log('✅ Updated map with geometry/bbox');
                    } catch (mapError) {
                        console.warn('⚠️ Could not update map with bbox:', mapError);
                    }
                }
            }

            // Update search summary display if available
            this.updateSearchSummary();
            console.log('✅ Applied all search parameters successfully');
        } catch (error) {
            console.error('❌ Error applying search parameters:', error);
        }
    }
    
    /**
     * Reset the search form to default values
     */
    resetSearchForm() {
        try {
            // Reset date range
            const dateStart = document.getElementById('date-start');
            const dateEnd = document.getElementById('date-end');
            if (dateStart) dateStart.value = '';
            if (dateEnd) dateEnd.value = '';
            
            // Don't reset bbox if we have a selected location
            if (!this.selectedLocation || this.selectedLocation === 'everywhere') {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) bboxInput.value = '';
                
                // Reset map if available and no location is selected
                if (this.mapManager && typeof this.mapManager.clearDrawings === 'function') {
                    try {
                        this.mapManager.clearDrawings();
                    } catch (e) {
                        console.warn('Could not clear map drawings:', e);
                    }
                }
            }
            
            // Reset cloud cover
            const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
            if (cloudCoverEnabled) cloudCoverEnabled.checked = false;
            
            console.log('✅ Search form reset (preserving location if selected)');
        } catch (error) {
            console.warn('⚠️ Error resetting search form:', error);
        }
    }
    
    /**
     * Update the search summary in the dashboard
     */
    updateSearchSummary() {
        try {
            const summaryDetails = document.getElementById('summary-details');
            if (!summaryDetails) return;
            
            // Create summary text
            let summary = '';
            
            // Add collection if selected
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect && collectionSelect.value) {
                const selectedOption = collectionSelect.options[collectionSelect.selectedIndex];
                const collectionName = selectedOption.textContent || collectionSelect.value;
                summary += `Dataset: ${collectionName}, `;
            }
            
            // Add date range if set
            const dateStart = document.getElementById('date-start');
            const dateEnd = document.getElementById('date-end');
            if (dateStart && dateStart.value && dateEnd && dateEnd.value) {
                summary += `Date: ${dateStart.value} to ${dateEnd.value}, `;
            }
            
            // Add location if set
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput && bboxInput.value) {
                summary += 'Location: Custom area, ';
            }
            
            // Add cloud cover if enabled
            const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
            const cloudCoverInput = document.getElementById('cloud-cover');
            if (cloudCoverEnabled && cloudCoverEnabled.checked && cloudCoverInput) {
                summary += `Cloud Cover: Max ${cloudCoverInput.value}%, `;
            }
            
            // Trim trailing comma and space
            summary = summary.replace(/, $/, '');
            
            // Set summary text or default
            summaryDetails.textContent = summary || 'Configure your search';
            
            console.log('✅ Updated search summary:', summary);
        } catch (error) {
            console.warn('⚠️ Error updating search summary:', error);
        }
    }
    
    /**
     * Format a Date object as YYYY-MM-DD
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Show collection details modal
     * @param {Object} collection - Collection object to show details for
     */
    showCollectionDetails(collection) {
        try {
            console.log('📄 Showing collection details for:', collection.id);
            
            if (this.collectionDetailsModal) {
                this.collectionDetailsModal.showCollection(collection);
            } else {
                console.error('❌ Collection details modal not initialized');
                this.notificationService.showNotification('Collection details unavailable', 'error');
            }
        } catch (error) {
            console.error('❌ Error showing collection details:', error);
            this.notificationService.showNotification('Error showing collection details', 'error');
        }
    }

    /**
     * Create collection dropdown content for inline dropdowns
     * @returns {HTMLElement} Dropdown content element
     */
    createCollectionDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Create header with close button
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <div class="ai-dropdown-header-content">
                <i class="material-icons">dataset</i>
                <span>Select Data Source</span>
            </div>
            <button class="ai-dropdown-close" title="Close">
                <i class="material-icons">close</i>
            </button>
        `;
        
        // Create search section
        const searchSection = document.createElement('div');
        searchSection.className = 'ai-search-section';
        searchSection.innerHTML = `
            <input type="text" class="ai-search-input" placeholder="Search collections..." />
        `;
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add EVERYTHING option first
        const everythingOption = document.createElement('div');
        everythingOption.className = 'ai-option ai-everything-option';
        everythingOption.dataset.value = '';
        everythingOption.innerHTML = `
            <i class="material-icons">public</i>
            <div class="ai-option-content">
                <div class="ai-option-title">📂 Everything</div>
                <div class="ai-option-subtitle">Search across all available data sources</div>
            </div>
        `;
        optionsSection.appendChild(everythingOption);
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'ai-source-separator';
        optionsSection.appendChild(separator);
        
        // Group collections by source
        const collections = this.allAvailableCollections || [];
        const groupedCollections = this.groupCollectionsBySource(collections);
        
        // Add collections grouped by source
        Object.keys(groupedCollections).forEach((source, sourceIndex) => {
            // Add source group header
            const sourceHeader = document.createElement('div');
            sourceHeader.className = 'ai-source-group-header';
            sourceHeader.textContent = this.getSourceDisplayName(source);
            optionsSection.appendChild(sourceHeader);
            
            // Add collections for this source
            groupedCollections[source].forEach(collection => {
                const option = document.createElement('div');
                option.className = 'ai-option';
                option.dataset.value = collection.id;
                option.dataset.source = collection.source;
                
                option.innerHTML = `
                    <i class="material-icons">satellite_alt</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">${collection.title || collection.id}</div>
                        <div class="ai-option-subtitle">${collection.id} • ${this.getSourceDisplayName(collection.source)}</div>
                    </div>
                    <button class="ai-option-details" data-collection-id="${collection.id}" data-collection-source="${collection.source}" title="View details">
                        <i class="material-icons">info</i>
                    </button>
                `;
                
                optionsSection.appendChild(option);
            });
            
            // Add separator between sources (except for last source)
            if (sourceIndex < Object.keys(groupedCollections).length - 1) {
                const sourceSeparator = document.createElement('div');
                sourceSeparator.className = 'ai-source-separator';
                optionsSection.appendChild(sourceSeparator);
            }
        });
        
        // If no collections available, show message
        if (collections.length === 0) {
            const noCollections = document.createElement('div');
            noCollections.className = 'ai-no-results';
            noCollections.innerHTML = `
                <i class="material-icons">info</i>
                <p>No collections available</p>
                <small>Collections are being loaded...</small>
            `;
            optionsSection.appendChild(noCollections);
        }
        
        // Assemble the dropdown
        container.appendChild(header);
        container.appendChild(searchSection);
        container.appendChild(optionsSection);
        
        return container;
    }

    /**
     * Group collections by their source
     * @param {Array} collections - Array of collection objects
     * @returns {Object} Collections grouped by source
     */
    groupCollectionsBySource(collections) {
        const grouped = {};
        
        collections.forEach(collection => {
            const source = collection.source || 'unknown';
            if (!grouped[source]) {
                grouped[source] = [];
            }
            grouped[source].push(collection);
        });
        
        return grouped;
    }
    
    /**
     * Get display name for a source
     * @param {string} source - Source identifier
     * @returns {string} Display name for the source
     */
    getSourceDisplayName(source) {
        const sourceMap = {
            'copernicus': 'Copernicus',
            'element84': 'Element84',
            'unknown': 'Unknown Source'
        };
        
        return sourceMap[source] || source;
    }

    /**
     * Create date dropdown content for inline dropdowns
     * @returns {HTMLElement} Dropdown content element
     */
    createDateDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Create header with close button
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <div class="ai-dropdown-header-content">
                <i class="material-icons">calendar_today</i>
                <span>Select Time Range</span>
            </div>
            <button class="ai-dropdown-close" title="Close">
                <i class="material-icons">close</i>
            </button>
        `;
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add ANYTIME option first
        const anytimeOption = document.createElement('div');
        anytimeOption.className = 'ai-option ai-anytime-option';
        anytimeOption.dataset.value = 'anytime';
        anytimeOption.innerHTML = `
            <i class="material-icons">all_inclusive</i>
            <div class="ai-option-content">
                <div class="ai-option-title">🕐 Anytime</div>
                <div class="ai-option-subtitle">Search across all available dates</div>
            </div>
        `;
        optionsSection.appendChild(anytimeOption);
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'ai-source-separator';
        optionsSection.appendChild(separator);
        
        // Add LAST 30 DAYS option
        const thisMonthOption = document.createElement('div');
        thisMonthOption.className = 'ai-option ai-this-month-option';
        thisMonthOption.dataset.value = 'last30days';
        thisMonthOption.innerHTML = `
            <i class="material-icons">calendar_month</i>
            <div class="ai-option-content">
                <div class="ai-option-title">Last 30 days</div>
                <div class="ai-option-subtitle">Search within the last 30 days</div>
            </div>
        `;
        optionsSection.appendChild(thisMonthOption);
        
        // Add separator
        const separator2 = document.createElement('div');
        separator2.className = 'ai-source-separator';
        optionsSection.appendChild(separator2);
        
        // Add CUSTOM DATE option
        const customDateOption = document.createElement('div');
        customDateOption.className = 'ai-option ai-custom-date-option';
        customDateOption.dataset.value = 'custom';
        customDateOption.innerHTML = `
            <i class="material-icons">date_range</i>
            <div class="ai-option-content">
                <div class="ai-option-title">CUSTOM RANGE</div>
                <div class="ai-option-subtitle">Select a specific date range</div>
            </div>
        `;
        optionsSection.appendChild(customDateOption);
        
        // Add custom date section (initially hidden)
        const customDateSection = document.createElement('div');
        customDateSection.id = 'custom-date-section';
        customDateSection.className = 'ai-custom-date-section';
        customDateSection.style.display = 'none';
        customDateSection.innerHTML = `
            <div class="ai-date-inputs">
                <div class="ai-date-input-group">
                    <label>Start Date</label>
                    <input type="date" id="date-start" class="ai-date-input" />
                </div>
                <div class="ai-date-input-group">
                    <label>End Date</label>
                    <input type="date" id="date-end" class="ai-date-input" />
                </div>
            </div>
            <button class="ai-apply-date-range">
                <i class="material-icons">check</i>
                Apply Range
            </button>
        `;
        optionsSection.appendChild(customDateSection);
        
        // Assemble the dropdown
        container.appendChild(header);
        container.appendChild(optionsSection);
        
        // Add click handlers
        optionsSection.querySelectorAll('.ai-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                if (value === 'custom') {
                    // Show custom date section
                    customDateSection.style.display = 'block';
                    // Focus on start date input
                    const startInput = customDateSection.querySelector('#date-start');
                    if (startInput) {
                        setTimeout(() => {
                            startInput.focus();
                            if (startInput.showPicker) {
                                try {
                                    startInput.showPicker();
                                } catch (e) {
                                    console.log('Date picker not available, using fallback');
                                }
                            }
                        }, 100);
                    }
                } else {
                    // Handle preset date ranges
                    this.handleDateSelection(value);
                    this.closeAllDropdowns();
                }
            });
        });
        
        // Add apply button handler
        const applyButton = customDateSection.querySelector('.ai-apply-date-range');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                const startInput = customDateSection.querySelector('#date-start');
                const endInput = customDateSection.querySelector('#date-end');
                
                if (startInput && endInput && startInput.value && endInput.value) {
                    this.selectedDate = {
                        type: 'custom',
                        start: startInput.value,
                        end: endInput.value,
                        preset: null
                    };
                    
                    // Update UI
                    const dateField = document.getElementById('ai-field-date');
                    if (dateField) {
                        dateField.textContent = this.getEnhancedDateDisplayText();
                        dateField.classList.remove('empty');
                    }
                    
                    this.closeAllDropdowns();
                }
            });
        }
        
        return container;
    }

    /**
     * Display a location on the map
     * @param {Array} bbox - Bounding box coordinates [minLon, minLat, maxLon, maxLat]
     * @param {string} name - Location name
     * @param {string} category - Location category
     */
    displayLocationOnMap(bbox, name, category) {
        if (!this.mapManager || !bbox) return;

        try {
            // Clear any previous location geometry
            this.clearPreviousLocationGeometry();

            // Create a unique ID for this location
            const locationId = `location-${Date.now()}`;

            // Create GeoJSON geometry for the location
            const [west, south, east, north] = bbox;
            const locationGeometry = {
                type: 'Feature',
                properties: {
                    name: name,
                    category: category,
                    type: 'location_geometry'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south],
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                }
            };

            // Add the geometry to the map using the beautiful geometry layer
            if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                this.mapManager.addBeautifulGeometryLayer(locationGeometry, locationId);
                console.log('✅ Added beautiful geometry layer:', locationId);
            } else if (typeof this.mapManager.addGeoJsonLayer === 'function') {
                this.mapManager.addGeoJsonLayer(locationGeometry, locationId);
                console.log('✅ Added GeoJSON layer:', locationId);
            } else {
                console.warn('Map manager does not support adding geometry layers');
                return;
            }

            // Store the current location ID for later clearing
            this.currentLocationLayerId = locationId;

            // Fit map to the bounding box
            if (typeof this.mapManager.fitToBounds === 'function') {
                this.mapManager.fitToBounds(bbox, {
                    padding: 50,
                    maxZoom: 16,
                    duration: 1000
                });
            } else if (typeof this.mapManager.fitMapToBbox === 'function') {
                this.mapManager.fitMapToBbox(bbox);
            } else {
                console.warn('Map zoom method not found');
            }

            // Show success notification
            if (this.notificationService) {
                this.notificationService.showNotification(`Location displayed: ${name}`, 'success');
            }
        } catch (error) {
            console.error('Error displaying location on map:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Error displaying location on map', 'error');
            }
        }
    }

    /**
     * Search for locations using geocoding service
     * @param {string} query - Search query
     */
    searchLocations(query, resultsContainer = null) {
        if (!query || query.length < 2) {
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            } else {
                const fallbackContainer = document.querySelector('.ai-location-search-results');
                if (fallbackContainer) {
                    fallbackContainer.style.display = 'none';
                    fallbackContainer.innerHTML = '';
                }
            }
            return;
        }

        // Clear previous timeout
        if (this.locationSearchTimeout) {
            clearTimeout(this.locationSearchTimeout);
        }

        // Set new timeout for search
        this.locationSearchTimeout = setTimeout(() => {
            this.geocodingService.geocodeLocation(query).then(results => {
                const targetContainer = resultsContainer || document.querySelector('.ai-location-search-results');
                if (!targetContainer) {
                    console.error('❌ Location results container not found in dropdown');
                    return;
                }

                if (!results || results.length === 0) {
                    targetContainer.innerHTML = '<div class="ai-no-results"><i class="material-icons">search_off</i><p>No locations found</p></div>';
                    targetContainer.style.display = 'block';
                    return;
                }

                // Clear previous results
                targetContainer.innerHTML = '';
                targetContainer.style.display = 'block';

                // Add each result with proper click handling
                results.slice(0, 8).forEach((result, index) => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'ai-location-result-item';
                    resultItem.setAttribute('role', 'option');
                    resultItem.setAttribute('tabindex', '0');
                    resultItem.dataset.index = index;

                    // Extract location data
                    const locationName = result.shortName || result.name || result.display_name;
                    const displayName = result.formattedName || result.display_name || locationName;
                    
                    // Extract country from address if available
                    const country = result.address?.country || '';
                    const countryCode = result.address?.country_code?.toUpperCase() || '';
                    
                    // Get appropriate emoji for location type
                    const emoji = this.getLocationEmoji(result.category, result.type, result.class);
                    
                    // Format display with emoji, name, and country
                    const formattedName = locationName || result.name || 'Unknown Location';
                    const locationDisplay = country ? `${emoji} ${formattedName}, ${country}` : `${emoji} ${formattedName}`;
                    
                    resultItem.innerHTML = `
                        <div class="ai-location-result-content">
                            <div class="ai-location-info">
                                <div class="ai-location-name">${locationDisplay}</div>
                                ${result.type ? `<div class="ai-location-type">${result.type}</div>` : ''}
                            </div>
                        </div>
                    `;

                    // Add comprehensive click handler
                    resultItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('🎯 Location result clicked:', result);
                        
                        this.handleLocationResultSelection(result, query, displayName);
                    });

                    // Add keyboard navigation
                    resultItem.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            resultItem.click();
                        }
                    });

                    // Add hover effects
                    resultItem.addEventListener('mouseenter', () => {
                        resultItem.classList.add('hovered');
                    });

                    resultItem.addEventListener('mouseleave', () => {
                        resultItem.classList.remove('hovered');
                    });

                    targetContainer.appendChild(resultItem);
                });
            }).catch(error => {
                console.error('Error searching locations:', error);
                if (targetContainer) {
                    targetContainer.innerHTML = '<div class="ai-error"><i class="material-icons">error</i><p>Search error</p></div>';
                    targetContainer.style.display = 'block';
                }
            });
        }, 300); // Debounce search for 300ms
    }

    /**
     * Get appropriate emoji for location type
     * @param {string} category - Location category
     * @param {string} type - Location type
     * @param {string} className - Location class
     * @returns {string} Emoji representing the location type
     */
    getLocationEmoji(category, type, className) {
        // Country emojis
        if (category === 'country' || type === 'country') {
            return '🌍';
        }
        
        // State/Province emojis
        if (category === 'state' || type === 'state') {
            return '🗺️';
        }
        
        // City and town emojis
        if (category === 'city' || type === 'city') {
            return '🏙️';
        }
        if (category === 'town' || type === 'town') {
            return '🏘️';
        }
        if (category === 'village' || type === 'village') {
            return '🏡';
        }
        if (category === 'hamlet' || type === 'hamlet') {
            return '🏠';
        }
        
        // Administrative areas
        if (category === 'administrative' || className === 'boundary') {
            return '📍';
        }
        
        // Natural features
        if (category === 'natural' || className === 'natural') {
            if (type === 'water' || type === 'bay' || type === 'lake') {
                return '🌊';
            }
            if (type === 'mountain' || type === 'peak') {
                return '🏔️';
            }
            if (type === 'forest' || type === 'wood') {
                return '🌲';
            }
            return '🌿';
        }
        
        // Neighborhoods and suburbs
        if (category === 'suburb' || category === 'neighborhood') {
            return '🏢';
        }
        
        // Islands
        if (type === 'island') {
            return '🏝️';
        }
        
        // Airports
        if (type === 'aerodrome' || className === 'aeroway') {
            return '✈️';
        }
        
        // Default location pin
        return '📍';
    }

    /**
     * Handle location result selection with proper cleanup
     * @param {Object} result - Selected location result
     * @param {string} query - Original search query
     * @param {string} displayName - Display name for the location
     */
    handleLocationResultSelection(result, query, displayName) {
        try {
            // Store the selected result with complete information
            this.selectedLocationResult = {
                ...result,
                display_name: displayName,
                shortName: result.shortName || result.name,
                formattedName: displayName,
                category: 'searched',
                originalQuery: query
            };

            // Store the bbox for search parameters
            let bbox = result.bbox;
            if (!bbox && result.boundingbox) {
                bbox = [
                    parseFloat(result.boundingbox[2]), // west (min_lon)
                    parseFloat(result.boundingbox[0]), // south (min_lat)
                    parseFloat(result.boundingbox[3]), // east (max_lon)
                    parseFloat(result.boundingbox[1])  // north (max_lat)
                ];
            }

            if (bbox) {
                this.selectedLocation = bbox;
                this.selectedLocationResult.bbox = bbox;
            }

            // Format display name with emoji for UI
            const emoji = this.getLocationEmoji(result.category, result.type, result.class);
            const formattedDisplayName = `${emoji} ${displayName}`;
            
            // Update the location display
            this.updateLocationDisplay(formattedDisplayName);

            // Display the location on the map
            if (bbox) {
                this.displayLocationOnMap(bbox, displayName, 'searched');
            }

            // Update search parameters
            this.updateSearchParameters();

            // Close all dropdowns with complete cleanup
            this.closeAllDropdowns();
            
            // Additional cleanup for inline dropdowns
            const resultsContainer = document.querySelector('.ai-location-search-results');
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            }

            // Clear the search input
            const searchInput = document.querySelector('.ai-location-search-input');
            if (searchInput) {
                searchInput.value = '';
            }

            // Show success notification
            if (this.notificationService) {
                this.notificationService.showNotification(`📍 Location selected: ${displayName}`, 'success');
            }

            console.log('✅ Location selection completed:', displayName);

        } catch (error) {
            console.error('❌ Error handling location selection:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Error selecting location', 'error');
            }
        }
    }

    /**
     * Process geometry input (WKT or GeoJSON)
     * @param {string} text - Geometry text
     * @param {string} format - Format of the geometry ('wkt' or 'geojson')
     */
    processGeometryInput(text, format) {
        try {
            let geojson;
            let bbox;

            if (format === 'wkt') {
                if (!isWKT(text)) {
                    throw new Error('Invalid WKT format');
                }
                geojson = wktToGeoJSON(text);
            } else if (format === 'geojson') {
                if (!isGeoJSON(text)) {
                    throw new Error('Invalid GeoJSON format');
                }
                geojson = parseGeoJSON(text);
            }

            if (geojson) {
                bbox = geojsonToBbox(geojson);
                
                // Store the location
                this.selectedLocation = bbox;
                this.selectedLocationResult = {
                    formattedName: 'CUSTOM GEOMETRY',
                    shortName: 'CUSTOM GEOMETRY',
                    bbox: bbox,
                    category: 'pasted',
                    geojson: geojson,
                    wkt: text
                };

                // Update the display
                this.updateLocationDisplay('CUSTOM GEOMETRY', 'pasted');

                // Display on map
                if (this.mapManager) {
                    this.displayLocationOnMap(bbox, 'CUSTOM GEOMETRY', 'pasted');
                }

                // Update search parameters
                this.updateSearchParameters();

                // Close any open dropdowns
                this.closeAllDropdowns();

                // Emit state change event
                this.emitStateChangeEvent();

                // Show success notification
                if (this.notificationService) {
                    this.notificationService.showNotification('Geometry successfully added', 'success');
                }
            }
        } catch (error) {
            console.error('Error processing geometry input:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Error processing geometry: ' + error.message, 'error');
            }
        }
    }

    /**
     * Clear previous location geometry from map
     */
    clearPreviousLocationGeometry() {
        if (this.currentLocationLayerId && this.mapManager) {
            try {
                // Try different methods to remove the layer
                if (typeof this.mapManager.removeLayer === 'function') {
                    this.mapManager.removeLayer(this.currentLocationLayerId);
                } else if (typeof this.mapManager.removeGeoJsonLayer === 'function') {
                    this.mapManager.removeGeoJsonLayer(this.currentLocationLayerId);
                } else if (typeof this.mapManager.removeGeometryLayer === 'function') {
                    this.mapManager.removeGeometryLayer(this.currentLocationLayerId);
                } else if (this.mapManager.map) {
                    // Direct mapbox-gl method
                    const map = this.mapManager.map;
                    if (map.getLayer(this.currentLocationLayerId)) {
                        map.removeLayer(this.currentLocationLayerId);
                    }
                    if (map.getSource(this.currentLocationLayerId)) {
                        map.removeSource(this.currentLocationLayerId);
                    }
                }
                console.log('✅ Cleared previous location geometry:', this.currentLocationLayerId);
            } catch (error) {
                console.warn('Warning: Could not clear previous location geometry:', error);
            }
            this.currentLocationLayerId = null;
        }
    }

    /**
     * Update search parameters with current selections
     */
    updateSearchParameters() {
        try {
            // Create search parameters object
            const params = {
                collection: this.selectedCollection || null,
                bbox: this.selectedLocation || null,
                datetime: this.getDateRangeString(),
                cloudCover: this.cloudCover || null
            };

            // Update the search panel if available
            if (this.searchPanel && typeof this.searchPanel.updateSearchParameters === 'function') {
                this.searchPanel.updateSearchParameters(params);
            }

            // Emit state change event
            const event = new CustomEvent('searchParameterChanged', {
                detail: {
                    collection: params.collection,
                    locationBbox: params.bbox,
                    locationName: this.selectedLocationResult?.shortName || this.selectedLocationResult?.formattedName,
                    dateType: this.selectedDate?.type,
                    dateStart: this.selectedDate?.start,
                    dateEnd: this.selectedDate?.end,
                    cloudCover: params.cloudCover
                },
                bubbles: true
            });
            document.dispatchEvent(event);

            console.log('✅ Updated search parameters:', params);
        } catch (error) {
            console.error('Error updating search parameters:', error);
        }
    }

    /**
     * Get date range string for search parameters
     */
    getDateRangeString() {
        if (!this.selectedDate || this.selectedDate.type === 'anytime') {
            return null;
        }

        const start = this.selectedDate.start;
        const end = this.selectedDate.end;

        if (start && end) {
            return `${start}/${end}`;
        } else if (start) {
            return `${start}/..`;
        } else if (end) {
            return `../${end}`;
        }

        return null;
    }

    /**
     * Update location display in the search menu
     * @param {string} displayName - Name to display
     * @param {string} category - Category of the location
     */
    updateLocationDisplay(displayName, category = 'location') {
        try {
            // Update the main location field
            const locationField = document.getElementById('ai-field-location');
            if (locationField) {
                locationField.textContent = displayName.toUpperCase();
                locationField.classList.remove('empty');
            }

            // Update the inline location field if it exists
            const inlineLocationField = document.getElementById('ai-field-location-inline');
            if (inlineLocationField) {
                inlineLocationField.textContent = displayName.toUpperCase();
                inlineLocationField.classList.remove('empty');
            }

            // Update the search summary if it exists
            const searchSummary = document.querySelector('.search-summary-item[data-field="location"] .search-summary-value');
            if (searchSummary) {
                searchSummary.textContent = displayName.toUpperCase();
            }

            // Update the bbox input if it exists
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput && this.selectedLocation && Array.isArray(this.selectedLocation)) {
                bboxInput.value = this.selectedLocation.join(',');
                bboxInput.dispatchEvent(new Event('change'));
            }

            // Update the location search input if it exists
            const locationSearchInput = document.querySelector('.ai-location-search-input');
            if (locationSearchInput) {
                locationSearchInput.value = '';
            }

            // Close any open dropdowns
            this.closeAllDropdowns();

            console.log('✅ Updated location display:', displayName);
        } catch (error) {
            console.error('Error updating location display:', error);
        }
    }

    /**
     * Handle draw on map completion
     * @param {Array} bbox - Bounding box coordinates
     */
    handleDrawOnMap(bbox) {
        if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
            console.warn('Invalid bbox from draw:', bbox);
            return;
        }

        try {
            // Store the location
            this.selectedLocation = bbox;
            this.selectedLocationResult = {
                formattedName: 'MAP SELECTION',
                shortName: 'MAP SELECTION',
                bbox: bbox,
                category: 'drawn'
            };

            // Update the display
            this.updateLocationDisplay('MAP SELECTION', 'drawn');

            // Display on map
            if (this.mapManager) {
                this.displayLocationOnMap(bbox, 'MAP SELECTION', 'drawn');
            }

            // Update search parameters
            this.updateSearchParameters();

            // Show success notification
            if (this.notificationService) {
                this.notificationService.showNotification('Map selection added', 'success');
            }
        } catch (error) {
            console.error('Error handling draw on map:', error);
            if (this.notificationService) {
                this.notificationService.showNotification('Error adding map selection', 'error');
            }
        }
    }

    /**
     * Create location dropdown with search functionality
     * @returns {HTMLElement} The dropdown content
     */
    createLocationDropdown() {
        // Create main container
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'ai-dropdown-content';
        
        // Create header with close button
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <div class="ai-dropdown-header-content">
                <i class="material-icons">place</i>
                <span>Select Location</span>
            </div>
            <button class="ai-dropdown-close" title="Close">
                <i class="material-icons">close</i>
            </button>
        `;
        dropdownContent.appendChild(header);
        
        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'ai-location-search-container';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ai-location-search-input';
        searchInput.placeholder = 'Search locations...';
        searchInput.setAttribute('aria-label', 'Search locations');
        searchContainer.appendChild(searchInput);
        
        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'ai-location-search-results';
        resultsContainer.style.display = 'none';
        searchContainer.appendChild(resultsContainer);
        
        // Add search container to dropdown
        dropdownContent.appendChild(searchContainer);
        
        // Create separator
        const separator = document.createElement('div');
        separator.className = 'ai-source-separator';
        dropdownContent.appendChild(separator);
        
        // Create options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add predefined options
        const predefinedOptions = [
            { 
                id: 'everywhere', 
                text: '🌍 Worldwide', 
                icon: 'public',
                subtitle: 'Search globally without location limits'
            },
            { 
                id: 'draw', 
                text: 'Draw on Map', 
                icon: 'edit_location',
                subtitle: 'Draw a bounding box or area on the map'
            },
            { 
                id: 'paste', 
                text: 'Paste WKT/GeoJSON', 
                icon: 'content_paste',
                subtitle: 'Paste geometry data from clipboard'
            }
        ];
        
        predefinedOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'ai-option ai-location-option';
            optionElement.dataset.value = option.id;
            
            optionElement.innerHTML = `
                <i class="material-icons">${option.icon}</i>
                <div class="ai-option-content">
                    <div class="ai-option-title">${option.text}</div>
                    <div class="ai-option-subtitle">${option.subtitle}</div>
                </div>
            `;
            
            // Add click handler for each option
            optionElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.handleLocationOptionClick(option.id);
                this.closeAllDropdowns();
            });
            
            optionsSection.appendChild(optionElement);
        });
        
        dropdownContent.appendChild(optionsSection);
        
        // Set up search input handler with proper debouncing
        this.setupLocationSearchInput(searchInput, resultsContainer);
        
        return dropdownContent;
    }

    /**
     * Set up location search input with proper event handling
     * @param {HTMLElement} searchInput - Search input element
     * @param {HTMLElement} resultsContainer - Results container element
     */
    setupLocationSearchInput(searchInput, resultsContainer) {
        let searchTimeout;
        let selectedIndex = -1;
        
        // Input handler for search
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            selectedIndex = -1; // Reset selection
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                return;
            }
            
            // Show loading state
            resultsContainer.innerHTML = '<div class="ai-location-loading"><i class="material-icons spinning">refresh</i> Searching...</div>';
            resultsContainer.style.display = 'block';
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                this.searchLocations(query, resultsContainer);
            }, 300);
        });
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            const results = resultsContainer.querySelectorAll('.ai-location-result-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (results.length > 0) {
                        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                        this.updateSelectedResult(results, selectedIndex);
                    }
                    break;
                
                case 'ArrowUp':
                    e.preventDefault();
                    if (results.length > 0) {
                        selectedIndex = Math.max(selectedIndex - 1, -1);
                        this.updateSelectedResult(results, selectedIndex);
                    }
                    break;
                
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && results[selectedIndex]) {
                        results[selectedIndex].click();
                    }
                    break;
                
                case 'Escape':
                    e.preventDefault();
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'none';
                    selectedIndex = -1;
                    this.closeAllDropdowns();
                    break;
            }
        });
        
        // Focus handler
        searchInput.addEventListener('focus', () => {
            console.log('🔍 Location search input focused');
        });
    }

    /**
     * Handle location option clicks (everywhere, draw, paste)
     * @param {string} optionId - Option identifier
     */
    handleLocationOptionClick(optionId) {
        console.log(`📍 Location option clicked: ${optionId}`);
        
        switch (optionId) {
            case 'everywhere':
                this.selectedLocation = 'everywhere';
                this.selectedLocationResult = null;
                this.clearPreviousLocationGeometry();
                this.updateLocationDisplay('🌍 Worldwide');
                if (this.notificationService) {
                    this.notificationService.showNotification('🌍 Location set to Worldwide', 'success');
                }
                break;
                
            case 'draw':
                this.closeAllDropdowns();
                if (this.mapManager && typeof this.mapManager.startDrawingBbox === 'function') {
                    // Update location display to show drawing in progress
                    this.updateLocationDisplay('🖊️ Drawing...');
                    
                    if (this.notificationService) {
                        this.notificationService.showNotification('🖊️ Click two points on the map to draw a bounding box', 'info');
                    }
                    
                    this.mapManager.startDrawingBbox((bbox) => {
                        if (bbox && bbox.length === 4) {
                            this.selectedLocation = bbox;
                            this.selectedLocationResult = {
                                formattedName: 'MAP SELECTION',
                                shortName: 'MAP SELECTION',
                                bbox: bbox,
                                category: 'drawn'
                            };
                            this.displayLocationOnMap(bbox, 'MAP SELECTION', 'drawn');
                            this.updateLocationDisplay('MAP SELECTION');
                            
                            if (this.notificationService) {
                                this.notificationService.showNotification('✅ Location drawn on map', 'success');
                            }
                        }
                    });
                } else {
                    if (this.notificationService) {
                        this.notificationService.showNotification('⚠️ Map drawing not available', 'warning');
                    }
                }
                return; // Don't close dropdown yet for draw option
                
            case 'paste':
                this.closeAllDropdowns();
                if (this.notificationService) {
                    this.notificationService.showNotification('📋 Paste WKT or GeoJSON anywhere - it will be detected automatically!', 'info');
                }
                this.setupTemporaryPasteListener();
                return; // Don't close dropdown yet for paste option
        }
    }

    /**
     * Set up temporary paste listener for geometry input
     */
    setupTemporaryPasteListener() {
        const pasteHandler = (event) => {
            try {
                const pastedText = (event.clipboardData || window.clipboardData).getData('text');
                
                if (pastedText && pastedText.trim()) {
                    console.log('📋 Geometry pasted, processing...', pastedText.substring(0, 100));
                    
                    // Try to process the geometry
                    this.processGeometryInput(pastedText.trim(), this.detectGeometryFormat(pastedText.trim()));
                    
                    // Remove the temporary listener
                    document.removeEventListener('paste', pasteHandler);
                    
                    if (this.notificationService) {
                        this.notificationService.showNotification('✅ Geometry processed successfully', 'success');
                    }
                }
            } catch (error) {
                console.error('❌ Error processing pasted geometry:', error);
                if (this.notificationService) {
                    this.notificationService.showNotification('❌ Invalid geometry format', 'error');
                }
                // Remove the listener on error too
                document.removeEventListener('paste', pasteHandler);
            }
        };
        
        document.addEventListener('paste', pasteHandler);
        
        // Clean up listener after 30 seconds
        setTimeout(() => {
            document.removeEventListener('paste', pasteHandler);
        }, 30000);
    }

    /**
     * Detect geometry format (WKT or GeoJSON)
     * @param {string} text - Geometry text
     * @returns {string} Format ('wkt' or 'geojson')
     */
    detectGeometryFormat(text) {
        const trimmed = text.trim();
        
        // Check for GeoJSON (starts with { or [)
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return 'geojson';
        }
        
        // Check for WKT patterns
        const wktPatterns = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(/i;
        if (wktPatterns.test(trimmed)) {
            return 'wkt';
        }
        
        // Default to GeoJSON for JSON-like content
        return 'geojson';
    }

    /**
     * Update the selected result in the list
     * @param {NodeList} results - List of result elements
     * @param {number} index - Index of selected result
     */
    updateSelectedResult(results, index) {
        results.forEach((result, i) => {
            if (i === index) {
                result.classList.add('selected');
                result.scrollIntoView({ block: 'nearest' });
            } else {
                result.classList.remove('selected');
            }
        });
    }

    /**
     * Emit state change event
     */
    emitStateChangeEvent() {
        // Implement the logic to emit a state change event
        console.log('State change event emitted');
    }

    /**
     * Close all open dropdowns
     */
    closeAllDropdowns() {
        try {
            // Close location dropdown
            const locationDropdown = document.querySelector('.location-dropdown');
            if (locationDropdown) {
                locationDropdown.style.display = 'none';
            }

            // Clear and hide results container
            const resultsContainer = document.querySelector('.ai-location-results');
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            }

            // Remove active states
            const locationSummary = document.getElementById('summary-location');
            if (locationSummary) {
                locationSummary.classList.remove('dropdown-active');
            }

            // Clear search input
            const searchInput = document.querySelector('.ai-location-search-input');
            if (searchInput) {
                searchInput.value = '';
            }

            console.log('✅ All dropdowns closed');
        } catch (error) {
            console.error('Error closing dropdowns:', error);
        }
    }

    /**
     * Set up collection dropdown events with enhanced search
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupCollectionDropdownEvents(dropdown) {
        try {
            // Handle collection option clicks
            dropdown.addEventListener('click', (e) => {
                const option = e.target.closest('.ai-option');
                if (option && option.dataset.value !== undefined) {
                    const collectionId = option.dataset.value;
                    const collectionSource = option.dataset.source;
                    
                    if (collectionId === '') {
                        // Everything option
                        this.selectedCollection = null;
                        this.selectedCollectionSource = null;
                        this.updateSearchSummary('collection', '📂 Everything');
                    } else {
                        // Specific collection
                        this.selectedCollection = collectionId;
                        this.selectedCollectionSource = collectionSource;
                        
                        const collectionTitle = option.querySelector('.ai-option-title').textContent;
                        this.updateSearchSummary('collection', collectionTitle);
                    }
                    
                    // Update field display
                    const collectionField = document.getElementById('ai-field-collection');
                    if (collectionField) {
                        if (collectionId === '') {
                            collectionField.textContent = '📂 Everything';
                            collectionField.classList.add('empty');
                        } else {
                            const title = option.querySelector('.ai-option-title');
                            if (title) {
                                collectionField.textContent = title.textContent;
                                collectionField.classList.remove('empty');
                            }
                        }
                    }
                    
                    this.closeAllDropdowns();
                }
                
                // Handle details button clicks
                const detailsBtn = e.target.closest('.ai-option-details');
                if (detailsBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const collectionId = detailsBtn.dataset.collectionId;
                    const collectionSource = detailsBtn.dataset.collectionSource;
                    
                    if (collectionId && this.allAvailableCollections) {
                        const collection = this.allAvailableCollections
                            .find(c => c.id === collectionId && c.source === collectionSource);
                        if (collection) {
                            this.showCollectionDetails(collection);
                        }
                    }
                }
            });
            
            // Handle search input with enhanced filtering
            const searchInput = dropdown.querySelector('.ai-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterCollections(e.target.value, dropdown);
                });
                
                // Focus the search input when dropdown opens
                setTimeout(() => {
                    searchInput.focus();
                }, 100);
            }
            
            console.log('✅ Collection dropdown events set up with enhanced search');
            
        } catch (error) {
            console.error('❌ Error setting up collection dropdown events:', error);
        }
    }

    /**
     * Filter collections in dropdown with enhanced search
     * @param {string} query - Search query
     * @param {HTMLElement} dropdown - Dropdown container
     */
    filterCollections(query, dropdown) {
        try {
            const options = dropdown.querySelectorAll('.ai-option[data-value]:not(.ai-everything-option)');
            const normalizedQuery = query.toLowerCase().trim();
            
            let visibleCount = 0;
            
            // Always show the "Everything" option
            const everythingOption = dropdown.querySelector('.ai-everything-option');
            if (everythingOption) {
                everythingOption.style.display = 'flex';
                if (!normalizedQuery) visibleCount++; // Count it when no query
            }
            
            // Track visible collections by source
            const sourceVisibility = {};
            
            options.forEach(option => {
                const collectionId = option.dataset.value?.toLowerCase() || '';
                const title = option.querySelector('.ai-option-title')?.textContent?.toLowerCase() || '';
                const subtitle = option.querySelector('.ai-option-subtitle')?.textContent?.toLowerCase() || '';
                
                // Find the actual collection object for more detailed search
                let collectionDescription = '';
                let collectionKeywords = '';
                let collection = null;
                
                if (this.allAvailableCollections && collectionId) {
                    // Try to find collection by ID - handle case sensitivity and exact match
                    collection = this.allAvailableCollections.find(c => 
                        c.id && c.id.toLowerCase() === collectionId
                    );
                    
                    if (collection) {
                        collectionDescription = (collection.description || '').toLowerCase();
                        collectionKeywords = (collection.keywords || []).join(' ').toLowerCase();
                    }
                }
                
                // Enhanced matching: search in ID, title, subtitle, description, keywords, and source
                const matches = !normalizedQuery || // Show all if no query
                              collectionId.includes(normalizedQuery) ||
                              title.includes(normalizedQuery) ||
                              subtitle.includes(normalizedQuery) ||
                              collectionDescription.includes(normalizedQuery) ||
                              collectionKeywords.includes(normalizedQuery) ||
                              (collection && collection.source && collection.source.toLowerCase().includes(normalizedQuery));
                
                if (matches) {
                    option.classList.remove('filtered-hidden');
                    visibleCount++;
                    
                    // Track which sources have visible collections
                    if (collection && collection.source) {
                        sourceVisibility[collection.source] = true;
                    }
                } else {
                    option.classList.add('filtered-hidden');
                }
                
                // Debug logging for specific search terms
                if (normalizedQuery === 'rtc' && collection) {
                    console.log(`🔍 Checking collection for 'rtc':`, {
                        id: collection.id,
                        title: collection.title,
                        description: collection.description,
                        keywords: collection.keywords,
                        source: collection.source,
                        matches: matches
                    });
                }
            });
            
            // Hide/show source group headers based on whether they have visible collections
            const sourceHeaders = dropdown.querySelectorAll('.ai-source-group-header');
            sourceHeaders.forEach(header => {
                const headerText = header.textContent.toLowerCase();
                let hasVisibleCollections = false;
                
                // Check if this source has any visible collections
                Object.keys(sourceVisibility).forEach(source => {
                    const sourceDisplayName = this.getSourceDisplayName ? 
                        this.getSourceDisplayName(source).toLowerCase() : 
                        source.toLowerCase();
                    
                    if (headerText.includes(sourceDisplayName) || 
                        sourceDisplayName.includes(headerText.replace(/\s+sources?$/i, ''))) {
                        hasVisibleCollections = true;
                    }
                });
                
                // Also check if this is for a source mentioned in the search query
                if (normalizedQuery && headerText.includes(normalizedQuery)) {
                    hasVisibleCollections = true;
                }
                
                if (hasVisibleCollections || !normalizedQuery) {
                    header.classList.remove('filtered-hidden');
                } else {
                    header.classList.add('filtered-hidden');
                }
            });
            
            // Update header count
            const header = dropdown.querySelector('.ai-dropdown-header span');
            if (header && normalizedQuery) {
                const total = this.allAvailableCollections ? 
                             this.allAvailableCollections.length : 0;
                header.textContent = `Search Results (${visibleCount} of ${total + 1})`; // +1 for Everything option
            } else if (header) {
                header.textContent = 'Select Data Source';
            }
            
            console.log(`🔍 Filtered collections: ${visibleCount} matches for "${query}"`);
            
            // Log debug info for troubleshooting
            if (normalizedQuery && visibleCount === 0) {
                console.warn(`⚠️ No collections found for query: "${normalizedQuery}"`);
                console.log('Available collections:', this.allAvailableCollections?.map(c => ({
                    id: c.id,
                    title: c.title
                })));
            }
            
        } catch (error) {
            console.error('❌ Error filtering collections:', error);
        }
    }

    /**
     * Set up location dropdown events
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupLocationDropdownEvents(dropdown) {
        console.log('📍 Location dropdown events setup');
        
        // Auto-focus the search input when location dropdown opens
        const searchInput = dropdown.querySelector('.ai-location-search-input');
        if (searchInput) {
            // Small delay to ensure dropdown is fully rendered
            setTimeout(() => {
                searchInput.focus();
                console.log('🎯 Auto-focused location search input');
            }, 100);
        }
    }

    /**
     * Set up date dropdown events
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupDateDropdownEvents(dropdown) {
        // This method can be implemented if needed for date dropdown events
        console.log('📅 Date dropdown events setup (placeholder)');
    }

    /**
     * Set up parameters dropdown events
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupParametersDropdownEvents(dropdown) {
        // This method can be implemented if needed for parameters dropdown events
        console.log('⚙️ Parameters dropdown events setup (placeholder)');
    }
}
