/**
 * URL Synchronization Fix for STAC Explorer
 * Fixes issues with URL not updating when location changes via left menu
 */

/**
 * Enhanced URL State Manager fixes
 */
class URLStateFix {
    constructor() {
        this.debug = true;
        this.eventQueue = [];
        this.isReady = false;
        this.setupDebugLogging();
    }

    /**
     * Setup enhanced debugging for URL state management
     */
    setupDebugLogging() {
        if (!this.debug) return;

        // Override console methods to add URL state tags
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        // Add debugging context
        window.urlDebug = {
            events: [],
            states: [],
            errors: []
        };

        console.log('[URL-DEBUG] Enhanced URL debugging enabled');
    }

    /**
     * Fix URL state manager initialization timing
     */
    fixURLStateManagerTiming() {
        // Wait for all components to be ready
        const waitForComponents = () => {
            const components = window.stacExplorer;
            
            if (components?.urlStateManager && 
                components?.inlineDropdownManager && 
                components?.aiSmartSearch) {
                
                console.log('[URL-FIX] All components ready, applying fixes');
                this.applyURLStateFixes();
                this.isReady = true;
                
                // Process queued events
                this.processEventQueue();
                
            } else {
                console.log('[URL-FIX] Waiting for components...', {
                    urlStateManager: !!components?.urlStateManager,
                    inlineDropdownManager: !!components?.inlineDropdownManager,
                    aiSmartSearch: !!components?.aiSmartSearch
                });
                setTimeout(waitForComponents, 500);
            }
        };

        waitForComponents();
    }

    /**
     * Apply comprehensive fixes to URL state management
     */
    applyURLStateFixes() {
        const { urlStateManager, inlineDropdownManager } = window.stacExplorer;

        console.log('[URL-FIX] Applying URL state management fixes');

        // Fix 1: Enhance event emission in InlineDropdownManager
        this.fixInlineDropdownEvents(inlineDropdownManager);

        // Fix 2: Improve URL state listener reliability
        this.fixURLStateListeners(urlStateManager);

        // Fix 3: Add direct URL update fallbacks
        this.addURLUpdateFallbacks(urlStateManager, inlineDropdownManager);

        // Fix 4: Add comprehensive state validation
        this.addStateValidation(urlStateManager);

        // Fix 5: Add manual sync triggers
        this.addManualSyncTriggers(urlStateManager, inlineDropdownManager);

        console.log('[URL-FIX] All fixes applied successfully');
    }

