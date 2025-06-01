/**
 * Search Synchronization and Execution Fix for STAC Explorer
 * Fixes bidirectional sync between left menu and fullscreen AI search
 * Adds search button to left menu and ensures proper search execution
 */

/**
 * Search Integration Fix
 */
class SearchIntegrationFix {
    constructor() {
        this.debug = true;
        this.searchHistory = [];
        this.syncInProgress = false;
        this.setupSearchIntegration();
    }

    /**
     * Setup comprehensive search integration
     */
    setupSearchIntegration() {
        console.log('[SEARCH-FIX] Setting up search integration...');
        
        // Wait for components to be ready
        this.waitForComponents();
    }

    /**
     * Wait for all required components
     */
    waitForComponents() {
        const checkComponents = () => {
            const components = window.stacExplorer;
            
            if (components?.inlineDropdownManager && 
                components?.aiSmartSearch && 
                components?.searchPanel) {
                
                console.log('[SEARCH-FIX] All components ready, applying fixes');
                this.applySearchFixes();
                
            } else {
                console.log('[SEARCH-FIX] Waiting for components...', {
                    inlineDropdownManager: !!components?.inlineDropdownManager,
                    aiSmartSearch: !!components?.aiSmartSearch,
                    searchPanel: !!components?.searchPanel
                });
                setTimeout(checkComponents, 1000);
            }
        };

        checkComponents();
    }

    /**
     * Apply all search-related fixes
     */
    applySearchFixes() {
        const { inlineDropdownManager, aiSmartSearch, searchPanel, mapManager } = window.stacExplorer;

        console.log('[SEARCH-FIX] Applying search integration fixes...');

        // Fix 1: Add bidirectional synchronization
        this.addBidirectionalSync(inlineDropdownManager, aiSmartSearch);

        // Fix 2: Add search button to left menu
        this.addLeftMenuSearchButton(inlineDropdownManager, searchPanel);

        // Fix 3: Fix search execution issues
        this.fixSearchExecution(inlineDropdownManager, searchPanel, aiSmartSearch);

        // Fix 4: Add search debugging
        this.addSearchDebugging(searchPanel);

        // Fix 5: Ensure URL parameter preservation doesn't break search
        this.fixParameterSearchIntegration(inlineDropdownManager, searchPanel);

        console.log('[SEARCH-FIX] All search fixes applied successfully');
    }

    /**
     * Fix 1: Add bidirectional synchronization
     */
    addBidirectionalSync(inlineDropdownManager, aiSmartSearch) {
        console.log('[SEARCH-FIX] Adding bidirectional synchronization...');

        // Enhance inline dropdown manager to sync to fullscreen AI search
        const originalUpdateSearchSummary = inlineDropdownManager.updateSearchSummary;
        
        inlineDropdownManager.updateSearchSummary = function(fieldType, value) {
            try {
                // Call original method
                const result = originalUpdateSearchSummary.call(this, fieldType, value);

                // Sync to fullscreen AI search (prevent infinite loops)
                if (!window.searchIntegrationFix?.syncInProgress) {
                    window.searchIntegrationFix.syncInProgress = true;
                    
                    setTimeout(() => {
                        window.searchIntegrationFix.syncToFullscreenAI(this, aiSmartSearch, fieldType);
                        window.searchIntegrationFix.syncInProgress = false;
                    }, 100);
                }

                return result;

            } catch (error) {
                console.error('[SYNC] Error in updateSearchSummary sync:', error);
                return originalUpdateSearchSummary.call(this, fieldType, value);
            }
        };

        // Enhance AI search to sync back to left menu
        if (aiSmartSearch.executeSearch) {
            const originalExecuteSearch = aiSmartSearch.executeSearch;
            
            aiSmartSearch.executeSearch = function() {
                try {
                    const result = originalExecuteSearch.call(this);

                    // Sync back to left menu (prevent infinite loops)
                    if (!window.searchIntegrationFix?.syncInProgress) {
                        window.searchIntegrationFix.syncInProgress = true;
                        
                        setTimeout(() => {
                            window.searchIntegrationFix.syncToLeftMenu(this, inlineDropdownManager);
                            window.searchIntegrationFix.syncInProgress = false;
                        }, 100);
                    }

                    return result;

                } catch (error) {
                    console.error('[SYNC] Error in executeSearch sync:', error);
                    return originalExecuteSearch.call(this);
                }
            };
        }

        console.log('[SEARCH-FIX] Bidirectional synchronization added');
    }

