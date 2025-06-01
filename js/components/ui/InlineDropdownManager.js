/**
 * InlineDropdownManager.js - Manages inline dropdowns for left menu items
 * Provides streamlined dropdown experience without opening fullscreen interface
 * OPTIMIZED VERSION - Fast loading, single dropdown, no fullscreen interference
 */

import { AISmartSearchEnhanced } from '../search/AISmartSearchEnhanced.js';

export class InlineDropdownManager {
    /**
     * Create a new InlineDropdownManager
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
        
        // Create a helper instance of AISmartSearchEnhanced to reuse its methods
        this.aiSearchHelper = new AISmartSearchEnhanced(
            apiClient, searchPanel, collectionManager, mapManager, notificationService
        );
        
        this.currentDropdown = null;
        this.currentField = null;
        this.isLoading = false;
        
        // Cache collections for performance
        this.collectionsCache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        // Initialize event listeners
        this.initializeInlineDropdowns();
        this.setupGlobalListeners();
        this.interceptMapDrawing();
        
        // Pre-load collections in background
        setTimeout(() => this.preloadCollections(), 1000);
    }
    
    /**
     * Pre-load collections in background for faster dropdowns
     */
    async preloadCollections() {
        try {
            console.log('🔄 Pre-loading collections in background...');
            await this.getCachedCollections();
            console.log('✅ Collections pre-loaded successfully');
        } catch (error) {
            console.warn('⚠️ Failed to pre-load collections:', error);
        }
    }
    
    /**
     * Get collections with caching for performance
     */
    async getCachedCollections() {
        const now = Date.now();
        
        // Return cached collections if valid
        if (this.collectionsCache && 
            this.cacheTimestamp && 
            (now - this.cacheTimestamp) < this.CACHE_DURATION) {
            console.log('📦 Using cached collections');
            return this.collectionsCache;
        }
        
        // Try to get from collection manager first
        if (this.collectionManager && typeof this.collectionManager.getAllCollections === 'function') {
            const managerCollections = this.collectionManager.getAllCollections();
            if (managerCollections && managerCollections.length > 0) {
                this.collectionsCache = managerCollections;
                this.cacheTimestamp = now;
                this.aiSearchHelper.allAvailableCollections = managerCollections;
                return managerCollections;
            }
        }
        
        // Fallback to loading collections
        console.log('🔄 Loading fresh collections...');
        await this.aiSearchHelper.ensureDataSourceSelected();
        
        if (this.aiSearchHelper.allAvailableCollections) {
            this.collectionsCache = this.aiSearchHelper.allAvailableCollections;
            this.cacheTimestamp = now;
            return this.collectionsCache;
        }
        
        return [];
    }
    
    /**
     * Intercept map drawing to prevent fullscreen interference
     */
    interceptMapDrawing() {
        if (!this.mapManager) return;
        
        console.log('🎯 Setting up comprehensive map drawing interception...');
        
        // Store original method if it exists
        this.originalStartDrawing = this.mapManager.startDrawingBbox;
        
        // Flag to track drawing state
        this.isDrawingActive = false;
        
        // Override the drawing method
        this.mapManager.startDrawingBbox = (callback) => {
            console.log('🎯 Intercepted map drawing - preventing fullscreen triggers');
            
            // Set drawing active flag
            this.isDrawingActive = true;
            
            // Temporarily disable AI search fullscreen during drawing
            this.temporarilyDisableAISearch();
            
            // Call original method with our custom callback
            if (this.originalStartDrawing) {
                this.originalStartDrawing.call(this.mapManager, (bbox) => {
                    console.log('📍 Drawing completed, handling inline:', bbox);
                    
                    // Reset drawing state
                    this.isDrawingActive = false;
                    
                    // Update location selection inline
                    this.handleDrawingComplete(bbox);
                    
                    // Re-enable AI search after a delay
                    setTimeout(() => {
                        this.restoreAISearch();
                    }, 1000);
                    
                    // Call original callback if provided
                    if (callback && typeof callback === 'function') {
                        callback(bbox);
                    }
                });
            }
        };
        
        // Also intercept any global drawing events that might trigger fullscreen
        this.interceptDrawingEvents();
        
        console.log('🎯 Map drawing interception set up with fullscreen prevention');
    }
    
