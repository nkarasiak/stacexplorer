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
        
        // Track current location layer for cleanup
        this.currentLocationLayerId = null;
        
        // Cache collections for performance
        this.collectionsCache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        // Initialize with default values
        this.aiSearchHelper.selectedDate = {
            type: 'anytime',
            start: null,
            end: null
        };
        
        // Update the search summary to show default values
        this.updateSearchSummary('date', 'ANYTIME');
        
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
            
            // Add hover effects using CSS classes only - no inline styles
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('dropdown-active')) {
                    // CSS handles the hover effects via :hover pseudo-class
                    // No need for JavaScript hover effects
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('dropdown-active')) {
                    // CSS handles the hover effects via :hover pseudo-class
                    // No need for JavaScript hover effects
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
            // IMPORTANT: Close any existing dropdown first with force cleanup
            this.forceCloseCurrentDropdown();
            
            // Prevent multiple dropdowns during loading with timeout fallback
            if (this.isLoading) {
                console.log('⏳ Already loading dropdown, attempting recovery...');
                // If loading state persists for more than 10 seconds, force reset
                if (!this.loadingStartTime || (Date.now() - this.loadingStartTime) > 10000) {
                    console.warn('⚠️ Loading state stuck, forcing reset...');
                    this.forceReset();
                } else {
                    return;
                }
            }
            
            console.log(`📋 Opening inline dropdown for: ${fieldType}`);
            this.isLoading = true;
            this.loadingStartTime = Date.now();
            
            // Set up automatic timeout to prevent stuck loading states
            this.loadingTimeout = setTimeout(() => {
                if (this.isLoading) {
                    console.warn('⚠️ Dropdown loading timeout, forcing reset...');
                    this.forceReset();
                    this.notificationService.showNotification('Dropdown loading timeout - please try again', 'warning');
                }
            }, 15000); // 15 second timeout
            
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
                    throw new Error(`Unknown field type: ${fieldType}`);
            }
            
            // Validate dropdown content
            if (!dropdownContent) {
                throw new Error(`Failed to create dropdown content for ${fieldType}`);
            }
            
            // Replace loading dropdown with actual content
            this.replaceLoadingWithContent(dropdownContent, fieldType);
            
            // Ensure dropdown is visible after content is loaded
            this.ensureDropdownVisible();
            
            console.log(`✅ Showed inline dropdown for: ${fieldType}`);
            
        } catch (error) {
            console.error(`❌ Error showing inline dropdown for ${fieldType}:`, error);
            this.notificationService.showNotification(`Error opening ${fieldType} options`, 'error');
            // Force cleanup on error
            this.forceReset();
        } finally {
            // Clear timeout and reset loading state
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            this.isLoading = false;
            this.loadingStartTime = null;
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
        
        // Add to document body for better positioning control
        document.body.appendChild(dropdown);
        
        // Add a debug class for easier identification
        dropdown.classList.add('debug-inline-dropdown');
        
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
        
        // Force visibility check after content is added
        setTimeout(() => {
            this.ensureDropdownVisible();
        }, 50);
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
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        console.log(`📍 Positioning dropdown - Trigger:`, triggerRect);
        console.log(`📍 Positioning dropdown - Sidebar:`, sidebarRect);
        console.log(`📍 Positioning dropdown - Viewport: ${viewportWidth}x${viewportHeight}`);
        
        // Enhanced positioning logic
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '9999'; // Higher z-index
        dropdown.style.maxHeight = '400px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.borderRadius = '12px';
        dropdown.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        
        // Calculate positioning
        let left = sidebarRect.left + 8;
        let top = triggerRect.bottom + 8;
        let width = Math.max(sidebarRect.width - 16, 300); // Minimum width of 300px
        
        // Ensure dropdown stays within viewport bounds
        if (left + width > viewportWidth) {
            left = viewportWidth - width - 16;
        }
        
        if (left < 8) {
            left = 8;
            width = Math.min(width, viewportWidth - 16);
        }
        
        // Check if dropdown would go below viewport
        if (top + 400 > viewportHeight) {
            // Position above trigger instead
            top = triggerRect.top - 408; // 400px height + 8px gap
            if (top < 8) {
                // If still not enough space, position at viewport edge
                top = 8;
                dropdown.style.maxHeight = `${triggerRect.top - 16}px`;
            }
        }
        
        // Apply calculated positions
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.width = `${width}px`;
        
        // Make absolutely sure it's visible
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'visible';
        dropdown.style.pointerEvents = 'auto';
        
        // Add animation with more reliable approach
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px) scale(0.95)';
        dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        // Force reflow and trigger animation
        dropdown.offsetHeight; // Force reflow
        
        requestAnimationFrame(() => {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0) scale(1)';
        });
        
        console.log(`📍 Positioned inline dropdown at (${left}, ${top}) with size ${width}x${dropdown.style.maxHeight}`);
        
        // Debug: Check if dropdown is actually visible
        setTimeout(() => {
            const finalRect = dropdown.getBoundingClientRect();
            const isVisible = finalRect.width > 0 && finalRect.height > 0 && 
                            window.getComputedStyle(dropdown).display !== 'none' &&
                            window.getComputedStyle(dropdown).visibility !== 'hidden';
            
            console.log(`📍 Dropdown final position check:`, {
                rect: finalRect,
                visible: isVisible,
                display: window.getComputedStyle(dropdown).display,
                visibility: window.getComputedStyle(dropdown).visibility,
                opacity: window.getComputedStyle(dropdown).opacity,
                zIndex: window.getComputedStyle(dropdown).zIndex
            });
            
            if (!isVisible) {
                console.error('❌ Dropdown positioned but not visible! Check for CSS conflicts.');
            }
        }, 100);
    }
    
    /**
     * Ensure dropdown is visible - fallback method for when normal positioning fails
     */
    ensureDropdownVisible() {
        if (!this.currentDropdown) return;
        
        setTimeout(() => {
            const dropdown = this.currentDropdown;
            if (!dropdown) return;
            
            const rect = dropdown.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(dropdown);
            
            const isVisible = rect.width > 0 && rect.height > 0 && 
                            computedStyle.display !== 'none' &&
                            computedStyle.visibility !== 'hidden' &&
                            parseFloat(computedStyle.opacity) > 0;
            
            if (!isVisible) {
                console.warn('⚠️ Dropdown not visible, applying fallback positioning...');
                
                // Fallback positioning - center on screen
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                dropdown.style.position = 'fixed';
                dropdown.style.top = '20%';
                dropdown.style.left = '50%';
                dropdown.style.transform = 'translateX(-50%)';
                dropdown.style.width = '320px';
                dropdown.style.maxWidth = 'calc(100vw - 32px)';
                dropdown.style.maxHeight = '60vh';
                dropdown.style.zIndex = '99999';
                dropdown.style.display = 'block';
                dropdown.style.visibility = 'visible';
                dropdown.style.opacity = '1';
                dropdown.style.pointerEvents = 'auto';
                dropdown.style.backgroundColor = 'var(--md-surface, #1e1e1e)';
                dropdown.style.border = '2px solid var(--md-primary, #2196F3)';
                dropdown.style.borderRadius = '12px';
                dropdown.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
                
                // Add a visible indicator that this is fallback positioning
                const existingIndicator = dropdown.querySelector('.fallback-indicator');
                if (!existingIndicator) {
                    const indicator = document.createElement('div');
                    indicator.className = 'fallback-indicator';
                    indicator.style.cssText = `
                        background: linear-gradient(45deg, #ff9800, #f57c00);
                        color: white;
                        padding: 4px 8px;
                        font-size: 11px;
                        font-weight: 600;
                        text-align: center;
                        border-radius: 4px 4px 0 0;
                    `;
                    indicator.textContent = 'DROPDOWN (FALLBACK POSITION)';
                    dropdown.insertBefore(indicator, dropdown.firstChild);
                }
                
                console.log('✅ Applied fallback positioning for dropdown visibility');
                
                // Show success notification
                if (this.notificationService) {
                    this.notificationService.showNotification(
                        `📝 ${this.currentField?.toUpperCase() || 'Dropdown'} menu opened`, 
                        'info'
                    );
                }
            } else {
                console.log('✅ Dropdown is properly visible');
            }
        }, 200);
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

            // Update the collection select element
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect) {
                collectionSelect.value = collectionId;
                collectionSelect.dispatchEvent(new Event('change'));
            }
        }
        
        console.log(`🎯 Collection selected: ${collectionId || 'EVERYTHING'}`);
    }
    
    /**
     * Handle location selection
     * @param {string} location - Location value
     * @param {string} displayText - Display text
     */
    handleLocationSelection(location, displayText) {
        // Update the search summary display
        this.updateSearchSummary('location', displayText);
        
        // If location is a bbox array, store it directly
        if (Array.isArray(location) && location.length === 4) {
            this.aiSearchHelper.selectedLocation = location;
        } else {
            // Otherwise, store the display text
            this.aiSearchHelper.selectedLocation = displayText;
        }
        
        // Update the bbox input
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput && Array.isArray(location) && location.length === 4) {
            bboxInput.value = location.join(',');
            bboxInput.dispatchEvent(new Event('change'));
        }
        
        // Close the dropdown after selection
        this.closeCurrentDropdown();
        
        // Show success notification
        this.notificationService.showNotification(`📍 Location selected: ${displayText}`, 'success');
        
        console.log(`📍 Location selected: ${displayText}`, location);
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
        const resultsContainer = dropdown.querySelector('.ai-location-results');
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }

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
                        </div>
                    </div>
                `;
            }).join('');
            
            resultsContainer.innerHTML = resultItems;
            
            // Add click handlers with enhanced functionality (same as fullscreen AI search)
            resultsContainer.querySelectorAll('.ai-location-result').forEach(resultEl => {
                resultEl.addEventListener('click', () => {
                    this.handleLocationSelectionEnhanced(resultEl, query);
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
                    
                    // Include geometry and query data if available
                    const locationResult = this.aiSearchHelper.selectedLocationResult;
                    
                    // Include WKT geometry if available
                    if (locationResult.wkt) {
                        currentState.geometry = locationResult.wkt;
                    }
                    
                    // Include original search query
                    if (locationResult.originalQuery || locationResult.searchQuery) {
                        currentState.locationQuery = locationResult.originalQuery || locationResult.searchQuery;
                    }
                    
                    // Include GeoJSON if available
                    if (locationResult.geojson) {
                        currentState.geojson = JSON.stringify(locationResult.geojson);
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
     * Close current dropdown with enhanced error handling
     */
    closeCurrentDropdown() {
        try {
            if (this.currentDropdown) {
                // Animate out if possible
                try {
                    this.currentDropdown.style.opacity = '0';
                    this.currentDropdown.style.transform = 'translateY(-10px)';
                } catch (styleError) {
                    console.warn('⚠️ Error setting animation styles:', styleError);
                }
                
                // Remove dropdown after animation or immediately on error
                const removeDropdown = () => {
                    try {
                        if (this.currentDropdown && this.currentDropdown.parentNode) {
                            this.currentDropdown.parentNode.removeChild(this.currentDropdown);
                        }
                    } catch (removeError) {
                        console.warn('⚠️ Error removing dropdown from DOM:', removeError);
                    }
                    this.currentDropdown = null;
                };
                
                // Try animated removal, but fallback to immediate removal
                try {
                    setTimeout(removeDropdown, 200);
                } catch (timeoutError) {
                    removeDropdown(); // Immediate removal if setTimeout fails
                }
            }
            
            // Remove active state from ALL trigger elements
            try {
                const activeItems = document.querySelectorAll('.dropdown-active');
                activeItems.forEach(item => {
                    try {
                        item.classList.remove('dropdown-active');
                        // Reset hover styles
                        item.style.transform = 'translateX(0)';
                        item.style.backgroundColor = 'transparent';
                    } catch (itemError) {
                        console.warn('⚠️ Error resetting item styles:', itemError);
                    }
                });
            } catch (cleanupError) {
                console.warn('⚠️ Error cleaning up active items:', cleanupError);
            }
            
            // Always reset these states
            this.currentField = null;
            this.isLoading = false;
            this.loadingStartTime = null;
            
            // Clear any pending timeouts
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            console.log('🚪 Closed inline dropdown successfully');
            
        } catch (error) {
            console.error('❌ Error closing dropdown, forcing reset:', error);
            this.forceReset();
        }
    }
    
    /**
     * Force close current dropdown without animations - more aggressive cleanup
     */
    forceCloseCurrentDropdown() {
        try {
            // Immediately remove dropdown without animation
            if (this.currentDropdown) {
                try {
                    if (this.currentDropdown.parentNode) {
                        this.currentDropdown.parentNode.removeChild(this.currentDropdown);
                    }
                } catch (removeError) {
                    console.warn('⚠️ Error force removing dropdown:', removeError);
                }
                this.currentDropdown = null;
            }
            
            // Force cleanup active states
            try {
                const activeItems = document.querySelectorAll('.dropdown-active');
                activeItems.forEach(item => {
                    item.classList.remove('dropdown-active');
                    item.style.transform = '';
                    item.style.backgroundColor = '';
                });
            } catch (cleanupError) {
                console.warn('⚠️ Error in force cleanup:', cleanupError);
            }
            
            // Reset all states
            this.currentField = null;
            this.isLoading = false;
            this.loadingStartTime = null;
            
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            console.log('🚪 Force closed dropdown');
            
        } catch (error) {
            console.error('❌ Critical error in force close, using nuclear reset:', error);
            this.forceReset();
        }
    }
    
    /**
     * Nuclear option: force reset everything to clean state
     */
    forceReset() {
        try {
            console.warn('🔄 Executing force reset of dropdown manager...');
            
            // Clear all timeouts
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Remove all dropdown elements forcefully
            try {
                const allDropdowns = document.querySelectorAll('.inline-dropdown-container, .debug-inline-dropdown');
                allDropdowns.forEach(dropdown => {
                    try {
                        if (dropdown.parentNode) {
                            dropdown.parentNode.removeChild(dropdown);
                        }
                    } catch (removeError) {
                        console.warn('⚠️ Error removing dropdown in reset:', removeError);
                    }
                });
            } catch (findError) {
                console.warn('⚠️ Error finding dropdowns to remove:', findError);
            }
            
            // Clear all active states
            try {
                const allActiveItems = document.querySelectorAll('.dropdown-active');
                allActiveItems.forEach(item => {
                    item.classList.remove('dropdown-active');
                    item.style.cssText = ''; // Clear all inline styles
                });
            } catch (activeError) {
                console.warn('⚠️ Error clearing active states:', activeError);
            }
            
            // Reset all internal state
            this.currentDropdown = null;
            this.currentField = null;
            this.isLoading = false;
            this.loadingStartTime = null;
            
            console.log('✅ Force reset completed successfully');
            
        } catch (criticalError) {
            console.error('❌ Critical error in force reset - manual intervention may be required:', criticalError);
            // Last resort: just reset internal state
            this.currentDropdown = null;
            this.currentField = null;
            this.isLoading = false;
            this.loadingStartTime = null;
            this.loadingTimeout = null;
        }
    }
    
    /**
     * Set up global event listeners with enhanced error handling
     */
    setupGlobalListeners() {
        // Enhanced click outside handler
        this.globalClickHandler = (e) => {
            try {
                if (this.currentDropdown && 
                    !this.currentDropdown.contains(e.target) && 
                    !e.target.closest('.search-summary-item')) {
                    console.log('👆 Click outside detected, closing dropdown');
                    this.closeCurrentDropdown();
                }
            } catch (error) {
                console.warn('⚠️ Error in global click handler:', error);
                this.forceReset();
            }
        };
        
        // Enhanced escape key handler
        this.globalEscapeHandler = (e) => {
            try {
                if (e.key === 'Escape' && this.currentDropdown) {
                    console.log('⌨️ Escape key pressed, closing dropdown');
                    this.closeCurrentDropdown();
                }
            } catch (error) {
                console.warn('⚠️ Error in escape handler:', error);
                this.forceReset();
            }
        };
        
        // Enhanced page visibility handler - close dropdowns when page becomes hidden
        this.visibilityChangeHandler = () => {
            try {
                if (document.hidden && this.currentDropdown) {
                    console.log('👁️ Page hidden, closing dropdown');
                    this.forceCloseCurrentDropdown();
                }
            } catch (error) {
                console.warn('⚠️ Error in visibility handler:', error);
                this.forceReset();
            }
        };
        
        // Add all event listeners
        document.addEventListener('click', this.globalClickHandler, { passive: true });
        document.addEventListener('keydown', this.globalEscapeHandler, { passive: true });
        document.addEventListener('visibilitychange', this.visibilityChangeHandler, { passive: true });
        
        // Add window blur handler to close dropdowns when user switches tabs/windows
        this.windowBlurHandler = () => {
            try {
                if (this.currentDropdown) {
                    console.log('🪟 Window blur detected, closing dropdown');
                    this.forceCloseCurrentDropdown();
                }
            } catch (error) {
                console.warn('⚠️ Error in blur handler:', error);
                this.forceReset();
            }
        };
        
        window.addEventListener('blur', this.windowBlurHandler, { passive: true });
        
        console.log('🎧 Enhanced global event listeners set up for inline dropdowns');
    }
    
    /**
     * Clean up global event listeners
     */
    removeGlobalListeners() {
        try {
            if (this.globalClickHandler) {
                document.removeEventListener('click', this.globalClickHandler);
                this.globalClickHandler = null;
            }
            
            if (this.globalEscapeHandler) {
                document.removeEventListener('keydown', this.globalEscapeHandler);
                this.globalEscapeHandler = null;
            }
            
            if (this.visibilityChangeHandler) {
                document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
                this.visibilityChangeHandler = null;
            }
            
            if (this.windowBlurHandler) {
                window.removeEventListener('blur', this.windowBlurHandler);
                this.windowBlurHandler = null;
            }
            
            console.log('🧹 Global event listeners cleaned up');
        } catch (error) {
            console.warn('⚠️ Error cleaning up global listeners:', error);
        }
    }
    
    /**
     * Destroy the dropdown manager and clean up all resources
     */
    destroy() {
        try {
            console.log('🗑️ Destroying InlineDropdownManager...');
            
            // Force close any open dropdowns
            this.forceReset();
            
            // Remove all event listeners
            this.removeGlobalListeners();
            
            // Clear all timeouts
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Clear references
            this.apiClient = null;
            this.searchPanel = null;
            this.collectionManager = null;
            this.mapManager = null;
            this.notificationService = null;
            this.aiSearchHelper = null;
            
            console.log('✅ InlineDropdownManager destroyed successfully');
        } catch (error) {
            console.error('❌ Error destroying InlineDropdownManager:', error);
        }
    }
    
    /**
     * Handle enhanced location selection with map display and zoom (same as fullscreen AI search)
     * @param {HTMLElement} resultElement - Selected location result element
     * @param {string} originalQuery - Original search query
     */
    handleLocationSelectionEnhanced(resultElement, originalQuery) {
        try {
            const bbox = resultElement.dataset.bbox;
            const name = resultElement.dataset.name;
            const shortName = resultElement.dataset.shortName;
            const lat = parseFloat(resultElement.dataset.lat);
            const lon = parseFloat(resultElement.dataset.lon);
            const category = resultElement.dataset.category;
            
            console.log(`[LOCATION] Enhanced location selected: ${name}`, { bbox, lat, lon, category, originalQuery });
            
            // Store the location with complete information
            let locationBbox;
            if (bbox) {
                locationBbox = bbox.split(',').map(Number);
            } else {
                // Fallback: create a small bbox around the point
                const offset = 0.01; // ~1km
                locationBbox = [lon - offset, lat - offset, lon + offset, lat + offset];
            }
            
            // Create GeoJSON geometry for the location
            const [west, south, east, north] = locationBbox;
            const locationGeometry = {
                type: 'Feature',
                properties: {
                    name: name,
                    category: category,
                    query: originalQuery,
                    type: 'location_geometry'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south], 
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                }
            };
            
            // Store the location with complete information
            this.aiSearchHelper.selectedLocation = locationBbox;
            this.aiSearchHelper.selectedLocationResult = {
                formattedName: name,
                shortName: shortName,
                bbox: locationBbox,
                coordinates: [lon, lat],
                category: 'searched',
                originalQuery: originalQuery,
                searchQuery: originalQuery, // For URL state
                geojson: locationGeometry,
                wkt: this.geojsonToWKT(locationGeometry.geometry)
            };
            
            // Update the display
            this.updateSearchSummary('location', (shortName || name).toUpperCase());
            
            // Display location on map and zoom to it
            this.displayLocationOnMap(locationBbox, name, category, locationGeometry);
            
            // Close dropdown
            this.closeCurrentDropdown();
            
            // Show success notification
            this.notificationService.showNotification(
                `[LOCATION] Selected: ${shortName || name}`, 
                'success'
            );
            
            // Emit state change event to ensure all components are updated
            this.emitStateChangeEvent();
            
            console.log(`[SUCCESS] Enhanced location selection complete for: ${name}`);
            
        } catch (error) {
            console.error('[ERROR] Error in enhanced location selection:', error);
            this.notificationService.showNotification('Error selecting location', 'error');
        }
    }
    
    /**
     * Display location on map with geometry and zoom (same behavior as fullscreen AI search)
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @param {string} name - Location name
     * @param {string} category - Location category
     * @param {Object} locationGeometry - GeoJSON geometry
     */
    displayLocationOnMap(bbox, name, category, locationGeometry) {
        if (!this.mapManager || !bbox || bbox.length !== 4) {
            console.warn('[WARN] Cannot display location: missing mapManager or invalid bbox');
            return;
        }
        
        try {
            console.log(`[MAP] Displaying location "${name}" on map:`, bbox);
            
            // Clear any previous location geometry first
            this.clearPreviousLocationGeometry();
            
            // Generate unique layer ID
            const layerId = `inline-location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.currentLocationLayerId = layerId;
            
            // Use MapManager's addBeautifulGeometryLayer method directly
            if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                this.mapManager.addBeautifulGeometryLayer(locationGeometry, layerId);
                console.log(`[SUCCESS] Added beautiful geometry layer via MapManager: ${layerId}`);
            } else if (typeof this.mapManager.addGeoJsonLayer === 'function') {
                this.mapManager.addGeoJsonLayer(locationGeometry, layerId);
                console.log(`[SUCCESS] Added GeoJSON layer via MapManager: ${layerId}`);
            } else {
                // Fallback: add directly to map
                const map = this.mapManager.map || this.mapManager.getMap();
                if (map) {
                    // Add source
                    map.addSource(layerId, {
                        type: 'geojson',
                        data: locationGeometry
                    });
                    
                    // Add fill layer
                    map.addLayer({
                        id: `${layerId}-fill`,
                        type: 'fill',
                        source: layerId,
                        paint: {
                            'fill-color': '#2196F3',
                            'fill-opacity': 0.2
                        }
                    });
                    
                    // Add stroke layer
                    map.addLayer({
                        id: `${layerId}-stroke`,
                        type: 'line',
                        source: layerId,
                        paint: {
                            'line-color': '#2196F3',
                            'line-width': 2
                        }
                    });
                    
                    console.log(`[SUCCESS] Added geometry layer directly to map: ${layerId}`);
                }
            }
            
            // Zoom to the location bounds using MapManager method
            if (typeof this.mapManager.fitToBounds === 'function') {
                this.mapManager.fitToBounds(bbox);
            } else if (typeof this.mapManager.fitMapToBbox === 'function') {
                this.mapManager.fitMapToBbox(bbox);
            } else {
                // Fallback: fit bounds directly
                const map = this.mapManager.map || this.mapManager.getMap();
                if (map) {
                    const [west, south, east, north] = bbox;
                    map.fitBounds([[west, south], [east, north]], { 
                        padding: 50, 
                        maxZoom: 16,
                        duration: 1000 
                    });
                }
            }
            
            // Store the current layer for later cleanup
            this.currentLocationLayerId = layerId;
            
            console.log(`[SUCCESS] Location "${name}" successfully displayed and zoomed on map (Layer: ${layerId})`);
            
        } catch (mapError) {
            console.error('[ERROR] Error displaying location on map:', mapError);
            // Continue anyway - the location is still stored for search
        }
    }
    
    /**
     * Clear previous location geometry from the map
     */
    clearPreviousLocationGeometry() {
        if (!this.mapManager) {
            return;
        }
        
        try {
            console.log('[CLEANUP] Clearing previous location geometry using MapManager');
            
            // Use MapManager's built-in cleanup method
            if (typeof this.mapManager.removeCurrentLayer === 'function') {
                this.mapManager.removeCurrentLayer();
                console.log('[SUCCESS] Used MapManager.removeCurrentLayer()');
            } else if (typeof this.mapManager.clearAllThumbnails === 'function') {
                this.mapManager.clearAllThumbnails();
                console.log('[SUCCESS] Used MapManager.clearAllThumbnails()');
            }
            
            // Also clear any layers with our tracked ID if we have one
            if (this.currentLocationLayerId) {
                const map = this.mapManager.map || this.mapManager.getMap();
                if (map) {
                    // Find and remove all layers with this source ID or containing this ID
                    const layersToRemove = [];
                    
                    if (map.getStyle && map.getStyle()) {
                        const layers = map.getStyle().layers || [];
                        layers.forEach(layer => {
                            // Check if layer source matches or layer ID contains our ID
                            if (layer.source === this.currentLocationLayerId || 
                                layer.id.includes(this.currentLocationLayerId)) {
                                layersToRemove.push(layer.id);
                            }
                        });
                    }
                    
                    // Remove each found layer
                    layersToRemove.forEach(layerId => {
                        try {
                            if (map.getLayer(layerId)) {
                                map.removeLayer(layerId);
                                console.log(`[SUCCESS] Removed layer: ${layerId}`);
                            }
                        } catch (layerError) {
                            console.warn(`[WARN] Could not remove layer ${layerId}:`, layerError);
                        }
                    });
                    
                    // Remove the source
                    try {
                        if (map.getSource(this.currentLocationLayerId)) {
                            map.removeSource(this.currentLocationLayerId);
                            console.log(`[SUCCESS] Removed source: ${this.currentLocationLayerId}`);
                        }
                    } catch (sourceError) {
                        console.warn(`[WARN] Could not remove source:`, sourceError);
                    }
                }
            }
            
            this.currentLocationLayerId = null;
            console.log('[SUCCESS] Successfully cleared previous location geometry');
            
        } catch (error) {
            console.warn('[WARN] Error clearing previous location geometry:', error);
            this.currentLocationLayerId = null;
        }
    }
    
    /**
     * Convert GeoJSON geometry to WKT format
     * @param {Object} geometry - GeoJSON geometry
     * @returns {string} WKT string
     */
    geojsonToWKT(geometry) {
        try {
            if (!geometry || !geometry.type) {
                return null;
            }
            
            switch (geometry.type) {
                case 'Polygon':
                    if (geometry.coordinates && geometry.coordinates[0]) {
                        const coords = geometry.coordinates[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
                        return `POLYGON((${coords}))`;
                    }
                    break;
                case 'Point':
                    if (geometry.coordinates) {
                        return `POINT(${geometry.coordinates[0]} ${geometry.coordinates[1]})`;
                    }
                    break;
                // Add more geometry types as needed
            }
            
            return null;
        } catch (error) {
            console.warn('[WARN] Error converting GeoJSON to WKT:', error);
            return null;
        }
    }
}
