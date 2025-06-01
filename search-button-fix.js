/**
 * Search Button Fix for STAC Explorer
 * Fixes the missing search button issue by finding the correct container
 * and adding proper debugging to identify why the button isn't appearing
 */

/**
 * Search Button Fix Implementation
 */
class SearchButtonFix {
    constructor() {
        this.debug = true;
        this.retryAttempts = 0;
        this.maxRetries = 10;
        this.searchButton = null;
        this.setupSearchButton();
    }

    /**
     * Setup search button with retry mechanism
     */
    setupSearchButton() {
        console.log('[SEARCH-BUTTON-FIX] Starting search button setup...');
        
        // Wait for components to be ready
        this.waitForComponentsAndAddButton();
    }

    /**
     * Wait for components and add button with retry
     */
    waitForComponentsAndAddButton() {
        this.retryAttempts++;
        
        console.log(`[SEARCH-BUTTON-FIX] Attempt ${this.retryAttempts}/${this.maxRetries} to add search button...`);
        
        // Check if search button already exists
        if (document.getElementById('left-menu-search-btn')) {
            console.log('[SEARCH-BUTTON-FIX] Search button already exists, skipping creation');
            return;
        }

        // Try to find a suitable container
        const containers = this.findSuitableContainers();
        console.log('[SEARCH-BUTTON-FIX] Found containers:', containers);

        if (containers.length === 0) {
            if (this.retryAttempts < this.maxRetries) {
                console.log('[SEARCH-BUTTON-FIX] No suitable container found, retrying in 1 second...');
                setTimeout(() => this.waitForComponentsAndAddButton(), 1000);
                return;
            } else {
                console.error('[SEARCH-BUTTON-FIX] Failed to find suitable container after max retries');
                this.logDOMStructure();
                return;
            }
        }

        // Use the best container
        const targetContainer = this.selectBestContainer(containers);
        console.log('[SEARCH-BUTTON-FIX] Selected container:', targetContainer);

        // Add search button
        try {
            this.addSearchButtonToContainer(targetContainer);
            console.log('[SEARCH-BUTTON-FIX] Search button added successfully!');
        } catch (error) {
            console.error('[SEARCH-BUTTON-FIX] Error adding search button:', error);
            if (this.retryAttempts < this.maxRetries) {
                setTimeout(() => this.waitForComponentsAndAddButton(), 1000);
            }
        }
    }

    /**
     * Find all suitable containers for the search button
     */
    findSuitableContainers() {
        const containers = [];

        // Option 1: Search summary interface (preferred)
        const searchSummaryInterface = document.querySelector('.search-summary-interface');
        if (searchSummaryInterface) {
            containers.push({
                element: searchSummaryInterface,
                type: 'search-summary-interface',
                priority: 1
            });
        }

        // Option 2: Search container card body
        const searchContainer = document.querySelector('#search-container .md-card-body');
        if (searchContainer) {
            containers.push({
                element: searchContainer,
                type: 'search-container-body',
                priority: 2
            });
        }

        // Option 3: Any .md-card-body in search container
        const anyCardBody = document.querySelector('#search-container .md-card-body');
        if (anyCardBody && !containers.find(c => c.element === anyCardBody)) {
            containers.push({
                element: anyCardBody,
                type: 'any-card-body',
                priority: 3
            });
        }

        // Option 4: Sidebar content as fallback
        const sidebarContent = document.querySelector('.sidebar-content');
        if (sidebarContent) {
            containers.push({
                element: sidebarContent,
                type: 'sidebar-content',
                priority: 4
            });
        }

        return containers.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Select the best container from available options
     */
    selectBestContainer(containers) {
        // Return the highest priority container
        return containers[0];
    }

    /**
     * Add search button to the selected container
     */
    addSearchButtonToContainer(container) {
        console.log('[SEARCH-BUTTON-FIX] Adding search button to:', container.type);

        // Create search button container
        const searchButtonContainer = document.createElement('div');
        searchButtonContainer.className = 'left-menu-search-container';
        searchButtonContainer.id = 'left-menu-search-container';
        
        // Different styling based on container type
        if (container.type === 'search-summary-interface') {
            // Add as part of the search summary interface
            searchButtonContainer.style.cssText = `
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            `;
        } else {
            // Add as separate section
            searchButtonContainer.style.cssText = `
                margin: 20px 0;
                padding: 15px 0;
            `;
        }

        // Create the search button
        const searchButton = document.createElement('button');
        searchButton.id = 'left-menu-search-btn';
        searchButton.className = 'left-menu-search-btn';
        searchButton.innerHTML = `
            <i class="material-icons">search</i>
            <span>Search</span>
        `;
        
        // Enhanced styling for better visibility
        searchButton.style.cssText = `
            width: 100%;
            padding: 16px 20px;
            background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
            position: relative;
            overflow: hidden;
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 1;
        `;

        // Add hover and active effects
        this.addButtonEffects(searchButton);

        // Add click handler
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.executeSearchFromButton();
        });