    /**
     * Temporarily disable AI search fullscreen during drawing
     */
    temporarilyDisableAISearch() {
        try {
            console.log('🚫 Temporarily disabling fullscreen AI search during drawing');
            
            // Store original method and replace with no-op
            if (this.aiSearchHelper && this.aiSearchHelper.showMinimalistSearch) {
                this.originalShowMinimalistSearch = this.aiSearchHelper.showMinimalistSearch;
                this.aiSearchHelper.showMinimalistSearch = () => {
                    console.log('🚫 Blocked fullscreen AI search during drawing');
                    return Promise.resolve();
                };
            }
            
            // Also disable global AI search if available
            const globalAISearch = window.stacExplorer?.aiSmartSearch;
            if (globalAISearch && globalAISearch.showMinimalistSearch) {
                this.originalGlobalShowMinimalistSearch = globalAISearch.showMinimalistSearch;
                globalAISearch.showMinimalistSearch = () => {
                    console.log('🚫 Blocked global fullscreen AI search during drawing');
                    return Promise.resolve();
                };
            }
            
        } catch (error) {
            console.warn('⚠️ Error disabling AI search:', error);
        }
    }
    
    /**
     * Restore AI search functionality after drawing
     */
    restoreAISearch() {
        try {
            console.log('✅ Restoring fullscreen AI search after drawing');
            
            // Restore original method
            if (this.originalShowMinimalistSearch) {
                this.aiSearchHelper.showMinimalistSearch = this.originalShowMinimalistSearch;
                this.originalShowMinimalistSearch = null;
            }
            
            // Restore global AI search
            if (this.originalGlobalShowMinimalistSearch) {
                const globalAISearch = window.stacExplorer?.aiSmartSearch;
                if (globalAISearch) {
                    globalAISearch.showMinimalistSearch = this.originalGlobalShowMinimalistSearch;
                }
                this.originalGlobalShowMinimalistSearch = null;
            }
            
        } catch (error) {
            console.warn('⚠️ Error restoring AI search:', error);
        }
    }
    
