/**
 * CardSearchPanel.js - Enhanced search panel with card-based interface
 * Replaces tab-based navigation with modern card dashboard
 */

export class CardSearchPanel {
    /**
     * Create a new CardSearchPanel
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
        
        // Track card states
        this.cardStates = {
            source: { completed: false, data: null },
            dataset: { completed: false, data: null },
            location: { completed: false, data: null },
            time: { completed: false, data: null },
            quality: { completed: false, data: null }
        };
        
        // Track pending collection selection for presets
        this.pendingCollectionSelection = null;
        
        this.init();
    }
    
    /**
     * Initialize the card-based search interface
     */
    init() {
        this.initCardInteractions();
        this.initFormHandlers();
        this.initQuickPresets();
        this.initSearchButtons();
        this.initCloudCoverControls();
        this.initStacUrlLoader();
        this.initGlobalPasteListener();
        
        // Always show search summary
        this.showSearchSummary();
        
        // Listen for catalog changes
        document.addEventListener('catalogChanged', (event) => {
            this.handleCatalogChange(event.detail);
        });
        
        // Listen for collections updated to set pending collection selection
        document.addEventListener('collectionsUpdated', (event) => {
            this.handleCollectionsUpdated(event.detail);
        });
        
        // Initialize with first card active and show search summary
        this.activateCard('source-card');
        this.updateSearchSummary(); // Call this after initialization
    }
    
    /**
     * Initialize card expand/collapse interactions
     */
    initCardInteractions() {
        document.querySelectorAll('.search-card-header').forEach(header => {
            header.addEventListener('click', (event) => {
                const card = header.closest('.search-card');
                const cardId = card.id;
                
                // Close other cards and open this one
                this.activateCard(cardId);
            });
        });
    }
    