        // Add to container and page
        searchButtonContainer.appendChild(searchButton);
        
        // Insert at the end of the container
        container.element.appendChild(searchButtonContainer);

        // Store reference
        this.searchButton = searchButton;

        // Add success indicator
        setTimeout(() => {
            this.showSuccessIndicator();
        }, 500);

        console.log('[SEARCH-BUTTON-FIX] Search button created and added to DOM');
        console.log('[SEARCH-BUTTON-FIX] Button element:', searchButton);
        console.log('[SEARCH-BUTTON-FIX] Button visible:', this.isButtonVisible());
    }

    /**
     * Add interactive effects to the button
     */
    addButtonEffects(button) {
        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-3px) scale(1.02)';
            button.style.boxShadow = '0 8px 25px rgba(33, 150, 243, 0.4)';
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #0288D1 100%)';
        });

        button.addEventListener('mouseleave', () => {
            if (!button.disabled) {
                button.style.transform = 'translateY(0) scale(1)';
                button.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                button.style.background = 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)';
            }
        });

        // Active effect
        button.addEventListener('mousedown', () => {
            button.style.transform = 'translateY(-1px) scale(0.98)';
        });

        button.addEventListener('mouseup', () => {
            if (!button.disabled) {
                button.style.transform = 'translateY(-3px) scale(1.02)';
            }
        });

        // Focus effect for accessibility
        button.addEventListener('focus', () => {
            button.style.outline = '2px solid rgba(33, 150, 243, 0.5)';
            button.style.outlineOffset = '2px';
        });

        button.addEventListener('blur', () => {
            button.style.outline = 'none';
        });
    }

    /**
     * Execute search when button is clicked
     */
    executeSearchFromButton() {
        console.log('[SEARCH-BUTTON-FIX] Search button clicked!');
        
        try {
            // Show loading state
            this.setButtonState('loading');

            // Get current search state
            const searchState = this.getCurrentSearchState();
            console.log('[SEARCH-BUTTON-FIX] Current search state:', searchState);

            // Try different search execution methods
            this.executeSearchWithFallbacks(searchState);

        } catch (error) {
            console.error('[SEARCH-BUTTON-FIX] Error executing search:', error);
            this.setButtonState('error');
        }
    }

    /**
     * Get current search state from the application
     */
    getCurrentSearchState() {
        const state = {
            collection: '',
            location: 'everywhere',
            date: { type: 'anytime' },
            cloudCover: 20
        };

        try {
            // Try to get state from inline dropdown manager
            const inlineManager = window.stacExplorer?.inlineDropdownManager;
            if (inlineManager?.aiSearchHelper) {
                const helper = inlineManager.aiSearchHelper;
                state.collection = helper.selectedCollection || '';
                state.collectionSource = helper.selectedCollectionSource;
                state.location = helper.selectedLocation || 'everywhere';
                state.locationResult = helper.selectedLocationResult;
                state.date = helper.selectedDate || { type: 'anytime' };
                state.cloudCover = helper.cloudCover || 20;
            }

            // Try to get state from form elements as fallback
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect && collectionSelect.value) {
                state.collection = collectionSelect.value;
            }

            const dateStart = document.getElementById('date-start');
            const dateEnd = document.getElementById('date-end');
            if (dateStart?.value || dateEnd?.value) {
                state.date = {
                    type: 'custom',
                    start: dateStart?.value,
                    end: dateEnd?.value
                };
            }

        } catch (error) {
            console.warn('[SEARCH-BUTTON-FIX] Error getting search state:', error);
        }

        return state;
    }

    /**
     * Execute search with multiple fallback methods
     */
    executeSearchWithFallbacks(searchState) {
        const methods = [
            () => this.executeViaSearchPanel(searchState),
            () => this.executeViaDebugFunction(searchState),
            () => this.executeViaFormSubmission(searchState),
            () => this.executeViaDirectAPI(searchState)
        ];

        let executed = false;

        for (const method of methods) {
            try {
                method();
                executed = true;
                console.log('[SEARCH-BUTTON-FIX] Search executed via method:', method.name);
                break;
            } catch (error) {
                console.warn('[SEARCH-BUTTON-FIX] Method failed:', method.name, error);
            }
        }

        if (executed) {
            this.setButtonState('success');
        } else {
            this.setButtonState('error');
            console.error('[SEARCH-BUTTON-FIX] All search execution methods failed');
        }
    }

    /**
     * Execute via SearchPanel component
     */
    executeViaSearchPanel(searchState) {
        const searchPanel = window.stacExplorer?.searchPanel;
        if (!searchPanel) throw new Error('SearchPanel not available');

        const params = this.buildSearchParameters(searchState);
        
        if (typeof searchPanel.executeSearch === 'function') {
            searchPanel.executeSearch(params);
        } else if (typeof searchPanel.performSearch === 'function') {
            searchPanel.performSearch(params);
        } else {
            throw new Error('No suitable search method found on SearchPanel');
        }
    }

    /**
     * Execute via debug function
     */
    executeViaDebugFunction(searchState) {
        if (typeof window.debugSearch?.testLeftMenuSearch === 'function') {
            window.debugSearch.testLeftMenuSearch();
        } else {
            throw new Error('Debug search function not available');
        }
    }

    /**
     * Execute via form submission
     */
    executeViaFormSubmission(searchState) {
        // Update form fields
        this.updateFormFields(searchState);

        // Find and click search button
        const searchBtns = [
            document.getElementById('summary-search-btn'),
            document.getElementById('execute-search'),
            document.querySelector('button[type="submit"]'),
            document.querySelector('.search-button')
        ];

        const searchBtn = searchBtns.find(btn => btn && btn.offsetParent !== null);
        if (!searchBtn) throw new Error('No search button found');

        searchBtn.click();
    }

    /**
     * Execute via direct API (placeholder for future implementation)
     */
    executeViaDirectAPI(searchState) {
        throw new Error('Direct API execution not implemented yet');
    }

    /**
     * Build search parameters from state
     */
    buildSearchParameters(searchState) {
        const params = {};

        if (searchState.collection) {
            params.collection = searchState.collection;
            if (searchState.collectionSource) {
                params.collectionSource = searchState.collectionSource;
            }
        }

        if (searchState.location && searchState.location !== 'everywhere') {
            if (Array.isArray(searchState.location)) {
                params.bbox = searchState.location;
            }
            if (searchState.locationResult?.bbox) {
                params.bbox = searchState.locationResult.bbox;
            }
        }

        if (searchState.date && searchState.date.type !== 'anytime') {
            if (searchState.date.start) params.dateStart = searchState.date.start;
            if (searchState.date.end) params.dateEnd = searchState.date.end;
        }

        if (searchState.cloudCover && searchState.cloudCover !== 20) {
            params.maxCloudCover = searchState.cloudCover;
        }

        return params;
    }

    /**
     * Update form fields with current state
     */
    updateFormFields(searchState) {
        const updates = {
            'collection-select': searchState.collection,
            'date-start': searchState.date?.start,
            'date-end': searchState.date?.end,
            'cloud-cover': searchState.cloudCover
        };

        if (searchState.locationResult?.bbox) {
            updates['bbox-input'] = searchState.locationResult.bbox.join(',');
        }

        Object.entries(updates).forEach(([id, value]) => {
            if (value !== undefined && value !== null) {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }

    /**
     * Set button state (loading, success, error)
     */
    setButtonState(state) {
        if (!this.searchButton) return;

        const button = this.searchButton;
        const icon = button.querySelector('i');
        const text = button.querySelector('span');

        switch (state) {
            case 'loading':
                button.disabled = true;
                button.style.background = 'linear-gradient(135deg, #607D8B 0%, #546E7A 100%)';
                button.style.cursor = 'not-allowed';
                if (icon) {
                    icon.textContent = 'refresh';
                    icon.style.animation = 'spin 1s linear infinite';
                }
                if (text) text.textContent = 'Searching...';
                break;

            case 'success':
                button.disabled = false;
                button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                button.style.cursor = 'pointer';
                if (icon) {
                    icon.textContent = 'check';
                    icon.style.animation = 'none';
                }
                if (text) text.textContent = 'Search Complete';
                
                // Revert to normal after 2 seconds
                setTimeout(() => {
                    if (this.searchButton) {
                        this.setButtonState('normal');
                    }
                }, 2000);
                break;

            case 'error':
                button.disabled = false;
                button.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
                button.style.cursor = 'pointer';
                if (icon) {
                    icon.textContent = 'error';
                    icon.style.animation = 'none';
                }
                if (text) text.textContent = 'Search Failed';
                
                // Revert to normal after 3 seconds
                setTimeout(() => {
                    if (this.searchButton) {
                        this.setButtonState('normal');
                    }
                }, 3000);
                break;

            case 'normal':
            default:
                button.disabled = false;
                button.style.background = 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)';
                button.style.cursor = 'pointer';
                if (icon) {
                    icon.textContent = 'search';
                    icon.style.animation = 'none';
                }
                if (text) text.textContent = 'Search';
                break;
        }
    }

    /**
     * Show success indicator after button creation
     */
    showSuccessIndicator() {
        if (!this.isButtonVisible()) {
            console.warn('[SEARCH-BUTTON-FIX] Button created but not visible!');
            this.logButtonVisibility();
            return;
        }

        // Create temporary success indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            font-family: 'Roboto', sans-serif;
        `;
        indicator.textContent = '✅ Search button added to left menu!';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
    }

    /**
     * Check if button is visible
     */
    isButtonVisible() {
        if (!this.searchButton) return false;
        
        const rect = this.searchButton.getBoundingClientRect();
        const style = window.getComputedStyle(this.searchButton);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }

    /**
     * Log button visibility debug info
     */
    logButtonVisibility() {
        if (!this.searchButton) {
            console.log('[DEBUG] No search button to check');
            return;
        }

        const rect = this.searchButton.getBoundingClientRect();
        const style = window.getComputedStyle(this.searchButton);
        
        console.log('[DEBUG] Button visibility:', {
            exists: !!this.searchButton,
            inDOM: document.contains(this.searchButton),
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
            style: { 
                display: style.display, 
                visibility: style.visibility, 
                opacity: style.opacity,
                position: style.position
            },
            parent: this.searchButton.parentElement,
            offsetParent: this.searchButton.offsetParent
        });
    }

    /**
     * Log DOM structure for debugging
     */
    logDOMStructure() {
        console.log('[DEBUG] Current DOM structure for search button placement:');
        
        const selectors = [
            '.search-summary-interface',
            '.global-search-summary',
            '#search-container',
            '.md-card-body',
            '.sidebar-content'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`[DEBUG] ${selector}: found ${elements.length} elements`);
            elements.forEach((el, index) => {
                console.log(`[DEBUG]   [${index}]:`, el);
            });
        });
    }

    /**
     * Add CSS for spin animation
     */
    addSpinAnimation() {
        if (document.getElementById('search-button-fix-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-button-fix-styles';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize the search button fix
let searchButtonFix;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            searchButtonFix = new SearchButtonFix();
            searchButtonFix.addSpinAnimation();
        }, 2000);
    });
} else {
    setTimeout(() => {
        searchButtonFix = new SearchButtonFix();  
        searchButtonFix.addSpinAnimation();
    }, 2000);
}

// Export for manual usage and debugging
window.searchButtonFix = searchButtonFix;

// Add manual functions for testing
window.addSearchButton = () => {
    if (searchButtonFix) {
        searchButtonFix.waitForComponentsAndAddButton();
    } else {
        searchButtonFix = new SearchButtonFix();
    }
};

window.checkSearchButton = () => {
    if (searchButtonFix) {
        console.log('Search button exists:', !!searchButtonFix.searchButton);
        console.log('Search button visible:', searchButtonFix.isButtonVisible());
        searchButtonFix.logButtonVisibility();
    } else {
        console.log('SearchButtonFix not initialized');
    }
};

console.log('[SEARCH-BUTTON-FIX] Search button fix script loaded');
console.log('[INFO] The fix will auto-initialize in 2 seconds');
console.log('[INFO] Manual functions: addSearchButton(), checkSearchButton()');