    /**
     * Fix 1: Enhance event emission in InlineDropdownManager
     */
    fixInlineDropdownEvents(inlineDropdownManager) {
        console.log('[URL-FIX] Fixing inline dropdown event emission');

        // Store original method
        const originalEmitStateChangeEvent = inlineDropdownManager.emitStateChangeEvent;

        // Enhanced version with better error handling and debugging
        inlineDropdownManager.emitStateChangeEvent = function() {
            try {
                console.log('[INLINE-EVENT] Emitting state change event...');
                
                // Call original method
                const result = originalEmitStateChangeEvent.call(this);
                
                // Add additional debugging
                const currentState = this.getCurrentState();
                console.log('[INLINE-EVENT] Current state:', currentState);
                
                // Emit a backup event with delay to ensure URL manager catches it
                setTimeout(() => {
                    const backupEvent = new CustomEvent('urlSyncBackup', {
                        detail: currentState,
                        bubbles: true
                    });
                    document.dispatchEvent(backupEvent);
                    console.log('[INLINE-EVENT] Backup sync event emitted');
                }, 100);

                return result;

            } catch (error) {
                console.error('[INLINE-EVENT] Error in emitStateChangeEvent:', error);

                // Fallback: try to emit a basic event
                try {
                    const fallbackState = this.getBasicState();
                    const fallbackEvent = new CustomEvent('searchParameterChanged', {
                        detail: fallbackState,
                        bubbles: true
                    });
                    document.dispatchEvent(fallbackEvent);
                    console.log('[INLINE-EVENT] Fallback event emitted:', fallbackState);
                } catch (fallbackError) {
                    console.error('[INLINE-EVENT] Fallback event also failed:', fallbackError);
                }
            }
        };

        // Add helper methods for state extraction
        inlineDropdownManager.getCurrentState = function() {
            return this.extractCurrentState();
        };

        inlineDropdownManager.getBasicState = function() {
            return {
                collection: this.aiSearchHelper?.selectedCollection || null,
                locationBbox: Array.isArray(this.aiSearchHelper?.selectedLocation) ? 
                           this.aiSearchHelper.selectedLocation : null,
                locationName: this.aiSearchHelper?.selectedLocationResult?.shortName || 
                           this.aiSearchHelper?.selectedLocationResult?.formattedName || null,
                dateType: this.aiSearchHelper?.selectedDate?.type || null,
                dateStart: this.aiSearchHelper?.selectedDate?.start || null,
                dateEnd: this.aiSearchHelper?.selectedDate?.end || null
            };
        };

        inlineDropdownManager.extractCurrentState = function() {
            try {
                const aiHelper = this.aiSearchHelper;
                if (!aiHelper) return {};

                const currentState = {
                    collection: aiHelper.selectedCollection || null,
                    collectionSource: aiHelper.selectedCollectionSource || null,
                    locationBbox: null,
                    locationName: null,
                    dateType: null,
                    dateStart: null,
                    dateEnd: null,
                    cloudCover: aiHelper.cloudCover || 20
                };

                // Location state with enhanced extraction
                if (aiHelper.selectedLocation && aiHelper.selectedLocation !== 'everywhere') {
                    if (Array.isArray(aiHelper.selectedLocation)) {
                        currentState.locationBbox = aiHelper.selectedLocation;
                    }
                    
                    if (aiHelper.selectedLocationResult) {
                        const locationResult = aiHelper.selectedLocationResult;
                        currentState.locationName = locationResult.shortName || 
                                                  locationResult.formattedName;
                        
                        // Include geometry data
                        if (locationResult.wkt) {
                            currentState.geometry = locationResult.wkt;
                        }
                        if (locationResult.originalQuery || locationResult.searchQuery) {
                            currentState.locationQuery = locationResult.originalQuery || 
                                                       locationResult.searchQuery;
                        }
                        if (locationResult.geojson) {
                            currentState.geojson = JSON.stringify(locationResult.geojson);
                        }
                    }
                }

                // Date state
                if (aiHelper.selectedDate && aiHelper.selectedDate.type !== 'anytime') {
                    currentState.dateType = aiHelper.selectedDate.type;
                    currentState.dateStart = aiHelper.selectedDate.start;
                    currentState.dateEnd = aiHelper.selectedDate.end;
                }

                return currentState;

            } catch (error) {
                console.error('[STATE-EXTRACT] Error extracting current state:', error);
                return {};
            }
        };

        console.log('[URL-FIX] Enhanced inline dropdown event emission');
    }

    /**
     * Fix 2: Improve URL state listener reliability
     */
    fixURLStateListeners(urlStateManager) {
        console.log('[URL-FIX] Fixing URL state listeners');

        // Store original setupStateListeners method
        const originalSetupStateListeners = urlStateManager.setupStateListeners;

        // Enhanced listener setup
        urlStateManager.setupStateListeners = function() {
            console.log('[URL-LISTENERS] Setting up enhanced state listeners');

            // Call original method
            if (originalSetupStateListeners) {
                originalSetupStateListeners.call(this);
            }

            // Add backup listener with less restrictive conditions
            document.addEventListener('urlSyncBackup', (event) => {
                console.log('[URL-BACKUP] Backup sync event received:', event.detail);
                
                // Force update URL even if flags are set
                const originalIsUpdating = this.isUpdatingFromURL;
                const originalIsApplying = this.isApplyingState;
                
                this.isUpdatingFromURL = false;
                this.isApplyingState = false;
                
                this.updateURLFromState(event.detail);
                
                // Restore original flags after a delay
                setTimeout(() => {
                    this.isUpdatingFromURL = originalIsUpdating;
                    this.isApplyingState = originalIsApplying;
                }, 100);
            });

            // Add listener for direct URL updates
            document.addEventListener('forceURLUpdate', (event) => {
                console.log('[URL-FORCE] Force URL update requested:', event.detail);
                this.performURLUpdate(event.detail);
            });

            console.log('[URL-LISTENERS] Enhanced state listeners setup complete');
        };

        // Re-setup listeners with enhancements
        urlStateManager.setupStateListeners();

        console.log('[URL-FIX] URL state listeners enhanced');
    }