    /**
     * Activate a specific card and close others
     * @param {string} cardId - ID of the card to activate
     */
    activateCard(cardId) {
        // Close all cards
        document.querySelectorAll('.search-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Open target card
        const targetCard = document.getElementById(cardId);
        if (targetCard) {
            targetCard.classList.add('active');
            
            // Scroll card into view
            targetCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }
    
    /**
     * Mark a card as completed
     * @param {string} cardId - ID of the card to mark as completed
     * @param {*} data - Data associated with the completion
     */
    completeCard(cardId, data = null) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        // Add completed state
        card.classList.add('completed');
        card.classList.add('success-flash');
        
        // Update card status
        const status = card.querySelector('.card-status');
        if (status) {
            status.textContent = 'Set';
            status.classList.remove('required', 'optional');
            status.classList.add('completed');
        }
        
        // Store completion state
        const cardKey = cardId.replace('-card', '');
        if (this.cardStates[cardKey]) {
            this.cardStates[cardKey].completed = true;
            this.cardStates[cardKey].data = data;
        }
        
        // Remove flash animation after completion
        setTimeout(() => {
            card.classList.remove('success-flash');
        }, 600);
        
        // Update search summary
        this.updateSearchSummary();
        
        // Auto-advance to next uncompleted required card
        this.autoAdvanceToNextCard();
    }
    
    /**
     * Auto-advance to the next uncompleted required card
     */
    autoAdvanceToNextCard() {
        const cardOrder = ['source-card', 'location-card', 'dataset-card', 'time-card', 'quality-card'];
        const requiredCards = ['source-card']; // Only data source is required
        
        for (const cardId of cardOrder) {
            const card = document.getElementById(cardId);
            const isRequired = requiredCards.includes(cardId);
            const isCompleted = card.classList.contains('completed');
            
            if (isRequired && !isCompleted) {
                this.activateCard(cardId);
                return;
            }
        }
        
        // If all required cards are completed, show summary
        if (this.areRequiredCardsCompleted()) {
            this.showSearchSummary();
        }
    }
    
    /**
     * Check if all required cards are completed
     * @returns {boolean}
     */
    areRequiredCardsCompleted() {
        const catalogValue = document.getElementById('catalog-select').value;
        const bboxValue = document.getElementById('bbox-input').value.trim();
        const collectionValue = document.getElementById('collection-select').value;
        
        console.log('🔍 Checking requirements:', { 
            catalogValue, 
            bboxValue, 
            collectionValue 
        });
        
        // Check if we're in AI Smart Search EVERYTHING mode
        // This happens when no specific catalog is selected but collections are loaded from all sources
        const isEverythingMode = catalogValue === '' && 
                                this.collectionManager && 
                                typeof this.collectionManager.getAllCollections === 'function' &&
                                this.collectionManager.getAllCollections().length > 0;
        
        // Data source is required UNLESS we're in EVERYTHING mode
        const sourceCompleted = catalogValue !== '' || isEverythingMode;
        const locationCompleted = true; // Location is now optional
        
        console.log('📊 Requirements status:', { 
            sourceCompleted, 
            isEverythingMode,
            locationOptional: true,
            locationProvided: bboxValue !== '',
            collectionSelected: collectionValue !== ''
        });
        
        return sourceCompleted;
    }
    
    /**
     * Initialize form field handlers
     */
    initFormHandlers() {
        // Catalog selection
        const catalogSelect = document.getElementById('catalog-select');
        catalogSelect.addEventListener('change', (event) => {
            if (event.target.value) {
                this.completeCard('source-card', event.target.value);
                this.handleCustomCatalogVisibility(event.target.value);
            }
        });
        
        // Collection selection
        const collectionSelect = document.getElementById('collection-select');
        collectionSelect.addEventListener('change', (event) => {
            if (event.target.value) {
                this.completeCard('dataset-card', event.target.value);
            }
        });
        
        // Location inputs - Enhanced to detect bbox changes
        const bboxInput = document.getElementById('bbox-input');
        
        // Listen for manual bbox entry
        bboxInput.addEventListener('input', (event) => {
            if (event.target.value.trim()) {
                this.completeCard('location-card', event.target.value);
            }
        });
        
        // Listen for bbox drawn on map
        document.addEventListener('bboxDrawn', (event) => {
            console.log('Bbox drawn event received:', event.detail);
            if (event.detail?.bbox) {
                this.completeCard('location-card', event.detail.bbox);
            }
        });
        
        // Also listen for any changes to the bbox input (programmatic)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    const bboxValue = bboxInput.value.trim();
                    if (bboxValue) {
                        this.completeCard('location-card', bboxValue);
                    }
                }
            });
        });
        observer.observe(bboxInput, { attributes: true });
        
        // Check for existing bbox value on initialization
        setTimeout(() => {
            const existingBbox = bboxInput.value.trim();
            if (existingBbox) {
                this.completeCard('location-card', existingBbox);
            }
        }, 500);
        
        // Date inputs
        const dateStart = document.getElementById('date-start');
        const dateEnd = document.getElementById('date-end');
        
        [dateStart, dateEnd].forEach(input => {
            input.addEventListener('change', () => {
                if (dateStart.value || dateEnd.value) {
                    this.completeCard('time-card', {
                        start: dateStart.value,
                        end: dateEnd.value
                    });
                }
            });
        });
        
        // Cloud cover
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        cloudCoverEnabled.addEventListener('change', () => {
            if (cloudCoverEnabled.checked) {
                this.completeCard('quality-card', {
                    cloudCover: document.getElementById('cloud-cover').value
                });
            }
        });
    }
    
    /**
     * Handle custom catalog URL visibility
     * @param {string} catalogValue - Selected catalog value
     */
    handleCustomCatalogVisibility(catalogValue) {
        const customContainer = document.getElementById('custom-catalog-container');
        if (catalogValue === 'custom') {
            customContainer.style.display = 'block';
        } else {
            customContainer.style.display = 'none';
        }
    }
    
    /**
     * Initialize quick preset functionality
     */
    initQuickPresets() {
        // Date preset buttons
        document.getElementById('preset-2024').addEventListener('click', () => {
            document.getElementById('date-start').value = '2024-01-01';
            document.getElementById('date-end').value = '2024-12-31';
            this.completeCard('time-card', {
                start: '2024-01-01',
                end: '2024-12-31'
            });
        });
    }
    
    /**
     * Apply a search preset
     * @param {string} presetName - Name of the preset to apply
     */
    applyPreset(presetName) {
        console.log(`🎯 Applying preset: ${presetName}`);
        
        switch (presetName) {
            case 'sentinel-toulouse':
                this.applyToulousePreset();
                break;
                
            case 'sentinel-vancouver':
                this.applyVancouverPreset();
                break;
        }
        
        // Update summary after applying preset
        setTimeout(() => {
            this.updateSearchSummary();
        }, 1500);
    }
    
    /**
     * Apply Sentinel-2 Toulouse preset with robust collection selection
     */
    async applyToulousePreset() {
        try {
            console.log('🇫🇷 Applying S-2 Toulouse preset...');
            
            // 1. Set basic form values first
            document.getElementById('date-start').value = '2024-01-01';
            document.getElementById('date-end').value = '2024-12-31';
            document.getElementById('bbox-input').value = '1.3,43.5,1.5,43.7';
            
            // 2. Set catalog and trigger change
            const catalogSelect = document.getElementById('catalog-select');
            catalogSelect.value = 'element84';
            catalogSelect.dispatchEvent(new Event('change'));
            
            console.log('📡 Switching to Element84 catalog...');
            
            // 3. Wait for collections to load with timeout and retry logic
            const targetCollection = 'sentinel-s2-l2a-cogs';
            await this.waitForCollectionAndSelect(targetCollection, 'S-2 Toulouse');
            
            // 4. Complete cards
            this.completeCard('source-card', 'element84');
            this.completeCard('dataset-card', targetCollection);
            this.completeCard('time-card', { start: '2024-01-01', end: '2024-12-31' });
            this.completeCard('location-card', '1.3,43.5,1.5,43.7');
            
            this.notificationService.showNotification('✅ Applied Sentinel-2 Toulouse preset (Element84)', 'success');
            
        } catch (error) {
            console.error('❌ Error applying Toulouse preset:', error);
            this.notificationService.showNotification(`Error applying Toulouse preset: ${error.message}`, 'error');
        }
    }
    
    /**
     * Apply Sentinel-1 Vancouver preset with robust collection selection
     */
    async applyVancouverPreset() {
        try {
            console.log('🇨🇦 Applying S-1 Vancouver preset...');
            
            // 1. Set basic form values first
            document.getElementById('date-start').value = '2024-01-01';
            document.getElementById('date-end').value = '2024-12-31';
            document.getElementById('bbox-input').value = '-123.3,49.1,-123.0,49.4';
            
            // 2. Set catalog and trigger change
            const catalogSelect = document.getElementById('catalog-select');
            catalogSelect.value = 'element84';
            catalogSelect.dispatchEvent(new Event('change'));
            
            console.log('📡 Switching to Element84 catalog...');
            
            // 3. Wait for collections to load with timeout and retry logic
            const targetCollection = 'sentinel-s1-grd';
            await this.waitForCollectionAndSelect(targetCollection, 'S-1 Vancouver');
            
            // 4. Complete cards
            this.completeCard('source-card', 'element84');
            this.completeCard('dataset-card', targetCollection);
            this.completeCard('time-card', { start: '2024-01-01', end: '2024-12-31' });
            this.completeCard('location-card', '-123.3,49.1,-123.0,49.4');
            
            this.notificationService.showNotification('✅ Applied Sentinel-1 Vancouver preset (Element84)', 'success');
            
        } catch (error) {
            console.error('❌ Error applying Vancouver preset:', error);
            this.notificationService.showNotification(`Error applying Vancouver preset: ${error.message}`, 'error');
        }
    }
    
    /**
     * Wait for a specific collection to be available and select it
     * @param {string} targetCollection - Collection ID to select
     * @param {string} presetName - Name of preset for logging
     * @returns {Promise} - Resolves when collection is selected
     */
    async waitForCollectionAndSelect(targetCollection, presetName) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds max wait
            const checkInterval = 500; // Check every 500ms
            
            console.log(`🔍 Looking for collection: ${targetCollection}`);
            
            const checkForCollection = () => {
                attempts++;
                const collectionSelect = document.getElementById('collection-select');
                
                if (!collectionSelect) {
                    console.warn('⚠️ Collection select element not found');
                    return;
                }
                
                // Look for the target collection in options
                const options = Array.from(collectionSelect.options);
                const matchingOption = options.find(option => 
                    option.value === targetCollection ||
                    option.value.includes(targetCollection.split('-').pop()) ||
                    targetCollection.includes(option.value)
                );
                
                if (matchingOption) {
                    console.log(`✅ Found collection: ${matchingOption.value} (${matchingOption.text})`);
                    
                    // Select the collection
                    collectionSelect.value = matchingOption.value;
                    collectionSelect.dispatchEvent(new Event('change'));
                    
                    // Verify selection worked
                    setTimeout(() => {
                        const selectedValue = collectionSelect.value;
                        if (selectedValue === matchingOption.value) {
                            console.log(`🎯 Collection selected successfully: ${selectedValue}`);
                            resolve(selectedValue);
                        } else {
                            console.warn(`⚠️ Collection selection failed: expected ${matchingOption.value}, got ${selectedValue}`);
                            reject(new Error(`Collection selection failed for ${presetName}`));
                        }
                    }, 100);
                    
                } else if (attempts >= maxAttempts) {
                    console.error(`❌ Timeout: Could not find collection ${targetCollection} after ${attempts} attempts`);
                    console.log('Available collections:', options.map(opt => `${opt.value} - ${opt.text}`));
                    reject(new Error(`Collection ${targetCollection} not found in ${presetName} preset`));
                    
                } else {
                    console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Collection not yet available, retrying...`);
                    setTimeout(checkForCollection, checkInterval);
                }
            };
            
            // Start checking
            checkForCollection();
        });
    }
    
    /**
     * Initialize search buttons
     */
    initSearchButtons() {
        // Execute search button
        document.getElementById('execute-search').addEventListener('click', () => {
            this.performSearch();
        });
        
        // Summary search button
        const summarySearchBtn = document.getElementById('summary-search-btn');
        if (summarySearchBtn) {
            summarySearchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }
        
        // Clear all button (now reset)
        document.getElementById('clear-all').addEventListener('click', () => {
            this.resetSearch();
        });
        
        // Summary reset button
        const summaryResetBtn = document.getElementById('summary-reset-btn');
        if (summaryResetBtn) {
            summaryResetBtn.addEventListener('click', () => {
                this.resetSearch();
            });
        }
        
        // Main search button (fixed controls)
        const mainSearchBtn = document.getElementById('main-search-btn');
        if (mainSearchBtn) {
            mainSearchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }
        
    }
    
    /**
     * Initialize cloud cover controls
     */
    initCloudCoverControls() {
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverSlider = document.getElementById('cloud-cover');
        const cloudCoverValue = document.getElementById('cloud-cover-value');
        
        // Toggle cloud cover controls
        cloudCoverEnabled.addEventListener('change', () => {
            const isEnabled = cloudCoverEnabled.checked;
            cloudCoverSlider.disabled = !isEnabled;
            
            // Update the quality card section styling
            const qualityCard = document.getElementById('quality-card');
            if (isEnabled) {
                qualityCard.classList.add('has-filters');
            } else {
                qualityCard.classList.remove('has-filters');
            }
        });
        
        // Update cloud cover value display
        cloudCoverSlider.addEventListener('input', () => {
            cloudCoverValue.textContent = cloudCoverSlider.value + '%';
        });
    }
    
    /**
     * Initialize STAC URL loader functionality with modal
     */
    initStacUrlLoader() {
        const loadButton = document.getElementById('load-stac-btn');
        const modal = document.getElementById('stac-load-modal');
        const closeButton = document.getElementById('stac-modal-close');
        
        if (!loadButton || !modal) {
            console.warn('⚠️ STAC loader elements not found');
            return;
        }
        
        // Handle load button click to show modal
        loadButton.addEventListener('click', () => {
            this.showStacLoadModal();
        });
        
        // Handle modal close
        closeButton.addEventListener('click', () => {
            this.hideStacLoadModal();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideStacLoadModal();
            }
        });
        
        // Initialize tab switching
        this.initModalTabs();
        
        // Initialize load buttons in modal
        this.initModalLoadButtons();
        
        console.log('🔗 STAC loader modal initialized');
    }
    
    /**
     * Show the STAC load modal
     */
    showStacLoadModal() {
        const modal = document.getElementById('stac-load-modal');
        modal.style.display = 'flex';
        
        // Focus on the URL input by default
        setTimeout(() => {
            const urlInput = document.getElementById('stac-item-url-modal');
            if (urlInput) urlInput.focus();
        }, 100);
    }
    
    /**
     * Hide the STAC load modal
     */
    hideStacLoadModal() {
        const modal = document.getElementById('stac-load-modal');
        modal.style.display = 'none';
        
        // Clear inputs
        const urlInput = document.getElementById('stac-item-url-modal');
        const jsonInput = document.getElementById('stac-item-json-modal');
        if (urlInput) urlInput.value = '';
        if (jsonInput) jsonInput.value = '';
    }
    
    /**
     * Initialize modal tab switching
     */
    initModalTabs() {
        const urlTab = document.getElementById('load-url-tab');
        const jsonTab = document.getElementById('load-json-tab');
        const urlContent = document.getElementById('url-load-content');
        const jsonContent = document.getElementById('json-load-content');
        
        urlTab.addEventListener('click', () => {
            urlTab.classList.add('active');
            jsonTab.classList.remove('active');
            urlContent.classList.add('active');
            jsonContent.classList.remove('active');
        });
        
        jsonTab.addEventListener('click', () => {
            jsonTab.classList.add('active');
            urlTab.classList.remove('active');
            jsonContent.classList.add('active');
            urlContent.classList.remove('active');
        });
    }
    
    /**
     * Initialize load buttons in modal
     */
    initModalLoadButtons() {
        const urlLoadBtn = document.getElementById('load-url-btn-modal');
        const jsonLoadBtn = document.getElementById('load-json-btn-modal');
        const urlInput = document.getElementById('stac-item-url-modal');
        const jsonInput = document.getElementById('stac-item-json-modal');
        
        // URL load button
        urlLoadBtn.addEventListener('click', () => {
            this.loadStacItemFromUrl();
        });
        
        // JSON load button
        jsonLoadBtn.addEventListener('click', () => {
            this.loadStacItemFromJson();
        });
        
        // Enter key support
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.loadStacItemFromUrl();
            }
        });
        
        jsonInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.loadStacItemFromJson();
            }
        });
    }
    
    /**
     * Load a STAC item from a pasted URL
     */
    async loadStacItemFromUrl() {
        const urlInput = document.getElementById('stac-item-url-modal');
        const loadButton = document.getElementById('load-url-btn-modal');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.notificationService.showNotification('Please enter a STAC item URL', 'warning');
            return;
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            this.notificationService.showNotification('Please enter a valid URL', 'error');
            return;
        }
        
        // Show loading state
        const originalText = loadButton.innerHTML;
        loadButton.innerHTML = '<i class="material-icons">hourglass_empty</i> Loading...';
        loadButton.disabled = true;
        
        try {
            console.log(`🔗 Loading STAC item from URL: ${url}`);
            
            // Fetch the STAC item JSON
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('URL does not return JSON content');
            }
            
            const stacItem = await response.json();
            
            // Validate and load the item
            await this.processStacItem(stacItem);
            
            // Close modal on success
            this.hideStacLoadModal();
            
        } catch (error) {
            console.error('❌ Error loading STAC item from URL:', error);
            this.notificationService.showNotification(
                `Failed to load STAC item: ${error.message}`, 
                'error'
            );
        } finally {
            // Restore button state
            loadButton.innerHTML = originalText;
            loadButton.disabled = false;
        }
    }
    
    /**
     * Load a STAC item from pasted JSON
     */
    async loadStacItemFromJson() {
        const jsonInput = document.getElementById('stac-item-json-modal');
        const loadButton = document.getElementById('load-json-btn-modal');
        const jsonText = jsonInput.value.trim();
        
        if (!jsonText) {
            this.notificationService.showNotification('Please enter STAC item JSON', 'warning');
            return;
        }
        
        // Show loading state
        const originalText = loadButton.innerHTML;
        loadButton.innerHTML = '<i class="material-icons">hourglass_empty</i> Loading...';
        loadButton.disabled = true;
        
        try {
            console.log('🔗 Loading STAC item from JSON');
            
            // Parse the JSON
            const stacItem = JSON.parse(jsonText);
            
            // Validate and load the item
            await this.processStacItem(stacItem);
            
            // Close modal on success
            this.hideStacLoadModal();
            
        } catch (error) {
            console.error('❌ Error loading STAC item from JSON:', error);
            if (error instanceof SyntaxError) {
                this.notificationService.showNotification(
                    'Invalid JSON format', 
                    'error'
                );
            } else {
                this.notificationService.showNotification(
                    `Failed to load STAC item: ${error.message}`, 
                    'error'
                );
            }
        } finally {
            // Restore button state
            loadButton.innerHTML = originalText;
            loadButton.disabled = false;
        }
    }
    
    /**
     * Process and validate a STAC item, then display it
     */
    async processStacItem(stacItem) {
        // Validate basic STAC item structure
        if (!stacItem.type || stacItem.type !== 'Feature') {
            throw new Error('Invalid STAC item: missing type=Feature');
        }
        
        if (!stacItem.id) {
            throw new Error('Invalid STAC item: missing id');
        }
        
        if (!stacItem.assets || typeof stacItem.assets !== 'object') {
            throw new Error('Invalid STAC item: missing or invalid assets');
        }
        
        console.log(`✅ Successfully loaded STAC item: ${stacItem.id}`);
        
        // Clear previous map state (geometry, bbox, thumbnails)
        this.clearMapState();
        
        // Display the item in results
        this.resultsPanel.setItems([stacItem]);
        
        // Show success notification
        this.notificationService.showNotification(
            `🎯 Loaded STAC item: ${stacItem.id}`, 
            'success'
        );
    }
    
    /**
     * Clear all previous map state (drawings, thumbnails, geometry)
     */
    clearMapState() {
        try {
            // Clear map drawings and previous geometry
            document.dispatchEvent(new CustomEvent('clearMapDrawings'));
            console.log('🧹 Cleared map drawings');
            
            // Clear current item layer (geometry/bbox) - this fixes the overlay issue!
            if (this.mapManager && typeof this.mapManager.removeCurrentLayer === 'function') {
                this.mapManager.removeCurrentLayer();
                console.log('🧹 Cleared current item layer (geometry/bbox)');
            }
            
            // Clear thumbnails if mapManager is available
            if (this.mapManager && typeof this.mapManager.clearAllThumbnails === 'function') {
                this.mapManager.clearAllThumbnails();
                console.log('🧹 Cleared all thumbnails from map');
            }
            
            // Clear any visualization layers if available
            if (window.stacExplorer?.rasterManager) {
                const layers = window.stacExplorer.rasterManager.getLayerInfo();
                layers.forEach(layer => {
                    window.stacExplorer.rasterManager.removeLayer(layer.layerId);
                });
                console.log('🧹 Cleared visualization layers');
            }
            
        } catch (error) {
            console.warn('⚠️ Error clearing map state:', error);
        }
    }
    
    /**
     * Update the search summary display
     */
    updateSearchSummary() {
        const summaryDetails = document.getElementById('summary-details');
        if (!summaryDetails) return; // Prevent errors if element doesn't exist yet
        
        const summary = [];
        
        // Build summary from completed cards
        if (this.cardStates.source.completed) {
            const catalogSelect = document.getElementById('catalog-select');
            const catalogText = catalogSelect.selectedOptions[0]?.text || 'Selected catalog';
            summary.push(catalogText.replace(/[🛰️🌍⚙️]/g, '').trim());
        }
        
        if (this.cardStates.dataset.completed) {
            const collectionSelect = document.getElementById('collection-select');
            const collectionText = collectionSelect.selectedOptions[0]?.text || 'Selected dataset';
            summary.push(collectionText.replace(/[🛰️📡]/g, '').trim());
        }
        
        if (this.cardStates.location.completed) {
            summary.push('Location');
        }
        
        if (this.cardStates.time.completed) {
            summary.push('Date');
        }
        
        if (this.cardStates.quality.completed) {
            summary.push('Filters');
        }
        
        if (summary.length > 0) {
            // Format the summary text for the tooltip
            summaryDetails.textContent = summary.join(' • ');
            summaryDetails.classList.add('active');
        } else {
            summaryDetails.textContent = 'Configure your search';
            summaryDetails.classList.remove('active');
        }
    }
    
    /**
     * Show the search summary bar
     */
    showSearchSummary() {
        const summaryBar = document.getElementById('global-summary');
        if (summaryBar) {
            summaryBar.classList.add('visible');
        }
    }
    
    /**
     * Hide the search summary bar
     */
    hideSearchSummary() {
        const summaryBar = document.getElementById('global-summary');
        if (summaryBar) {
            summaryBar.classList.remove('visible');
        }
    }
    
    /**
     * Perform search with parameters from all cards
     */
    async performSearch() {
        try {
            console.log('🔍 Starting search...');
            
            // Validate required fields
            if (!this.areRequiredCardsCompleted()) {
                // Check if we're in EVERYTHING mode for better error messaging
                const catalogValue = document.getElementById('catalog-select').value;
                const isEverythingMode = catalogValue === '' && 
                                        this.collectionManager && 
                                        typeof this.collectionManager.getAllCollections === 'function' &&
                                        this.collectionManager.getAllCollections().length > 0;
                
                if (isEverythingMode) {
                    this.notificationService.showNotification('EVERYTHING mode active - continuing with search across all data sources', 'info');
                } else {
                    this.notificationService.showNotification('Please select a Data Source to continue', 'warning');
                    return;
                }
            }
            
            // Show loading indicator
            document.getElementById('loading').style.display = 'flex';
            
            // Get search parameters from SearchForm (maintains compatibility)
            const searchParams = this.searchForm.getSearchParams();
            console.log('📋 Base search params from form:', JSON.stringify(searchParams, null, 2));
            
            // CRITICAL: Override collection parameter from our card UI
            const collectionSelect = document.getElementById('collection-select');
            const selectedCollection = collectionSelect ? collectionSelect.value : '';
            
            console.log('🎯 Collection select element:', collectionSelect);
            console.log('🎯 Selected collection value:', selectedCollection);
            console.log('🎯 Collection select options count:', collectionSelect?.options.length || 0);
            
            // Add collection if specified
            if (selectedCollection) {
                searchParams.collections = [selectedCollection];
                console.log('✅ Added collection to search params:', selectedCollection);
            } else {
                console.log('⚠️ No collection selected - proceeding without collection parameter');
            }
            
            // Check if we're in EVERYTHING mode
            const catalogValue = document.getElementById('catalog-select').value;
            const isEverythingMode = catalogValue === '';
            
            // CRITICAL: Validate that we have required parameters for the search
            console.log('🔍 Final search parameters before API call:', JSON.stringify(searchParams, null, 2));
            
            // Check if we're missing collection for single-source search
            if (!isEverythingMode && !searchParams.collections) {
                const errorMsg = 'Collection is required for single-source search but none was selected';
                console.error('❌', errorMsg);
                this.notificationService.showNotification(errorMsg, 'error');
                document.getElementById('loading').style.display = 'none';
                return;
            }
            
            let items = [];
            
            if (isEverythingMode && !searchParams.collections) {
                // Use multi-source search for EVERYTHING mode
                console.log('🌍 Using multi-source search for EVERYTHING mode');
                items = await this.performMultiSourceSearch(searchParams);
            } else {
                // Use regular single-source search
                console.log('🎯 Using single-source search');
                console.log('🌐 Making API request...');
                items = await this.apiClient.searchItems(searchParams);
            }
            console.log('📊 Search completed, received items:', items.length);

            // Presign Planetary Computer rendered_preview URLs
            items.forEach(item => {
                if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                    // Convert to presigned URL
                    item.assets.rendered_preview.href = item.assets.rendered_preview.href.replace(
                        'https://planetarycomputer.microsoft.com/api/stac/v1',
                        'https://planetarycomputer.microsoft.com/api/data/v1'
                    );
                }
            });
            
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
                const event = new CustomEvent('toggleCard', { detail: { cardId: 'results-card' } });
                document.dispatchEvent(event);
            }
            
            // Dispatch event that search results have been loaded
            document.dispatchEvent(new CustomEvent('searchResultsLoaded', {
                detail: { results: items }
            }));
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Show success notification with collection info
            if (items.length === 0) {
                const catalogValue = document.getElementById('catalog-select').value;
                const isEverythingMode = catalogValue === '';
                const searchContext = selectedCollection ? ` in collection "${selectedCollection}"` : 
                                    isEverythingMode ? ' across ALL data sources (EVERYTHING mode)' : 
                                    ' across all collections';
                this.notificationService.showNotification(`No datasets found${searchContext} matching your search criteria.`, 'info');
            } else {
                const catalogValue = document.getElementById('catalog-select').value;
                const isEverythingMode = catalogValue === '';
                const collectionText = selectedCollection ? ` from collection "${selectedCollection}"` : 
                                     isEverythingMode ? ' from ALL data sources (🌍 EVERYTHING mode)' : 
                                     ' from all collections';
                this.notificationService.showNotification(`Found ${items.length} datasets${collectionText}!`, 'success');
                console.log('🎉 Search successful!', {
                    itemCount: items.length,
                    collection: selectedCollection || (isEverythingMode ? 'EVERYTHING mode' : 'all collections'),
                    searchParams: searchParams
                });
            }
        } catch (error) {
            console.error('❌ Error searching items:', error);
            this.notificationService.showNotification(`Error searching items: ${error.message}`, 'error');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
        }
    }
    
    /**
     * Check if any filters are currently active
     * @returns {boolean} - True if any filters are active
     */
    hasActiveFilters() {
        // Check if any meaningful filters are set
        return document.getElementById('catalog-select').value !== '' ||
               document.getElementById('collection-select').value !== '' ||
               document.getElementById('bbox-input').value !== '' ||
               document.getElementById('date-start').value !== '' ||
               document.getElementById('date-end').value !== '' ||
               document.getElementById('cloud-cover-enabled').checked;
    }
    
    /**
     * Perform search across multiple data sources (EVERYTHING mode)
     * @param {Object} baseSearchParams - Base search parameters to use for all sources
     * @returns {Promise<Array>} Combined results from all sources
     */
    async performMultiSourceSearch(baseSearchParams) {
        console.log('🌍 Starting EVERYTHING mode: Multi-source search across all data sources...');
        
        // Get all available data sources from config
        const config = window.stacExplorer?.config;
        if (!config?.stacEndpoints) {
            throw new Error('No STAC endpoints configuration found');
        }
        
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
            
            // For other sources, just check if search URL exists
            return endpoints.search && endpoints.search.startsWith('http');
        });
        
        console.log(`🔍 Found ${validSources.length} valid data sources for EVERYTHING search:`, validSources);
        
        if (validSources.length === 0) {
            throw new Error('No valid data sources found for EVERYTHING search');
        }
        
        // Store original API client state
        const originalEndpoints = this.apiClient.getCurrentEndpoints();
        
        let allResults = [];
        const sourceResults = {};
        const sourceErrors = {};
        
        // Search each data source
        for (const source of validSources) {
            try {
                console.log(`🔎 Searching data source: ${source}`);
                
                // Get endpoints for this source
                const endpoints = config.stacEndpoints[source];
                
                // Set API client to use this source
                this.apiClient.setEndpoints(endpoints);
                
                // Create search parameters for this source
                const sourceSearchParams = { ...baseSearchParams };
                
                // Perform search on this source
                console.log(`📡 Making search request to ${source}:`, sourceSearchParams);
                const results = await this.apiClient.searchItems(sourceSearchParams);
                
                // Presign Planetary Computer rendered_preview URLs
                results.forEach(item => {
                    if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href.includes('planetarycomputer')) {
                        // Convert to presigned URL
                        item.assets.rendered_preview.href = item.assets.rendered_preview.href.replace(
                            'https://planetarycomputer.microsoft.com/api/stac/v1',
                            'https://planetarycomputer.microsoft.com/api/data/v1'
                        );
                    }
                });
                
                // Add source information to each result
                const resultsWithSource = results.map(item => ({
                    ...item,
                    _stacSource: source,
                    _stacSourceLabel: this.getSourceLabel(source)
                }));
                
                // Store results
                sourceResults[source] = resultsWithSource;
                allResults = allResults.concat(resultsWithSource);
                
                console.log(`✅ ${source}: Found ${results.length} results`);
                
            } catch (error) {
                console.error(`❌ Error searching ${source}:`, error);
                sourceErrors[source] = error.message;
                
                // Continue with other sources even if one fails
                continue;
            }
        }
        
        // Restore original API client state
        if (originalEndpoints) {
            this.apiClient.setEndpoints(originalEndpoints);
        }
        
        // Log final results
        console.log('🎯 EVERYTHING search completed:');
        console.log(`📊 Total results: ${allResults.length}`);
        console.log('📈 Results by source:', Object.keys(sourceResults).map(source => 
            `${source}: ${sourceResults[source].length}`
        ).join(', '));
        
        if (Object.keys(sourceErrors).length > 0) {
            console.warn('⚠️ Some sources had errors:', sourceErrors);
        }
        
        // Show detailed notification
        this.showMultiSourceSearchNotification(sourceResults, sourceErrors);
        
        return allResults;
    }
    
    /**
     * Get user-friendly label for data source
     * @param {string} source - Data source key
     * @returns {string} User-friendly label
     */
    getSourceLabel(source) {
        const labels = {
            copernicus: 'Copernicus Data Space',
            element84: 'Element84 Earth Search',
            local: 'Local STAC',
            custom: 'Custom STAC'
        };
        return labels[source] || source;
    }
    
    /**
     * Show notification with multi-source search results
     * @param {Object} sourceResults - Results by source
     * @param {Object} sourceErrors - Errors by source
     */
    showMultiSourceSearchNotification(sourceResults, sourceErrors) {
        const successfulSources = Object.keys(sourceResults);
        const failedSources = Object.keys(sourceErrors);
        const totalResults = Object.values(sourceResults).reduce((sum, results) => sum + results.length, 0);
        
        if (totalResults === 0) {
            const message = failedSources.length > 0 ? 
                `No results found. ${failedSources.length} source(s) had errors: ${failedSources.join(', ')}` :
                'No results found across any data sources.';
            this.notificationService.showNotification(message, 'info');
        } else {
            const breakdown = successfulSources.map(source => 
                `${this.getSourceLabel(source)}: ${sourceResults[source].length}`
            ).join(', ');
            
            let message = `🌍 EVERYTHING search: Found ${totalResults} datasets! (${breakdown})`;
            
            if (failedSources.length > 0) {
                message += ` ⚠️ ${failedSources.length} source(s) failed: ${failedSources.join(', ')}`;
            }
            
            this.notificationService.showNotification(message, 'success');
        }
    }
    
    /**
     * Reset search form and results
     */
    resetSearch() {
        // Show confirmation dialog only if there are active filters
        if (this.hasActiveFilters() && !confirm('Are you sure you want to clear all search filters?')) {
            return; // User canceled, so don't reset
        }
        
        // Reset all form fields
        document.getElementById('catalog-select').value = '';
        document.getElementById('collection-select').value = '';
        document.getElementById('bbox-input').value = '';
        document.getElementById('date-start').value = '';
        document.getElementById('date-end').value = '';
        document.getElementById('cloud-cover-enabled').checked = false;
        document.getElementById('cloud-cover').value = 50;
        document.getElementById('cloud-cover-value').textContent = '50%';
        document.getElementById('cloud-cover').disabled = true;
        
        // Reset all card states
        document.querySelectorAll('.search-card').forEach(card => {
            card.classList.remove('completed', 'active', 'has-filters');
            
            // Reset status badges
            const status = card.querySelector('.card-status');
            if (status) {
                status.classList.remove('completed');
                if (card.id === 'source-card') {
                    status.textContent = 'Required';
                    status.classList.add('required');
                } else {
                    status.textContent = 'Optional';
                    status.classList.add('optional');
                }
            }
        });
        
        // Reset card states tracking
        Object.keys(this.cardStates).forEach(key => {
            this.cardStates[key] = { completed: false, data: null };
        });
        
        // Hide search summary
        this.hideSearchSummary();
        
        // Activate first card
        this.activateCard('source-card');
        
        // Clear map drawings if available
        document.dispatchEvent(new CustomEvent('clearMapDrawings'));
        
        // Reset collection selection
        this.collectionManager.resetSelection();
        
        // Clear results
        this.resultsPanel.clearResults();
        
        // Show notification
        this.notificationService.showNotification('All search filters have been cleared.', 'info');
    }
    
    /**
     * Handle catalog change events
     * @param {Object} catalogInfo - Information about the selected catalog
     */
    handleCatalogChange(catalogInfo) {
        // After selecting a catalog, go directly to dataset selection
        setTimeout(() => {
            this.activateCard('dataset-card');
        }, 300);
    }
    
    /**
     * Handle collections updated event
     * @param {Object} collectionsInfo - Information about loaded collections
     */
    handleCollectionsUpdated(collectionsInfo) {
        console.log('📡 Collections updated event received');
        console.log('📋 Collections info:', collectionsInfo);
        console.log('🔄 Checking for pending selection:', this.pendingCollectionSelection);
        
        // Log all available collections
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            const availableCollections = Array.from(collectionSelect.options).map(opt => ({
                value: opt.value,
                text: opt.text
            }));
            console.log('📋 Available collections after update:', availableCollections);
        }
        
        // If we have a pending collection selection, apply it now
        if (this.pendingCollectionSelection) {
            const targetCollection = this.pendingCollectionSelection;
            
            // Try to find the collection in the loaded options
            const option = Array.from(collectionSelect.options).find(opt => 
                opt.value === targetCollection || 
                opt.value.includes(targetCollection) ||
                targetCollection.includes(opt.value)
            );
            
            if (option) {
                console.log('✅ Found matching collection option:', option.value, '-', option.text);
                collectionSelect.value = option.value;
                collectionSelect.dispatchEvent(new Event('change'));
                this.completeCard('dataset-card', option.value);
                console.log('🎯 Collection selected and card completed:', option.value);
            } else {
                console.warn('⚠️ Could not find collection:', targetCollection);
                console.log('🔍 Available options were:', 
                    Array.from(collectionSelect.options).map(opt => `${opt.value} - ${opt.text}`));
            }
            
            // Clear pending selection
            this.pendingCollectionSelection = null;
        }
    }
    
    /**
     * Initialize global paste listener for STAC items
     */
    initGlobalPasteListener() {
        document.addEventListener('paste', (e) => {
            // Don't interfere if user is pasting into an input field
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            )) {
                return;
            }
            
            // Get pasted text
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            if (!pastedText.trim()) return;
            
            // Try to detect and parse STAC item JSON
            this.handleGlobalPaste(pastedText.trim());
        });
        
        console.log('🎯 Global paste listener initialized for STAC items');
    }
    
    /**
     * Handle global paste and detect STAC items
     * @param {string} pastedText - The pasted text content
     */
    async handleGlobalPaste(pastedText) {
        try {
            // Try to parse as JSON
            let jsonData;
            try {
                jsonData = JSON.parse(pastedText);
            } catch (parseError) {
                // Not valid JSON, ignore silently
                return;
            }
            
            // Check if it looks like a STAC item
            if (this.isValidStacItem(jsonData)) {
                console.log('🎯 Detected STAC item from paste:', jsonData.id);
                
                // Show notification
                this.notificationService.showNotification(
                    `🎯 STAC item detected! Loading: ${jsonData.id}`,
                    'info'
                );
                
                // Process and load the item
                await this.processStacItem(jsonData);
                
            } else if (this.isStacCollection(jsonData)) {
                console.log('📂 Detected STAC collection from paste:', jsonData.id);
                
                this.notificationService.showNotification(
                    `📂 STAC collection detected, but only items are supported for direct loading`,
                    'warning'
                );
                
            } else {
                // Valid JSON but not a STAC item/collection - ignore silently
                return;
            }
            
        } catch (error) {
            // Error processing - ignore silently to avoid annoying users
            console.debug('Paste processing error (ignored):', error);
        }
    }
    
    /**
     * Check if JSON object is a valid STAC item
     * @param {Object} obj - JSON object to check
     * @returns {boolean} True if valid STAC item
     */
    isValidStacItem(obj) {
        return obj && 
               typeof obj === 'object' &&
               obj.type === 'Feature' &&
               typeof obj.id === 'string' &&
               obj.assets &&
               typeof obj.assets === 'object' &&
               obj.properties &&
               typeof obj.properties === 'object' &&
               (obj.stac_version || obj.geometry !== undefined); // STAC version or geometry indicates STAC item
    }
    
    /**
     * Check if JSON object is a STAC collection
     * @param {Object} obj - JSON object to check  
     * @returns {boolean} True if STAC collection
     */
    isStacCollection(obj) {
        return obj &&
               typeof obj === 'object' &&
               obj.type === 'Collection' &&
               typeof obj.id === 'string' &&
               (obj.stac_version || obj.extent !== undefined);
    }
}

// Export for compatibility with existing code
export { CardSearchPanel as SearchPanel };
