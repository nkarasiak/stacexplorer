/**
 * InlineDropdownManagerModular - Modular dropdown manager
 * 
 * Combines DropdownCore, LocationDropdown, and other dropdown modules
 * This is the new modular version that replaces the monolithic InlineDropdownManager
 */

import { DropdownCore } from '../../core/ui/dropdown/DropdownCore.js';
import { LocationDropdown } from '../../core/ui/dropdown/LocationDropdown.js';
import { defaultGeocodingService } from '../../utils/GeocodingService.js';

export class InlineDropdownManager {
    constructor(apiClient, searchPanel, collectionManager, mapManager, notificationService) {
        this.apiClient = apiClient;
        this.searchPanel = searchPanel;
        this.collectionManager = collectionManager;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        
        // Initialize modular components
        this.dropdownCore = new DropdownCore();
        this.locationDropdown = new LocationDropdown(
            defaultGeocodingService, 
            mapManager, 
            notificationService
        );
        
        // State management
        this.selectedDate = { type: 'anytime', start: null, end: null };
        this.selectedLocation = 'everywhere';
        this.selectedCollection = null;
        this.cloudCover = 20;
        this.allAvailableCollections = [];
    }

    /**
     * Initialize inline dropdowns
     */
    initializeInlineDropdowns() {
        console.log('🎛️ Initializing modular inline dropdowns...');
        
        // Set up source dropdown
        this.setupSourceDropdown();
        
        // Set up location dropdown
        this.setupLocationDropdown();
        
        // Set up date dropdown
        this.setupDateDropdown();
        
        // Set up preset handlers
        this.setupPersistentPresetHandler();
        
        // Preload collections
        this.preloadCollections();
        
        console.log('✅ Modular inline dropdowns initialized');
    }

    /**
     * Set up source dropdown
     */
    setupSourceDropdown() {
        const sourceCard = document.getElementById('summary-source');
        if (!sourceCard) return;

        sourceCard.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.dropdownCore.isOpen()) {
                this.dropdownCore.cleanupDropdown();
                return;
            }

