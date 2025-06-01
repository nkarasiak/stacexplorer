/**
 * InlineDropdownManager.js - Manages inline dropdowns for left menu items
 * Provides streamlined dropdown experience without opening fullscreen interface
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
        
        // Initialize event listeners
        this.initializeInlineDropdowns();
        this.setupGlobalListeners();
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
                item.style.transform = 'translateX(4px)';
                item.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateX(0)';
                item.style.backgroundColor = 'transparent';
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
            // Close any existing dropdown
            this.closeCurrentDropdown();
            
            console.log(`📋 Opening inline dropdown for: ${fieldType}`);
            
            // Ensure AI search helper has collections loaded
            await this.aiSearchHelper.ensureDataSourceSelected();
            
            // Create dropdown content based on field type
            let dropdownContent;
            
            switch (fieldType) {
                case 'collection':
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
                    return;
            }
            
            // Create inline dropdown container
            const dropdown = document.createElement('div');
            dropdown.className = 'inline-dropdown-container';
            dropdown.setAttribute('data-field', fieldType);
            
            // Add the dropdown content
            dropdown.appendChild(dropdownContent);
            
            // Position the dropdown relative to the trigger element
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
            
            // Set up dropdown-specific event handlers
            this.setupDropdownHandlers(dropdown, fieldType);
            
            // Add active state to trigger element
            triggerElement.classList.add('dropdown-active');
            
            // Focus first interactive element
            const firstInput = dropdown.querySelector('input, button, [tabindex]');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log(`✅ Showed inline dropdown for: ${fieldType}`);
            
        } catch (error) {
            console.error(`❌ Error showing inline dropdown for ${fieldType}:`, error);
            this.notificationService.showNotification(`Error opening ${fieldType} options`, 'error');
        }
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
            
            // Handle option selection
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
            
            // Handle special buttons
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
        const dateRange = this.aiSearchHelper.calculateDateRange(dateType);
        
        this.aiSearchHelper.selectedDate = {
            type: dateType,
            start: dateRange.start,
            end: dateRange.end,
            preset: dateType
        };
        
        const displayText = dateType === 'anytime' ? 'ANYTIME' : 
                          this.aiSearchHelper.getEnhancedDateDisplayText().toUpperCase();
        
        this.updateSearchSummary('date', displayText);
        
        console.log(`📅 Date selected: ${dateType}`);
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
        const customSection = dropdown.querySelector('#custom-date-section');
        if (customSection) {
            customSection.style.display = 'block';
            
            // Set up apply button
            const applyBtn = dropdown.querySelector('#apply-date-range');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const startInput = dropdown.querySelector('#date-start');
                    const endInput = dropdown.querySelector('#date-end');
                    
                    if (startInput && endInput && startInput.value && endInput.value) {
                        this.aiSearchHelper.selectedDate = {
                            type: 'custom',
                            start: startInput.value,
                            end: endInput.value,
                            preset: null
                        };
                        
                        const dateText = `${startInput.value} to ${endInput.value}`;
                        this.updateSearchSummary('date', dateText.toUpperCase());
                        
                        this.closeCurrentDropdown();
                    }
                });
            }
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
     * Update search summary display
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
            
            // Remove active state from trigger elements
            const activeItems = document.querySelectorAll('.dropdown-active');
            activeItems.forEach(item => item.classList.remove('dropdown-active'));
            
            this.currentField = null;
            
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