    /**
     * Fix 3: Add direct URL update fallbacks
     */
    addURLUpdateFallbacks(urlStateManager, inlineDropdownManager) {
        console.log('[URL-FIX] Adding URL update fallbacks');

        // Add direct update method to inline dropdown manager
        inlineDropdownManager.forceURLUpdate = function() {
            try {
                const currentState = this.extractCurrentState();
                console.log('[FALLBACK] Forcing URL update with state:', currentState);

                // Direct URL update
                const urlParams = new URLSearchParams();

                // Collection parameters
                if (currentState.collection) {
                    urlParams.set('c', currentState.collection);
                }
                if (currentState.collectionSource) {
                    urlParams.set('cs', currentState.collectionSource);
                }

                // Location parameters
                if (currentState.locationBbox && Array.isArray(currentState.locationBbox)) {
                    urlParams.set('lb', currentState.locationBbox.join(','));
                }
                if (currentState.locationName && currentState.locationName !== 'THE WORLD') {
                    urlParams.set('ln', currentState.locationName);
                }
                if (currentState.locationQuery) {
                    urlParams.set('lq', currentState.locationQuery);
                }

                // Date parameters
                if (currentState.dateType && currentState.dateType !== 'anytime') {
                    urlParams.set('dt', currentState.dateType);
                }
                if (currentState.dateStart) {
                    urlParams.set('ds', currentState.dateStart);
                }
                if (currentState.dateEnd) {
                    urlParams.set('de', currentState.dateEnd);
                }

                // Cloud cover
                if (currentState.cloudCover && currentState.cloudCover !== 20) {
                    urlParams.set('cc', currentState.cloudCover.toString());
                }

                // Update URL
                const newURL = urlParams.toString() ? 
                    `${window.location.pathname}?${urlParams.toString()}` : 
                    window.location.pathname;

                window.history.replaceState({ searchState: currentState }, '', newURL);
                
                console.log('[FALLBACK] URL updated directly:', newURL);
                return true;

            } catch (error) {
                console.error('[FALLBACK] Error in direct URL update:', error);
                return false;
            }
        };

        // Override updateSearchSummary to include fallback
        const originalUpdateSearchSummary = inlineDropdownManager.updateSearchSummary;
        
        inlineDropdownManager.updateSearchSummary = function(fieldType, value) {
            // Call original method
            const result = originalUpdateSearchSummary.call(this, fieldType, value);

            // Add fallback URL update after a delay
            setTimeout(() => {
                this.forceURLUpdate();
            }, 200);

            return result;
        };

        console.log('[URL-FIX] URL update fallbacks added');
    }

    /**
     * Fix 4: Add comprehensive state validation
     */
    addStateValidation(urlStateManager) {
        console.log('[URL-FIX] Adding state validation');

        // Add validation method
        urlStateManager.validateState = function(state) {
            const issues = [];

            // Check location state consistency
            if (state.locationBbox && !Array.isArray(state.locationBbox)) {
                issues.push('locationBbox is not an array');
            }

            if (state.locationBbox && state.locationBbox.length !== 4) {
                issues.push('locationBbox does not have 4 elements');
            }

            // Check date state consistency
            if (state.dateStart && state.dateEnd) {
                const start = new Date(state.dateStart);
                const end = new Date(state.dateEnd);
                if (start > end) {
                    issues.push('dateStart is after dateEnd');
                }
            }

            if (issues.length > 0) {
                console.warn('[STATE-VALIDATION] State validation issues:', issues, state);
            }

            return issues.length === 0;
        };

        // Override performURLUpdate to include validation
        const originalPerformURLUpdate = urlStateManager.performURLUpdate;
        
        urlStateManager.performURLUpdate = function(stateChange) {
            try {
                // Validate state before updating
                if (!this.validateState(stateChange)) {
                    console.warn('[URL-UPDATE] State validation failed, attempting to fix...');
                    stateChange = this.sanitizeState(stateChange);
                }

                return originalPerformURLUpdate.call(this, stateChange);

            } catch (error) {
                console.error('[URL-UPDATE] Error in performURLUpdate:', error);
                
                // Try basic URL update as fallback
                try {
                    const urlParams = new URLSearchParams();
                    if (stateChange.locationName) {
                        urlParams.set('ln', stateChange.locationName);
                    }
                    const newURL = urlParams.toString() ? 
                        `${window.location.pathname}?${urlParams.toString()}` : 
                        window.location.pathname;
                    window.history.replaceState({}, '', newURL);
                    console.log('[URL-UPDATE] Fallback URL update successful');
                } catch (fallbackError) {
                    console.error('[URL-UPDATE] Fallback URL update also failed:', fallbackError);
                }
            }
        };

        // Add state sanitization method
        urlStateManager.sanitizeState = function(state) {
            const sanitized = { ...state };

            // Fix locationBbox
            if (sanitized.locationBbox && !Array.isArray(sanitized.locationBbox)) {
                delete sanitized.locationBbox;
            }

            // Fix dates
            if (sanitized.dateStart && sanitized.dateEnd) {
                const start = new Date(sanitized.dateStart);
                const end = new Date(sanitized.dateEnd);
                if (start > end) {
                    sanitized.dateEnd = sanitized.dateStart;
                }
            }

            console.log('[STATE-SANITIZE] Sanitized state:', sanitized);
            return sanitized;
        };

        console.log('[URL-FIX] State validation added');
    }