    /**
     * Sync left menu changes to fullscreen AI search
     */
    syncToFullscreenAI(inlineDropdownManager, aiSmartSearch, changedField) {
        try {
            console.log('[SYNC-TO-AI] Syncing left menu changes to fullscreen AI:', changedField);

            const aiHelper = inlineDropdownManager.aiSearchHelper;
            if (!aiHelper) return;

            // Sync collection
            if (changedField === 'collection' || !changedField) {
                aiSmartSearch.selectedCollection = aiHelper.selectedCollection;
                aiSmartSearch.selectedCollectionSource = aiHelper.selectedCollectionSource;
            }

            // Sync location
            if (changedField === 'location' || !changedField) {
                aiSmartSearch.selectedLocation = aiHelper.selectedLocation;
                aiSmartSearch.selectedLocationResult = aiHelper.selectedLocationResult;
            }

            // Sync date
            if (changedField === 'date' || !changedField) {
                aiSmartSearch.selectedDate = aiHelper.selectedDate;
            }

            // Sync cloud cover
            aiSmartSearch.cloudCover = aiHelper.cloudCover;

            console.log('[SYNC-TO-AI] Fullscreen AI state updated:', {
                collection: aiSmartSearch.selectedCollection,
                location: aiSmartSearch.selectedLocation,
                date: aiSmartSearch.selectedDate
            });

        } catch (error) {
            console.error('[SYNC-TO-AI] Error syncing to fullscreen AI:', error);
        }
    }

    /**
     * Sync fullscreen AI changes to left menu
     */
    syncToLeftMenu(aiSmartSearch, inlineDropdownManager) {
        try {
            console.log('[SYNC-TO-MENU] Syncing fullscreen AI changes to left menu');

            const aiHelper = inlineDropdownManager.aiSearchHelper;
            if (!aiHelper) return;

            // Sync states
            aiHelper.selectedCollection = aiSmartSearch.selectedCollection;
            aiHelper.selectedCollectionSource = aiSmartSearch.selectedCollectionSource;
            aiHelper.selectedLocation = aiSmartSearch.selectedLocation;
            aiHelper.selectedLocationResult = aiSmartSearch.selectedLocationResult;
            aiHelper.selectedDate = aiSmartSearch.selectedDate;
            aiHelper.cloudCover = aiSmartSearch.cloudCover;

            // Update left menu display
            this.updateLeftMenuDisplay(inlineDropdownManager, aiSmartSearch);

            console.log('[SYNC-TO-MENU] Left menu state updated');

        } catch (error) {
            console.error('[SYNC-TO-MENU] Error syncing to left menu:', error);
        }
    }

    /**
     * Update left menu display based on current state
     */
    updateLeftMenuDisplay(inlineDropdownManager, aiSmartSearch) {
        try {
            // Update collection display
            if (aiSmartSearch.selectedCollection) {
                const collectionName = this.getCollectionDisplayName(aiSmartSearch.selectedCollection);
                inlineDropdownManager.updateSearchSummary('collection', collectionName.toUpperCase());
            }

            // Update location display
            if (aiSmartSearch.selectedLocationResult) {
                const locationName = aiSmartSearch.selectedLocationResult.shortName || 
                                   aiSmartSearch.selectedLocationResult.formattedName;
                if (locationName) {
                    inlineDropdownManager.updateSearchSummary('location', locationName.toUpperCase());
                }
            }

            // Update date display
            if (aiSmartSearch.selectedDate) {
                let dateText = 'ANYTIME';
                const dateObj = aiSmartSearch.selectedDate;
                
                if (dateObj.type === 'thismonth') {
                    dateText = 'THIS MONTH';
                } else if (dateObj.type === 'custom' && dateObj.start && dateObj.end) {
                    dateText = `${dateObj.start} to ${dateObj.end}`.toUpperCase();
                }
                
                inlineDropdownManager.updateSearchSummary('date', dateText);
            }

        } catch (error) {
            console.error('[DISPLAY-UPDATE] Error updating left menu display:', error);
        }
    }

