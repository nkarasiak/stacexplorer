/**
 * InlineDropdownManagerRefactored.js - Refactored dropdown manager using modular components
 * Coordinates between different dropdown handlers and manages overall dropdown state
 */

import { PresetButtonHandler } from './PresetButtonHandler.js';
import { SearchSummaryManager } from './SearchSummaryManager.js';
import { DropdownRenderer } from './DropdownRenderer.js';
import { defaultGeocodingService } from '../../utils/GeocodingService.js';

export class InlineDropdownManagerRefactored {
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        // Component references
        this.apiClient = apiClient;
        this.searchPanel = searchPanel;
        this.collectionManager = collectionManager;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        
        // State management
        this.currentDropdown = null;
        this.currentFieldType = null;
        this.isLoading = false;
        
        // Initialize modular components
        this.searchSummaryManager = new SearchSummaryManager();
        this.dropdownRenderer = new DropdownRenderer();
        
        // Initialize preset button handler with bound methods
        this.presetButtonHandler = new PresetButtonHandler(
            notificationService,
            this.searchSummaryManager.updateSearchSummary.bind(this.searchSummaryManager),
            this.formatDateForInput.bind(this),
            this.formatDateDisplay.bind(this)
        );
        
        // Initialize default state
        this.currentDateSelection = {
            type: 'anytime',
            start: null,
            end: null
        };
        
        // Set default search summary values
        this.searchSummaryManager.resetToDefaults();
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.setupGlobalEventHandlers();
        
