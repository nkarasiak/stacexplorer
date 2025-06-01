/**
 * URLStateManager.js - Comprehensive URL state management for search synchronization
 * Ensures perfect sync between inline dropdowns and fullscreen search
 * Enables bookmarking, sharing, and state persistence via URL parameters
 */

export class URLStateManager {
    constructor(inlineDropdownManager, aiSmartSearch, mapManager, notificationService) {
        this.inlineDropdownManager = inlineDropdownManager;
        this.aiSmartSearch = aiSmartSearch;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        
        // State tracking
        this.currentState = {};
        this.isUpdatingFromURL = false;
        this.updateTimeout = null;
        
        // URL parameter keys
        this.urlKeys = {
            collection: 'c',
            collectionSource: 'cs',
            location: 'l',
            locationName: 'ln',
            locationBbox: 'lb',
            dateType: 'dt',
            dateStart: 'ds',
            dateEnd: 'de',
            cloudCover: 'cc',
            geometry: 'g' // For WKT/GeoJSON
        };
        
        this.initialize();
    }
    
    /**
     * Initialize URL state management
     */
    initialize() {
        console.log('[URL] Initializing URL State Manager...');
        
        // Listen for browser back/forward
        window.addEventListener('popstate', (event) => {
            console.log('[NAV] Browser navigation detected, restoring state');
            this.restoreStateFromURL();
        });
        
        // Listen for search parameter changes
        this.setupStateListeners();
        
        // Restore state from URL on page load
        this.restoreStateFromURL();
        
        console.log('[SUCCESS] URL State Manager initialized');
    }
    
    /**
     * Set up listeners for search parameter changes
     */
    setupStateListeners() {
        // Listen for inline dropdown changes
        document.addEventListener('searchParameterChanged', (event) => {
            if (!this.isUpdatingFromURL) {
                console.log('[PARAM] Search parameter changed:', event.detail);
                this.updateURLFromState(event.detail);
            }
        });
        
        // Listen for fullscreen AI search changes
        document.addEventListener('aiSearchStateChanged', (event) => {
            if (!this.isUpdatingFromURL) {
                console.log('[AI] AI search state changed:', event.detail);
                this.updateURLFromState(event.detail);
            }
        });
        
        // Listen for map drawing completion
        document.addEventListener('geometrySelected', (event) => {
            if (!this.isUpdatingFromURL) {
                console.log('[MAP] Geometry selected:', event.detail);
                this.updateURLFromState({
                    type: 'location',
                    locationBbox: event.detail.bbox,
                    locationName: event.detail.name || 'Map Selection'
                });
            }
        });
    }
    