    /**
     * Intercept any global drawing completion events
     */
    interceptDrawingEvents() {
        // Listen for any drawing completion events
        document.addEventListener('drawingCompleted', (event) => {
            if (this.isDrawingActive) {
                console.log('🎯 Intercepted drawing completion event');
                event.stopPropagation();
                event.preventDefault();
                
                // Handle the drawing result inline
                const bbox = event.detail?.bbox;
                if (bbox) {
                    this.handleDrawingComplete(bbox);
                }
            }
        }, true); // Use capture phase to intercept early
        
        // Also listen for any geometry sync events that might trigger fullscreen
        document.addEventListener('geometryChanged', (event) => {
            if (this.isDrawingActive) {
                console.log('🎯 Intercepted geometry change event during drawing');
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);
        
        console.log('🎯 Drawing event interception set up');
    }
    
    /**
     * Handle drawing completion inline without opening fullscreen
     */
    handleDrawingComplete(bbox) {
        try {
            // Update the AI search helper state
            this.aiSearchHelper.selectedLocation = bbox;
            this.aiSearchHelper.selectedLocationResult = {
                formattedName: 'Map Selection',
                shortName: 'Map Selection',
                bbox: bbox,
                category: 'drawn'
            };
            
            // Update the sidebar summary
            this.updateSearchSummary('location', 'MAP SELECTION');
            
            // Show success notification
            this.notificationService.showNotification('📍 Location drawn and applied!', 'success');
            
            console.log('✅ Drawing handled inline, no fullscreen opened');
            
        } catch (error) {
            console.error('❌ Error handling drawing completion:', error);
        }
    }
    
    /**
     * Initialize inline dropdown functionality for search summary items
     */
    initializeInlineDropdowns() {
        // Find all search summary items in the sidebar
        const summaryItems = document.querySelectorAll('.search-summary-item');
        
        summaryItems.forEach(item => {
            // Remove existing click handlers
            item.replaceWith(item.cloneNode(true));
        });
        
        // Re-select items after cloning (to remove old handlers)
        const newSummaryItems = document.querySelectorAll('.search-summary-item');
        
        newSummaryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const field = item.dataset.field;
                console.log(`🎯 Search summary item clicked for inline dropdown: ${field}`);
                
                this.showInlineDropdown(field, item);
            });
            
            // Add visual indication that it's clickable
            item.style.cursor = 'pointer';
            item.style.transition = 'all 0.2s ease';
            
            // Add hover effects
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('dropdown-active')) {
                    item.style.transform = 'translateX(4px)';
                    item.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('dropdown-active')) {
                    item.style.transform = 'translateX(0)';
                    item.style.backgroundColor = 'transparent';
                }
            });
        });
        
        console.log(`✅ Initialized inline dropdowns for ${newSummaryItems.length} search summary items`);
    }
    
    /**
     * Show inline dropdown for a specific field
     * @param {string} fieldType - Type of field ('collection', 'location', 'date')
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    async showInlineDropdown(fieldType, triggerElement) {
        try {
            // IMPORTANT: Close any existing dropdown first
            this.closeCurrentDropdown();
            
            // Prevent multiple dropdowns during loading
            if (this.isLoading) {
                console.log('⏳ Already loading dropdown, please wait...');
                return;
            }
            
            console.log(`📋 Opening inline dropdown for: ${fieldType}`);
            this.isLoading = true;
            
            // Show loading state immediately
            this.showLoadingDropdown(fieldType, triggerElement);
            
            // Create dropdown content based on field type
            let dropdownContent;
            
            switch (fieldType) {
                case 'collection':
                    // Use cached collections for instant loading
                    const collections = await this.getCachedCollections();
                    this.aiSearchHelper.allAvailableCollections = collections;
                    dropdownContent = this.aiSearchHelper.createCollectionDropdown();
                    break;
                case 'location':
                    dropdownContent = this.aiSearchHelper.createLocationDropdown();
                    break; 
                case 'date':
                    dropdownContent = this.aiSearchHelper.createDateDropdown();
                    break;
                default:
                    console.warn(`Unknown field type: ${fieldType}`);
                    this.isLoading = false;
                    return;
            }
            
            // Replace loading dropdown with actual content
            this.replaceLoadingWithContent(dropdownContent, fieldType);
            
            console.log(`✅ Showed inline dropdown for: ${fieldType}`);
            
        } catch (error) {
            console.error(`❌ Error showing inline dropdown for ${fieldType}:`, error);
            this.notificationService.showNotification(`Error opening ${fieldType} options`, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Show loading dropdown immediately for better UX
     */
    showLoadingDropdown(fieldType, triggerElement) {
        // Create loading dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'inline-dropdown-container loading-dropdown';
        dropdown.setAttribute('data-field', fieldType);
        
        // Add loading content
        dropdown.innerHTML = `
            <div class="ai-dropdown-content">
                <div class="ai-dropdown-header">
                    <i class="material-icons">${
                        fieldType === 'collection' ? 'dataset' :
                        fieldType === 'location' ? 'place' : 'event'
                    }</i>
                    <span>Loading ${fieldType}...</span>
                </div>
                <div class="ai-loading-section">
                    <div class="ai-loading">
                        <i class="material-icons spinning">refresh</i>
                        Please wait...
                    </div>
                </div>
            </div>
        `;
        
        // Position and show the loading dropdown
        this.positionInlineDropdown(dropdown, triggerElement);
        
        // Add to the sidebar
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.appendChild(dropdown);
        } else {
            document.body.appendChild(dropdown);
        }
        
        // Store references
        this.currentDropdown = dropdown;
        this.currentField = fieldType;
        
        // Add active state to trigger element
        triggerElement.classList.add('dropdown-active');
        
        console.log(`⏳ Loading dropdown shown for: ${fieldType}`);
    }
    
    /**
     * Replace loading dropdown with actual content
     */
    replaceLoadingWithContent(dropdownContent, fieldType) {
        if (!this.currentDropdown) return;
        
        // Clear current content
        this.currentDropdown.innerHTML = '';
        
        // Add the real dropdown content
        this.currentDropdown.appendChild(dropdownContent);
        
        // Remove loading class
        this.currentDropdown.classList.remove('loading-dropdown');
        
        // Set up dropdown-specific event handlers
        this.setupDropdownHandlers(this.currentDropdown, fieldType);
        
        // Focus first interactive element
        const firstInput = this.currentDropdown.querySelector('input, button, [tabindex]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        console.log(`🔄 Loading dropdown replaced with content for: ${fieldType}`);
    }
    
    /**
     * Position the inline dropdown relative to the trigger element
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} trigger - Trigger element
     */
    positionInlineDropdown(dropdown, trigger) {
        const triggerRect = trigger.getBoundingClientRect();
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { left: 0, width: 360 };
        
        // Position dropdown
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${sidebarRect.left + 8}px`;
        dropdown.style.right = '8px';
        dropdown.style.top = `${triggerRect.bottom + 8}px`;
        dropdown.style.zIndex = '2500';
        dropdown.style.maxWidth = `${sidebarRect.width - 16}px`;
        dropdown.style.maxHeight = '400px';
        dropdown.style.overflowY = 'auto';
        
        // Add animation
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        dropdown.style.transition = 'all 0.3s ease';
        
        // Trigger animation
        setTimeout(() => {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        }, 10);
        
        console.log(`📍 Positioned inline dropdown relative to trigger`);
    }
    
    /**
     * Set up event handlers for dropdown interactions
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} fieldType - Field type
     */
    setupDropdownHandlers(dropdown, fieldType) {
        // Handle clicks within the dropdown
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Handle option selection for dates
            if (fieldType === 'date') {
                const option = e.target.closest('.ai-option');
                if (option && option.dataset.value) {
                    console.log(`📅 Date option clicked: ${option.dataset.value}`);
                    this.handleDateSelection(option.dataset.value);
                    this.closeCurrentDropdown();
                    return;
                }
                
                // Handle custom date button
                const customDateBtn = e.target.closest('#custom-date');
                if (customDateBtn) {
                    console.log('📅 Custom date button clicked');
                    this.handleCustomDate(dropdown);
                    return;
                }
                
                return; // Exit early for date dropdown
            }
            
            // Handle option selection for other types
            const option = e.target.closest('.ai-option');
            if (option) {
                this.handleOptionSelection(option, fieldType);
                return;
            }
            
            // Handle details button clicks
            const detailsBtn = e.target.closest('.ai-option-details');
            if (detailsBtn) {
                e.preventDefault();
                const collectionId = detailsBtn.dataset.collectionId;
                const collectionSource = detailsBtn.dataset.collectionSource;
                
                if (collectionId && this.aiSearchHelper.allAvailableCollections) {
                    const collection = this.aiSearchHelper.allAvailableCollections
                        .find(c => c.id === collectionId && c.source === collectionSource);
                    if (collection) {
                        this.aiSearchHelper.showCollectionDetails(collection);
                    }
                }
                return;
            }
            
            // Handle draw on map option
            const drawBtn = e.target.closest('#draw-location');
            if (drawBtn) {
                this.handleDrawLocation();
                return;
            }
            
            const pasteBtn = e.target.closest('#paste-geometry');
            if (pasteBtn) {
                this.handlePasteGeometry();
                return;
            }
            
            const customDateBtn = e.target.closest('#custom-date');
            if (customDateBtn) {
                this.handleCustomDate(dropdown);
                return;
            }
        });
        
        // Handle search input
        const searchInput = dropdown.querySelector('.ai-search-input');
        if (searchInput) {
            if (fieldType === 'collection') {
                searchInput.addEventListener('input', (e) => {
                    this.filterCollections(e.target.value, dropdown);
                });
            } else if (fieldType === 'location') {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchLocations(e.target.value, dropdown);
                    }, 300);
                });
            }
        }
        
        // Handle sliders and other inputs
        const slider = dropdown.querySelector('.ai-slider');
        if (slider) {
            const valueDisplay = dropdown.querySelector('#cloud-value');
            slider.addEventListener('input', () => {
                if (valueDisplay) {
                    valueDisplay.textContent = `${slider.value}%`;
                }
            });
        }
    }
    
    /**
     * Handle option selection from dropdown
     * @param {HTMLElement} option - Selected option element
     * @param {string} fieldType - Field type
     */
    handleOptionSelection(option, fieldType) {
        const value = option.dataset.value;
        
        switch (fieldType) {
            case 'collection':
                this.handleCollectionSelection(value, option);
                break;
            case 'location':
                if (value === 'everywhere') {
                    this.handleLocationSelection('everywhere', 'THE WORLD');
                }
                break;
            case 'date':
                this.handleDateSelection(value);
                break;
        }
        
        // Close dropdown after selection
        this.closeCurrentDropdown();
    }
    
    /**
     * Handle collection selection
     * @param {string} collectionId - Collection ID
     * @param {HTMLElement} option - Option element
     */
    handleCollectionSelection(collectionId, option) {
        if (collectionId === '') {
            // EVERYTHING mode
            this.updateSearchSummary('collection', 'EVERYTHING');
            this.aiSearchHelper.selectedCollection = '';
            this.aiSearchHelper.selectedCollectionSource = null;
        } else {
            // Specific collection
            const collectionTitle = option.querySelector('.ai-option-title').textContent;
            const collectionSource = option.dataset.source;
            
            this.updateSearchSummary('collection', collectionTitle.toUpperCase());
            this.aiSearchHelper.selectedCollection = collectionId;
            this.aiSearchHelper.selectedCollectionSource = collectionSource;
        }
        
        console.log(`🎯 Collection selected: ${collectionId || 'EVERYTHING'}`);
    }
    
    /**
     * Handle location selection
     * @param {string} location - Location value
     * @param {string} displayText - Display text
     */
    handleLocationSelection(location, displayText) {
        this.updateSearchSummary('location', displayText);
        this.aiSearchHelper.selectedLocation = location;
        
        console.log(`📍 Location selected: ${location}`);
    }
    
    /**
     * Handle date selection
     * @param {string} dateType - Date type
     */
    handleDateSelection(dateType) {
        console.log(`📅 Handling date selection: ${dateType}`);
        
        let dateRange;
        let displayText;
        
        switch (dateType) {
            case 'anytime':
                dateRange = { start: null, end: null };
                displayText = 'ANYTIME';
                break;
            case 'thismonth':
                dateRange = this.calculateCurrentMonthRange();
                displayText = 'THIS MONTH';
                break;
            default:
                console.warn(`Unknown date preset: ${dateType}`);
                return;
        }
        
        // Update AI search helper state
        this.aiSearchHelper.selectedDate = {
            type: dateType,
            start: dateRange.start,
            end: dateRange.end,
            preset: dateType
        };
        
        // Update the sidebar summary
        this.updateSearchSummary('date', displayText);
        
        // Also update the actual form fields for compatibility
        if (dateRange.start && dateRange.end) {
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            if (startInput) startInput.value = dateRange.start;
            if (endInput) endInput.value = dateRange.end;
            
            // Trigger change events
            if (startInput) startInput.dispatchEvent(new Event('change'));
            if (endInput) endInput.dispatchEvent(new Event('change'));
        } else {
            // Clear date inputs for "anytime"
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
        }
        
        console.log(`✅ Date selected: ${dateType}`, this.aiSearchHelper.selectedDate);
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
            start: this.formatDateForInput(startOfMonth),
            end: this.formatDateForInput(endOfMonth)
        };
    }
    
    /**
     * Format date for input field (YYYY-MM-DD)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Handle draw location action
     */
    handleDrawLocation() {
        this.closeCurrentDropdown();
        
        if (this.mapManager) {
            this.mapManager.startDrawingBbox((bbox) => {
                this.aiSearchHelper.selectedLocation = bbox;
                this.updateSearchSummary('location', 'MAP SELECTION');
                
                this.notificationService.showNotification('Location drawn on map!', 'success');
            });
            
            this.notificationService.showNotification('Draw a bounding box on the map', 'info');
        }
    }
    
    /**
     * Handle paste geometry action
     */
    handlePasteGeometry() {
        this.closeCurrentDropdown();
        
        this.notificationService.showNotification(
            '📋 Paste WKT or GeoJSON anywhere - it will be detected automatically!', 
            'info'
        );
        
        // Set up paste listener temporarily
        const pasteHandler = (event) => {
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');
            
            if (pastedText && pastedText.trim()) {
                const geometryResult = this.aiSearchHelper.parseGeometry(pastedText.trim());
                
                if (geometryResult) {
                    this.aiSearchHelper.handlePastedGeometry(geometryResult, pastedText);
                    this.updateSearchSummary('location', 'CUSTOM GEOMETRY');
                    
                    // Remove the temporary listener
                    document.removeEventListener('paste', pasteHandler);
                }
            }
        };
        
        document.addEventListener('paste', pasteHandler);
        
        // Clean up listener after 30 seconds
        setTimeout(() => {
            document.removeEventListener('paste', pasteHandler);
        }, 30000);
    }
    
    /**
     * Handle custom date range
     * @param {HTMLElement} dropdown - Dropdown container
     */
    handleCustomDate(dropdown) {
        console.log('📅 Showing custom date section');
        
        const customSection = dropdown.querySelector('#custom-date-section');
        if (customSection) {
            customSection.style.display = 'block';
            
            // Focus on start date input
            const startInput = dropdown.querySelector('#date-start');
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
            
            // Set up smart date picker flow
            this.setupSmartDateFlow(dropdown);
            
            // Set up apply button
            const applyBtn = dropdown.querySelector('#apply-date-range');
            if (applyBtn) {
                // Remove existing handlers
                const newApplyBtn = applyBtn.cloneNode(true);
                applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
                
                newApplyBtn.addEventListener('click', () => {
                    this.applyCustomDateRange(dropdown);
                });
                
                console.log('✅ Custom date apply button set up');
            }
        }
    }
    
    /**
     * Set up smart date picker flow
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupSmartDateFlow(dropdown) {
        const startInput = dropdown.querySelector('#date-start');
        const endInput = dropdown.querySelector('#date-end');
        
        if (startInput && endInput) {
            // When start date is selected, automatically focus end date
            startInput.addEventListener('change', () => {
                if (startInput.value) {
                    console.log(`📅 Start date set to: ${startInput.value}`);
                    
                    // Set minimum date for end input
                    endInput.min = startInput.value;
                    
                    // Focus end date picker after short delay
                    setTimeout(() => {
                        endInput.focus();
                        if (endInput.showPicker) {
                            try {
                                endInput.showPicker();
                            } catch (e) {
                                console.log('End date picker not available');
                            }
                        }
                    }, 200);
                }
            });
            
            // Clear minimum when start date is cleared
            startInput.addEventListener('input', () => {
                if (!startInput.value) {
                    endInput.min = '';
                }
            });
            
            // Auto-apply when both dates are selected
            endInput.addEventListener('change', () => {
                if (startInput.value && endInput.value) {
                    console.log(`📅 Both dates selected, auto-applying`);
                    setTimeout(() => {
                        this.applyCustomDateRange(dropdown);
                    }, 500);
                }
            });
            
            console.log('✅ Smart date picker flow set up');
        }
    }
    
    /**
     * Apply custom date range
     * @param {HTMLElement} dropdown - Dropdown container
     */
    applyCustomDateRange(dropdown) {
        console.log('📅 Applying custom date range');
        
        const startInput = dropdown.querySelector('#date-start');
        const endInput = dropdown.querySelector('#date-end');
        
        if (startInput && endInput && startInput.value && endInput.value) {
            // Validate date range
            const startDate = new Date(startInput.value);
            const endDate = new Date(endInput.value);
            
            if (startDate > endDate) {
                this.notificationService.showNotification('⚠️ Start date must be before end date', 'warning');
                return;
            }
            
            // Update AI search helper state
            this.aiSearchHelper.selectedDate = {
                type: 'custom',
                start: startInput.value,
                end: endInput.value,
                preset: null
            };
            
            // Create display text
            const dateText = `${startInput.value} to ${endInput.value}`;
            
            // Update sidebar summary
            this.updateSearchSummary('date', dateText.toUpperCase());
            
            // Update the actual form fields for compatibility
            const globalStartInput = document.getElementById('date-start');
            const globalEndInput = document.getElementById('date-end');
            if (globalStartInput) globalStartInput.value = startInput.value;
            if (globalEndInput) globalEndInput.value = endInput.value;
            
            // Trigger change events
            if (globalStartInput) globalStartInput.dispatchEvent(new Event('change'));
            if (globalEndInput) globalEndInput.dispatchEvent(new Event('change'));
            
            console.log(`✅ Custom date range applied: ${dateText}`);
            
            // Close dropdown
            this.closeCurrentDropdown();
            
            // Show success notification
            this.notificationService.showNotification(`📅 Date range set: ${dateText}`, 'success');
        } else {
            this.notificationService.showNotification('⚠️ Please select both start and end dates', 'warning');
        }
    }
    
    /**
     * Filter collections in dropdown
     * @param {string} query - Search query
     * @param {HTMLElement} dropdown - Dropdown container
     */
    filterCollections(query, dropdown) {
        const options = dropdown.querySelectorAll('.ai-option[data-value]');
        const normalizedQuery = query.toLowerCase();
        
        let visibleCount = 0;
        
        options.forEach(option => {
            const title = option.querySelector('.ai-option-title').textContent.toLowerCase();
            const subtitle = option.querySelector('.ai-option-subtitle').textContent.toLowerCase();
            const matches = title.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
            
            option.style.display = matches ? 'flex' : 'none';
            if (matches) visibleCount++;
        });
        
        // Update header count
        const header = dropdown.querySelector('.ai-dropdown-header span');
        if (header && query.trim()) {
            const total = this.aiSearchHelper.allAvailableCollections ? 
                         this.aiSearchHelper.allAvailableCollections.length : 0;
            header.textContent = `Search Results (${visibleCount} of ${total})`;
        }
    }
    
    /**
     * Search locations in dropdown
     * @param {string} query - Search query
     * @param {HTMLElement} dropdown - Dropdown container
     */
    searchLocations(query, dropdown) {
        const resultsContainer = dropdown.querySelector('#location-results');
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        resultsContainer.innerHTML = '<div class="ai-loading">Searching...</div>';
        
        this.aiSearchHelper.geocodingService.searchLocations(query, (results, error) => {
            if (error) {
                resultsContainer.innerHTML = '<div class="ai-error">Search failed</div>';
                return;
            }
            
            if (!results || results.length === 0) {
                resultsContainer.innerHTML = '<div class="ai-no-results">No results found</div>';
                return;
            }
            
            const resultItems = results.slice(0, 5).map(result => {
                return `
                    <div class="ai-location-result" 
                         data-bbox="${result.bbox ? result.bbox.join(',') : ''}" 
                         data-name="${result.formattedName}"
                         data-short-name="${result.shortName}">
                        <i class="material-icons">place</i>
                        <div class="ai-location-info">
                            <div class="ai-location-name">${result.formattedName}</div>
                            <div class="ai-location-category">${result.category}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            resultsContainer.innerHTML = resultItems;
            
            // Add click handlers
            resultsContainer.querySelectorAll('.ai-location-result').forEach(resultEl => {
                resultEl.addEventListener('click', () => {
                    const name = resultEl.dataset.name;
                    const shortName = resultEl.dataset.shortName;
                    const bbox = resultEl.dataset.bbox;
                    
                    if (bbox) {
                        this.aiSearchHelper.selectedLocation = bbox.split(',').map(Number);
                    }
                    
                    this.updateSearchSummary('location', (shortName || name).toUpperCase());
                    this.closeCurrentDropdown();
                });
            });
        });
    }
    
    /**
     * Update search summary display and emit URL state event
     * @param {string} fieldType - Field type to update
     * @param {string} value - New value to display
     */
    updateSearchSummary(fieldType, value) {
        let summaryElement = null;
        
        switch (fieldType) {
            case 'collection':
                summaryElement = document.querySelector('[data-field="collection"] .search-summary-value');
                break;
            case 'location':
                summaryElement = document.querySelector('[data-field="location"] .search-summary-value');  
                break;
            case 'date':
                summaryElement = document.querySelector('[data-field="date"] .search-summary-value');
                break;
        }
        
        if (summaryElement) {
            summaryElement.textContent = value;
            
            // Add brief highlight animation
            summaryElement.style.animation = 'highlight 0.5s ease-in-out';
            setTimeout(() => {
                summaryElement.style.animation = '';
            }, 500);
            
            console.log(`🔄 Updated search summary ${fieldType}: ${value}`);
            
            // Emit URL state change event
            this.emitStateChangeEvent();
        }
    }
    
    /**
     * Emit search parameter change event for URL state management
     */
    emitStateChangeEvent() {
        try {
            // Collect current state from AI search helper
            const currentState = {
                collection: this.aiSearchHelper.selectedCollection || null,
                collectionSource: this.aiSearchHelper.selectedCollectionSource || null,
                locationBbox: null,
                locationName: null,
                dateType: null,
                dateStart: null,
                dateEnd: null,
                cloudCover: this.aiSearchHelper.cloudCover || 20
            };
            
            // Location state
            if (this.aiSearchHelper.selectedLocation && this.aiSearchHelper.selectedLocation !== 'everywhere') {
                if (Array.isArray(this.aiSearchHelper.selectedLocation)) {
                    currentState.locationBbox = this.aiSearchHelper.selectedLocation;
                }
                
                if (this.aiSearchHelper.selectedLocationResult) {
                    currentState.locationName = this.aiSearchHelper.selectedLocationResult.shortName || 
                                              this.aiSearchHelper.selectedLocationResult.formattedName;
                    
                    // Include geometry if available
                    if (this.aiSearchHelper.selectedLocationResult.geojson) {
                        currentState.geometry = JSON.stringify(this.aiSearchHelper.selectedLocationResult.geojson);
                    }
                    if (this.aiSearchHelper.selectedLocationResult.originalText) {
                        currentState.geometry = this.aiSearchHelper.selectedLocationResult.originalText;
                    }
                }
            }
            
            // Date state
            if (this.aiSearchHelper.selectedDate && this.aiSearchHelper.selectedDate.type !== 'anytime') {
                currentState.dateType = this.aiSearchHelper.selectedDate.type;
                currentState.dateStart = this.aiSearchHelper.selectedDate.start;
                currentState.dateEnd = this.aiSearchHelper.selectedDate.end;
            }
            
            // Emit the event
            const event = new CustomEvent('searchParameterChanged', {
                detail: currentState,
                bubbles: true
            });
            
            document.dispatchEvent(event);
            
            console.log('📡 Emitted search parameter change event:', currentState);
            
        } catch (error) {
            console.error('❌ Error emitting state change event:', error);
        }
    }
    
    /**
     * Close current dropdown
     */
    closeCurrentDropdown() {
        if (this.currentDropdown) {
            // Animate out
            this.currentDropdown.style.opacity = '0';
            this.currentDropdown.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (this.currentDropdown && this.currentDropdown.parentNode) {
                    this.currentDropdown.parentNode.removeChild(this.currentDropdown);
                }
                this.currentDropdown = null;
            }, 200);
            
            // Remove active state from ALL trigger elements
            const activeItems = document.querySelectorAll('.dropdown-active');
            activeItems.forEach(item => {
                item.classList.remove('dropdown-active');
                // Reset hover styles
                item.style.transform = 'translateX(0)';
                item.style.backgroundColor = 'transparent';
            });
            
            this.currentField = null;
            this.isLoading = false; // Reset loading state
            
            console.log('🚪 Closed inline dropdown');
        }
    }
    
    /**
     * Set up global event listeners
     */
    setupGlobalListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.currentDropdown && 
                !this.currentDropdown.contains(e.target) && 
                !e.target.closest('.search-summary-item')) {
                this.closeCurrentDropdown();
            }
        });
        
        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentDropdown) {
                this.closeCurrentDropdown();
            }
        });
        
        console.log('🎧 Global event listeners set up for inline dropdowns');
    }
}
