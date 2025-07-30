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
            <div class="dropdown-section date-dropdown-modern">
                <div class="date-presets-modern">
                    <button class="date-preset-btn-modern" data-preset="last-7-days">
                        <div class="preset-icon">
                            <i class="material-icons">today</i>
                        </div>
                        <div class="preset-content">
                            <span class="preset-title">Last 7 Days</span>
                            <span class="preset-desc">Past week</span>
                        </div>
                    </button>
                    <button class="date-preset-btn-modern" data-preset="last-30-days">
                        <div class="preset-icon">
                            <i class="material-icons">date_range</i>
                        </div>
                        <div class="preset-content">
                            <span class="preset-title">Last 30 Days</span>
                            <span class="preset-desc">Past month</span>
                        </div>
                    </button>
                    <button class="date-preset-btn-modern" data-preset="this-year">
                        <div class="preset-icon">
                            <i class="material-icons">calendar_today</i>
                        </div>
                        <div class="preset-content">
                            <span class="preset-title">This Year</span>
                            <span class="preset-desc">2025</span>
                        </div>
                    </button>
                    <button class="date-preset-btn-modern" data-preset="2024">
                        <div class="preset-icon">
                            <i class="material-icons">calendar_view_year</i>
                        </div>
                        <div class="preset-content">
                            <span class="preset-title">Year 2024</span>
                            <span class="preset-desc">Previous year</span>
                        </div>
                    </button>
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
        const presetButtons = dropdown.querySelectorAll('.date-preset-btn-modern');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.selectDatePreset(preset);
                this.dropdownCore.cleanupDropdown();
            });
        });
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
        console.log('[DATE INPUT] 🎯 selectDatePreset called with:', preset);
        
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
        
        console.log('[DATE INPUT] 📊 Selected date calculated:', this.selectedDate);
        
        // Update URL parameters directly
        console.log('[DATE INPUT] 1️⃣ Updating URL parameters...');
        this.updateURLParameters();
        
        // Update main form inputs first (these are used by forceRestoreDateInputs)
        console.log('[DATE INPUT] 2️⃣ Updating main form inputs...');
        this.updateMainFormInputs();
        
        // Update the display immediately
        console.log('[DATE INPUT] 3️⃣ Updating display...');
        this.updateDateDisplay();
        
        // Trigger search parameter change
        console.log('[DATE INPUT] 4️⃣ Triggering search parameter change...');
        this.triggerSearchParameterChange();
        
        // Final direct update to visible inputs after a small delay
        setTimeout(() => {
            console.log('[DATE INPUT] 5️⃣ Final direct update to visible inputs...');
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
                console.log('[DATE INPUT] ✅ Final input values set:', { 
                    start: startInput.value, 
                    end: endInput.value 
                });
            }
        }, 50);
        
        console.log('[DATE INPUT] ✅ Date preset selection complete:', preset, this.selectedDate);
    }

    /**
     * Update URL parameters directly
     */
    updateURLParameters() {
        const url = new URL(window.location);
        
        if (this.selectedDate.type === 'anytime') {
            url.searchParams.delete('ds');
            url.searchParams.delete('de');
        } else {
            if (this.selectedDate.start) {
                url.searchParams.set('ds', this.selectedDate.start);
            }
            if (this.selectedDate.end) {
                url.searchParams.set('de', this.selectedDate.end);
            }
        }
        
        window.history.pushState({}, '', url);
        console.log('[DATE INPUT] 🔗 URL updated with parameters:', { 
            ds: url.searchParams.get('ds'), 
            de: url.searchParams.get('de') 
        });
    }

    /**
     * Update date display in UI
     */
    updateDateDisplay() {
        console.log('[DATE INPUT] 🔄 updateDateDisplay called with:', this.selectedDate);
        
        // Instead of trying to update existing inputs, recreate them with correct values
        this.recreateMiniDateInputs();
        
        // Update the search summary display
        this.updateSearchSummaryDateDisplay();
    }

    /**
     * Recreate mini date inputs with the correct values
     */
    recreateMiniDateInputs() {
        const summaryValueDiv = document.querySelector('[data-field="date"] .search-summary-value');
        if (!summaryValueDiv) {
            console.warn('[DATE INPUT] ⚠️ Summary value div not found');
            return;
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        let startValue, endValue;
        if (this.selectedDate.type === 'anytime') {
            startValue = '';
            endValue = '';
        } else {
            startValue = this.selectedDate.start || '';
            endValue = this.selectedDate.end || '';
        }
        
        console.log('[DATE INPUT] 🔧 Recreating mini date inputs with:', { startValue, endValue });
        
        // Recreate the mini date inputs HTML with simple text inputs
        summaryValueDiv.innerHTML = `
            <div class="mini-date-inputs" id="mini-date-container">
                <input type="text" id="summary-start-date" class="mini-date-input" placeholder="YYYY-MM-DD" maxlength="10" value="${startValue}">
                <span class="date-separator">to</span>
                <input type="text" id="summary-end-date" class="mini-date-input" placeholder="YYYY-MM-DD" maxlength="10" value="${endValue}">
            </div>
        `;
        
        // Re-attach event handlers for the new inputs
        this.attachMiniDateInputHandlers();
        
        // Get references to the new inputs and verify they have the correct values
        const startInput = document.getElementById('summary-start-date');
        const endInput = document.getElementById('summary-end-date');
        
        console.log('[DATE INPUT] ✅ Mini date inputs recreated with values:', { 
            actualStartValue: startInput?.value,
            actualEndValue: endInput?.value
        });
        
        // Force a visual update
        if (startInput && endInput) {
            // Trigger change events to ensure all systems are in sync
            startInput.dispatchEvent(new Event('change', { bubbles: true }));
            endInput.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
                startInput.focus();
                startInput.blur();
                endInput.focus();
                endInput.blur();
                console.log('[DATE INPUT] 🔄 Forced visual refresh');
            }, 50);
        }
        
        // Check values again after a short delay to see if something is overriding them
        setTimeout(() => {
            console.log('[DATE INPUT] 🔍 Values after 500ms:', {
                startValue: document.getElementById('summary-start-date')?.value,
                endValue: document.getElementById('summary-end-date')?.value,
                startHTML: document.getElementById('summary-start-date')?.outerHTML,
                endHTML: document.getElementById('summary-end-date')?.outerHTML
            });
        }, 500);
    }

    /**
     * Attach event handlers to mini date inputs
     */
    attachMiniDateInputHandlers() {
        const startDateInput = document.getElementById('summary-start-date');
        const endDateInput = document.getElementById('summary-end-date');
        
        if (!startDateInput || !endDateInput) return;
        
        // Setup simple input listeners for both inputs
        this.setupSimpleDateInputListeners(startDateInput);
        this.setupSimpleDateInputListeners(endDateInput);
    }

    /**
     * Setup simple date input listeners with YYYY-MM-DD formatting
     */
    setupSimpleDateInputListeners(input) {
        // Input event for typing with YYYY-MM-DD formatting
        input.addEventListener('input', (e) => {
            const formatted = this.formatDateInput(e.target.value);
            e.target.value = formatted;
            
            // Validate
            if (formatted.length === 10 && this.isValidDateFormat(formatted)) {
                e.target.classList.remove('error');
                this.syncToMainForm();
            } else if (formatted.length === 10) {
                e.target.classList.add('error');
            } else {
                e.target.classList.remove('error');
            }
        });
        
        // Change event to sync with main form
        input.addEventListener('change', () => {
            this.syncToMainForm();
        });
    }

    /**
     * Format input as YYYY-MM-DD while typing
     */
    formatDateInput(input) {
        let value = input.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length >= 4) {
            value = value.substring(0, 4) + '-' + value.substring(4);
        }
        if (value.length >= 7) {
            value = value.substring(0, 7) + '-' + value.substring(7, 9);
        }
        
        return value;
    }

    /**
     * Validate date format YYYY-MM-DD
     */
    isValidDateFormat(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        // Check if it's a valid date
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
    }

    /**
     * Sync summary inputs to main form inputs
     */
    syncToMainForm() {
        const startInput = document.getElementById('summary-start-date');
        const endInput = document.getElementById('summary-end-date');
        const formStartInput = document.getElementById('date-start');
        const formEndInput = document.getElementById('date-end');
        
        if (startInput && endInput && formStartInput && formEndInput) {
            formStartInput.value = startInput.value;
            formEndInput.value = endInput.value;
            
            // Update URL parameters
            const url = new URL(window.location);
            if (startInput.value) {
                url.searchParams.set('ds', startInput.value);
            } else {
                url.searchParams.delete('ds');
            }
            if (endInput.value) {
                url.searchParams.set('de', endInput.value);
            } else {
                url.searchParams.delete('de');
            }
            window.history.pushState({}, '', url);
            
            // Trigger search parameter change event
            document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                detail: {
                    type: 'date',
                    dateType: 'custom',
                    dateStart: startInput.value,
                    dateEnd: endInput.value
                }
            }));
        }
    }


    /**
     * Update main form inputs (date-start and date-end)
     */
    updateMainFormInputs() {
        const startInput = document.getElementById('date-start');
        const endInput = document.getElementById('date-end');
        
        if (startInput && endInput) {
            if (this.selectedDate.type === 'anytime') {
                startInput.value = '';
                endInput.value = '';
            } else {
                startInput.value = this.selectedDate.start || '';
                endInput.value = this.selectedDate.end || '';
            }
            
            // Trigger change events to notify other components
            startInput.dispatchEvent(new Event('change'));
            endInput.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Update search summary date display
     */
    updateSearchSummaryDateDisplay() {
        const summaryDateElement = document.querySelector('#summary-date .search-summary-value');
        
        if (summaryDateElement) {
            if (this.selectedDate.type === 'anytime') {
                summaryDateElement.textContent = 'Anytime';
            } else if (this.selectedDate.start && this.selectedDate.end) {
                const startDate = new Date(this.selectedDate.start);
                const endDate = new Date(this.selectedDate.end);
                const startFormatted = startDate.toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric' 
                });
                const endFormatted = endDate.toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric' 
                });
                summaryDateElement.textContent = `${startFormatted} to ${endFormatted}`.toUpperCase();
            }
        }
    }

    /**
     * Trigger search parameter change event
     */
    triggerSearchParameterChange() {
        // Trigger search parameter change event
        document.dispatchEvent(new CustomEvent('searchParameterChanged', {
            detail: {
                type: 'date',
                dateType: this.selectedDate.type === 'anytime' ? 'anytime' : 'custom',
                dateStart: this.selectedDate.start,
                dateEnd: this.selectedDate.end
            }
        }));
    }

    /**
     * Sync UI inputs from URL parameters (this overrides any competing systems)
     */
    syncUIFromURL() {
        console.log('[DATE INPUT] 🔗 Syncing UI from URL...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const dateStart = urlParams.get('ds');  // Using 'ds' parameter
        const dateEnd = urlParams.get('de');    // Using 'de' parameter
        
        console.log('[DATE INPUT] 🔗 URL params found:', { ds: dateStart, de: dateEnd });
        
        if (dateStart || dateEnd) {
            // Update the mini input fields
            const startInput = document.getElementById('summary-start-date');
            const endInput = document.getElementById('summary-end-date');
            
            if (startInput && endInput) {
                if (dateStart) startInput.value = dateStart;
                if (dateEnd) endInput.value = dateEnd;
                console.log('[DATE INPUT] 🔗 UI inputs synced from URL:', { 
                    startValue: startInput.value, 
                    endValue: endInput.value 
                });
            } else {
                console.warn('[DATE INPUT] 🔗 UI inputs not found for URL sync');
            }
        } else {
            console.log('[DATE INPUT] 🔗 No date parameters in URL to sync');
        }
    }

    /**
     * Set up persistent preset handler
     */
    setupPersistentPresetHandler() {
        console.log('[DATE INPUT] 🎛️ Setting up persistent preset handlers...');
        
        // Handle mini preset buttons
        const presetButtons = document.querySelectorAll('.preset-mini-btn');
        console.log('[DATE INPUT] 🔘 Found preset buttons:', presetButtons.length, Array.from(presetButtons).map(btn => btn.id));
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('[DATE INPUT] 🖱️ Preset button clicked:', btn.id, btn.dataset);
                e.stopPropagation();
                
                // Remove active class from all preset buttons and add to clicked one
                document.querySelectorAll('.preset-mini-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (btn.dataset.days) {
                    const days = parseInt(btn.dataset.days);
                    const preset = days === 7 ? 'last-7-days' : 'last-30-days';
                    console.log('[DATE INPUT] 📅 Calling selectDatePreset with:', preset);
                    this.selectDatePreset(preset);
                } else if (btn.dataset.year) {
                    const year = btn.dataset.year;
                    const preset = year === 'current' ? 'this-year' : year;
                    console.log('[DATE INPUT] 📅 Calling selectDatePreset with:', preset);
                    this.selectDatePreset(preset);
                }
            });
        });
        
        console.log('[DATE INPUT] ✅ Preset handlers set up');
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
     * Update search summary display
     * @param {string} category - The category to update (collection, location, date)
     * @param {string} displayName - The display name to show
     */
    updateSearchSummary(category, displayName) {
        let elementId;
        
        switch (category) {
            case 'collection':
                elementId = 'summary-source';
                break;
            case 'location':
                elementId = 'summary-location';
                break;
            case 'date':
                elementId = 'summary-date';
                break;
            default:
                console.warn('Unknown search summary category:', category);
                return;
        }
        
        const element = document.getElementById(elementId);
        if (element) {
            const valueElement = element.querySelector('.search-summary-value');
            if (valueElement) {
                valueElement.textContent = displayName;
            }
        }
    }

    /**
     * Ensure data source is selected (compatibility method)
     */
    async ensureDataSourceSelected() {
        return true; // Simplified implementation
    }
}