    /**
     * Update URL parameters from current state
     * @param {Object} stateChange - Changed state parameters
     */
    updateURLFromState(stateChange) {
        // Debounce URL updates
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.performURLUpdate(stateChange);
        }, 300);
    }
    
    /**
     * Perform the actual URL update
     * @param {Object} stateChange - Changed state parameters
     */
    performURLUpdate(stateChange) {
        try {
            // Update current state
            Object.assign(this.currentState, stateChange);
            
            // Build URL parameters
            const urlParams = new URLSearchParams();
            
            // Collection parameters
            if (this.currentState.collection) {
                urlParams.set(this.urlKeys.collection, this.currentState.collection);
            }
            if (this.currentState.collectionSource) {
                urlParams.set(this.urlKeys.collectionSource, this.currentState.collectionSource);
            }
            
            // Location parameters
            if (this.currentState.locationBbox && Array.isArray(this.currentState.locationBbox)) {
                urlParams.set(this.urlKeys.locationBbox, this.currentState.locationBbox.join(','));
            }
            if (this.currentState.locationName && this.currentState.locationName !== 'THE WORLD') {
                urlParams.set(this.urlKeys.locationName, this.currentState.locationName);
            }
            if (this.currentState.geometry) {
                urlParams.set(this.urlKeys.geometry, encodeURIComponent(this.currentState.geometry));
            }
            
            // Date parameters
            if (this.currentState.dateType && this.currentState.dateType !== 'anytime') {
                urlParams.set(this.urlKeys.dateType, this.currentState.dateType);
            }
            if (this.currentState.dateStart) {
                urlParams.set(this.urlKeys.dateStart, this.currentState.dateStart);
            }
            if (this.currentState.dateEnd) {
                urlParams.set(this.urlKeys.dateEnd, this.currentState.dateEnd);
            }
            
            // Other parameters
            if (this.currentState.cloudCover && this.currentState.cloudCover !== 20) {
                urlParams.set(this.urlKeys.cloudCover, this.currentState.cloudCover.toString());
            }
            
            // Update URL without page reload
            const newURL = urlParams.toString() ? 
                `${window.location.pathname}?${urlParams.toString()}` : 
                window.location.pathname;
            
            window.history.replaceState({ searchState: this.currentState }, '', newURL);
            
            console.log('[URL] URL updated:', newURL);
            
            // Sync both interfaces
            this.syncInterfaces();
            
        } catch (error) {
            console.error('[ERROR] Error updating URL:', error);
        }
    }
    
    /**
     * Restore state from URL parameters
     */
    restoreStateFromURL() {
        try {
            this.isUpdatingFromURL = true;
            
            const urlParams = new URLSearchParams(window.location.search);
            const restoredState = {};
            
            // Collection parameters
            if (urlParams.has(this.urlKeys.collection)) {
                restoredState.collection = urlParams.get(this.urlKeys.collection);
            }
            if (urlParams.has(this.urlKeys.collectionSource)) {
                restoredState.collectionSource = urlParams.get(this.urlKeys.collectionSource);
            }
            
            // Location parameters
            if (urlParams.has(this.urlKeys.locationBbox)) {
                const bboxStr = urlParams.get(this.urlKeys.locationBbox);
                restoredState.locationBbox = bboxStr.split(',').map(Number);
            }
            if (urlParams.has(this.urlKeys.locationName)) {
                restoredState.locationName = urlParams.get(this.urlKeys.locationName);
            }
            if (urlParams.has(this.urlKeys.geometry)) {
                restoredState.geometry = decodeURIComponent(urlParams.get(this.urlKeys.geometry));
            }
            
            // Date parameters
            if (urlParams.has(this.urlKeys.dateType)) {
                restoredState.dateType = urlParams.get(this.urlKeys.dateType);
            }
            if (urlParams.has(this.urlKeys.dateStart)) {
                restoredState.dateStart = urlParams.get(this.urlKeys.dateStart);
            }
            if (urlParams.has(this.urlKeys.dateEnd)) {
                restoredState.dateEnd = urlParams.get(this.urlKeys.dateEnd);
            }
            
            // Other parameters
            if (urlParams.has(this.urlKeys.cloudCover)) {
                restoredState.cloudCover = parseInt(urlParams.get(this.urlKeys.cloudCover));
            }
            
            if (Object.keys(restoredState).length > 0) {
                console.log('[RESTORE] Restoring state from URL:', restoredState);
                this.currentState = restoredState;
                this.applyStateToInterfaces(restoredState);
                
                // Show notification
                this.notificationService.showNotification('[URL] Search parameters restored from URL', 'info');
            }
            
        } catch (error) {
            console.error('[ERROR] Error restoring state from URL:', error);
        } finally {
            // Reset flag after a delay to ensure all updates are complete
            setTimeout(() => {
                this.isUpdatingFromURL = false;
            }, 1000);
        }
    }
    
    /**
     * Apply restored state to both interfaces
     * @param {Object} state - State to apply
     */
    applyStateToInterfaces(state) {
        // Apply to inline dropdown manager
        if (this.inlineDropdownManager) {
            this.applyStateToInlineDropdowns(state);
        }
        
        // Apply to AI search
        if (this.aiSmartSearch) {
            this.applyStateToAISearch(state);
        }
        
        // Apply to map if geometry exists
        if (state.locationBbox || state.geometry) {
            this.applyStateToMap(state);
        }
        
        // Apply to form fields
        this.applyStateToFormFields(state);
    }
    
    /**
     * Apply state to inline dropdowns
     * @param {Object} state - State to apply
     */
    applyStateToInlineDropdowns(state) {
        try {
            const aiHelper = this.inlineDropdownManager.aiSearchHelper;
            
            // Collection state
            if (state.collection !== undefined) {
                aiHelper.selectedCollection = state.collection;
                aiHelper.selectedCollectionSource = state.collectionSource;
                
                const displayName = state.collection ? 
                    this.getCollectionDisplayName(state.collection) : 'EVERYTHING';
                this.inlineDropdownManager.updateSearchSummary('collection', displayName);
            }
            
            // Location state
            if (state.locationBbox || state.locationName) {
                aiHelper.selectedLocation = state.locationBbox || 'everywhere';
                if (state.locationBbox) {
                    aiHelper.selectedLocationResult = {
                        formattedName: state.locationName || 'Custom Location',
                        shortName: state.locationName || 'Custom Location',
                        bbox: state.locationBbox,
                        category: 'restored'
                    };
                }
                
                const displayName = state.locationName || 'THE WORLD';
                this.inlineDropdownManager.updateSearchSummary('location', displayName.toUpperCase());
            }
            
            // Date state
            if (state.dateType) {
                aiHelper.selectedDate = {
                    type: state.dateType,
                    start: state.dateStart,
                    end: state.dateEnd,
                    preset: state.dateType !== 'custom' ? state.dateType : null
                };
                
                let displayText = 'ANYTIME';
                if (state.dateType === 'thismonth') {
                    displayText = 'THIS MONTH';
                } else if (state.dateType === 'custom' && state.dateStart && state.dateEnd) {
                    displayText = `${state.dateStart} to ${state.dateEnd}`.toUpperCase();
                }
                
                this.inlineDropdownManager.updateSearchSummary('date', displayText);
            }
            
            // Cloud cover
            if (state.cloudCover !== undefined) {
                aiHelper.cloudCover = state.cloudCover;
            }
            
            console.log('[SUCCESS] State applied to inline dropdowns');
            
        } catch (error) {
            console.error('[ERROR] Error applying state to inline dropdowns:', error);
        }
    }
    
    /**
     * Apply state to AI search interface
     * @param {Object} state - State to apply
     */
    applyStateToAISearch(state) {
        try {
            // Collection state
            if (state.collection !== undefined) {
                this.aiSmartSearch.selectedCollection = state.collection;
                this.aiSmartSearch.selectedCollectionSource = state.collectionSource;
            }
            
            // Location state
            if (state.locationBbox || state.locationName) {
                this.aiSmartSearch.selectedLocation = state.locationBbox || 'everywhere';
                if (state.locationBbox) {
                    this.aiSmartSearch.selectedLocationResult = {
                        formattedName: state.locationName || 'Custom Location',
                        shortName: state.locationName || 'Custom Location',
                        bbox: state.locationBbox,
                        category: 'restored'
                    };
                }
            }
            
            // Date state
            if (state.dateType) {
                this.aiSmartSearch.selectedDate = {
                    type: state.dateType,
                    start: state.dateStart,
                    end: state.dateEnd,
                    preset: state.dateType !== 'custom' ? state.dateType : null
                };
            }
            
            // Cloud cover
            if (state.cloudCover !== undefined) {
                this.aiSmartSearch.cloudCover = state.cloudCover;
            }
            
            console.log('[SUCCESS] State applied to AI search');
            
        } catch (error) {
            console.error('[ERROR] Error applying state to AI search:', error);
        }
    }
    
    /**
     * Apply state to map
     * @param {Object} state - State to apply
     */
    applyStateToMap(state) {
        try {
            if (this.mapManager && (state.locationBbox || state.geometry)) {
                // Clear previous geometry
                if (typeof this.mapManager.clearAllThumbnails === 'function') {
                    this.mapManager.clearAllThumbnails();
                }
                
                if (state.geometry) {
                    // Handle WKT/GeoJSON geometry
                    const geometryResult = this.parseGeometry(state.geometry);
                    if (geometryResult) {
                        this.displayGeometryOnMap(geometryResult.geojson, state.locationName);
                        if (geometryResult.bbox) {
                            this.mapManager.fitToBounds(geometryResult.bbox);
                        }
                    }
                } else if (state.locationBbox) {
                    // Handle bounding box
                    this.displayBboxOnMap(state.locationBbox, state.locationName);
                    this.mapManager.fitToBounds(state.locationBbox);
                }
                
                console.log('[SUCCESS] State applied to map');
            }
        } catch (error) {
            console.error('[ERROR] Error applying state to map:', error);
        }
    }
    
    /**
     * Apply state to form fields
     * @param {Object} state - State to apply
     */
    applyStateToFormFields(state) {
        try {
            // Date fields
            if (state.dateStart) {
                const startInput = document.getElementById('date-start');
                if (startInput) startInput.value = state.dateStart;
            }
            if (state.dateEnd) {
                const endInput = document.getElementById('date-end');
                if (endInput) endInput.value = state.dateEnd;
            }
            
            // Collection field
            if (state.collection !== undefined) {
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect) collectionSelect.value = state.collection;
            }
            
            // Bbox field
            if (state.locationBbox) {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) bboxInput.value = state.locationBbox.join(',');
            }
            
            console.log('[SUCCESS] State applied to form fields');
            
        } catch (error) {
            console.error('[ERROR] Error applying state to form fields:', error);
        }
    }
    
    /**
     * Synchronize both interfaces to ensure consistency
     */
    syncInterfaces() {
        if (!this.isUpdatingFromURL) {
            // Apply current state to both interfaces
            this.applyStateToInterfaces(this.currentState);
        }
    }
    
    /**
     * Get shareable URL with current search parameters
     * @returns {string} Shareable URL
     */
    getShareableURL() {
        return window.location.href;
    }
    
    /**
     * Copy current search URL to clipboard
     */
    async copySearchURL() {
        try {
            const url = this.getShareableURL();
            await navigator.clipboard.writeText(url);
            this.notificationService.showNotification('[URL] Search URL copied to clipboard!', 'success');
            return url;
        } catch (error) {
            console.error('[ERROR] Error copying URL:', error);
            this.notificationService.showNotification('[ERROR] Failed to copy URL', 'error');
            return null;
        }
    }
    
    /**
     * Clear all search parameters from URL
     */
    clearURLParameters() {
        window.history.replaceState({}, '', window.location.pathname);
        this.currentState = {};
        this.notificationService.showNotification('[CLEAR] Search parameters cleared from URL', 'info');
    }
    
    /**
     * Utility methods
     */
    getCollectionDisplayName(collectionId) {
        // Try to get display name from available collections
        const collections = this.inlineDropdownManager?.aiSearchHelper?.allAvailableCollections;
        if (collections) {
            const collection = collections.find(c => c.id === collectionId);
            if (collection) {
                return collection.displayTitle || collection.title || collectionId;
            }
        }
        return collectionId;
    }
    
    parseGeometry(geometryString) {
        // Implementation for parsing WKT/GeoJSON
        // This would use the existing geometry parsing utilities
        return null; // Placeholder
    }
    
    displayGeometryOnMap(geojson, name) {
        // Implementation for displaying geometry on map
        // This would use the existing map display utilities
    }
    
    displayBboxOnMap(bbox, name) {
        // Implementation for displaying bbox on map
        // This would use the existing map display utilities
    }
}
