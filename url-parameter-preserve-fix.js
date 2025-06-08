/**
 * URL Parameter Preservation Fix for STAC Explorer
 * Fixes issue where location search clears existing URL parameters
 * instead of properly merging them
 */

/**
 * Enhanced URL Parameter Management
 */
class URLParameterFix {
    constructor() {
        this.debug = true;
        this.originalParameters = {};
        this.parameterHistory = [];
        this.setupParameterPreservation();
    }

    /**
     * Setup parameter preservation system
     */
    setupParameterPreservation() {
        console.log('[URL-PRESERVE] Setting up URL parameter preservation...');
        
        // Store initial URL parameters
        this.storeCurrentParameters();
        
        // Monitor URL changes
        this.monitorURLChanges();
        
        console.log('[URL-PRESERVE] Parameter preservation system ready');
    }

    /**
     * Store current URL parameters for preservation
     */
    storeCurrentParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.originalParameters = Object.fromEntries(urlParams.entries());
        
        console.log('[URL-PRESERVE] Stored current parameters:', this.originalParameters);
    }

    /**
     * Monitor URL changes for debugging
     */
    monitorURLChanges() {
        let lastURL = window.location.href;
        
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastURL) {
                lastURL = window.location.href;
                this.onURLChanged();
            }
        });
        
        observer.observe(document, { subtree: true, childList: true });
        
        // Also monitor popstate events
        window.addEventListener('popstate', () => this.onURLChanged());
    }

    /**
     * Handle URL changes
     */
    onURLChanged() {
        const newParams = new URLSearchParams(window.location.search);
        const newParamsObj = Object.fromEntries(newParams.entries());
        
        console.log('[URL-PRESERVE] URL changed:', {
            old: this.originalParameters,
            new: newParamsObj,
            url: window.location.href
        });
        
        this.parameterHistory.push({
            timestamp: new Date().toISOString(),
            parameters: { ...newParamsObj },
            url: window.location.href
        });
        
        this.originalParameters = newParamsObj;
    }

    /**
     * Apply fixes to URL state management
     */
    applyParameterPreservationFix() {
        if (!window.stacExplorer?.urlStateManager) {
            console.log('[URL-PRESERVE] URLStateManager not ready, waiting...');
            setTimeout(() => this.applyParameterPreservationFix(), 1000);
            return;
        }

        const urlStateManager = window.stacExplorer.urlStateManager;
        
        console.log('[URL-PRESERVE] Applying parameter preservation fixes...');

        // Fix 1: Enhanced performURLUpdate with parameter preservation
        this.fixPerformURLUpdate(urlStateManager);

        // Fix 2: Smart parameter merging
        this.addParameterMerging(urlStateManager);

        // Fix 3: Location-specific parameter handling
        this.addLocationParameterHandling(urlStateManager);

        // Fix 4: Parameter preservation utilities
        this.addPreservationUtilities(urlStateManager);

        console.log('[URL-PRESERVE] Parameter preservation fixes applied');
    }

    /**
     * Fix 1: Enhanced performURLUpdate with parameter preservation
     */
    fixPerformURLUpdate(urlStateManager) {
        console.log('[URL-PRESERVE] Fixing performURLUpdate method...');

        // Store original method
        const originalPerformURLUpdate = urlStateManager.performURLUpdate;

        // Enhanced version with parameter preservation
        urlStateManager.performURLUpdate = function(stateChange) {
            try {
                console.log('[URL-UPDATE] Performing URL update with preservation:', stateChange);

                // Get current URL parameters to preserve non-conflicting ones
                const currentParams = new URLSearchParams(window.location.search);
                const preservedParams = new URLSearchParams();

                // Preserve existing parameters that aren't being updated
                for (const [key, value] of currentParams.entries()) {
                    preservedParams.set(key, value);
                }

                console.log('[URL-UPDATE] Current parameters to preserve:', 
                           Object.fromEntries(preservedParams.entries()));

                // Update current state (merge, don't replace)
                Object.assign(this.currentState, stateChange);

                // Build URL parameters starting with preserved ones
                const urlParams = preservedParams;

                // Only update parameters that are specifically changing
                const urlKeys = this.urlKeys || {
                    collection: 'c',
                    collectionSource: 'cs',
                    location: 'l',
                    locationName: 'ln',
                    locationBbox: 'lb',
                    locationQuery: 'lq',
                    dateType: 'dt',
                    dateStart: 'ds',
                    dateEnd: 'de',
                    cloudCover: 'cc',
                    geometry: 'g',
                    geojson: 'gj'
                };

                // Update only changed parameters
                if ('collection' in stateChange) {
                    if (this.currentState.collection) {
                        urlParams.set(urlKeys.collection, this.currentState.collection);
                    } else {
                        urlParams.delete(urlKeys.collection);
                    }
                }

                if ('collectionSource' in stateChange) {
                    if (this.currentState.collectionSource) {
                        urlParams.set(urlKeys.collectionSource, this.currentState.collectionSource);
                    } else {
                        urlParams.delete(urlKeys.collectionSource);
                    }
                }

                // Location parameters - only update if location-related changes
                if ('locationBbox' in stateChange || 'locationName' in stateChange || 'locationQuery' in stateChange) {
                    // Handle location bbox
                    if (this.currentState.locationBbox && Array.isArray(this.currentState.locationBbox)) {
                        urlParams.set(urlKeys.locationBbox, this.currentState.locationBbox.join(','));
                    } else if ('locationBbox' in stateChange) {
                        urlParams.delete(urlKeys.locationBbox);
                    }

                    // Handle location name
                    if (this.currentState.locationName && this.currentState.locationName !== 'THE WORLD') {
                        urlParams.set(urlKeys.locationName, this.currentState.locationName);
                    } else if ('locationName' in stateChange) {
                        urlParams.delete(urlKeys.locationName);
                    }

                    // Handle location query
                    if (this.currentState.locationQuery) {
                        urlParams.set(urlKeys.locationQuery, this.currentState.locationQuery);
                    } else if ('locationQuery' in stateChange) {
                        urlParams.delete(urlKeys.locationQuery);
                    }

                    // Handle geometry
                    if (this.currentState.geometry) {
                        urlParams.set(urlKeys.geometry, encodeURIComponent(this.currentState.geometry));
                    } else if ('geometry' in stateChange) {
                        urlParams.delete(urlKeys.geometry);
                    }

                    // Handle geojson
                    if (this.currentState.geojson) {
                        urlParams.set(urlKeys.geojson, encodeURIComponent(this.currentState.geojson));
                    } else if ('geojson' in stateChange) {
                        urlParams.delete(urlKeys.geojson);
                    }
                }

                // Date parameters - only update if date-related changes
                if ('dateType' in stateChange || 'dateStart' in stateChange || 'dateEnd' in stateChange) {
                    if (this.currentState.dateType && this.currentState.dateType !== 'anytime') {
                        urlParams.set(urlKeys.dateType, this.currentState.dateType);
                    } else if ('dateType' in stateChange) {
                        urlParams.delete(urlKeys.dateType);
                    }

                    if (this.currentState.dateStart) {
                        urlParams.set(urlKeys.dateStart, this.currentState.dateStart);
                    } else if ('dateStart' in stateChange) {
                        urlParams.delete(urlKeys.dateStart);
                    }

                    if (this.currentState.dateEnd) {
                        urlParams.set(urlKeys.dateEnd, this.currentState.dateEnd);
                    } else if ('dateEnd' in stateChange) {
                        urlParams.delete(urlKeys.dateEnd);
                    }
                }

                // Cloud cover - only update if specified
                if ('cloudCover' in stateChange) {
                    if (this.currentState.cloudCover && this.currentState.cloudCover !== 20) {
                        urlParams.set(urlKeys.cloudCover, this.currentState.cloudCover.toString());
                    } else {
                        urlParams.delete(urlKeys.cloudCover);
                    }
                }

                // Update URL without page reload
                const newURL = urlParams.toString() ? 
                    `${window.location.pathname}?${urlParams.toString()}` : 
                    window.location.pathname;

                const oldURL = window.location.href;
                window.history.replaceState({ searchState: this.currentState }, '', newURL);

                console.log('[URL-UPDATE] URL updated with preservation:', {
                    old: oldURL,
                    new: newURL,
                    preserved: Object.fromEntries(preservedParams.entries()),
                    final: Object.fromEntries(urlParams.entries())
                });

            } catch (error) {
                console.error('[URL-UPDATE] Error in enhanced performURLUpdate:', error);
                
                // Fallback to original method
                if (originalPerformURLUpdate) {
                    return originalPerformURLUpdate.call(this, stateChange);
                }
            }
        };

        console.log('[URL-PRESERVE] performURLUpdate method enhanced');
    }

    /**
     * Fix 2: Smart parameter merging
     */
    addParameterMerging(urlStateManager) {
        console.log('[URL-PRESERVE] Adding smart parameter merging...');

        // Add smart merge method
        urlStateManager.mergeURLParameters = function(newParams) {
            const currentParams = new URLSearchParams(window.location.search);
            
            // Merge new parameters with existing ones
            Object.entries(newParams).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    currentParams.set(key, value);
                } else {
                    currentParams.delete(key);
                }
            });

            const newURL = currentParams.toString() ? 
                `${window.location.pathname}?${currentParams.toString()}` : 
                window.location.pathname;

            window.history.replaceState({ merged: true }, '', newURL);
            
            console.log('[URL-MERGE] Parameters merged:', newParams);
            return newURL;
        };

        console.log('[URL-PRESERVE] Smart parameter merging added');
    }

    /**
     * Fix 3: Location-specific parameter handling
     */
    addLocationParameterHandling(urlStateManager) {
        console.log('[URL-PRESERVE] Adding location-specific parameter handling...');

        // Add location-only update method
        urlStateManager.updateLocationParameters = function(locationState) {
            try {
                const currentParams = new URLSearchParams(window.location.search);
                
                console.log('[LOCATION-UPDATE] Updating only location parameters:', locationState);

                // Update only location-related parameters
                if (locationState.locationBbox && Array.isArray(locationState.locationBbox)) {
                    currentParams.set('lb', locationState.locationBbox.join(','));
                }

                if (locationState.locationName && locationState.locationName !== 'THE WORLD') {
                    currentParams.set('ln', locationState.locationName);
                }

                if (locationState.locationQuery) {
                    currentParams.set('lq', locationState.locationQuery);
                }

                if (locationState.geometry) {
                    currentParams.set('g', encodeURIComponent(locationState.geometry));
                }

                if (locationState.geojson) {
                    currentParams.set('gj', encodeURIComponent(locationState.geojson));
                }

                const newURL = currentParams.toString() ? 
                    `${window.location.pathname}?${currentParams.toString()}` : 
                    window.location.pathname;

                window.history.replaceState({ locationUpdate: true }, '', newURL);
                
                console.log('[LOCATION-UPDATE] Location parameters updated:', newURL);
                return newURL;

            } catch (error) {
                console.error('[LOCATION-UPDATE] Error updating location parameters:', error);
            }
        };

        console.log('[URL-PRESERVE] Location-specific parameter handling added');
    }

    /**
     * Fix 4: Parameter preservation utilities
     */
    addPreservationUtilities(urlStateManager) {
        console.log('[URL-PRESERVE] Adding preservation utilities...');

        // Add parameter backup/restore
        urlStateManager.backupParameters = function() {
            const params = new URLSearchParams(window.location.search);
            this._parameterBackup = Object.fromEntries(params.entries());
            console.log('[BACKUP] Parameters backed up:', this._parameterBackup);
            return this._parameterBackup;
        };

        urlStateManager.restoreParameters = function() {
            if (this._parameterBackup) {
                const urlParams = new URLSearchParams(this._parameterBackup);
                const newURL = urlParams.toString() ? 
                    `${window.location.pathname}?${urlParams.toString()}` : 
                    window.location.pathname;
                
                window.history.replaceState({ restored: true }, '', newURL);
                console.log('[RESTORE] Parameters restored:', this._parameterBackup);
                return newURL;
            }
            return null;
        };

        // Add parameter comparison
        urlStateManager.compareParameters = function() {
            const current = Object.fromEntries(new URLSearchParams(window.location.search).entries());
            const backup = this._parameterBackup || {};
            
            const comparison = {
                current,
                backup,
                added: {},
                removed: {},
                changed: {}
            };

            // Find added parameters
            Object.keys(current).forEach(key => {
                if (!(key in backup)) {
                    comparison.added[key] = current[key];
                }
            });

            // Find removed parameters  
            Object.keys(backup).forEach(key => {
                if (!(key in current)) {
                    comparison.removed[key] = backup[key];
                }
            });

            // Find changed parameters
            Object.keys(current).forEach(key => {
                if (key in backup && current[key] !== backup[key]) {
                    comparison.changed[key] = { old: backup[key], new: current[key] };
                }
            });

            console.log('[COMPARE] Parameter comparison:', comparison);
            return comparison;
        };

        console.log('[URL-PRESERVE] Preservation utilities added');
    }

    /**
     * Get parameter change history
     */
    getParameterHistory() {
        return this.parameterHistory;
    }

    /**
     * Test parameter preservation
     */
    testParameterPreservation() {
        console.log('[TEST-PRESERVE] Testing parameter preservation...');

        const urlStateManager = window.stacExplorer?.urlStateManager;
        if (!urlStateManager) {
            console.error('[TEST-PRESERVE] URLStateManager not available');
            return false;
        }

        try {
            // Backup current parameters
            const backup = urlStateManager.backupParameters();

            // Simulate location change
            const testLocationState = {
                locationBbox: [-2.3522, 43.3183, -2.2522, 43.4183],
                locationName: 'Test Location Preserve',
                locationQuery: 'test preserve'
            };

            // Update only location parameters
            urlStateManager.updateLocationParameters(testLocationState);

            // Compare parameters
            const comparison = urlStateManager.compareParameters();

            console.log('[TEST-PRESERVE] Test completed:', {
                backup,
                comparison,
                success: Object.keys(comparison.removed).length === 0
            });

            // Restore original parameters after test
            setTimeout(() => {
                urlStateManager.restoreParameters();
                console.log('[TEST-PRESERVE] Original parameters restored');
            }, 2000);

            return true;

        } catch (error) {
            console.error('[TEST-PRESERVE] Test failed:', error);
            return false;
        }
    }
}

// Initialize the fix
const urlParameterFix = new URLParameterFix();

// Auto-apply fix when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            urlParameterFix.applyParameterPreservationFix();
        }, 3000);
    });
} else {
    setTimeout(() => {
        urlParameterFix.applyParameterPreservationFix();
    }, 3000);
}

// Add global functions for testing
window.testParameterPreservation = () => urlParameterFix.testParameterPreservation();
window.getParameterHistory = () => urlParameterFix.getParameterHistory();
window.backupURLParameters = () => window.stacExplorer?.urlStateManager?.backupParameters();
window.restoreURLParameters = () => window.stacExplorer?.urlStateManager?.restoreParameters();
window.compareURLParameters = () => window.stacExplorer?.urlStateManager?.compareParameters();

// Export for manual usage
window.urlParameterFix = urlParameterFix;

console.log('[URL-PRESERVE-FIX] URL parameter preservation fix loaded');
console.log('[INFO] The fix will auto-apply in 3 seconds');
console.log('[INFO] Test function: testParameterPreservation()');