    /**
     * Fix 5: Add manual sync triggers
     */
    addManualSyncTriggers(urlStateManager, inlineDropdownManager) {
        console.log('[URL-FIX] Adding manual sync triggers');

        // Add global sync function
        window.syncURLState = function() {
            console.log('[MANUAL-SYNC] Manual URL sync triggered');
            
            try {
                const currentState = inlineDropdownManager.extractCurrentState();
                console.log('[MANUAL-SYNC] Current state:', currentState);

                // Force URL update
                urlStateManager.performURLUpdate(currentState);
                
                console.log('[MANUAL-SYNC] Manual sync completed');
                return true;

            } catch (error) {
                console.error('[MANUAL-SYNC] Manual sync failed:', error);
                return false;
            }
        };

        // Add sync verification function
        window.verifyURLSync = function() {
            const urlParams = new URLSearchParams(window.location.search);
            const currentState = inlineDropdownManager.extractCurrentState();
            
            const verification = {
                url: Object.fromEntries(urlParams.entries()),
                state: currentState,
                synchronized: true,
                issues: []
            };

            // Check synchronization
            if (currentState.locationName && !urlParams.has('ln')) {
                verification.synchronized = false;
                verification.issues.push('Location name not in URL');
            }

            if (currentState.locationBbox && !urlParams.has('lb')) {
                verification.synchronized = false;
                verification.issues.push('Location bbox not in URL');
            }

            console.log('[VERIFY-SYNC] URL synchronization verification:', verification);
            return verification;
        };

        // Add test function
        window.testURLSync = function() {
            console.log('[TEST-SYNC] Testing URL synchronization...');

            // Simulate location change
            inlineDropdownManager.aiSearchHelper.selectedLocation = [-2.3522, 43.3183, -2.2522, 43.4183];
            inlineDropdownManager.aiSearchHelper.selectedLocationResult = {
                formattedName: 'Test Location',
                shortName: 'Test Location',
                bbox: [-2.3522, 43.3183, -2.2522, 43.4183]
            };

            // Update summary (should trigger URL update)
            inlineDropdownManager.updateSearchSummary('location', 'TEST LOCATION');

            // Verify after delay
            setTimeout(() => {
                const verification = window.verifyURLSync();
                console.log('[TEST-SYNC] Test completed:', verification);
            }, 1000);
        };

        console.log('[URL-FIX] Manual sync triggers added');
        console.log('[URL-FIX] Available functions: syncURLState(), verifyURLSync(), testURLSync()');
    }

    /**
     * Process queued events
     */
    processEventQueue() {
        if (this.eventQueue.length === 0) return;

        console.log(`[URL-FIX] Processing ${this.eventQueue.length} queued events`);

        this.eventQueue.forEach((event, index) => {
            try {
                setTimeout(() => {
                    document.dispatchEvent(event);
                    console.log(`[URL-FIX] Processed queued event ${index + 1}`);
                }, index * 100);
            } catch (error) {
                console.error(`[URL-FIX] Error processing queued event ${index + 1}:`, error);
            }
        });

        this.eventQueue = [];
    }
}

// Initialize the fix
const urlStateFix = new URLStateFix();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            urlStateFix.fixURLStateManagerTiming();
        }, 2000);
    });
} else {
    setTimeout(() => {
        urlStateFix.fixURLStateManagerTiming();
    }, 2000);
}

// Export for manual usage
window.urlStateFix = urlStateFix;

console.log('[URL-SYNC-FIX] URL synchronization fix script loaded');
console.log('[INFO] The fix will auto-initialize in 2 seconds');
console.log('[INFO] Available functions: syncURLState(), verifyURLSync(), testURLSync()');
