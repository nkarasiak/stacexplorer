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
        
        // Location search state
        this.locationSearchResults = [];
        this.selectedLocationResult = null;
        this.locationSearchTimeout = null;
        
        // Selected parameters
        this.selectedCollection = "";
        this.selectedLocation = "everywhere";
        this.selectedDate = {
            type: "anytime",
            start: null,
            end: null,
            preset: null
        };
        this.cloudCover = 20;
        
        this.activeField = null;
        
        // Collections loaded from all data sources
        this.allAvailableCollections = null;
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
        const allCollections = [];
        
        // Dynamically get all available data sources from config
        const availableDataSources = this.getAvailableDataSources();
        const dataSources = availableDataSources.length > 0 ? availableDataSources : ['copernicus', 'element84'];
        
        console.log('🔄 Loading collections from ALL available data sources...');
        console.log('📡 Available data sources:', dataSources);
        
        for (const source of dataSources) {
            try {
                console.log(`🔍 Loading collections from ${source}...`);
                
                // Get endpoints for this source
                const endpoints = window.stacExplorer?.config?.stacEndpoints?.[source];
                if (!endpoints) {
                    console.warn(`⚠️ No endpoints configured for ${source}`);
                    continue;
                }
                
                // Set API client to use this source
                this.apiClient.setEndpoints(endpoints);
                
                // Fetch collections from this source
                const collections = await this.apiClient.fetchCollections();
                
                // Add source information to each collection
                const collectionsWithSource = collections.map(collection => ({
                    ...collection,
                    source: source,
                    sourceLabel: source === 'copernicus' ? 'Copernicus' : 'Element84',
                    displayTitle: `${collection.title || collection.id}`
                }));
                
                allCollections.push(...collectionsWithSource);
                console.log(`✅ Loaded ${collections.length} collections from ${source}`);
                
            } catch (error) {
                console.error(`❌ Error loading collections from ${source}:`, error);
                // Continue with other sources even if one fails
            }
        }
        
        console.log(`🗂️ Total collections loaded from ALL sources: ${allCollections.length}`);
        console.log(`📊 EVERYTHING mode: Collections from ${dataSources.length} data sources`);
        return allCollections;
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
            
            // Get all configured data sources except 'custom' and 'local' unless they're properly configured
            const allSources = Object.keys(config.stacEndpoints);
            const validSources = allSources.filter(source => {
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
     */
    async showMinimalistSearch() {
        try {
            console.log('🤖 Showing Enhanced AI Smart Search...');
            
            // Show interface immediately
            this.createAndShowInterface();
            
            // Load collections in background
            this.loadCollectionsInBackground();
            
        } catch (error) {
            console.error('❌ Error showing AI minimalist search:', error);
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
                          data-placeholder="EVERYTHING">${this.selectedCollection ? this.getCollectionDisplayName(this.selectedCollection) : 'EVERYTHING'}</span>
                    over 
                    <span class="ai-field ${this.selectedLocation === 'everywhere' ? 'empty' : ''}" 
                          id="ai-field-location" 
                          data-placeholder="THE WORLD">${this.selectedLocation === 'everywhere' ? 'THE WORLD' : 'Custom Location'}</span>
                    at 
                    <span class="ai-field ${this.selectedDate.type === 'anytime' ? 'empty' : ''}" 
                          id="ai-field-date" 
                          data-placeholder="ANYTIME">${this.getEnhancedDateDisplayText()}</span>
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
        // Close any existing dropdown
        this.closeAllDropdowns();
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'ai-dropdown-enhanced';
        dropdown.setAttribute('data-type', type);
        
        // Add content
        dropdown.appendChild(dropdownContent);
        
        // Add to document
        document.body.appendChild(dropdown);
        
        // Store reference
        this.currentDropdown = dropdown;
        this.activeField = field;
        
        // Position dropdown relative to field
        this.positionDropdownNearField(dropdown, field);
        
        // Add active state to field
        field.classList.add('active');
        
        // Focus first interactive element
        const firstInput = dropdown.querySelector('input, button, [tabindex]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        console.log(`✅ Showed ${type} dropdown with enhanced positioning`);
    }
    
    /**
     * Position dropdown near the clicked field with smart collision detection
     * @param {HTMLElement} dropdown - Dropdown element
     * @param {HTMLElement} field - Field element
     */
    positionDropdownNearField(dropdown, field) {
        const fieldRect = field.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Initial positioning below the field
        let top = fieldRect.bottom + 8;
        let left = fieldRect.left + (fieldRect.width / 2);
        
        // Show dropdown to measure its dimensions
        dropdown.style.position = 'fixed';
        dropdown.style.visibility = 'hidden';
        dropdown.style.display = 'block';
        dropdown.style.zIndex = '1200';
        
        const dropdownRect = dropdown.getBoundingClientRect();
        
        // Adjust horizontal position to center on field but keep in viewport
        left = left - (dropdownRect.width / 2);
        
        // Ensure dropdown doesn't go off screen horizontally
        if (left < 10) {
            left = 10;
        } else if (left + dropdownRect.width > viewportWidth - 10) {
            left = viewportWidth - dropdownRect.width - 10;
        }
        
        // Check if dropdown would go off screen vertically
        if (top + dropdownRect.height > viewportHeight - 10) {
            // Position above the field instead
            top = fieldRect.top - dropdownRect.height - 8;
            
            // If still doesn't fit, position at top of viewport
            if (top < 10) {
                top = 10;
            }
        }
        
        // Apply final position
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.visibility = 'visible';
        
        // Add positioning class for animations
        dropdown.classList.add('positioned');
        
        console.log(`📍 Positioned dropdown at (${left}, ${top}) for field at (${fieldRect.left}, ${fieldRect.top})`);
    }
    
    /**
     * Create minimalist collection dropdown
     * @returns {HTMLElement} Collection dropdown content
     */
    createCollectionDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        const collections = this.allAvailableCollections || [];
        console.log(`🎯 Creating collection dropdown. Total collections: ${collections.length}, Show all: ${this.showAllCollections}`);
        console.log(`📊 Collections by source:`, collections.reduce((acc, c) => {
            acc[c.source] = (acc[c.source] || 0) + 1;
            return acc;
        }, {}));
        
        // Sort collections: Element84 first (fewer items, easier to find), then Copernicus
        const sortedCollections = [...collections].sort((a, b) => {
            // First sort by source: element84 first, then copernicus
            if (a.source !== b.source) {
                if (a.source === 'element84') return -1;
                if (b.source === 'element84') return 1;
                if (a.source === 'copernicus') return -1;
                if (b.source === 'copernicus') return 1;
            }
            // Then sort by title within each source
            return (a.displayTitle || a.title || a.id).localeCompare(b.displayTitle || b.title || b.id);
        });
        
        const initialDisplayLimit = 25;
        const collectionsToShow = this.showAllCollections ? sortedCollections : sortedCollections.slice(0, initialDisplayLimit);
        
        console.log(`📋 Showing ${collectionsToShow.length} collections (limit: ${this.showAllCollections ? 'none' : initialDisplayLimit})`);
        
        // Group collections by source for display
        const groupedCollections = collectionsToShow.reduce((groups, collection) => {
            const source = collection.source || 'unknown';
            if (!groups[source]) {
                groups[source] = [];
            }
            groups[source].push(collection);
            return groups;
        }, {});
        
        // Create HTML for collections with source grouping
        let collectionsHTML = ''; 
        
        // Add EVERYTHING option at the top
        collectionsHTML += `
            <div class="ai-option ai-everything-option" data-value="" data-source="">
                <i class="material-icons">public</i>
                <div class="ai-option-content">
                    <div class="ai-option-title">EVERYTHING</div>
                    <div class="ai-option-subtitle">Search across all ${collections.length} collections</div>
                </div>
            </div>
            <div class="ai-source-separator"></div>
        `;
        
        if (Object.keys(groupedCollections).length > 0) {
            // Add Element84 collections first (if any)
            if (groupedCollections.element84) {
                collectionsHTML += `
                    <div class="ai-source-group-header">Element84 Collections (${groupedCollections.element84.length})</div>
                `;
                collectionsHTML += groupedCollections.element84.map(collection => `
                    <div class="ai-option" data-value="${collection.id}" data-source="${collection.source}">
                        <i class="material-icons">satellite</i>
                        <div class="ai-option-content">
                            <div class="ai-option-title">${collection.displayTitle}</div>
                            <div class="ai-option-subtitle">${collection.source}</div>
                        </div>
                        <button class="ai-option-details" data-collection-id="${collection.id}" data-collection-source="${collection.source}" title="View collection details">
                            <i class="material-icons">info</i>
                        </button>
                    </div>
                `).join('');
            }
            
            // Add Copernicus collections
            if (groupedCollections.copernicus) {
                if (groupedCollections.element84) {
                    collectionsHTML += `<div class="ai-source-separator"></div>`;
                }
                collectionsHTML += `
                    <div class="ai-source-group-header">Copernicus Collections (${groupedCollections.copernicus.length})</div>
                `;
                collectionsHTML += groupedCollections.copernicus.map(collection => `
                <div class="ai-option" data-value="${collection.id}" data-source="${collection.source}">
                <i class="material-icons">satellite</i>
                <div class="ai-option-content">
                <div class="ai-option-title">${collection.displayTitle}</div>
                <div class="ai-option-subtitle">${collection.source}</div>
                </div>
                    <button class="ai-option-details" data-collection-id="${collection.id}" data-collection-source="${collection.source}" title="View collection details">
                            <i class="material-icons">info</i>
                    </button>
                </div>
            `).join('');
            }
            
            // Add other sources if any
            Object.keys(groupedCollections).forEach(source => {
                if (source !== 'element84' && source !== 'copernicus') {
                    if (collectionsHTML) {
                        collectionsHTML += `<div class="ai-source-separator"></div>`;
                    }
                    collectionsHTML += `
                        <div class="ai-source-group-header">${source} Collections (${groupedCollections[source].length})</div>
                    `;
                    collectionsHTML += groupedCollections[source].map(collection => `
                        <div class="ai-option" data-value="${collection.id}" data-source="${collection.source}">
                            <i class="material-icons">satellite</i>
                            <div class="ai-option-content">
                                <div class="ai-option-title">${collection.displayTitle}</div>
                                <div class="ai-option-subtitle">${collection.source}</div>
                            </div>
                            <button class="ai-option-details" data-collection-id="${collection.id}" data-collection-source="${collection.source}" title="View collection details">
                                <i class="material-icons">info</i>
                            </button>
                        </div>
                    `).join('');
                }
            });
        } else {
            collectionsHTML = '<div class="ai-option-loading"><i class="material-icons">refresh</i> Loading collections...</div>';
        }
        
        container.innerHTML = `
            <div class="ai-dropdown-header">
                <i class="material-icons">dataset</i>
                <span>Select Dataset (${collections.length} available)</span>
            </div>
            
            <div class="ai-search-section">
                <input type="text" class="ai-search-input" placeholder="Search collections..." id="collection-search">
            </div>
            
            <div class="ai-options-section" id="collection-options">
                ${collectionsHTML}
                ${!this.showAllCollections && collections.length > initialDisplayLimit ? `
                    <div class="ai-show-all-option" id="show-all-collections">
                        <i class="material-icons">expand_more</i>
                        <div class="ai-option-content">
                            <div class="ai-option-title">Show all ${collections.length} collections</div>
                            <div class="ai-option-subtitle">Display complete list</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.setupCollectionDropdownEvents(container);
        return container;
    }
    
    /**
     * Create minimalist location dropdown
     * @returns {HTMLElement} Location dropdown content
     */
    createLocationDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        container.innerHTML = `
            <div class="ai-dropdown-header">
                <i class="material-icons">place</i>
                <span>Select Location</span>
            </div>
            
            <div class="ai-search-section">
                <input type="text" class="ai-search-input" placeholder="Search places..." id="location-search">
                <div class="ai-search-results" id="location-results"></div>
            </div>
            
            <div class="ai-options-section">
                <div class="ai-option" data-value="everywhere">
                    <i class="material-icons">public</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">The World</div>
                        <div class="ai-option-subtitle">No location filter</div>
                    </div>
                </div>
                
                <div class="ai-option" id="draw-location">
                    <i class="material-icons">draw</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">Draw on Map</div>
                        <div class="ai-option-subtitle">Select area visually</div>
                    </div>
                </div>
                
                <div class="ai-option" id="paste-geometry">
                    <i class="material-icons">content_paste</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">Paste WKT/GeoJSON</div>
                        <div class="ai-option-subtitle">Paste geometry anywhere</div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupLocationDropdownEvents(container);
        return container;
    }
    
    /**
     * Create minimalist date dropdown
     * @returns {HTMLElement} Date dropdown content
     */
    createDateDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        container.innerHTML = `
            <div class="ai-dropdown-header">
                <i class="material-icons">event</i>
                <span>Select Time Period</span>
            </div>
            
            <div class="ai-options-section">
                <div class="ai-option" data-value="anytime">
                    <i class="material-icons">all_inclusive</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">Anytime</div>
                        <div class="ai-option-subtitle">No date filter</div>
                    </div>
                </div>
                
                <div class="ai-option" data-value="thismonth">
                    <i class="material-icons">calendar_month</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">This Month</div>
                        <div class="ai-option-subtitle">Current month</div>
                    </div>
                </div>
                
                <div class="ai-option" id="custom-date">
                    <i class="material-icons">date_range</i>
                    <div class="ai-option-content">
                        <div class="ai-option-title">Custom Range</div>
                        <div class="ai-option-subtitle">Pick specific dates</div>
                    </div>
                </div>
            </div>
            
            <div class="ai-custom-section" id="custom-date-section" style="display: none;">
                <div class="ai-date-inputs">
                    <div class="ai-date-group">
                        <label>From</label>
                        <input type="date" id="date-start" class="ai-date-input">
                    </div>
                    <div class="ai-date-group">
                        <label>To</label>
                        <input type="date" id="date-end" class="ai-date-input">
                    </div>
                </div>
                <button class="ai-apply-btn" id="apply-date-range">
                    <i class="material-icons">check</i> Apply
                </button>
            </div>
        `;
        
        this.setupDateDropdownEvents(container);
        return container;
    }
    
    /**
     * Create minimalist parameters dropdown
     * @returns {HTMLElement} Parameters dropdown content
     */
    createParametersDropdown() {
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        container.innerHTML = `
            <div class="ai-dropdown-header">
                <i class="material-icons">tune</i>
                <span>Parameters</span>
            </div>
            
            <div class="ai-param-section">
                <div class="ai-param-group">
                    <label class="ai-param-label">
                        <i class="material-icons">cloud</i>
                        Maximum Cloud Cover: <span id="cloud-value">${this.cloudCover}%</span>
                    </label>
                    <input type="range" class="ai-slider" id="cloud-slider" 
                           min="0" max="100" value="${this.cloudCover}">
                </div>
            </div>
            
            <button class="ai-apply-btn" id="apply-params">
                <i class="material-icons">check</i> Apply
            </button>
        `;
        
        this.setupParametersDropdownEvents(container);
        return container;
    }
    
    /**
     * Set up collection dropdown event handlers
     * @param {HTMLElement} container - Dropdown container
     */
    setupCollectionDropdownEvents(container) {
        // Search input
        const searchInput = container.querySelector('#collection-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterCollections(e.target.value, container);
            });
        }
        
        // Show all collections button
        const showAllButton = container.querySelector('#show-all-collections');
        if (showAllButton) {
            showAllButton.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔄 Show all collections clicked');
                
                // Set flag to show all collections
                this.showAllCollections = true;
                
                // Rebuild dropdown with all collections
                const newDropdownContent = this.createCollectionDropdown();
                
                // Find the current dropdown and replace its content
                const currentDropdown = this.currentDropdown;
                if (currentDropdown) {
                    // Clear current content
                    currentDropdown.innerHTML = '';
                    // Add new content
                    currentDropdown.appendChild(newDropdownContent);
                    
                    // Reposition dropdown to handle new size
                    this.positionDropdownNearField(currentDropdown, this.activeField);
                    
                    // Focus search input in new dropdown
                    const searchInput = currentDropdown.querySelector('#collection-search');
                    if (searchInput) {
                        setTimeout(() => searchInput.focus(), 100);
                    }
                    
                    console.log('✅ Successfully expanded to show all collections');
                } else {
                    console.error('❌ Could not find current dropdown to expand');
                }
            });
        }
        
        // Collection options and details buttons
        container.addEventListener('click', (e) => {
            // Handle details button clicks
            const detailsBtn = e.target.closest('.ai-option-details');
            if (detailsBtn) {
                e.stopPropagation();
                const collectionId = detailsBtn.dataset.collectionId;
                const collectionSource = detailsBtn.dataset.collectionSource;
                
                if (collectionId) {
                    const collection = this.allAvailableCollections.find(c => c.id === collectionId && c.source === collectionSource);
                    if (collection) {
                        this.showCollectionDetails(collection);
                    }
                }
                return;
            }
            
            // Handle collection selection
            const option = e.target.closest('.ai-option');
            if (option) {
                const optionValue = option.dataset.value;
                
                if (optionValue === '') {
                    // EVERYTHING option selected
                    this.selectedCollection = '';
                    this.selectedCollectionSource = null;
                    
                    const collectionField = document.getElementById('ai-field-collection');
                    collectionField.textContent = 'EVERYTHING';
                    collectionField.classList.add('empty'); // Use empty styling for EVERYTHING
                    
                    console.log('🌍 EVERYTHING mode selected');
                } else if (optionValue) {
                    // Specific collection selected
                    this.selectedCollection = optionValue;
                    this.selectedCollectionSource = option.dataset.source;
                    
                    const collectionField = document.getElementById('ai-field-collection');
                    collectionField.textContent = option.querySelector('.ai-option-title').textContent;
                    collectionField.classList.remove('empty');
                    
                    console.log(`🎯 Specific collection selected: ${optionValue}`);
                }
                
                this.closeAllDropdowns();
            }
        });
    }
    
    /**
     * Set up location dropdown event handlers
     * @param {HTMLElement} container - Dropdown container
     */
    setupLocationDropdownEvents(container) {
        // Everywhere option
        const everywhereOption = container.querySelector('[data-value="everywhere"]');
        if (everywhereOption) {
            everywhereOption.addEventListener('click', () => {
                this.selectedLocation = 'everywhere';
                const locationField = document.getElementById('ai-field-location');
                locationField.textContent = 'THE WORLD';
                locationField.classList.add('empty');
                this.closeAllDropdowns();
            });
        }
        
        // Draw on map option
        const drawOption = container.querySelector('#draw-location');
        if (drawOption) {
            drawOption.addEventListener('click', () => {
                this.handleDrawOnMap();
            });
        }
        
        // Paste geometry option
        const pasteOption = container.querySelector('#paste-geometry');
        if (pasteOption) {
            pasteOption.addEventListener('click', () => {
                this.handlePasteGeometry();
            });
        }
        
        // Location search
        const searchInput = container.querySelector('#location-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchLocations(e.target.value, container);
                }, 300);
            });
        }
    }
    
    /**
     * Set up date dropdown event handlers
     * @param {HTMLElement} container - Dropdown container
     */
    setupDateDropdownEvents(container) {
        // Date preset options
        container.addEventListener('click', (e) => {
            const option = e.target.closest('.ai-option');
            if (option && option.dataset.value) {
                this.handleDatePreset(option.dataset.value);
            }
        });
        
        // Custom date option
        const customOption = container.querySelector('#custom-date');
        if (customOption) {
            customOption.addEventListener('click', () => {
                const customSection = container.querySelector('#custom-date-section');
                if (customSection) {
                    customSection.style.display = 'block';
                    // Focus on start date input
                    setTimeout(() => {
                        const startInput = container.querySelector('#date-start');
                        if (startInput) {
                            startInput.focus();
                            startInput.showPicker && startInput.showPicker(); // Modern browsers
                        }
                    }, 100);
                }
            });
        }
        
        // Smart date picker flow - when start date is selected, open end date
        const startInput = container.querySelector('#date-start');
        const endInput = container.querySelector('#date-end');
        
        if (startInput && endInput) {
            startInput.addEventListener('change', () => {
                if (startInput.value) {
                    // Automatically focus and open the end date picker
                    setTimeout(() => {
                        endInput.focus();
                        endInput.showPicker && endInput.showPicker(); // Modern browsers
                    }, 200);
                    
                    // Set minimum date for end input to be the start date
                    endInput.min = startInput.value;
                    
                    console.log(`📅 Start date set to: ${startInput.value}, opening end date picker`);
                }
            });
            
            // Clear minimum when start date is cleared
            startInput.addEventListener('input', () => {
                if (!startInput.value) {
                    endInput.min = '';
                }
            });
        }
        
        // Apply custom date range
        const applyBtn = container.querySelector('#apply-date-range');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.handleCustomDateRange(container);
            });
        }
    }
    
    /**
     * Set up parameters dropdown event handlers
     * @param {HTMLElement} container - Dropdown container
     */
    setupParametersDropdownEvents(container) {
        // Cloud cover slider
        const slider = container.querySelector('#cloud-slider');
        const valueDisplay = container.querySelector('#cloud-value');
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', () => {
                this.cloudCover = parseInt(slider.value);
                valueDisplay.textContent = `${this.cloudCover}%`;
            });
        }
        
        // Apply button
        const applyBtn = container.querySelector('#apply-params');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const paramsField = document.getElementById('ai-field-params');
                paramsField.textContent = `≤${this.cloudCover}% CLOUDS`;
                paramsField.classList.remove('empty');
                this.closeAllDropdowns();
            });
        }
    }
    
    /**
     * Handle draw on map functionality
     */
    handleDrawOnMap() {
        this.closeAllDropdowns();
        this.closeFullscreen();
        
        if (this.mapManager) {
            this.mapManager.startDrawingBbox((bbox) => {
                this.selectedLocation = bbox;
                this.selectedLocationResult = {
                    formattedName: 'Map Selection',
                    shortName: 'Map Selection',
                    bbox: bbox,
                    category: 'drawn'
                };
                
                // Reopen AI Search with updated location
                this.showMinimalistSearch();
                setTimeout(() => {
                    const locationField = document.getElementById('ai-field-location');
                    if (locationField) {
                        locationField.textContent = "Map Selection";
                        locationField.classList.remove('empty');
                    }
                }, 100);
            });
            
            this.notificationService.showNotification('Draw a bounding box on the map', 'info');
        }
    }
    
    /**
     * Handle paste geometry option
     */
    handlePasteGeometry() {
        this.closeAllDropdowns();
        
        // Show instructions
        this.notificationService.showNotification('📋 Paste WKT or GeoJSON anywhere on the page - it will be detected automatically!', 'info');
        
        // Focus on the AI interface to make paste detection work
        if (this.fullscreenElement) {
            this.fullscreenElement.focus();
        }
    }
    
    /**
     * Set up global paste detection for WKT/GeoJSON
     */
    setupGlobalPasteDetection() {
        this.pasteHandler = (event) => {
            // Only process paste events when AI Search is open
            if (!this.fullscreenElement) return;
            
            // Get pasted text
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            
            if (pastedText && pastedText.trim()) {
                // Try to parse as geometry
                const geometryResult = this.parseGeometry(pastedText.trim());
                
                if (geometryResult) {
                    this.handlePastedGeometry(geometryResult, pastedText);
                    event.preventDefault(); // Prevent normal paste behavior
                }
            }
        };
        
        // Add paste listener to document
        document.addEventListener('paste', this.pasteHandler);
        console.log('📋 Global paste detection for WKT/GeoJSON enabled');
    }
    
    /**
     * Parse geometry from text (WKT or GeoJSON)
     * @param {string} text - Text to parse
     * @returns {Object|null} Parsed geometry result or null
     */
    parseGeometry(text) {
        try {
            let geojson = null;
            let bbox = null;
            let type = null;
            
            // Try to parse as GeoJSON first
            if (this.isGeoJSON(text)) {
                geojson = parseGeoJSON(text);
                bbox = geojsonToBbox(geojson);
                type = 'GeoJSON';
            } else if (this.isWKT(text)) {
                // Try to parse as WKT
                geojson = wktToGeoJSON(text);
                bbox = geojsonToBbox(geojson);
                type = 'WKT';
            }
            
            if (bbox && bbox.length === 4) {
                return {
                    bbox,
                    geojson,
                    type,
                    originalText: text
                };
            }
            
        } catch (error) {
            console.warn('⚠️ Error parsing geometry:', error);
        }
        
        return null;
    }
    
    /**
     * Handle successfully pasted geometry
     * @param {Object} geometryResult - Parsed geometry result
     * @param {string} originalText - Original pasted text
     */
    handlePastedGeometry(geometryResult, originalText) {
        // Store the geometry
        this.selectedLocation = geometryResult.bbox;
        this.selectedLocationResult = {
            formattedName: 'Custom Geometry',
            shortName: 'Custom Geometry', 
            bbox: geometryResult.bbox,
            category: 'pasted',
            geojson: geometryResult.geojson,
            originalText: originalText,
            type: geometryResult.type
        };
        
        // Update the location field
        const locationField = document.getElementById('ai-field-location');
        if (locationField) {
            locationField.textContent = 'Custom Geometry';
            locationField.classList.remove('empty');
        }
        
        // Show success notification
        this.notificationService.showNotification(
            `✅ ${geometryResult.type} geometry pasted successfully!`, 
            'success'
        );
        
        console.log(`📋 Parsed ${geometryResult.type} geometry:`, geometryResult);
    }
    
    /**
     * Check if text is WKT format
     * @param {string} text - Text to check
     * @returns {boolean} True if WKT format
     */
    isWKT(text) {
        return isWKT ? isWKT(text) : /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(/i.test(text.trim());
    }
    
    /**
     * Check if text is GeoJSON format
     * @param {string} text - Text to check
     * @returns {boolean} True if GeoJSON format
     */
    isGeoJSON(text) {
        if (isGeoJSON) {
            return isGeoJSON(text);
        }
        
        try {
            const parsed = JSON.parse(text);
            return parsed && (parsed.type === 'Feature' || parsed.type === 'FeatureCollection' || 
                   ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(parsed.type));
        } catch {
            return false;
        }
    }
    
    /**
     * Search locations using geocoding service
     * @param {string} query - Search query
     * @param {HTMLElement} container - Dropdown container
     */
    searchLocations(query, container) {
        const resultsContainer = container.querySelector('#location-results');
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        resultsContainer.innerHTML = '<div class="ai-loading">Searching...</div>';
        
        this.geocodingService.searchLocations(query, (results, error) => {
            if (error) {
                resultsContainer.innerHTML = '<div class="ai-error">Search failed</div>';
                return;
            }
            
            if (!results || results.length === 0) {
                resultsContainer.innerHTML = '<div class="ai-no-results">No results found</div>';
                return;
            }
            
            const resultItems = results.slice(0, 5).map(result => {
                // Create a better location display format
                let locationHierarchy = result.formattedName;
                
                // Try to extract country/region info from the result
                if (result.bbox && result.address) {
                    // If we have address components, use them
                    const parts = [];
                    if (result.address.city) parts.push(result.address.city);
                    if (result.address.state) parts.push(result.address.state);
                    if (result.address.country) parts.push(result.address.country);
                    if (parts.length > 0) {
                        locationHierarchy = parts.join(', ');
                    }
                } else {
                    // Fallback: try to parse from formattedName
                    const nameParts = result.formattedName.split(',');
                    if (nameParts.length > 1) {
                        locationHierarchy = nameParts.map(part => part.trim()).join(', ');
                    }
                }
                
                return `
                    <div class="ai-location-result" data-bbox="${result.bbox ? result.bbox.join(',') : ''}">
                        <i class="material-icons">place</i>
                        <div class="ai-location-info">
                            <div class="ai-location-name">${locationHierarchy}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            resultsContainer.innerHTML = resultItems;
            
            // Add click handlers
            resultsContainer.querySelectorAll('.ai-location-result').forEach(result => {
                result.addEventListener('click', () => {
                    const bbox = result.dataset.bbox;
                    const name = result.querySelector('.ai-location-name').textContent;
                    
                    if (bbox) {
                        this.selectedLocation = bbox.split(',').map(Number);
                    }
                    
                    const locationField = document.getElementById('ai-field-location');
                    locationField.textContent = name;
                    locationField.classList.remove('empty');
                    this.closeAllDropdowns();
                });
            });
        });
    }
    
    /**
     * Handle date preset selection
     * @param {string} preset - Date preset type
     */
    handleDatePreset(preset) {
        let range;
        
        switch (preset) {
            case 'anytime':
                range = { start: null, end: null };
                break;
            case 'thismonth':
                range = this.calculateCurrentMonthRange();
                break;
            default:
                // Fallback to DateUtils if available
                if (typeof DateUtils !== 'undefined' && DateUtils.calculateDateRange) {
                    range = DateUtils.calculateDateRange(preset);
                } else {
                    console.warn(`Unknown date preset: ${preset}`);
                    return;
                }
        }
        
        this.selectedDate = {
            type: preset,
            start: range.start,
            end: range.end,
            preset: preset
        };
        
        const dateField = document.getElementById('ai-field-date');
        dateField.textContent = this.getEnhancedDateDisplayText();
        dateField.classList.toggle('empty', preset === 'anytime');
        
        console.log(`📅 Applied date preset: ${preset}`, this.selectedDate);
        
        this.closeAllDropdowns();
    }
    
    /**
     * Calculate current month date range
     * @returns {Object} Date range for current month
     */
    calculateCurrentMonthRange() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            start: this.formatDate(startOfMonth),
            end: this.formatDate(endOfMonth)
        };
    }
    
    /**
     * Handle custom date range
     * @param {HTMLElement} container - Dropdown container
     */
    handleCustomDateRange(container) {
        const startInput = container.querySelector('#date-start');
        const endInput = container.querySelector('#date-end');
        
        if (startInput && endInput && startInput.value && endInput.value) {
            this.selectedDate = {
                type: 'custom',
                start: startInput.value,
                end: endInput.value,
                preset: null
            };
            
            const dateField = document.getElementById('ai-field-date');
            dateField.textContent = `${startInput.value} to ${endInput.value}`;
            dateField.classList.remove('empty');
            
            this.closeAllDropdowns();
        }
    }
    
    /**
     * Filter collections based on search query
     * @param {string} query - Search query
     * @param {HTMLElement} container - Dropdown container
     */
    filterCollections(query, container) {
        const options = container.querySelectorAll('.ai-option[data-value]');
        const showAllButton = container.querySelector('#show-all-collections');
        const normalizedQuery = query.toLowerCase();
        
        let visibleCount = 0;
        
        options.forEach(option => {
            const title = option.querySelector('.ai-option-title').textContent.toLowerCase();
            const subtitle = option.querySelector('.ai-option-subtitle').textContent.toLowerCase();
            const matches = title.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
            
            option.style.display = matches ? 'flex' : 'none';
            if (matches) visibleCount++;
        });
        
        // Hide "Show all" button when searching
        if (showAllButton) {
            showAllButton.style.display = query.trim() ? 'none' : 'flex';
        }
        
        // Show count of filtered results
        const header = container.querySelector('.ai-dropdown-header span');
        if (header && query.trim()) {
            const total = this.allAvailableCollections ? this.allAvailableCollections.length : 0;
            header.textContent = `Search Results (${visibleCount} of ${total})`;
        } else if (header) {
            const total = this.allAvailableCollections ? this.allAvailableCollections.length : 0;
            header.textContent = `Select Dataset (${total} available)`;
        }
    }
    
    /**
     * Close all open dropdowns
     */
    closeAllDropdowns() {
        if (this.currentDropdown) {
            document.body.removeChild(this.currentDropdown);
            this.currentDropdown = null;
        }
        
        if (this.activeField) {
            this.activeField.classList.remove('active');
            this.activeField = null;
        }
        
        // Reset show all collections state
        this.showAllCollections = false;
    }
    
    /**
     * Close the fullscreen search interface
     */
    closeFullscreen() {
        this.closeAllDropdowns();
        
        if (this.fullscreenElement && document.body.contains(this.fullscreenElement)) {
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
            
            document.body.removeChild(this.fullscreenElement);
            this.fullscreenElement = null;
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
                params.collections = [this.selectedCollection];
                console.log(`🎯 Searching specific collection: ${this.selectedCollection}`);
            } else {
                // EVERYTHING mode - search across all available collections
                console.log('🌍 EVERYTHING mode: Searching across all available collections');
                // Don't set collections parameter - this will search all collections
                // Alternatively, we could set all available collection IDs, but omitting is cleaner
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
                    params.bbox = this.selectedLocation;
                } else if (this.selectedLocationResult && this.selectedLocationResult.bbox) {
                    params.bbox = this.selectedLocationResult.bbox;
                }
            }
            
            console.log('🔍 AI Smart Search Enhanced Parameters:', params);
            
            // Show appropriate processing message
            const searchTypeMessage = params.collections && params.collections.length > 0 ? 
                `Processing search for ${this.getCollectionDisplayName(params.collections[0])}...` : 
                'Processing EVERYTHING search across all collections...';
            this.notificationService.showNotification(searchTypeMessage, 'info');
            
            // Close the interface first
            this.closeFullscreen();
            
            // Ensure sidebar is visible BEFORE applying parameters
            this.ensureSidebarVisible();
            
            // Apply parameters to the search form
            this.applySearchParameters(params);
            
            // Execute the search with a small delay to ensure DOM updates
            setTimeout(() => {
                if (this.searchPanel && typeof this.searchPanel.performSearch === 'function') {
                    this.searchPanel.performSearch();
                    console.log('✅ Search executed via searchPanel.performSearch()');
                } else {
                    // Fallback: trigger search button click
                    const searchButton = document.getElementById('execute-search') || document.getElementById('summary-search-btn');
                    if (searchButton) {
                        searchButton.click();
                        console.log('✅ Search executed via button click fallback');
                    } else {
                        console.error('❌ No search execution method available');
                        this.notificationService.showNotification('Error: Could not execute search', 'error');
                        return;
                    }
                }
                
                // Show success notification after a brief delay
                setTimeout(() => {
                    const searchType = params.collections && params.collections.length > 0 ? 
                        `specific collection (${params.collections[0]})` : 
                        'ALL collections (🌍 EVERYTHING mode)';
                    this.notificationService.showNotification(`Search executed successfully across ${searchType}! 🎉`, 'success');
                }, 500);
                
            }, 200);
            
        } catch (error) {
            console.error('❌ Error executing search:', error);
            this.notificationService.showNotification('Error processing your search request', 'error');
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
            
            // If we have a selected collection with source info, set the API client accordingly
            if (this.selectedCollectionSource && this.selectedCollection) {
                console.log(`🔌 Setting API client to use ${this.selectedCollectionSource} for collection ${this.selectedCollection}`);
                const endpoints = window.stacExplorer.config.stacEndpoints[this.selectedCollectionSource];
                if (endpoints) {
                    this.apiClient.setEndpoints(endpoints);
                    
                    // Also update the catalog selector to reflect the current source
                    const catalogSelect = document.getElementById('catalog-select');
                    if (catalogSelect) {
                        catalogSelect.value = this.selectedCollectionSource;
                        // Trigger change event to update UI
                        catalogSelect.dispatchEvent(new Event('change'));
                        console.log(`✅ Set catalog selector to: ${this.selectedCollectionSource}`);
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
            if (params.collections && params.collections.length > 0) {
                const collectionId = params.collections[0];
                
                // Use the enhanced collection manager's method to set both collection and source
                if (this.collectionManager && typeof this.collectionManager.setSelectedCollection === 'function') {
                    // Set collection and source together
                    this.collectionManager.setSelectedCollection(collectionId, this.selectedCollectionSource);
                    console.log(`✅ Set collection via CollectionManagerEnhanced: ${collectionId} from ${this.selectedCollectionSource}`);
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
                        this.mapManager.setBboxFromCoordinates(params.bbox);
                        console.log('✅ Updated map with bbox');
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
            
            // Reset bbox
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) bboxInput.value = '';
            
            // Reset map if available
            if (this.mapManager && typeof this.mapManager.clearDrawings === 'function') {
                try {
                    this.mapManager.clearDrawings();
                } catch (e) {
                    console.warn('Could not clear map drawings:', e);
                }
            }
            
            // Reset cloud cover
            const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
            if (cloudCoverEnabled) cloudCoverEnabled.checked = false;
            
            console.log('✅ Search form reset');
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
}