        // Pre-load collections in background
        setTimeout(() => this.preloadCollections(), 1000);
    }
    
    /**
     * Initialize event listeners for search summary items
     */
    initializeEventListeners() {
        // Use event delegation to avoid conflicts with existing HTML setup
        document.addEventListener('click', (e) => {
            // Check if the click is on a search summary item that should trigger dropdowns
            const summaryItem = e.target.closest('.search-summary-item[data-field]');
            if (!summaryItem) return;
            
            // Skip if this is handled by existing inline scripts (collections) or new inline date inputs (date)
            const field = summaryItem.dataset.field;
            if (field === 'collection' || field === 'date') return;
            
            // Prevent reopening immediately after preset selection
            if (this.presetButtonHandler.isPresetJustSelected()) {
                return;
            }
            
            // Don't open dropdown if clicking on specific UI elements
            if (e.target.closest('.ai-preset-btn') || 
                e.target.closest('.flatpickr-calendar') || 
                e.target.closest('.ai-dropdown-container') ||
                e.target.closest('.location-action-btn') ||
                e.target.closest('.source-mini-btn')) {
                return;
            }
            
            // Handle location and date dropdowns
            if (field === 'location' || field === 'date') {
                e.preventDefault();
                e.stopPropagation();
                this.showDropdown(field, summaryItem);
            }
        }, true); // Use capture phase
        
        // Also expose this manager to global scope for backward compatibility
        if (!window.stacExplorer) window.stacExplorer = {};
        window.stacExplorer.inlineDropdownManager = this;
    }
    
    /**
     * Show dropdown for a specific field
     * @param {string} fieldType - Type of field ('collection', 'location', 'date')
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    async showDropdown(fieldType, triggerElement) {
        try {
            // Close any existing dropdown
            this.closeCurrentDropdown();
            
            // Prevent multiple dropdowns during loading
            if (this.isLoading) return;
            
            this.isLoading = true;
            this.currentFieldType = fieldType;
            
            // Create appropriate dropdown content
            let content = '';
            switch (fieldType) {
                case 'date':
                    // Date dropdown removed - using inline date inputs instead
                    console.log('Date dropdown disabled - using inline date inputs');
                    return;
                case 'collection':
                    content = await this.createCollectionDropdownHTML();
                    break;
                case 'location':
                    content = await this.createLocationDropdownHTML();
                    break;
                default:
                    throw new Error(`Unknown field type: ${fieldType}`);
            }
            
            // Create and show dropdown
            this.currentDropdown = this.dropdownRenderer.createDropdown(fieldType, triggerElement, content);
            
            // Initialize dropdown functionality
            this.initializeDropdownHandlers(fieldType);
            
            // Mark trigger as active
            triggerElement.classList.add('dropdown-active');
            
        } catch (error) {
            console.error(`Error showing dropdown for ${fieldType}:`, error);
            this.notificationService.showNotification(`Error opening ${fieldType} options`, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Initialize handlers for the current dropdown
     * @param {string} fieldType - Type of dropdown
     */
    initializeDropdownHandlers(fieldType) {
        if (!this.currentDropdown) return;
        
        switch (fieldType) {
            case 'date':
                // Date dropdown removed - no initialization needed
                break;
            case 'collection':
                this.initializeCollectionDropdown(this.currentDropdown);
                break;
            case 'location':
                this.initializeLocationDropdown(this.currentDropdown);
                break;
        }
        
        // Setup close button
        const closeButton = this.currentDropdown.querySelector('.ai-dropdown-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeCurrentDropdown();
            });
        }
    }
    
    /**
     * Close current dropdown
     */
    closeCurrentDropdown() {
        if (this.currentDropdown) {
            // Cleanup any field-specific functionality
            if (this.currentFieldType === 'date') {
                this.dateDropdownHandler.cleanup();
            }
            
            // Remove active state from trigger
            const activeTrigger = document.querySelector('.search-summary-item.dropdown-active');
            if (activeTrigger) {
                activeTrigger.classList.remove('dropdown-active');
            }
            
            // Close dropdown with animation
            this.dropdownRenderer.closeDropdown();
            
            this.currentDropdown = null;
            this.currentFieldType = null;
        }
    }
    
    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentDropdown) {
                this.closeCurrentDropdown();
            }
        });
        
        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (this.currentDropdown && 
                !e.target.closest('.ai-dropdown-container') && 
                !e.target.closest('.search-summary-item')) {
                this.closeCurrentDropdown();
            }
        });
        
        // Listen for custom close events
        document.addEventListener('closeDropdown', () => {
            this.closeCurrentDropdown();
        });
        
        // Handle window blur (user switches tabs/windows)
        window.addEventListener('blur', () => {
            this.closeCurrentDropdown();
        });
    }
    
    /**
     * Pre-load collections in background for faster dropdowns
     */
    async preloadCollections() {
        try {
            if (this.collectionManager && this.collectionManager.getAllCollections) {
                await this.collectionManager.getAllCollections();
            }
        } catch (error) {
            // Silent fail for background preloading
        }
    }
    
    /**
     * Create collection dropdown HTML (simplified version)
     * @returns {string} HTML for collection dropdown
     */
    async createCollectionDropdownHTML() {
        return `
            <div class="ai-dropdown-container ai-collection-dropdown" style="display: none;">
                <div class="ai-dropdown-header">
                    <span class="ai-dropdown-title">
                        <i class="material-icons">layers</i>
                        Select Collection
                    </span>
                    <button class="ai-dropdown-close" type="button">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="ai-dropdown-content">
                    <div class="ai-option" data-value="all">
                        <span>All Collections</span>
                    </div>
                    <!-- Collection options would be populated here -->
                </div>
            </div>
        `;
    }
    
    /**
     * Create location dropdown HTML (simplified version)
     * @returns {string} HTML for location dropdown
     */
    async createLocationDropdownHTML() {
        return `
            <div class="ai-dropdown-container ai-location-dropdown" style="display: none;">
                <div class="ai-dropdown-header">
                    <span class="ai-dropdown-title">
                        <i class="material-icons">location_on</i>
                        Select Location
                    </span>
                    <button class="ai-dropdown-close" type="button">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="ai-dropdown-content">
                    <input type="text" class="ai-search-input" placeholder="Search for a location...">
                    <div class="ai-option" data-value="everywhere">
                        <span>Everywhere</span>
                    </div>
                    <!-- Location results would be populated here -->
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize collection dropdown (placeholder)
     */
    initializeCollectionDropdown(dropdown) {
        // Simplified implementation
        const options = dropdown.querySelectorAll('.ai-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                this.searchSummaryManager.updateSearchSummary('collection', option.textContent.trim());
                this.closeCurrentDropdown();
            });
        });
    }
    
    /**
     * Initialize location dropdown (placeholder)
     */
    initializeLocationDropdown(dropdown) {
        // Simplified implementation
        const options = dropdown.querySelectorAll('.ai-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                this.searchSummaryManager.updateSearchSummary('location', option.textContent.trim());
                this.closeCurrentDropdown();
            });
        });
    }
    
    /**
     * Update search summary (proxy to SearchSummaryManager)
     * @param {string} fieldType - Field type to update
     * @param {string} value - New value to display
     */
    updateSearchSummary(fieldType, value) {
        this.searchSummaryManager.updateSearchSummary(fieldType, value);
    }
    
    /**
     * Handle date selection (for compatibility with app.js)
     * @param {string} presetValue - Preset value to handle
     */
    handleDateSelection(presetValue) {
        // Date dropdown removed - using inline date inputs instead
        console.log('Date selection handled by inline inputs:', presetValue);
    }
    
    /**
     * Open Flatpickr calendar (for compatibility with app.js)
     */
    openFlatpickrCalendar() {
        // Date dropdown removed - inline date inputs handle calendar functionality
        console.log('Calendar functionality handled by inline date inputs');
    }
    
    /**
     * Format date for input field (YYYY-MM-DD)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Format date for display (MMM DD, YYYY)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateDisplay(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}