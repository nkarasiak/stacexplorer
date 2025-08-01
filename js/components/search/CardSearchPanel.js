/**
 * CardSearchPanel.js - Enhanced search panel with card-based interface
 * Replaces tab-based navigation with modern card dashboard
 */

// import { searchHistoryManager } from '../../utils/SearchHistoryManager.js'; // unused
// import { getEnabledCollectionIds } from '../../utils/CollectionConfig.js'; // unused

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
      quality: { completed: false, data: null },
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
    document.addEventListener('catalogChanged', event => {
      this.handleCatalogChange(event.detail);
    });

    // Listen for collections updated to set pending collection selection
    document.addEventListener('collectionsUpdated', event => {
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
      header.addEventListener('click', _event => {
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
        block: 'nearest',
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
    if (!card) {
      return;
    }

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
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;

    // Data source is always required
    const sourceCompleted = catalogValue !== '';

    // When no specific collection is selected, require location AND time constraints
    const hasSpecificCollection = collectionValue !== '';
    const hasLocation = bboxValue !== '';
    const hasTimeRange = dateStart !== '' && dateEnd !== '';

    let locationCompleted = true;
    let timeCompleted = true;

    if (!hasSpecificCollection) {
      // No specific collection selected - require both location and time
      locationCompleted = hasLocation;
      timeCompleted = hasTimeRange;
    }

    const allCompleted = sourceCompleted && locationCompleted && timeCompleted;

    return allCompleted;
  }

  /**
   * Initialize form field handlers
   */
  initFormHandlers() {
    // Catalog selection
    const catalogSelect = document.getElementById('catalog-select');
    catalogSelect.addEventListener('change', event => {
      if (event.target.value) {
        this.completeCard('source-card', event.target.value);
        this.handleCustomCatalogVisibility(event.target.value);
      }
    });

    // Collection selection
    const collectionSelect = document.getElementById('collection-select');
    collectionSelect.addEventListener('change', event => {
      if (event.target.value) {
        this.completeCard('dataset-card', event.target.value);
      }
    });

    // Location inputs - Enhanced to detect bbox changes
    const bboxInput = document.getElementById('bbox-input');

    // Listen for manual bbox entry
    bboxInput.addEventListener('input', event => {
      if (event.target.value.trim()) {
        this.completeCard('location-card', event.target.value);
      }
    });

    // Listen for bbox drawn on map
    document.addEventListener('bboxDrawn', event => {
      if (event.detail?.bbox) {
        this.completeCard('location-card', event.detail.bbox);
      }
    });

    // Also listen for any changes to the bbox input (programmatic)
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
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
            end: dateEnd.value,
          });
        }
      });
    });

    // Cloud cover
    const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
    cloudCoverEnabled.addEventListener('change', () => {
      if (cloudCoverEnabled.checked) {
        this.completeCard('quality-card', {
          cloudCover: document.getElementById('cloud-cover').value,
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
        end: '2024-12-31',
      });
    });
  }

  /**
   * Apply a search preset
   * @param {string} presetName - Name of the preset to apply
   */
  applyPreset(presetName) {
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
      // 1. Set basic form values first
      document.getElementById('date-start').value = '2024-01-01';
      document.getElementById('date-end').value = '2024-12-31';
      document.getElementById('bbox-input').value = '1.3,43.5,1.5,43.7';

      // 2. Set catalog and trigger change
      const catalogSelect = document.getElementById('catalog-select');
      catalogSelect.value = 'earth-search-aws';
      catalogSelect.dispatchEvent(new Event('change'));

      // 3. Wait for collections to load with timeout and retry logic
      const targetCollection = 'sentinel-s2-l2a-cogs';
      await this.waitForCollectionAndSelect(targetCollection, 'S-2 Toulouse');

      // 4. Complete cards
      this.completeCard('source-card', 'earth-search-aws');
      this.completeCard('dataset-card', targetCollection);
      this.completeCard('time-card', {
        start: '2024-01-01',
        end: '2024-12-31',
      });
      this.completeCard('location-card', '1.3,43.5,1.5,43.7');

      this.notificationService.showNotification(
        '✅ Applied Sentinel-2 Toulouse preset (Element84)',
        'success'
      );
    } catch (error) {
      console.error('❌ Error applying Toulouse preset:', error);
      this.notificationService.showNotification(
        `Error applying Toulouse preset: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * Apply Sentinel-1 Vancouver preset with robust collection selection
   */
  async applyVancouverPreset() {
    try {
      // 1. Set basic form values first
      document.getElementById('date-start').value = '2024-01-01';
      document.getElementById('date-end').value = '2024-12-31';
      document.getElementById('bbox-input').value = '-123.3,49.1,-123.0,49.4';

      // 2. Set catalog and trigger change
      const catalogSelect = document.getElementById('catalog-select');
      catalogSelect.value = 'earth-search-aws';
      catalogSelect.dispatchEvent(new Event('change'));

      // 3. Wait for collections to load with timeout and retry logic
      const targetCollection = 'sentinel-s1-grd';
      await this.waitForCollectionAndSelect(targetCollection, 'S-1 Vancouver');

      // 4. Complete cards
      this.completeCard('source-card', 'earth-search-aws');
      this.completeCard('dataset-card', targetCollection);
      this.completeCard('time-card', {
        start: '2024-01-01',
        end: '2024-12-31',
      });
      this.completeCard('location-card', '-123.3,49.1,-123.0,49.4');

      this.notificationService.showNotification(
        '✅ Applied Sentinel-1 Vancouver preset (Element84)',
        'success'
      );
    } catch (error) {
      console.error('❌ Error applying Vancouver preset:', error);
      this.notificationService.showNotification(
        `Error applying Vancouver preset: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * Wait for a specific collection to be available and select it
   * @param {string} targetCollection - Collection ID to select
   * @param {string} presetName - Name of preset for logging
   * @returns {Promise} - Resolves when collection is selected
   */
  waitForCollectionAndSelect(targetCollection, presetName) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max wait
      const checkInterval = 500; // Check every 500ms

      const checkForCollection = () => {
        attempts++;
        const collectionSelect = document.getElementById('collection-select');

        if (!collectionSelect) {
          console.warn('⚠️ Collection select element not found');
          return;
        }

        // Look for the target collection in options
        const options = Array.from(collectionSelect.options);
        const matchingOption = options.find(
          option =>
            option.value === targetCollection ||
            option.value.includes(targetCollection.split('-').pop()) ||
            targetCollection.includes(option.value)
        );

        if (matchingOption) {
          // Select the collection
          collectionSelect.value = matchingOption.value;
          collectionSelect.dispatchEvent(new Event('change'));

          // Verify selection worked
          setTimeout(() => {
            const selectedValue = collectionSelect.value;
            if (selectedValue === matchingOption.value) {
              resolve(selectedValue);
            } else {
              console.warn(
                `⚠️ Collection selection failed: expected ${matchingOption.value}, got ${selectedValue}`
              );
              reject(new Error(`Collection selection failed for ${presetName}`));
            }
          }, 100);
        } else if (attempts >= maxAttempts) {
          console.error(
            `❌ Timeout: Could not find collection ${targetCollection} after ${attempts} attempts`
          );
          reject(new Error(`Collection ${targetCollection} not found in ${presetName} preset`));
        } else {
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
      cloudCoverValue.textContent = `${cloudCoverSlider.value}%`;
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
    loadButton.addEventListener('click', event => {
      event.stopPropagation(); // Prevent header click from toggling card
      this.showStacLoadModal();
    });

    // Handle modal close
    closeButton.addEventListener('click', () => {
      this.hideStacLoadModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideStacLoadModal();
      }
    });

    // Escape key handler will be added when modal is shown

    // Initialize tab switching
    this.initModalTabs();

    // Initialize load buttons in modal
    this.initModalLoadButtons();
  }

  /**
   * Show the STAC load modal
   */
  showStacLoadModal() {
    const modal = document.getElementById('stac-load-modal');
    modal.style.display = 'flex';

    // Add escape key handler when modal is shown
    this.handleStacModalEscape = e => {
      if (e.key === 'Escape') {
        this.hideStacLoadModal();
      }
    };
    document.addEventListener('keydown', this.handleStacModalEscape);

    // Focus on the URL input by default
    setTimeout(() => {
      const urlInput = document.getElementById('stac-item-url-modal');
      if (urlInput) {
        urlInput.focus();
      }
    }, 100);
  }

  /**
   * Hide the STAC load modal
   */
  hideStacLoadModal() {
    const modal = document.getElementById('stac-load-modal');
    modal.style.display = 'none';

    // Remove escape key handler
    if (this.handleStacModalEscape) {
      document.removeEventListener('keydown', this.handleStacModalEscape);
    }

    // Clear inputs
    const urlInput = document.getElementById('stac-item-url-modal');
    const jsonInput = document.getElementById('stac-item-json-modal');
    if (urlInput) {
      urlInput.value = '';
    }
    if (jsonInput) {
      jsonInput.value = '';
    }
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
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.loadStacItemFromUrl();
      }
    });

    jsonInput.addEventListener('keydown', e => {
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
    } catch {
      this.notificationService.showNotification('Please enter a valid URL', 'error');
      return;
    }

    // Show loading state
    const originalText = loadButton.innerHTML;
    loadButton.innerHTML = '<i class="material-icons">hourglass_empty</i> Loading...';
    loadButton.disabled = true;

    try {
      // Fetch the STAC item JSON
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Try to parse as JSON regardless of content-type (many servers don't set correct headers)
      let stacItem;
      try {
        stacItem = await response.json();
      } catch (parseError) {
        const contentType = response.headers.get('content-type') || 'unknown';
        throw new Error(
          `Failed to parse JSON response. Content-Type: ${contentType}. Parse error: ${parseError.message}`
        );
      }

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
      // Parse the JSON
      const stacItem = JSON.parse(jsonText);

      // Validate and load the item
      await this.processStacItem(stacItem);

      // Close modal on success
      this.hideStacLoadModal();
    } catch (error) {
      console.error('❌ Error loading STAC item from JSON:', error);
      if (error instanceof SyntaxError) {
        this.notificationService.showNotification('Invalid JSON format', 'error');
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
      console.error('❌ [PASTE-DEBUG] Invalid type. Expected "Feature", got:', stacItem.type);
      console.error('❌ [PASTE-DEBUG] Full object keys:', Object.keys(stacItem));

      // If it looks like a STAC item but just missing the type, try to fix it
      if (!stacItem.type && stacItem.id && stacItem.assets && stacItem.properties) {
        console.warn(
          '⚠️ [PASTE-DEBUG] Object looks like STAC item but missing type field. Auto-adding type="Feature"'
        );
        stacItem.type = 'Feature';
      } else {
        throw new Error(
          `Invalid STAC item: expected type="Feature", got type="${stacItem.type || 'undefined'}". Make sure your STAC item has a "type": "Feature" field at the root level.`
        );
      }
    }

    if (!stacItem.id) {
      console.error('❌ [PASTE-DEBUG] Missing id field');
      throw new Error('Invalid STAC item: missing id');
    }

    if (!stacItem.assets || typeof stacItem.assets !== 'object') {
      console.error('❌ [PASTE-DEBUG] Missing or invalid assets:', stacItem.assets);
      throw new Error('Invalid STAC item: missing or invalid assets');
    }

    // Clear previous map state (geometry, bbox, thumbnails)
    this.clearMapState();

    // Display the item in results
    this.resultsPanel.setItems([stacItem]);

    // Automatically display the pasted item on the map (like clicking on it)
    if (this.mapManager) {
      try {
        await this.mapManager.displayItemOnMap(stacItem, 'thumbnail');
      } catch (error) {
        console.warn('⚠️ [DEBUG] Failed to auto-display on map:', error);
        // Fallback: just fit to bounds without displaying assets
        const bbox = this.mapManager.getBoundingBox(stacItem);
        if (bbox) {
          this.mapManager.fitMapToBbox(bbox);
        }
      }
    }

    // Show success notification
    this.notificationService.showNotification(`Loaded STAC item: ${stacItem.id}`, 'success');
  }

  /**
   * Clear all previous map state (drawings, thumbnails, geometry)
   */
  clearMapState() {
    try {
      // Clear map drawings and previous geometry
      document.dispatchEvent(new CustomEvent('clearMapDrawings'));

      // Clear current item layer (geometry/bbox) - this fixes the overlay issue!
      if (this.mapManager && typeof this.mapManager.removeCurrentLayer === 'function') {
        this.mapManager.removeCurrentLayer();
      } else {
        console.warn('⚠️ [PASTE-DEBUG] MapManager or removeCurrentLayer not available');
      }

      // Clear thumbnails if mapManager is available
      if (this.mapManager && typeof this.mapManager.clearAllThumbnails === 'function') {
        this.mapManager.clearAllThumbnails();
      }

      // Clear any visualization layers if available
      if (window.stacExplorer?.rasterManager) {
        const layers = window.stacExplorer.rasterManager.getLayerInfo();
        layers.forEach(layer => {
          window.stacExplorer.rasterManager.removeLayer(layer.layerId);
        });
      }
    } catch (error) {
      console.error('❌ [PASTE-DEBUG] Error clearing map state:', error);
    }
  }

  /**
   * Update the search summary display
   */
  updateSearchSummary() {
    const summaryDetails = document.getElementById('summary-details');
    if (!summaryDetails) {
      return;
    } // Prevent errors if element doesn't exist yet

    const summary = [];

    // Build summary from completed cards
    if (this.cardStates.source.completed) {
      const catalogSelect = document.getElementById('catalog-select');
      const catalogText = catalogSelect.selectedOptions[0]?.text || 'Selected catalog';
      summary.push(catalogText.replace(/🛰️|🌍|⚙️/g, '').trim());
    }

    if (this.cardStates.dataset.completed) {
      const collectionSelect = document.getElementById('collection-select');
      const collectionText = collectionSelect.selectedOptions[0]?.text || 'Selected dataset';
      summary.push(collectionText.replace(/🛰️|📡/g, '').trim());
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
      summaryDetails.textContent = 'Browse Collections';
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
      // Dispatch search-started event for tutorial and other listeners
      const searchParams = this.searchForm.getSearchParams();
      const catalogValue = document.getElementById('catalog-select').value;
      const collectionValue = document.getElementById('collection-select').value;

      document.dispatchEvent(
        new CustomEvent('search-started', {
          detail: {
            catalog: catalogValue,
            collection: collectionValue,
            searchParams: searchParams,
            timestamp: new Date().toISOString(),
          },
        })
      );

      // Validate required fields
      if (!this.areRequiredCardsCompleted()) {
        // Get current field values for detailed error messaging
        const catalogValue = document.getElementById('catalog-select').value;
        const collectionValue = document.getElementById('collection-select').value;
        const bboxValue = document.getElementById('bbox-input').value.trim();
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;

        const hasSpecificCollection = collectionValue !== '';
        const hasLocation = bboxValue !== '';
        const hasTimeRange = dateStart !== '' && dateEnd !== '';

        // Provide specific error messages based on what's missing
        if (catalogValue === '') {
          this.notificationService.showNotification(
            'Please select a Data Source to continue',
            'warning'
          );
          return;
        } else if (!hasSpecificCollection) {
          // No specific collection selected - need location AND time
          const missingItems = [];
          if (!hasLocation) {
            missingItems.push('Location');
          }
          if (!hasTimeRange) {
            missingItems.push('Time Range');
          }

          if (missingItems.length > 0) {
            const message = `When searching all collections, please specify: ${missingItems.join(' and ')}`;
            this.notificationService.showNotification(message, 'warning');
            return;
          }
        }
      }

      // Show loading indicator
      document.getElementById('loading').style.display = 'flex';

      // Get search parameters from SearchForm (maintains compatibility)
      // searchParams already declared above at line 1016

      // Add filter parameters if FilterManager is available
      if (window.stacExplorer?.filterManager) {
        const filterParams = window.stacExplorer.filterManager.getSTACQueryParameters();
        if (Object.keys(filterParams).length > 0) {
          // Merge filter parameters into the query
          if (!searchParams.query) {
            searchParams.query = {};
          }
          Object.assign(searchParams.query, filterParams);
        } else {
          // No filter params to assign
        }
      } else {
        // Use default search params
      }

      // CRITICAL: Override collection parameter from our card UI
      const collectionSelect = document.getElementById('collection-select');
      const selectedCollection = collectionSelect ? collectionSelect.value : '';

      // Add collection if specified
      if (selectedCollection) {
        searchParams.collections = [selectedCollection];
      } else {
        // No specific collection selected, search all collections
      }

      // CRITICAL: Validate that we have required parameters for the search

      // Collection is always required
      if (!searchParams.collections) {
        const errorMsg = 'Collection is required for single-source search but none was selected';
        console.error('❌', errorMsg);
        this.notificationService.showNotification(errorMsg, 'error');
        document.getElementById('loading').style.display = 'none';
        return;
      }

      // CRITICAL: Additional validation for "all collections" searches without constraints
      if (!searchParams.collections || searchParams.collections.length === 0) {
        const hasLocationConstraint = searchParams.bbox || searchParams.intersects;
        const hasTimeConstraint = searchParams.datetime;

        if (!hasLocationConstraint || !hasTimeConstraint) {
          const missingConstraints = [];
          if (!hasLocationConstraint) {
            missingConstraints.push('Location');
          }
          if (!hasTimeConstraint) {
            missingConstraints.push('Time Range');
          }

          const errorMsg = `Searching all collections requires: ${missingConstraints.join(' and ')}`;
          console.error('❌', errorMsg);
          this.notificationService.showNotification(errorMsg, 'error');
          document.getElementById('loading').style.display = 'none';
          return;
        }
      }

      let items = [];

      // Use regular single-source search
      items = await this.apiClient.searchItems(searchParams);

      // Update results panel
      this.resultsPanel.setItems(items);

      // Collapse search container only if we found results
      if (items.length > 0) {
        const searchContainer = document.getElementById('search-container');
        if (!searchContainer.classList.contains('collapsed')) {
          const collapseSearchEvent = new CustomEvent('toggleCard', {
            detail: { cardId: 'search-container' },
          });
          document.dispatchEvent(collapseSearchEvent);
        }
      }

      // Only expand results card if we found results
      if (items.length > 0) {
        const resultsCard = document.getElementById('results-card');
        if (resultsCard.classList.contains('collapsed')) {
          const event = new CustomEvent('toggleCard', {
            detail: { cardId: 'results-card' },
          });
          document.dispatchEvent(event);
        }
      }

      // Dispatch event that search results have been loaded
      document.dispatchEvent(
        new CustomEvent('searchResultsLoaded', {
          detail: { results: items },
        })
      );

      // Save search to history (only if we got results)
      if (items.length > 0) {
        try {
          // Prepare search parameters for history with additional metadata
          const historyParams = {
            ...searchParams,
            collectionTitle: selectedCollection
              ? this.getCollectionTitle(selectedCollection)
              : null,
            resultCount: items.length,
            searchTimestamp: new Date().toISOString(),
          };

          // Dispatch event for search history manager to catch
          document.dispatchEvent(
            new CustomEvent('searchExecuted', {
              detail: historyParams,
            })
          );
        } catch (historyError) {
          console.warn('⚠️ Failed to save search to history:', historyError);
        }
      }

      // Hide loading indicator
      document.getElementById('loading').style.display = 'none';

      // Show success notification with collection info
      if (items.length === 0) {
        const searchContext = selectedCollection
          ? ` in collection "${selectedCollection}"`
          : ' across all collections';
        this.notificationService.showNotification(
          `No datasets found${searchContext} matching your search criteria.`,
          'info'
        );
      } else {
        const collectionText = selectedCollection
          ? ` from collection "${selectedCollection}"`
          : ' from all collections';
        this.notificationService.showNotification(
          `Found ${items.length} datasets${collectionText}!`,
          'success'
        );
      }
    } catch (error) {
      console.error('❌ Error searching items:', error);

      // Provide user-friendly error messages
      let userMessage = 'Search failed. Please try again.';

      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_RESET') ||
        (error.message.includes('All') && error.message.includes('attempts failed'))
      ) {
        userMessage =
          'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        userMessage = 'Request timed out. The server may be busy - please try again in a moment.';
      } else if (error.message.includes('HTTP error 5')) {
        userMessage =
          'Server error. The STAC API is temporarily unavailable - please try again later.';
      } else if (error.message.includes('HTTP error 4')) {
        userMessage = 'Invalid search parameters. Please check your search criteria.';
      }

      this.notificationService.showNotification(userMessage, 'error');

      // Hide loading indicator
      document.getElementById('loading').style.display = 'none';
    }
  }

  /**
   * Get the display title for a collection
   * @param {string} collectionId - Collection ID
   * @returns {string} Collection title or ID if title not found
   */
  getCollectionTitle(collectionId) {
    try {
      const collectionSelect = document.getElementById('collection-select');
      if (collectionSelect) {
        const option = Array.from(collectionSelect.options).find(opt => opt.value === collectionId);
        return option ? option.textContent : collectionId;
      }
      return collectionId;
    } catch (error) {
      console.warn('Failed to get collection title:', error);
      return collectionId;
    }
  }

  /**
   * Check if any filters are currently active
   * @returns {boolean} - True if any filters are active
   */
  hasActiveFilters() {
    // Check if any meaningful filters are set
    return (
      document.getElementById('catalog-select').value !== '' ||
      document.getElementById('collection-select').value !== '' ||
      document.getElementById('bbox-input').value !== '' ||
      document.getElementById('date-start').value !== '' ||
      document.getElementById('date-end').value !== '' ||
      document.getElementById('cloud-cover-enabled').checked
    );
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
      custom: 'Custom STAC',
    };
    return labels[source] || source;
  }

  /**
   * Reset search form and results
   */
  resetSearch() {
    // Show confirmation dialog only if there are active filters
    // eslint-disable-next-line no-alert
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

    // Reset smart filters if FilterManager is available
    if (window.stacExplorer?.filterManager) {
      window.stacExplorer.filterManager.resetFilters();
    }

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
  handleCatalogChange(_catalogInfo) {
    // After selecting a catalog, go directly to dataset selection
    setTimeout(() => {
      this.activateCard('dataset-card');
    }, 300);
  }

  /**
   * Handle collections updated event
   * @param {Object} collectionsInfo - Information about loaded collections
   */
  handleCollectionsUpdated(_collectionsInfo) {
    // Log all available collections
    const collectionSelect = document.getElementById('collection-select');
    if (collectionSelect) {
      // Available collections for debugging
      // const availableCollections = Array.from(collectionSelect.options).map(opt => ({
      //   value: opt.value,
      //   text: opt.text,
      // }));
    }

    // If we have a pending collection selection, apply it now
    if (this.pendingCollectionSelection) {
      const targetCollection = this.pendingCollectionSelection;

      // Try to find the collection in the loaded options
      const option = Array.from(collectionSelect.options).find(
        opt =>
          opt.value === targetCollection ||
          opt.value.includes(targetCollection) ||
          targetCollection.includes(opt.value)
      );

      if (option) {
        collectionSelect.value = option.value;
        collectionSelect.dispatchEvent(new Event('change'));
        this.completeCard('dataset-card', option.value);
      } else {
        console.warn('⚠️ Could not find collection:', targetCollection);
      }

      // Clear pending selection
      this.pendingCollectionSelection = null;
    }
  }

  /**
   * Initialize global paste listener for STAC items
   */
  initGlobalPasteListener() {
    document.addEventListener('paste', e => {
      // Don't interfere if user is pasting into an input field
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true')
      ) {
        return;
      }

      // Get pasted text
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      if (!pastedText.trim()) {
        return;
      }

      // Try to detect and parse STAC item JSON
      this.handleGlobalPaste(pastedText.trim());
    });
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
      } catch {
        // Not valid JSON, ignore silently
        return;
      }

      // Check if it looks like a STAC item
      if (this.isValidStacItem(jsonData)) {
        // Show notification
        this.notificationService.showNotification(
          `STAC item detected! Loading: ${jsonData.id}`,
          'info'
        );

        // Process and load the item
        await this.processStacItem(jsonData);
      } else if (this.isStacCollection(jsonData)) {
        this.notificationService.showNotification(
          `📂 STAC collection detected, but only items are supported for direct loading`,
          'warning'
        );
      } else {
        // Valid JSON but not a STAC item/collection - ignore silently
        return;
      }
    } catch {
      // Error processing - ignore silently to avoid annoying users
    }
  }

  /**
   * Check if JSON object is a valid STAC item
   * @param {Object} obj - JSON object to check
   * @returns {boolean} True if valid STAC item
   */
  isValidStacItem(obj) {
    const isValid =
      obj &&
      typeof obj === 'object' &&
      (obj.type === 'Feature' || (!obj.type && obj.id && obj.assets && obj.properties)) && // Accept missing type if other fields present
      typeof obj.id === 'string' &&
      obj.assets &&
      typeof obj.assets === 'object' &&
      obj.properties &&
      typeof obj.properties === 'object' &&
      (obj.stac_version || obj.geometry !== undefined); // STAC version or geometry indicates STAC item

    return isValid;
  }

  /**
   * Check if JSON object is a STAC collection
   * @param {Object} obj - JSON object to check
   * @returns {boolean} True if STAC collection
   */
  isStacCollection(obj) {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.type === 'Collection' &&
      typeof obj.id === 'string' &&
      (obj.stac_version || obj.extent !== undefined)
    );
  }
}

// Export for compatibility with existing code
export { CardSearchPanel as SearchPanel };