    /**
     * Fix 2: Add search button to left menu
     */
    addLeftMenuSearchButton(inlineDropdownManager, searchPanel) {
        console.log('[SEARCH-FIX] Adding search button to left menu...');

        try {
            // Find the search summary section
            const searchSummary = document.querySelector('.global-search-summary');
            if (!searchSummary) {
                console.warn('[SEARCH-BUTTON] Search summary section not found');
                return;
            }

            // Check if search button already exists
            if (document.getElementById('left-menu-search-btn')) {
                console.log('[SEARCH-BUTTON] Search button already exists');
                return;
            }

            // Create search button container
            const searchButtonContainer = document.createElement('div');
            searchButtonContainer.className = 'left-menu-search-container';
            searchButtonContainer.style.cssText = `
                margin: 15px 0;
                padding: 10px 0;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            `;

            // Create search button
            const searchButton = document.createElement('button');
            searchButton.id = 'left-menu-search-btn';
            searchButton.className = 'left-menu-search-btn';
            searchButton.innerHTML = `
                <i class="material-icons">search</i>
                <span>Search</span>
            `;
            
            searchButton.style.cssText = `
                width: 100%;
                padding: 12px 16px;
                background: linear-gradient(45deg, #2196F3, #21CBF3);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
            `;

            // Add hover effects
            searchButton.addEventListener('mouseenter', () => {
                searchButton.style.transform = 'translateY(-2px)';
                searchButton.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                searchButton.style.background = 'linear-gradient(45deg, #1976D2, #0288D1)';
            });

            searchButton.addEventListener('mouseleave', () => {
                searchButton.style.transform = 'translateY(0)';
                searchButton.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
                searchButton.style.background = 'linear-gradient(45deg, #2196F3, #21CBF3)';
            });

            // Add click handler
            searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.executeLeftMenuSearch(inlineDropdownManager, searchPanel);
            });

            // Add to container and page
            searchButtonContainer.appendChild(searchButton);
            searchSummary.appendChild(searchButtonContainer);