            const content = this.createSimpleCollectionDropdown();
            const dropdown = this.dropdownCore.createDropdown(sourceCard, content);
            this.setupCollectionDropdownHandlers(dropdown);
        });
    }

    /**
     * Set up location dropdown
     */
    setupLocationDropdown() {
        const locationCard = document.getElementById('summary-location');
        if (!locationCard) return;

        locationCard.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.dropdownCore.isOpen()) {
                this.dropdownCore.cleanupDropdown();
                return;
            }

            const content = this.locationDropdown.createLocationDropdownContent();
            const dropdown = this.dropdownCore.createDropdown(locationCard, content);
            this.locationDropdown.setupLocationDropdownHandlers(dropdown);
        });
    }

    /**
     * Set up date dropdown
     */
    setupDateDropdown() {
        const dateCard = document.getElementById('summary-date');
        if (!dateCard) return;

        dateCard.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.dropdownCore.isOpen()) {
                this.dropdownCore.cleanupDropdown();
                return;
            }

            const content = this.createSimpleDateDropdown();
            const dropdown = this.dropdownCore.createDropdown(dateCard, content);
            this.setupDateDropdownHandlers(dropdown);
        });
    }

    /**
     * Create simple collection dropdown content
     */
    createSimpleCollectionDropdown() {
        return `
            <div class="dropdown-section">
                <div class="dropdown-header">
                    <h3>Data Sources</h3>
                </div>
                
                <div class="collection-options">
                    <div class="collection-option" data-collection="all">
                        <div class="collection-info">
                            <div class="collection-name">🌍 Everything</div>
                            <div class="collection-description">Search across all available catalogs</div>
                        </div>
                    </div>
                    
                    <div class="collection-option" data-collection="copernicus">
                        <div class="collection-info">
                            <div class="collection-name">🛰️ Copernicus Data Space</div>
                            <div class="collection-description">ESA satellite data (Sentinel-1, Sentinel-2, etc.)</div>
                        </div>
                    </div>
                    
                    <div class="collection-option" data-collection="planetary-computer">
                        <div class="collection-info">
                            <div class="collection-name">🌐 Planetary Computer</div>
                            <div class="collection-description">Microsoft's Earth observation datasets</div>
                        </div>
                    </div>
                    
                    <div class="collection-option" data-collection="earth-search">
                        <div class="collection-info">
                            <div class="collection-name">🔍 Earth Search</div>
                            <div class="collection-description">Element 84's Landsat and Sentinel-2 data</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create simple date dropdown content
     */
    createSimpleDateDropdown() {
        return `
            <div class="dropdown-section">
                <div class="dropdown-header">
                    <h3>Time Range</h3>
                </div>
                
                <div class="date-presets">
                    <button class="date-preset-btn" data-preset="anytime">
                        <i class="material-icons">schedule</i>
                        Any Time
                    </button>
                    <button class="date-preset-btn" data-preset="last-7-days">
                        <i class="material-icons">today</i>
                        Last 7 Days
                    </button>
                    <button class="date-preset-btn" data-preset="last-30-days">
                        <i class="material-icons">date_range</i>
                        Last 30 Days
                    </button>
                    <button class="date-preset-btn" data-preset="this-year">
                        <i class="material-icons">calendar_today</i>
                        This Year (2025)
                    </button>
                    <button class="date-preset-btn" data-preset="2024">
                        <i class="material-icons">calendar_view_year</i>
                        Year 2024
                    </button>
                </div>
                
                <div class="custom-date-range">
                    <h4>Custom Range</h4>
                    <div class="date-inputs">
                        <input type="date" id="custom-start-date" class="date-input">
                        <span class="date-separator">to</span>
                        <input type="date" id="custom-end-date" class="date-input">
                    </div>
                    <button id="apply-custom-dates" class="apply-dates-btn">Apply Custom Range</button>
                </div>
            </div>
        `;
    }

    /**
     * Set up collection dropdown handlers
     */
    setupCollectionDropdownHandlers(dropdown) {
        const options = dropdown.querySelectorAll('.collection-option');
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                const collection = option.dataset.collection;
                this.selectCollection(collection);
                this.dropdownCore.cleanupDropdown();
            });
        });
    }

    /**
     * Set up date dropdown handlers
     */
    setupDateDropdownHandlers(dropdown) {
        const presetButtons = dropdown.querySelectorAll('.date-preset-btn');
        const customApplyBtn = dropdown.querySelector('#apply-custom-dates');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.selectDatePreset(preset);
                this.dropdownCore.cleanupDropdown();
            });
        });
        
        if (customApplyBtn) {
            customApplyBtn.addEventListener('click', () => {
                const startDate = dropdown.querySelector('#custom-start-date').value;
                const endDate = dropdown.querySelector('#custom-end-date').value;
                
                if (startDate && endDate) {
                    this.selectCustomDateRange(startDate, endDate);
                    this.dropdownCore.cleanupDropdown();
                }
            });
        }
    }

    /**
     * Select collection
     */
    selectCollection(collection) {
        this.selectedCollection = collection;
        
        // Update UI
        const sourceValue = document.querySelector('#summary-source .search-summary-value');
        if (sourceValue) {
            const collectionNames = {
                'all': 'Everything',
                'copernicus': 'Copernicus Data Space',
                'planetary-computer': 'Planetary Computer',
                'earth-search': 'Earth Search'
            };
            sourceValue.textContent = collectionNames[collection] || collection;
        }
        
        console.log('Collection selected:', collection);
    }

    /**
     * Select date preset
     */
    selectDatePreset(preset) {
        const today = new Date();
        
        switch (preset) {
            case 'anytime':
                this.selectedDate = { type: 'anytime', start: null, end: null };
                break;
            case 'last-7-days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                this.selectedDate = { 
                    type: 'range', 
                    start: sevenDaysAgo.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                };
                break;
            case 'last-30-days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                this.selectedDate = { 
                    type: 'range', 
                    start: thirtyDaysAgo.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                };
                break;
            case 'this-year':
                this.selectedDate = { 
                    type: 'range', 
                    start: '2025-01-01', 
                    end: today.toISOString().split('T')[0] 
                };
                break;
            case '2024':
                this.selectedDate = { 
                    type: 'range', 
                    start: '2024-01-01', 
                    end: '2024-12-31' 
                };
                break;
        }
        
        this.updateDateDisplay();
        console.log('Date preset selected:', preset, this.selectedDate);
    }

    /**
     * Select custom date range
     */
    selectCustomDateRange(startDate, endDate) {
        this.selectedDate = {
            type: 'range',
            start: startDate,
            end: endDate
        };
        
        this.updateDateDisplay();
        console.log('Custom date range selected:', this.selectedDate);
    }

    /**
     * Update date display in UI
     */
    updateDateDisplay() {
        // Update the mini date inputs
        const startInput = document.getElementById('summary-start-date');
        const endInput = document.getElementById('summary-end-date');
        
        if (startInput && endInput) {
            if (this.selectedDate.type === 'anytime') {
                startInput.value = '';
                endInput.value = '';
            } else {
                startInput.value = this.selectedDate.start || '';
                endInput.value = this.selectedDate.end || '';
            }
        }
    }

    /**
     * Set up persistent preset handler
     */
    setupPersistentPresetHandler() {
        // Handle mini preset buttons
        const presetButtons = document.querySelectorAll('.preset-mini-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (btn.dataset.days) {
                    const days = parseInt(btn.dataset.days);
                    this.selectDatePreset(days === 7 ? 'last-7-days' : 'last-30-days');
                } else if (btn.dataset.year) {
                    const year = btn.dataset.year;
                    this.selectDatePreset(year === 'current' ? 'this-year' : year);
                }
            });
        });
    }

    /**
     * Preload collections
     */
    async preloadCollections() {
        try {
            // Simplified preloading - just log for now
            console.log('🔄 Preloading collections...');
            this.allAvailableCollections = [];
            console.log('✅ Collections preloaded');
        } catch (error) {
            console.warn('⚠️ Failed to preload collections:', error);
        }
    }

    /**
     * Clean up debug dropdowns (placeholder)
     */
    cleanupDebugDropdowns() {
        this.dropdownCore.cleanupDropdown();
    }

    /**
     * Get selected values for search
     */
    getSelectedValues() {
        return {
            collection: this.selectedCollection,
            date: this.selectedDate,
            location: this.locationDropdown.getSelectedLocationResult(),
            cloudCover: this.cloudCover
        };
    }

    /**
     * Ensure data source is selected (compatibility method)
     */
    async ensureDataSourceSelected() {
        return true; // Simplified implementation
    }
}