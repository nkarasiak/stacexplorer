/**
 * SearchPanel.js - Main search panel with tabbed interface
 */

export class SearchPanel {
    /**
     * Create a new SearchPanel
     * @param {Object} apiClient - STAC API client
     * @param {Object} resultsPanel - Results panel
     * @param {Object} catalogSelector - Catalog selector component
     * @param {Object} collectionManager - Collection manager component
     * @param {Object} searchForm - Search form component
     * @param {Object} notificationService - Notification service
     */
    constructor(
        apiClient, 
        resultsPanel, 
        catalogSelector, 
        collectionManager, 
        searchForm,
        notificationService
    ) {
        this.apiClient = apiClient;
        this.resultsPanel = resultsPanel;
        this.catalogSelector = catalogSelector;
        this.collectionManager = collectionManager;
        this.searchForm = searchForm;
        this.notificationService = notificationService;
        
        // Initialize tabs and buttons
        this.initTabs();
        
        // Initialize search button
        const searchBtn = document.getElementById('execute-search');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        } else {
            console.error('Search button not found: execute-search');
        }
        
        // Initialize summary search button
        const summarySearchBtn = document.getElementById('summary-search-btn');
        if (summarySearchBtn) {
            summarySearchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }
        
        // Initialize reset button
        const resetBtn = document.getElementById('clear-all');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSearch();
            });
        } else {
            console.error('Reset button not found: clear-all');
        }
        
        // Initialize summary reset button
        const summaryResetBtn = document.getElementById('summary-reset-btn');
        if (summaryResetBtn) {
            summaryResetBtn.addEventListener('click', () => {
                this.resetSearch();
            });
        }

        // Listen for catalog change to switch to collections tab
        document.addEventListener('catalogChanged', (event) => {
            // Switch to the collections tab after a short delay to let collections load
            setTimeout(() => {
                this.switchToTab('collections-tab');
            }, 300);
        });

        // Add click handler for search container header to hide results card
        const searchContainerHeader = document.getElementById('search-container-header');
        if (searchContainerHeader) {
            searchContainerHeader.addEventListener('click', () => {
                // Collapse results card when search container is clicked
                const resultsCard = document.getElementById('results-card');
                if (!resultsCard.classList.contains('collapsed')) {
                    const event = new CustomEvent('toggleCard', { detail: { cardId: 'results-card' } });
                    document.dispatchEvent(event);
                }
            });
        }
    }
    
    /**
     * Initialize tabs functionality
     */
    initTabs() {
        const tabs = document.querySelectorAll('.search-tabs .tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const targetId = tab.getAttribute('data-target');
                this.switchToTab(targetId);
            });
        });
    }

    /**
     * Switch to a specific tab
     * @param {string} targetId - ID of the tab to switch to
     */
    switchToTab(targetId) {
        // Get the tab element that corresponds to this target
        const tabs = document.querySelectorAll('.search-tabs .tab');
        const targetTab = Array.from(tabs).find(tab => tab.getAttribute('data-target') === targetId);
        
        if (!targetTab) return;

        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        targetTab.classList.add('active');
        
        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Show selected tab pane
        document.getElementById(targetId).classList.add('active');
    }
    
    /**
     * Perform search with parameters from all components
     */
    async performSearch() {
        try {
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Get search parameters from SearchForm
            const searchParams = this.searchForm.getSearchParams();
            
            // Add collection if specified
            const selectedCollection = this.collectionManager.getSelectedCollection();
            if (selectedCollection) {
                searchParams.collections = [selectedCollection];
            }
            
            // console.log('Final search parameters:', JSON.stringify(searchParams, null, 2));
            
            // Perform the search
            const items = await this.apiClient.searchItems(searchParams);
            
            // Presign Planetary Computer thumbnail URLs
            items.forEach(item => {
                if (item.assets && item.assets.thumbnail && item.assets.thumbnail.href.includes('planetarycomputer')) {
                    // Convert to presigned URL
                    item.assets.thumbnail.href = item.assets.thumbnail.href.replace(
                        'https://planetarycomputer.microsoft.com/api/stac/v1',
                        'https://planetarycomputer.microsoft.com/api/data/v1'
                    );
                }
            });

            // console.log('Results:', JSON.stringify(items, null, 2));

            // Update results panel
            this.resultsPanel.setItems(items);
            
            // Collapse search container after search is performed
            const searchContainer = document.getElementById('search-container');
            if (!searchContainer.classList.contains('collapsed')) {
                const collapseSearchEvent = new CustomEvent('toggleCard', { detail: { cardId: 'search-container' } });
                document.dispatchEvent(collapseSearchEvent);
            }
            
            // Make sure the results card is expanded
            const resultsCard = document.getElementById('results-card');
            if (resultsCard.classList.contains('collapsed')) {
                // Toggle results card
                const event = new CustomEvent('toggleCard', { detail: { cardId: 'results-card' } });
                document.dispatchEvent(event);
            }
            
            // Dispatch event that search results have been loaded
            document.dispatchEvent(new CustomEvent('searchResultsLoaded', {
                detail: { results: items }
            }));
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Show notification if no results
            if (items.length === 0) {
                this.notificationService.showNotification('No datasets found matching your search criteria.', 'info');
            }
        } catch (error) {
            console.error('Error searching items:', error);
            this.notificationService.showNotification(`Error searching items: ${error.message}`, 'error');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        }
    }
    
    /**
     * Reset search form and results
     */
    resetSearch() {
        // Reset search input
        document.getElementById('search-input').value = '';
        
        // Reset date range
        document.getElementById('date-start').value = '';
        document.getElementById('date-end').value = '';
        
        // Reset bounding box
        document.getElementById('bbox-input').value = '';
        
        // Clear map drawings if available
        document.dispatchEvent(new CustomEvent('clearMapDrawings'));
        
        // Reset collection selection
        this.collectionManager.resetSelection();
        
        // Clear results
        this.resultsPanel.clearResults();
        
        // Show notification
        this.notificationService.showNotification('Search has been reset.', 'info');
    }
}