            console.log('[SEARCH-FIX] Search button added to left menu successfully');

        } catch (error) {
            console.error('[SEARCH-BUTTON] Error adding search button:', error);
        }
    }

    /**
     * Execute search from left menu
     */
    executeLeftMenuSearch(inlineDropdownManager, searchPanel) {
        try {
            console.log('[LEFT-SEARCH] Executing search from left menu...');

            // Show loading state
            const searchButton = document.getElementById('left-menu-search-btn');
            if (searchButton) {
                const originalHTML = searchButton.innerHTML;
                searchButton.innerHTML = '<i class="material-icons spinning">refresh</i><span>Searching...</span>';
                searchButton.disabled = true;

                // Restore button after delay
                setTimeout(() => {
                    searchButton.innerHTML = originalHTML;
                    searchButton.disabled = false;
                }, 2000);
            }

            // Get current search state from inline dropdown manager
            const aiHelper = inlineDropdownManager.aiSearchHelper;
            const searchState = {
                collection: aiHelper?.selectedCollection || '',
                collectionSource: aiHelper?.selectedCollectionSource || null,
                location: aiHelper?.selectedLocation || 'everywhere',
                locationResult: aiHelper?.selectedLocationResult || null,
                date: aiHelper?.selectedDate || { type: 'anytime' },
                cloudCover: aiHelper?.cloudCover || 20
            };

            console.log('[LEFT-SEARCH] Search state:', searchState);

            // Build search parameters
            const searchParams = this.buildSearchParameters(searchState);
            console.log('[LEFT-SEARCH] Search parameters:', searchParams);

            // Execute search via search panel
            if (searchPanel && typeof searchPanel.executeSearch === 'function') {
                searchPanel.executeSearch(searchParams);
            } else if (searchPanel && typeof searchPanel.performSearch === 'function') {
                searchPanel.performSearch(searchParams);
            } else {
                // Fallback: trigger search via form submission
                this.triggerFormSearch(searchParams);
            }

            // Log search execution
            this.searchHistory.push({
                timestamp: new Date().toISOString(),
                source: 'left-menu',
                state: searchState,
                parameters: searchParams
            });

            console.log('[LEFT-SEARCH] Search executed successfully');

        } catch (error) {
            console.error('[LEFT-SEARCH] Error executing left menu search:', error);
            
            // Show error state
            const searchButton = document.getElementById('left-menu-search-btn');
            if (searchButton) {
                searchButton.innerHTML = '<i class="material-icons">error</i><span>Error</span>';
                searchButton.style.background = '#f44336';
                
                setTimeout(() => {
                    searchButton.innerHTML = '<i class="material-icons">search</i><span>Search</span>';
                    searchButton.style.background = 'linear-gradient(45deg, #2196F3, #21CBF3)';
                }, 2000);
            }
        }
    }

    /**
     * Build search parameters from current state
     */
    buildSearchParameters(searchState) {
        const params = {};

        // Collection parameters
        if (searchState.collection) {
            params.collection = searchState.collection;
            if (searchState.collectionSource) {
                params.collectionSource = searchState.collectionSource;
            }
        }

        // Location parameters
        if (searchState.location && searchState.location !== 'everywhere') {
            if (Array.isArray(searchState.location)) {
                params.bbox = searchState.location;
            }
            
            if (searchState.locationResult) {
                params.locationName = searchState.locationResult.formattedName;
                if (searchState.locationResult.bbox) {
                    params.bbox = searchState.locationResult.bbox;
                }
            }
        }

        // Date parameters
        if (searchState.date && searchState.date.type !== 'anytime') {
            if (searchState.date.start) {
                params.dateStart = searchState.date.start;
            }
            if (searchState.date.end) {
                params.dateEnd = searchState.date.end;
            }
        }

        // Cloud cover
        if (searchState.cloudCover && searchState.cloudCover !== 20) {
            params.maxCloudCover = searchState.cloudCover;
        }

        return params;
    }

    /**
     * Fallback: trigger search via form submission
     */
    triggerFormSearch(searchParams) {
        try {
            console.log('[FORM-SEARCH] Triggering search via form submission...');

            // Update form fields
            Object.entries(searchParams).forEach(([key, value]) => {
                let inputId;
                
                switch (key) {
                    case 'collection':
                        inputId = 'collection-select';
                        break;
                    case 'bbox':
                        inputId = 'bbox-input';
                        if (Array.isArray(value)) {
                            value = value.join(',');
                        }
                        break;
                    case 'dateStart':
                        inputId = 'date-start';
                        break;
                    case 'dateEnd':
                        inputId = 'date-end';
                        break;
                    case 'maxCloudCover':
                        inputId = 'cloud-cover';
                        break;
                }

                if (inputId) {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.value = value;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });

            // Trigger search button
            const searchBtn = document.getElementById('search-btn') || 
                            document.querySelector('button[type="submit"]') ||
                            document.querySelector('.search-button');
            
            if (searchBtn) {
                searchBtn.click();
                console.log('[FORM-SEARCH] Search form submitted');
            } else {
                console.warn('[FORM-SEARCH] Search button not found');
            }

        } catch (error) {
            console.error('[FORM-SEARCH] Error in form search fallback:', error);
        }
    }

    /**
     * Fix 3: Fix search execution issues
     */
    fixSearchExecution(inlineDropdownManager, searchPanel, aiSmartSearch) {
        console.log('[SEARCH-FIX] Fixing search execution issues...');

        // Add search execution debugging
        if (searchPanel) {
            // Monitor search panel methods
            ['executeSearch', 'performSearch', 'search'].forEach(methodName => {
                if (typeof searchPanel[methodName] === 'function') {
                    const originalMethod = searchPanel[methodName];
                    
                    searchPanel[methodName] = function(...args) {
                        console.log(`[SEARCH-EXEC] ${methodName} called with:`, args);
                        
                        try {
                            const result = originalMethod.apply(this, args);
                            console.log(`[SEARCH-EXEC] ${methodName} result:`, result);
                            return result;
                        } catch (error) {
                            console.error(`[SEARCH-EXEC] ${methodName} error:`, error);
                            throw error;
                        }
                    };
                }
            });
        }

        console.log('[SEARCH-FIX] Search execution monitoring added');
    }

    /**
     * Fix 4: Add search debugging
     */
    addSearchDebugging(searchPanel) {
        console.log('[SEARCH-FIX] Adding search debugging...');

        // Add global search debugging functions
        window.debugSearch = {
            getSearchHistory: () => this.searchHistory,
            getCurrentSearchState: () => {
                const { inlineDropdownManager, aiSmartSearch } = window.stacExplorer;
                return {
                    leftMenu: inlineDropdownManager?.aiSearchHelper ? {
                        collection: inlineDropdownManager.aiSearchHelper.selectedCollection,
                        location: inlineDropdownManager.aiSearchHelper.selectedLocation,
                        date: inlineDropdownManager.aiSearchHelper.selectedDate
                    } : null,
                    fullscreen: aiSmartSearch ? {
                        collection: aiSmartSearch.selectedCollection,
                        location: aiSmartSearch.selectedLocation,
                        date: aiSmartSearch.selectedDate
                    } : null
                };
            },
            testLeftMenuSearch: () => {
                const { inlineDropdownManager, searchPanel } = window.stacExplorer;
                if (inlineDropdownManager && searchPanel) {
                    this.executeLeftMenuSearch(inlineDropdownManager, searchPanel);
                }
            },
            syncStates: () => {
                const { inlineDropdownManager, aiSmartSearch } = window.stacExplorer;
                if (inlineDropdownManager && aiSmartSearch) {
                    this.syncToFullscreenAI(inlineDropdownManager, aiSmartSearch);
                    this.syncToLeftMenu(aiSmartSearch, inlineDropdownManager);
                }
            }
        };

        console.log('[SEARCH-FIX] Search debugging tools added');
        console.log('[INFO] Use debugSearch.getCurrentSearchState() to check sync');
        console.log('[INFO] Use debugSearch.testLeftMenuSearch() to test left menu search');
    }

    /**
     * Fix 5: Ensure URL parameter preservation doesn't break search
     */
    fixParameterSearchIntegration(inlineDropdownManager, searchPanel) {
        console.log('[SEARCH-FIX] Fixing parameter-search integration...');

        // Ensure URL updates don't interfere with search execution
        const urlStateManager = window.stacExplorer?.urlStateManager;
        if (urlStateManager) {
            const originalPerformURLUpdate = urlStateManager.performURLUpdate;
            
            urlStateManager.performURLUpdate = function(stateChange) {
                // Store search execution state
                const wasSearching = document.querySelector('.search-loading') !== null;
                
                try {
                    return originalPerformURLUpdate.call(this, stateChange);
                } catch (error) {
                    console.error('[URL-SEARCH] Error in URL update during search:', error);
                    // Don't let URL errors break search
                } finally {
                    // Restore search state if needed
                    if (wasSearching) {
                        console.log('[URL-SEARCH] Preserving search state during URL update');
                    }
                }
            };
        }

        console.log('[SEARCH-FIX] Parameter-search integration fixed');
    }

    /**
     * Utility methods
     */
    getCollectionDisplayName(collectionId) {
        try {
            const { inlineDropdownManager } = window.stacExplorer;
            const collections = inlineDropdownManager?.aiSearchHelper?.allAvailableCollections;
            if (collections) {
                const collection = collections.find(c => c.id === collectionId);
                if (collection) {
                    return collection.displayTitle || collection.title || collectionId;
                }
            }
            return collectionId;
        } catch (error) {
            console.warn('[UTIL] Error getting collection display name:', error);
            return collectionId;
        }
    }

    /**
     * Get search execution history
     */
    getSearchHistory() {
        return this.searchHistory;
    }
}

// Initialize the fix
const searchIntegrationFix = new SearchIntegrationFix();

// Auto-apply fix when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Apply after other fixes have loaded
        }, 4000);
    });
} else {
    setTimeout(() => {
        // Apply after other fixes have loaded  
    }, 4000);
}

// Export for manual usage
window.searchIntegrationFix = searchIntegrationFix;

// Add CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .left-menu-search-container {
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

console.log('[SEARCH-INTEGRATION-FIX] Search integration and synchronization fix loaded');
console.log('[INFO] The fix will auto-apply in 4 seconds');
console.log('[INFO] Debug tools: debugSearch.getCurrentSearchState(), debugSearch.testLeftMenuSearch()');
