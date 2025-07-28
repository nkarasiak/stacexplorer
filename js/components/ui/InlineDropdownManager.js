/**
 * InlineDropdownManager.js - Manages inline dropdowns for left menu items
 * Provides streamlined dropdown experience without opening fullscreen interface
 * OPTIMIZED VERSION - Fast loading, single dropdown, no fullscreen interference
 */

import { defaultGeocodingService } from '../../utils/GeocodingService.js';
import { isWKT, wktToGeoJSON, isGeoJSON, parseGeoJSON } from '../../utils/GeometryUtils.js';

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
        
        // Flag to temporarily disable click-outside detection
        this.temporarilyDisableClickOutside = false;
        
        // Create a simple helper object to replace AI search functionality
        this.aiSearchHelper = {
            selectedDate: { type: 'anytime', start: null, end: null },
            selectedLocation: 'everywhere',
            selectedLocationResult: null,
            selectedCollection: null,
            selectedCollectionSource: null,
            cloudCover: 20,
            allAvailableCollections: [],
            geocodingService: defaultGeocodingService,
            async ensureDataSourceSelected() {
                // Simple implementation - just return true
                return true;
            },
            createCollectionDropdown() {
                return this.createSimpleCollectionDropdown();
            },
            createDateDropdown() {
                return this.createSimpleDateDropdown();
            },
            showCollectionDetails(collection) {
                // Simple implementation - just log for now
            },
            parseGeometry(text) {
                if (!text || typeof text !== 'string') {
                    return null;
                }
                
                const trimmedText = text.trim();
                
                // Check if it's WKT format
                if (isWKT(trimmedText)) {
                    const geoJSON = wktToGeoJSON(trimmedText);
                    if (geoJSON) {
                        return {
                            type: 'WKT',
                            originalText: trimmedText,
                            geoJSON: geoJSON,
                            format: 'WKT'
                        };
                    }
                }
                
                // Check if it's GeoJSON format
                if (isGeoJSON(trimmedText)) {
                    const geoJSON = parseGeoJSON(trimmedText);
                    if (geoJSON) {
                        return {
                            type: 'GeoJSON',
                            originalText: trimmedText,
                            geoJSON: geoJSON,
                            format: 'GeoJSON'
                        };
                    }
                }
                
                return null;
            },
            handlePastedGeometry(geometryResult, originalText) {
                // Update the selected location to indicate custom geometry
                this.selectedLocation = 'custom';
                const displayText = `${geometryResult.format.toUpperCase()} geometry`;
                this.selectedLocationResult = {
                    display_name: displayText,
                    shortName: displayText,
                    formattedName: displayText,
                    geometry: geometryResult.geoJSON,
                    bbox: this.extractBboxFromGeometry(geometryResult.geoJSON),
                    wkt: geometryResult.format === 'WKT' ? originalText : null
                };
                
            },
            extractBboxFromGeometry(geoJSON) {
                // Simple bbox extraction - this could be enhanced
                if (!geoJSON || !geoJSON.geometry) {
                    return null;
                }
                
                const geometry = geoJSON.geometry;
                if (!geometry.coordinates) {
                    return null;
                }
                
                // For simple cases, extract from coordinates
                let coords = [];
                const extractCoords = (coordArray) => {
                    if (Array.isArray(coordArray[0])) {
                        coordArray.forEach(extractCoords);
                    } else {
                        coords.push(coordArray);
                    }
                };
                
                extractCoords(geometry.coordinates);
                
                if (coords.length === 0) {
                    return null;
                }
                
                let minLng = coords[0][0], maxLng = coords[0][0];
                let minLat = coords[0][1], maxLat = coords[0][1];
                
                coords.forEach(coord => {
                    minLng = Math.min(minLng, coord[0]);
                    maxLng = Math.max(maxLng, coord[0]);
                    minLat = Math.min(minLat, coord[1]);
                    maxLat = Math.max(maxLat, coord[1]);
                });
                
                return [minLng, minLat, maxLng, maxLat];
            }
        };
        
        // Bind methods to maintain proper context
        this.aiSearchHelper.createCollectionDropdown = this.createSimpleCollectionDropdown.bind(this);
        this.aiSearchHelper.createDateDropdown = this.createSimpleDateDropdown.bind(this);
        this.aiSearchHelper.showCollectionDetails = this.showCollectionDetails.bind(this);
        this.aiSearchHelper.parseGeometry = this.aiSearchHelper.parseGeometry.bind(this.aiSearchHelper);
        this.aiSearchHelper.handlePastedGeometry = this.aiSearchHelper.handlePastedGeometry.bind(this.aiSearchHelper);
        this.aiSearchHelper.extractBboxFromGeometry = this.aiSearchHelper.extractBboxFromGeometry.bind(this.aiSearchHelper);
        
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
        this.updateSearchSummary('date', 'Anytime');
        
        // Initialize persistent preset button handler (survives DOM updates)
        this.setupPersistentPresetHandler();
        
        // Clean up any leftover debug dropdowns first
        this.cleanupDebugDropdowns();
        
        // Initialize event listeners
        this.initializeInlineDropdowns();
        this.setupGlobalListeners();
        this.interceptMapDrawing();
        
        // Pre-load collections in background
        setTimeout(() => this.preloadCollections(), 1000);
        
        // Add global cleanup function for debugging
        window.cleanupDebugDropdowns = () => this.cleanupDebugDropdowns();
    }
    
    /**
     * Clean up any leftover debug dropdowns from previous sessions
     */
    cleanupDebugDropdowns() {
        try {
            // Remove any leftover debug dropdowns or inline dropdown containers
            const debugDropdowns = document.querySelectorAll('.debug-inline-dropdown, .inline-dropdown-container');
            debugDropdowns.forEach(dropdown => {
                try {
                    if (dropdown.parentNode) {
                        dropdown.parentNode.removeChild(dropdown);
                        console.log('🧹 Removed leftover debug dropdown');
                    }
                } catch (error) {
                    console.warn('⚠️ Error removing debug dropdown:', error);
                }
            });
        } catch (error) {
            console.warn('⚠️ Error in cleanupDebugDropdowns:', error);
        }
    }
    
    /**
     * Setup persistent event handler for preset buttons using event delegation
     * This survives DOM updates and re-initialization
     */
    setupPersistentPresetHandler() {
        // Use event delegation on document to catch all preset button clicks
        document.addEventListener('click', (e) => {
            // Check if clicked element is a preset button (either dropdown or mini preset buttons)
            const presetBtn = e.target.closest('.ai-preset-btn, .preset-mini-btn');
            if (!presetBtn) return;
            
            // Prevent default and stop propagation
            e.preventDefault();
            e.stopPropagation();
            
            // Handle different preset types
            let startDate, endDate;
            
            if (presetBtn.dataset.days) {
                const days = parseInt(presetBtn.dataset.days);
                if (isNaN(days)) return;
                
                // Calculate dates (going back in time for mini buttons, forward for dropdown buttons)
                if (presetBtn.classList.contains('preset-mini-btn')) {
                    // Mini buttons go back in time
                    endDate = new Date();
                    startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                } else {
                    // Dropdown buttons go forward in time (existing behavior)
                    startDate = new Date();
                    endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                }
            } else if (presetBtn.dataset.year) {
                const year = presetBtn.dataset.year;
                
                if (year === 'current') {
                    const currentYear = new Date().getFullYear();
                    startDate = new Date(currentYear, 0, 1); // January 1st
                    endDate = new Date(currentYear, 11, 31); // December 31st
                } else {
                    const yearNum = parseInt(year);
                    if (isNaN(yearNum)) return;
                    
                    startDate = new Date(yearNum, 0, 1); // January 1st
                    endDate = new Date(yearNum, 11, 31); // December 31st
                }
            } else {
                return; // No valid preset data
            }
            
            // Format dates
            const startDateStr = this.formatDateForInput(startDate);
            const endDateStr = this.formatDateForInput(endDate);
            
            // Update form inputs immediately
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            if (startInput) startInput.value = startDateStr;
            if (endInput) endInput.value = endDateStr;
            
            // Update mini date fields if they exist
            const summaryStartInput = document.getElementById('summary-start-date');
            const summaryEndInput = document.getElementById('summary-end-date');
            if (summaryStartInput) summaryStartInput.value = startDateStr;
            if (summaryEndInput) summaryEndInput.value = endDateStr;
            
            // Add visual feedback for mini preset buttons
            if (presetBtn.classList.contains('preset-mini-btn')) {
                // Remove active class from all preset mini buttons and add to clicked one
                document.querySelectorAll('.preset-mini-btn').forEach(btn => btn.classList.remove('active'));
                presetBtn.classList.add('active');
            }
            
            // Close any open dropdown immediately
            if (this.currentDropdown) {
                this.forceCloseCurrentDropdown();
            }
            
            // Set flag to prevent reopening
            this.presetJustSelected = true;
            
            // Delay search summary update and events
            setTimeout(() => {
                // Update search summary
                const dateRange = `${this.formatDateDisplay(startDate)} to ${this.formatDateDisplay(endDate)}`;
                this.updateSearchSummary('date', dateRange.toUpperCase());
                
                // Trigger search parameter change event
                document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                    detail: {
                        type: 'date',
                        dateType: 'custom',
                        dateStart: startDateStr,
                        dateEnd: endDateStr
                    }
                }));
                
                // Clear the prevention flag
                this.presetJustSelected = false;
            }, 300);
            
        }, true); // Use capture phase to ensure it runs first
    }
    
    /**
     * Pre-load collections in background for faster dropdowns
     */
    async preloadCollections() {
        try {
            await this.getCachedCollections();
        } catch (error) {
            console.warn('Failed to pre-load collections:', error);
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
            this.aiSearchHelper.allAvailableCollections = this.collectionsCache;
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
        
        // If collection manager is still loading, wait a bit and try again
        if (this.collectionManager && this.collectionManager.isLoadingCollections && this.collectionManager.isLoadingCollections()) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try again after waiting
            const managerCollections = this.collectionManager.getAllCollections();
            if (managerCollections && managerCollections.length > 0) {
                this.collectionsCache = managerCollections;
                this.cacheTimestamp = now;
                this.aiSearchHelper.allAvailableCollections = managerCollections;
                return managerCollections;
            }
        }
        
        console.warn('⚠️ No collections available from collection manager');
        return [];
    }
    
    /**
     * Intercept map drawing to prevent fullscreen interference
     */
    interceptMapDrawing() {
        if (!this.mapManager) return;
        
        
        // Store original method if it exists
        this.originalStartDrawing = this.mapManager.startDrawingBbox;
        
        // Flag to track drawing state
        this.isDrawingActive = false;
        
        // Override the drawing method
        this.mapManager.startDrawingBbox = (callback) => {
            
            // Set drawing active flag
            this.isDrawingActive = true;
            
            // AI search functionality removed
            
            // Call original method with our custom callback
            if (this.originalStartDrawing) {
                this.originalStartDrawing.call(this.mapManager, (bbox) => {
                    
                    // Reset drawing state
                    this.isDrawingActive = false;
                    
                    // Update location selection inline
                    this.handleDrawingComplete(bbox);
                    
                    // AI search functionality removed
                    
                    // Call original callback if provided
                    if (callback && typeof callback === 'function') {
                        callback(bbox);
                    }
                });
            }
        };
        
        // Also intercept any global drawing events that might trigger fullscreen
        this.interceptDrawingEvents();
        
    }
    
    // Simple dropdown creation methods to replace AI search functionality
    
    /**
     * Create a simple collection dropdown with search functionality
     */
    createSimpleCollectionDropdown() {
        // OLD DROPDOWN DISABLED - Using new modal collection browser instead
        // Return empty/invisible div to prevent old dropdown from appearing
        const container = document.createElement('div');
        container.style.display = 'none';
        return container;
    }
    
    /**
     * Group collections by source
     */
    groupCollectionsBySource(collections) {
        return collections.reduce((groups, collection) => {
            const source = collection.source || 'unknown';
            if (!groups[source]) {
                groups[source] = [];
            }
            groups[source].push(collection);
            return groups;
        }, {});
    }
    
    /**
     * Get source label for display
     */
    getSourceLabel(source) {
        const labels = {
            'copernicus': 'Copernicus',
            'element84': 'Element84',
            'planetary': 'Microsoft Planetary Computer',
            'unknown': 'Unknown Source'
        };
        return labels[source] || source;
    }
    
    
    
    
    
    
    
    
    

    
    /**
     * Create a simple date dropdown
     */
    createSimpleDateDropdown() {
        // Create the main dropdown container
        const container = document.createElement('div');
        container.className = 'ai-dropdown-content';
        
        // Add header with close button
        const header = document.createElement('div');
        header.className = 'ai-dropdown-header';
        header.innerHTML = `
            <div class="ai-dropdown-header-content">
                <i class="material-icons">calendar_today</i>
                <span>Select Date Range</span>
            </div>
            <button class="ai-dropdown-close" type="button">
                <i class="material-icons">close</i>
            </button>
        `;
        container.appendChild(header);
        
        // Add options section
        const optionsSection = document.createElement('div');
        optionsSection.className = 'ai-options-section';
        
        // Add preset options (removed Today and Last 7 days as requested)
        const presets = [
            { value: 'anytime', title: 'Anytime', description: 'No date restriction', icon: 'all_inclusive' },
            { value: 'last7days', title: 'Last 7 days', description: 'Past week including today', icon: 'view_week' },
            { value: 'last30days', title: 'Last 30 days', description: 'Past month including today', icon: 'calendar_month' },
            { value: 'custom', title: 'Custom range', description: 'Select dates or type manually (e.g., 2024-12-31 to 2025-01-30)', icon: 'date_range' }
        ];
        
        presets.forEach(preset => {
            const option = document.createElement('div');
            option.className = 'ai-option';
            option.setAttribute('data-type', 'date');
            option.setAttribute('data-value', preset.value);
            
            // Add ID for custom option
            if (preset.value === 'custom') {
                option.id = 'custom-date';
            }
            
            option.innerHTML = `
                <i class="material-icons">${preset.icon}</i>
                <div class="ai-option-content">
                    <div class="ai-option-title">${preset.title}</div>
                    <div class="ai-option-subtitle">${preset.description}</div>
                </div>
            `;
            optionsSection.appendChild(option);
        });
        
        // Note: Embedded calendar removed - we now use standalone popup calendar when clicking custom range
        
        container.appendChild(optionsSection);
        
        return container;
    }
    
    /**
     * Create HTML for Flatpickr calendar interface
     */
    createFlatpickrCalendarHTML() {
        return `
            <div class="ai-calendar-container">
                <div class="ai-calendar-header">
                    <h3>📅 Select Date Range</h3>
                    <p class="ai-calendar-subtitle">Choose dates for your search</p>
                </div>
                
                <div class="ai-flatpickr-wrapper">
                    <div class="ai-date-input-group">
                        <i class="material-icons">event</i>
                        <input type="text" 
                               id="flatpickr-date-range" 
                               class="ai-flatpickr-input" 
                               placeholder="Select date range or type YYYY-MM-DD to YYYY-MM-DD...">
                    </div>
                </div>
                
                <div class="ai-preset-buttons">
                    <div class="ai-preset-grid">
                        <button type="button" class="ai-preset-btn" data-days="1">
                            <i class="material-icons">today</i>
                            <span>1 Day</span>
                        </button>
                        <button type="button" class="ai-preset-btn" data-days="7">
                            <i class="material-icons">date_range</i>
                            <span>1 Week</span>
                        </button>
                        <button type="button" class="ai-preset-btn" data-days="30">
                            <i class="material-icons">calendar_month</i>
                            <span>1 Month</span>
                        </button>
                        <button type="button" class="ai-preset-btn" data-days="183">
                            <i class="material-icons">event_note</i>
                            <span>6 Months</span>
                        </button>
                    </div>
                </div>
                
                <div class="ai-calendar-actions">
                    <button type="button" id="calendar-apply-btn" class="ai-apply-btn">
                        <i class="material-icons">check</i>
                        Apply Date Range
                    </button>
                    <button type="button" id="calendar-clear-btn" class="ai-clear-btn">
                        <i class="material-icons">clear</i>
                        Clear Dates
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Format date for display
     */
    formatDateDisplay(date) {
        const options = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Initialize Flatpickr calendar functionality
     */
    initializeFlatpickrCalendar(calendarSection) {
        const dateRangeInput = calendarSection.querySelector('#flatpickr-date-range');
        const applyBtn = calendarSection.querySelector('#calendar-apply-btn');
        const clearBtn = calendarSection.querySelector('#calendar-clear-btn');
        const presetButtons = calendarSection.querySelectorAll('.ai-preset-btn');
        
        // Initialize Flatpickr
        const fp = flatpickr(dateRangeInput, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            // Fix: Start with current month, show previous month on left
            defaultDate: null, // Don't set default dates to avoid initial month jumping
            showMonths: 2,
            static: true,
            position: 'below',
            theme: 'dark',
            monthSelectorType: 'dropdown',
            yearSelectorType: 'dropdown',
            allowInput: true,
            disableMobile: true, // Fix: Prevent mobile layout issues
            // Don't pre-select any dates
            defaultDate: null,
            onReady: function(selectedDates, dateStr, instance) {
                instance.input.removeAttribute('readonly');
            },
            onChange: (selectedDates) => {
                if (selectedDates.length === 2) {
                    applyBtn.disabled = false;
                } else {
                    applyBtn.disabled = true;
                }
            },
            onReady: function() {
                // Set the view to 30 days ago without selecting dates
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                this.jumpToDate(thirtyDaysAgo, false); // Position view without triggering events
            }
        });
        
        // Store flatpickr instance for later use
        this.flatpickrInstance = fp;
        
        // Preset button functionality
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const days = parseInt(btn.dataset.days);
                const startDate = new Date();
                const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                
                fp.setDate([startDate, endDate]);
                
                // Update button states
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Get preset name from button text
                const presetName = btn.querySelector('span')?.textContent || `${days} Days`;
                
                // Immediately apply the selection and close
                const startDateStr = this.formatDateForInput(startDate);
                const endDateStr = this.formatDateForInput(endDate);
                
                // Update form inputs
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                if (startInput) startInput.value = startDateStr;
                if (endInput) endInput.value = endDateStr;
                
                // Close the dropdown immediately first
                cleanup();
                
                // Set flag to prevent dropdown from reopening
                this.presetJustSelected = true;
                
                // Delay all updates until after dropdown is completely closed
                setTimeout(() => {
                    // Update search summary
                    const dateRange = `${this.formatDateDisplay(startDate)} to ${this.formatDateDisplay(endDate)}`;
                    this.updateSearchSummary('date', dateRange.toUpperCase());
                    
                    // Trigger search parameter change event
                    document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                        detail: {
                            type: 'date',
                            dateType: 'custom',
                            dateStart: startDateStr,
                            dateEnd: endDateStr
                        }
                    }));
                    
                    // Dispatch date preset selected event for tutorial system
                    document.dispatchEvent(new CustomEvent('date-preset-selected', {
                        detail: { 
                            preset: `${days}days`,
                            presetName: presetName,
                            dateRange: {
                                start: startDateStr,
                                end: endDateStr
                            },
                            source: 'flatpickr-preset'
                        }
                    }));
                    
                    // Clear the prevention flag
                    this.presetJustSelected = false;
                }, 300);
            });
        });
        
        // Apply button functionality
        applyBtn.addEventListener('click', () => {
            const selectedDates = fp.selectedDates;
            
            if (selectedDates.length === 2) {
                const startDate = selectedDates[0].toISOString().split('T')[0];
                const endDate = selectedDates[1].toISOString().split('T')[0];
                
                // Update the AI search helper state
                this.aiSearchHelper.selectedDate = {
                    type: 'custom',
                    start: startDate,
                    end: endDate,
                    preset: null
                };
                
                // Update the regular form inputs
                const regularStartInput = document.getElementById('date-start');
                const regularEndInput = document.getElementById('date-end');
                if (regularStartInput) regularStartInput.value = startDate;
                if (regularEndInput) regularEndInput.value = endDate;
                
                // Update search summary
                const dateRange = `${this.formatDateDisplay(selectedDates[0])} to ${this.formatDateDisplay(selectedDates[1])}`;
                this.updateSearchSummary('date', dateRange.toUpperCase());
                
                // Trigger search parameter change event
                document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                    detail: {
                        type: 'date',
                        dateType: 'custom',
                        dateStart: startDate,
                        dateEnd: endDate
                    }
                }));
                
                // Close the dropdown
                this.closeCurrentDropdown();
                
            }
        });
        
        // Clear button functionality
        clearBtn.addEventListener('click', () => {
            fp.clear();
            presetButtons.forEach(b => b.classList.remove('active'));
            applyBtn.disabled = true;
        });
        
    }
    
    /**
     * Open a standalone Flatpickr calendar for custom date selection
     */
    openFlatpickrCalendar() {
        // DISABLED - Old flatpickr calendar system disabled in favor of inline date inputs
        console.log('🚫 Old Flatpickr calendar disabled - using inline date inputs');
        return;
        
        // Create a temporary input for Flatpickr
        const tempInput = document.createElement('input');
        tempInput.type = 'text';
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        
        // Create backdrop first
        const backdrop = document.createElement('div');
        backdrop.className = 'flatpickr-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        document.body.appendChild(backdrop);
        
        // Cleanup function
        const cleanup = () => {
            try {
                if (fp) fp.destroy();
                if (tempInput && tempInput.parentNode) document.body.removeChild(tempInput);
                if (backdrop && backdrop.parentNode) document.body.removeChild(backdrop);
            } catch (error) {
                console.warn('Calendar cleanup error:', error);
            }
        };
        
        // Initialize Flatpickr with inline mode for better visibility
        const fp = flatpickr(tempInput, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            inline: true,
            showMonths: 2,
            theme: 'dark',
            monthSelectorType: 'dropdown',
            yearSelectorType: 'dropdown',
            position: 'center',
            // Don't pre-select dates but position view to show previous month on left
            defaultDate: null,
            // Fix: Set fixed height to prevent resizing issues
            disableMobile: true,
            static: true,
            onReady: (selectedDates, dateStr, instance) => {
                // Position view to show previous month on left, current on right
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                instance.jumpToDate(thirtyDaysAgo, false);
                
                // Style the calendar container
                const calendarEl = instance.calendarContainer;
                calendarEl.style.position = 'fixed';
                calendarEl.style.top = '50%';
                calendarEl.style.left = '50%';
                // Fix: Set consistent height to prevent layout shifts
                calendarEl.style.height = 'auto';
                calendarEl.style.minHeight = '400px';
                calendarEl.style.maxHeight = '500px';
                calendarEl.style.transform = 'translate(-50%, -50%)';
                calendarEl.style.zIndex = '10000';
                calendarEl.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                calendarEl.style.borderRadius = '12px';
                
                // Add close button
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '<i class="material-icons">close</i>';
                closeBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: var(--danger-color, #ef4444);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10001;
                `;
                closeBtn.addEventListener('click', cleanup);
                calendarEl.appendChild(closeBtn);
            },
            onChange: (selectedDates, dateStr, instance) => {
                if (selectedDates.length === 2) {
                    // Get the date strings using local date components to avoid timezone conversion
                    const startDateStr = [
                        selectedDates[0].getFullYear(),
                        String(selectedDates[0].getMonth() + 1).padStart(2, '0'),
                        String(selectedDates[0].getDate()).padStart(2, '0')
                    ].join('-');
                    
                    const endDateStr = [
                        selectedDates[1].getFullYear(),
                        String(selectedDates[1].getMonth() + 1).padStart(2, '0'),
                        String(selectedDates[1].getDate()).padStart(2, '0')
                    ].join('-');
                    
                    // Create datetime strings in UTC to avoid timezone issues
                    const startDate = `${startDateStr}T00:00:00Z`;
                    const endDate = `${endDateStr}T23:59:59Z`;
                    
                    // Apply the date range immediately with full datetime
                    this.aiSearchHelper.selectedDate = {
                        type: 'custom',
                        start: startDate,
                        end: endDate,
                        preset: null
                    };
                    
                    // Update regular form inputs with date strings only
                    const regularStartInput = document.getElementById('date-start');
                    const regularEndInput = document.getElementById('date-end');
                    if (regularStartInput) regularStartInput.value = startDateStr;
                    if (regularEndInput) regularEndInput.value = endDateStr;
                    
                    // Update search summary
                    const dateRange = `${this.formatDateDisplay(selectedDates[0])} to ${this.formatDateDisplay(selectedDates[1])}`;
                    this.updateSearchSummary('date', dateRange.toUpperCase());
                    
                    // Trigger search parameter change event
                    document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                        detail: {
                            type: 'date',
                            dateType: 'custom',
                            dateStart: startDate,
                            dateEnd: endDate
                        }
                    }));
                    
                    // Auto-close after selection with cleanup
                    setTimeout(cleanup, 300);
                }
            },
            onDestroy: () => {
                // Ensure cleanup happens when Flatpickr is destroyed
                setTimeout(() => {
                    if (backdrop && backdrop.parentNode) {
                        document.body.removeChild(backdrop);
                    }
                }, 0);
            }
        });
        
        // Add backdrop click to close
        backdrop.addEventListener('click', cleanup);
        
        // Open the calendar immediately
        fp.open();
    }
    
    /**
     * Show collection details (simplified)
     */
    showCollectionDetails(collection) {
        if (!collection) return;
        
        this.notificationService.showNotification(`Collection: ${collection.title || collection.id}`, 'info');
    }
    
    /**
     * Intercept any global drawing completion events
     */
    interceptDrawingEvents() {
        // Listen for any drawing completion events
        document.addEventListener('drawingCompleted', (event) => {
            if (this.isDrawingActive) {
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
                event.stopPropagation();
                event.preventDefault();
            }
        }, true);
        
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
            
            // Update the bbox-input field for SearchForm compatibility
            const bboxInput = document.getElementById('bbox-input');
            if (bboxInput) {
                bboxInput.value = bbox.join(',');
            }
            
            // Show success notification
            this.notificationService.showNotification('📍 Location drawn and applied!', 'success');
            
            
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
                
                // Prevent reopening immediately after preset selection
                if (this.presetJustSelected) {
                    return;
                }
                
                // Don't open dropdown if clicking on a preset button or within a dropdown
                if (e.target.closest('.ai-preset-btn') || e.target.closest('.flatpickr-calendar') || e.target.closest('.ai-dropdown-container')) {
                    return;
                }
                
                const field = item.dataset.field;
                
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
                // If loading state persists for more than 10 seconds, force reset
                if (!this.loadingStartTime || (Date.now() - this.loadingStartTime) > 10000) {
                    console.warn('⚠️ Loading state stuck, forcing reset...');
                    this.forceReset();
                } else {
                    return;
                }
            }
            
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
            
            // Only show loading state for collection dropdown (which needs async data)
            // Location and date dropdowns are synchronous and don't need loading state
            if (fieldType === 'collection') {
                this.showLoadingDropdown(fieldType, triggerElement);
            }
            
            // Create dropdown content based on field type
            let dropdownContent;
            
            switch (fieldType) {
                case 'collection':
                    // Don't wait for collections - create dropdown immediately
                    // Collections will be loaded in background and dropdown will update
                    this.aiSearchHelper.allAvailableCollections = this.collectionsCache || [];
                    dropdownContent = this.aiSearchHelper.createCollectionDropdown();
                    
                    // Load collections in background and update dropdown
                    this.getCachedCollections().then(collections => {
                        if (this.currentDropdown && this.currentField === 'collection') {
                            this.aiSearchHelper.allAvailableCollections = collections;
                            const updatedContent = this.aiSearchHelper.createCollectionDropdown();
                            this.updateDropdownContent(updatedContent, fieldType);
                        }
                    }).catch(error => {
                        console.warn('Failed to load collections in background:', error);
                    });
                    break;
 
                case 'date':
                    // Date dropdown doesn't need to wait for collections
                    dropdownContent = this.aiSearchHelper.createDateDropdown();
                    break;
                default:
                    // Silently ignore location fields (dropdown disabled)
                    if (fieldType === 'location') {
                        return;
                    }
                    console.warn(`Unknown field type: ${fieldType}`);
                    throw new Error(`Unknown field type: ${fieldType}`);
            }
            
            // Validate dropdown content
            if (!dropdownContent) {
                throw new Error(`Failed to create dropdown content for ${fieldType}`);
            }
            
            // Handle dropdown display based on type
            if (fieldType === 'collection') {
                // Collection dropdown: replace loading content with actual content
                this.replaceLoadingWithContent(dropdownContent, fieldType);
            } else {
                // Location/Date dropdowns: show directly without loading state
                this.showDirectDropdown(dropdownContent, fieldType, triggerElement);
            }
            
            // Ensure dropdown is visible after content is loaded
            this.ensureDropdownVisible();
            
            // Temporarily disable click-outside detection to prevent immediate closure
            this.temporarilyDisableClickOutside = true;
            setTimeout(() => {
                this.temporarilyDisableClickOutside = false;
            }, 300);
            
            
            // Dispatch dropdown opened events for tutorial system
            if (fieldType === 'date') {
                document.dispatchEvent(new CustomEvent('date-dropdown-opened', {
                    detail: { triggerElement, fieldType }
                }));
            }
            
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
        
        // Add loading content with close button
        dropdown.innerHTML = `
            <div class="ai-dropdown-content">
                <div class="ai-dropdown-header">
                    <div class="ai-dropdown-header-content">
                        <i class="material-icons">${
                            fieldType === 'collection' ? 'dataset' : 'event'
                        }</i>
                        <span>Loading ${fieldType}...</span>
                    </div>
                    <button class="ai-dropdown-close" title="Close">
                        <i class="material-icons">close</i>
                    </button>
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
        
        // Set up close button handler for loading dropdown
        this.setupCloseButtonHandler(dropdown);
        
        // Debug class removed - no longer needed
        
        // Store references
        this.currentDropdown = dropdown;
        this.currentField = fieldType;
        
        // Add active state to trigger element
        triggerElement.classList.add('dropdown-active');
        
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
        
        // Set up close button handler
        this.setupCloseButtonHandler(this.currentDropdown);
        
        // Auto-focus search input field when dropdown opens
        let searchInput = null;
        
        // Try to find the specific search input based on field type
        if (fieldType === 'collection') {
            searchInput = this.currentDropdown.querySelector('.ai-search-input');
        }
        
        // Fallback to any input field if specific search input not found
        if (!searchInput) {
            searchInput = this.currentDropdown.querySelector('input, button, [tabindex]');
        }
        
        // Focus the search input with a small delay to ensure DOM is ready
        if (searchInput) {
            setTimeout(() => {
                searchInput.focus();
            }, 150);
        }
        
        
        // Force visibility check after content is added
        setTimeout(() => {
            this.ensureDropdownVisible();
        }, 50);
    }
    
    /**
     * Show dropdown directly without loading state (for synchronous dropdowns)
     * @param {HTMLElement} dropdownContent - Dropdown content
     * @param {string} fieldType - Field type
     * @param {HTMLElement} triggerElement - Trigger element
     */
    showDirectDropdown(dropdownContent, fieldType, triggerElement) {
        // BLOCK date dropdowns - using new inline date input system
        if (fieldType === 'date') {
            console.log('🚫 Blocked old date dropdown - using inline date inputs');
            return;
        }
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'inline-dropdown-container';
        dropdown.setAttribute('data-field', fieldType);
        
        // Add the dropdown content directly
        dropdown.appendChild(dropdownContent);
        
        // Position and show the dropdown
        this.positionInlineDropdown(dropdown, triggerElement);
        
        // Add to document body for better positioning control
        document.body.appendChild(dropdown);
        
        // Set as current dropdown
        this.currentDropdown = dropdown;
        this.currentField = fieldType;
        
        // Set up dropdown-specific event handlers
        this.setupDropdownHandlers(dropdown, fieldType);
        
        // Set up close button handler
        this.setupCloseButtonHandler(dropdown);
        
        // Mark trigger as active
        triggerElement.classList.add('dropdown-active');
        
        // Auto-focus search input field when dropdown opens
        let searchInput = null;
        
        // Try to find the specific search input based on field type
        if (fieldType === 'date') {
            searchInput = dropdown.querySelector('input, button, [tabindex]');
        }
        
        // Focus the search input with a small delay to ensure DOM is ready
        if (searchInput) {
            setTimeout(() => {
                searchInput.focus();
            }, 150);
        }
    }
    
    /**
     * Update dropdown content in place (for background loading)
     * @param {HTMLElement} newContent - New dropdown content
     * @param {string} fieldType - Field type
     */
    updateDropdownContent(newContent, fieldType) {
        if (!this.currentDropdown) return;
        
        // Clear current content
        this.currentDropdown.innerHTML = '';
        
        // Add the updated dropdown content
        this.currentDropdown.appendChild(newContent);
        
        // Set up dropdown-specific event handlers
        this.setupDropdownHandlers(this.currentDropdown, fieldType);
        
        // Set up close button handler
        this.setupCloseButtonHandler(this.currentDropdown);
        
        // Auto-focus search input field when dropdown updates
        let searchInput = null;
        
        // Try to find the specific search input based on field type
        if (fieldType === 'collection') {
            searchInput = this.currentDropdown.querySelector('.ai-search-input');
        }
        
        // Fallback to any input field if specific search input not found
        if (!searchInput) {
            searchInput = this.currentDropdown.querySelector('input, button, [tabindex]');
        }
        
        // Focus the search input with a small delay to ensure DOM is ready
        if (searchInput) {
            setTimeout(() => {
                searchInput.focus();
            }, 150);
        }
        
        // Force visibility check after content is updated
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
        
        
        // Enhanced positioning logic - always position at top of viewport
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '9999'; // Higher z-index
        dropdown.style.maxHeight = '300px'; // Reduced height for more compact dropdown
        dropdown.style.overflowY = 'auto';
        dropdown.style.borderRadius = '12px';
        dropdown.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        
        // Calculate positioning - always at top of viewport for maximum space
        let left = sidebarRect.left + 8;
        let top = 16; // Always position near top of viewport
        let width = Math.max(sidebarRect.width - 16, 320); // Slightly wider minimum
        
        // Ensure dropdown stays within viewport bounds
        if (left + width > viewportWidth) {
            left = viewportWidth - width - 16;
        }
        
        if (left < 8) {
            left = 8;
            width = Math.min(width, viewportWidth - 16);
        }
        
        // Calculate available height from top
        const availableHeight = viewportHeight - top - 32; // Leave 32px bottom margin
        dropdown.style.maxHeight = `${Math.min(300, availableHeight)}px`;
        
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
            requestAnimationFrame(() => { // Double RAF for better reliability
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0) scale(1)';
            });
        });
        
        
        // Debug: Check if dropdown is actually visible after animation completes
        setTimeout(() => {
            const finalRect = dropdown.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(dropdown);
            const isVisible = finalRect.width > 0 && finalRect.height > 0 && 
                            computedStyle.display !== 'none' &&
                            computedStyle.visibility !== 'hidden' &&
                            parseFloat(computedStyle.opacity) > 0;
            
            if (!isVisible) {
                console.warn('❌ Dropdown positioned but not visible! Attempting to fix...');
                console.log('Debug info:', {
                    rect: finalRect,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    zIndex: computedStyle.zIndex
                });
                
                // Force visibility as fallback
                dropdown.style.setProperty('display', 'block', 'important');
                dropdown.style.setProperty('visibility', 'visible', 'important');
                dropdown.style.setProperty('opacity', '1', 'important');
                dropdown.style.setProperty('pointer-events', 'auto', 'important');
                dropdown.style.setProperty('z-index', '999999', 'important');
                dropdown.style.setProperty('position', 'fixed', 'important');
                
                // Ensure it's definitely attached to body and not trapped by overflow:hidden
                if (dropdown.parentNode !== document.body) {
                    document.body.appendChild(dropdown);
                }
            }
        }, 300); // Wait longer for animation to complete
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
                
                
                // Show success notification
                if (this.notificationService) {
                    this.notificationService.showNotification(
                        `📝 ${this.currentField?.toUpperCase() || 'Dropdown'} menu opened`, 
                        'info'
                    );
                }
            } else {
            }
        }, 200);
    }
    
    /**
     * Set up close button handler for dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupCloseButtonHandler(dropdown) {
        const closeButton = dropdown.querySelector('.ai-dropdown-close');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeCurrentDropdown();
            });
        }
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
                // Handle custom date button first (before generic option handling)
                const customDateBtn = e.target.closest('#custom-date');
                if (customDateBtn) {
                    this.openFlatpickrCalendar();
                    return;
                }
                
                // Handle custom date range option - open Flatpickr immediately
                const option = e.target.closest('.ai-option');
                if (option && option.dataset.value === 'custom') {
                    this.openFlatpickrCalendar();
                    return;
                }
                
                // Handle other date options
                if (option && option.dataset.value && option.dataset.value !== 'custom') {
                    this.handleDateSelection(option.dataset.value);
                    this.closeCurrentDropdown();
                    return;
                }
                
                return; // Exit early for date dropdown
            }
            
            // Handle option selection for other types
            const option = e.target.closest('.ai-option, .ai-location-option');
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
                        try {
                            this.aiSearchHelper.showCollectionDetails(collection);
                        } catch (error) {
                            console.error('❌ Error showing collection details:', error);
                            this.notificationService.showNotification(
                                `Error showing collection details: ${error.message}`, 
                                'error'
                            );
                        }
                    } else {
                        console.warn('⚠️ Collection not found:', collectionId, collectionSource);
                        this.notificationService.showNotification(
                            'Collection details not available', 
                            'warning'
                        );
                    }
                } else {
                    console.warn('⚠️ Missing collection ID or available collections');
                    this.notificationService.showNotification(
                        'Collection information not available', 
                        'warning'
                    );
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
        });
        
        // Handle search input
        const searchInput = dropdown.querySelector('.ai-search-input') || dropdown.querySelector('.ai-location-search-input');
        if (searchInput) {
            if (fieldType === 'collection') {
                searchInput.addEventListener('input', (e) => {
                    this.filterCollections(e.target.value, dropdown);
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
            this.updateSearchSummary('collection', '📂 Everything');
            this.aiSearchHelper.selectedCollection = '';
            this.aiSearchHelper.selectedCollectionSource = null;
        } else {
            // Specific collection - add error handling and validation
            const titleElement = option.querySelector('.ai-option-title');
            const collectionSource = option.dataset.source;
            
            // Fallback to data-collection-id if collectionId is missing
            const actualCollectionId = collectionId || option.dataset.collectionId || option.dataset.value;
            
            if (!titleElement) {
                console.error('❌ Collection title element not found, retrying...');
                // Retry after a brief delay to handle race conditions
                setTimeout(() => {
                    this.handleCollectionSelection(actualCollectionId, option);
                }, 100);
                return;
            }
            
            if (!collectionSource) {
                console.error('❌ Collection source not found in dataset:', option.dataset);
                console.error('❌ Option element:', option);
                return;
            }
            
            if (!actualCollectionId) {
                console.error('❌ Collection ID not found:', { collectionId, option: option.dataset });
                return;
            }
            
            const collectionTitle = titleElement.textContent;
            
            // Update state immediately to prevent race conditions
            this.aiSearchHelper.selectedCollection = actualCollectionId;
            this.aiSearchHelper.selectedCollectionSource = collectionSource;
            
            this.updateSearchSummary('collection', collectionTitle.toUpperCase());

            // Update the collection select element
            const collectionSelect = document.getElementById('collection-select');
            if (collectionSelect) {
                collectionSelect.value = actualCollectionId;
                collectionSelect.dispatchEvent(new Event('change'));
            }
            
            // Check if this is a DEM collection and auto-set time to "Anytime"
            this.checkAndSetDEMTimeSettings(actualCollectionId, collectionTitle);
            
        }
    }
    
    /**
     * Check if the selected collection is a DEM and automatically set time to "Anytime"
     * @param {string} collectionId - The collection ID
     * @param {string} collectionTitle - The collection title
     */
    checkAndSetDEMTimeSettings(collectionId, collectionTitle) {
        if (!collectionId || !collectionTitle) return;
        
        // Check if this is a DEM collection based on ID and title
        const isDEM = this.isDEMCollection(collectionId, collectionTitle);
        
        if (isDEM) {
            
            // Update the AI search helper state
            this.aiSearchHelper.selectedDate = {
                type: 'anytime',
                start: null,
                end: null
            };
            
            // Clear date inputs
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
            
            // Update the search summary interface to show "Anytime"
            this.updateSearchSummary('date', 'Anytime');
            
            // Trigger change events to update any dependent UI components
            if (startInput) startInput.dispatchEvent(new Event('change'));
            if (endInput) endInput.dispatchEvent(new Event('change'));
        }
    }
    
    /**
     * Determine if a collection is a DEM (Digital Elevation Model) based on its metadata
     * @param {string} collectionId - The collection ID
     * @param {string} collectionTitle - The collection title
     * @returns {boolean} True if this is a DEM collection
     */
    isDEMCollection(collectionId, collectionTitle) {
        if (!collectionId && !collectionTitle) return false;
        
        const id = collectionId?.toLowerCase() || '';
        const title = collectionTitle?.toLowerCase() || '';
        
        // Common DEM identifiers
        const demKeywords = [
            'dem', 'elevation', 'altitude', 'height', 'topography', 'terrain',
            'digital elevation model', 'dtm', 'dsm', 'digital terrain model',
            'digital surface model', 'srtm', 'aster gdem', 'copernicus dem',
            'alos palsar', 'tandem-x'
        ];
        
        // Check if any DEM keywords match the collection ID or title
        return demKeywords.some(keyword => 
            id.includes(keyword) || 
            title.includes(keyword)
        );
    }
    
    
    /**
     * Handle date selection
     * @param {string} dateType - Date type
     */
    handleDateSelection(dateType) {
        // DISABLED - Old date selection system disabled in favor of inline date inputs
        console.log('🚫 Old date selection disabled - using inline date inputs for:', dateType);
        return;
        
        switch (dateType) {
            case 'anytime':
                dateRange = { start: null, end: null };
                displayText = 'Anytime';
                break;
            case 'last7days':
                dateRange = this.calculateLast7DaysRange();
                displayText = 'LAST 7 DAYS';
                break;
            case 'last30days':
                dateRange = this.calculateLast30DaysRange();
                displayText = 'LAST 30 DAYS';
                break;
            case 'thismonth':
                dateRange = this.calculateCurrentMonthRange();
                displayText = 'THIS MONTH';
                break;
            case 'custom':
                // Don't process custom here - it will be handled by handleCustomDate
                return;
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
        
        // Dispatch date preset selected event for tutorial system
        document.dispatchEvent(new CustomEvent('date-preset-selected', {
            detail: { 
                preset: dateType,
                presetName: displayText,
                dateRange: dateRange
            }
        }));
        
    }
    
    /**
     * Calculate last 7 days date range
     * @returns {Object} Date range for last 7 days including today
     */
    calculateLast7DaysRange() {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // 7 days including today
        
        return {
            start: this.formatDateForInput(sevenDaysAgo),
            end: this.formatDateForInput(today)
        };
    }
    
    calculateLast30DaysRange() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 29); // 30 days including today
        
        return {
            start: this.formatDateForInput(thirtyDaysAgo),
            end: this.formatDateForInput(today)
        };
    }

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
        // Use local date to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Handle draw location action
     */
    handleDrawLocation() {
        this.closeCurrentDropdown();
        
        if (this.mapManager && typeof this.mapManager.startDrawingBbox === 'function') {
            // Update sidebar to show drawing in progress
            this.updateSearchSummary('location', '🖊️ Drawing...');
            
            // Show instruction notification
            this.notificationService.showNotification('🖊️ Click two points on the map to draw a bounding box', 'info');
            
            // Start drawing with proper callback
            this.mapManager.startDrawingBbox((bbox) => {
                if (bbox && Array.isArray(bbox) && bbox.length === 4) {
                    
                    // Store location data in AI search helper
                    this.aiSearchHelper.selectedLocation = bbox;
                    this.aiSearchHelper.selectedLocationResult = {
                        formattedName: 'MAP SELECTION',
                        shortName: 'MAP SELECTION',
                        bbox: bbox,
                        category: 'drawn'
                    };
                    
                    // Update the sidebar summary
                    this.updateSearchSummary('location', 'MAP SELECTION');
                    
                    // Update the bbox-input field for SearchForm compatibility
                    const bboxInput = document.getElementById('bbox-input');
                    if (bboxInput) {
                        bboxInput.value = bbox.join(',');
                    }
                    
                    // Display on map if not already displayed
                    if (typeof this.aiSearchHelper.displayLocationOnMap === 'function') {
                        this.aiSearchHelper.displayLocationOnMap(bbox, 'MAP SELECTION', 'drawn');
                    }
                    
                    // Update search parameters
                    if (typeof this.aiSearchHelper.updateSearchParameters === 'function') {
                        this.aiSearchHelper.updateSearchParameters();
                    }
                    
                    // Show success notification
                    this.notificationService.showNotification('✅ Location drawn and applied successfully!', 'success');
                    
                } else {
                    console.warn('⚠️ Invalid bbox returned from drawing:', bbox);
                    this.notificationService.showNotification('⚠️ Drawing incomplete - please try again', 'warning');
                }
            });
        } else {
            console.error('❌ Map drawing not available - MapManager or startDrawingBbox method not found');
            this.notificationService.showNotification('⚠️ Map drawing functionality not available', 'warning');
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
                    
                    // Update dropdown and summary with geometry format
                    const displayText = `${geometryResult.format.toUpperCase()} geometry`;
                    this.handleLocationSelection('custom', displayText);
                    
                    // Also update the static system if the function exists
                    if (typeof window.updateSearchSummary === 'function') {
                        window.updateSearchSummary('location', displayText);
                    }
                    
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
            
            // Focus on start date input
            const startInput = dropdown.querySelector('#dropdown-date-start');
            if (startInput) {
                setTimeout(() => {
                    startInput.focus();
                    if (startInput.showPicker) {
                        try {
                            startInput.showPicker();
                        } catch (e) {
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
                
            }
            
            // Set up cancel button
            const cancelBtn = dropdown.querySelector('.ai-cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    customSection.style.display = 'none';
                });
            }
        }
    }
    
    /**
     * Set up smart date picker flow
     * @param {HTMLElement} dropdown - Dropdown container
     */
    setupSmartDateFlow(dropdown) {
        const startInput = dropdown.querySelector('#dropdown-date-start');
        const endInput = dropdown.querySelector('#dropdown-date-end');
        
        if (startInput && endInput) {
            // When start date is selected, automatically focus end date
            startInput.addEventListener('change', () => {
                if (startInput.value) {
                    
                    // Set minimum date for end input
                    endInput.min = startInput.value;
                    
                    // Focus end date picker after short delay
                    setTimeout(() => {
                        endInput.focus();
                        if (endInput.showPicker) {
                            try {
                                endInput.showPicker();
                            } catch (e) {
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
                    setTimeout(() => {
                        this.applyCustomDateRange(dropdown);
                    }, 500);
                }
            });
            
        }
    }
    
    /**
     * Apply custom date range
     * @param {HTMLElement} dropdown - Dropdown container
     */
    applyCustomDateRange(dropdown) {
        
        const startInput = dropdown.querySelector('#dropdown-date-start');
        const endInput = dropdown.querySelector('#dropdown-date-end');
        
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
            
            
            // Close dropdown
            this.closeCurrentDropdown();
            
            // Show success notification
            this.notificationService.showNotification(`📅 Date range set: ${dateText}`, 'success');
        } else {
            this.notificationService.showNotification('⚠️ Please select both start and end dates', 'warning');
        }
    }
    
    /**
     * Filter collections in dropdown with enhanced search
     * @param {string} query - Search query
     * @param {HTMLElement} dropdown - Dropdown container
     */
    filterCollections(query, dropdown) {
        const options = dropdown.querySelectorAll('.ai-option[data-value]');
        const normalizedQuery = query.toLowerCase().trim();
        
        let visibleCount = 0;
        
        // Track visible collections by source
        const sourceVisibility = {};
        
        options.forEach(option => {
            const collectionId = option.dataset.value?.toLowerCase() || '';
            const title = option.querySelector('.ai-option-title')?.textContent?.toLowerCase() || '';
            const subtitle = option.querySelector('.ai-option-subtitle')?.textContent?.toLowerCase() || '';
            
            // Find the actual collection object for more detailed search
            let collectionDescription = '';
            let collectionKeywords = '';
            let collection = null;
            
            if (this.aiSearchHelper.allAvailableCollections && collectionId) {
                // Try to find collection by ID - handle case sensitivity and exact match
                collection = this.aiSearchHelper.allAvailableCollections.find(c => 
                    c.id && c.id.toLowerCase() === collectionId
                );
                
                if (collection) {
                    collectionDescription = (collection.description || '').toLowerCase();
                    collectionKeywords = (collection.keywords || []).join(' ').toLowerCase();
                }
            }
            
            // Enhanced matching: search in ID, title, subtitle, description, keywords, and source
            const matches = normalizedQuery === '' || // Show all if query is empty
                          collectionId.includes(normalizedQuery) ||
                          title.includes(normalizedQuery) ||
                          subtitle.includes(normalizedQuery) ||
                          collectionDescription.includes(normalizedQuery) ||
                          collectionKeywords.includes(normalizedQuery) ||
                          (collection && collection.source && collection.source.toLowerCase().includes(normalizedQuery));
            
            if (matches) {
                option.classList.remove('filtered-hidden');
                visibleCount++;
                
                // Track which sources have visible collections
                if (collection && collection.source) {
                    sourceVisibility[collection.source] = true;
                }
            } else {
                option.classList.add('filtered-hidden');
            }
            
            // Debug logging for specific search terms
            if (normalizedQuery === 'rtc' && collection) {
            }
        });
        
        // Hide/show source group headers based on whether they have visible collections
        const sourceHeaders = dropdown.querySelectorAll('.ai-source-group-header');
        sourceHeaders.forEach(header => {
            const headerText = header.textContent.toLowerCase();
            let hasVisibleCollections = false;
            
            // Check if this source has any visible collections
            Object.keys(sourceVisibility).forEach(source => {
                const sourceDisplayName = this.aiSearchHelper.getSourceDisplayName ? 
                    this.aiSearchHelper.getSourceDisplayName(source).toLowerCase() : 
                    source.toLowerCase();
                
                if (headerText.includes(sourceDisplayName) || 
                    sourceDisplayName.includes(headerText.replace(/\s+sources?$/i, ''))) {
                    hasVisibleCollections = true;
                }
            });
            
            // Also check if this is for a source mentioned in the search query
            if (normalizedQuery && headerText.includes(normalizedQuery)) {
                hasVisibleCollections = true;
            }
            
            if (hasVisibleCollections || normalizedQuery === '') {
                header.classList.remove('filtered-hidden');
            } else {
                header.classList.add('filtered-hidden');
            }
        });
        
        // Update header count
        const header = dropdown.querySelector('.ai-dropdown-header span');
        if (header && query.trim()) {
            const total = this.aiSearchHelper.allAvailableCollections ? 
                         this.aiSearchHelper.allAvailableCollections.length : 0;
            header.textContent = `Search Results (${visibleCount} of ${total})`;
        } else if (header) {
            header.textContent = 'Select Collection';
        }
        
        // Log debug info for troubleshooting
        if (query.trim() && visibleCount === 0) {
            console.warn(`⚠️ No collections found for query: "${query}"`);
        }
    }
    
    /**
     * Handle keyboard navigation in collection dropdown
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} container - Dropdown container
     */
    handleCollectionKeyboardNavigation(e, container) {
        const visibleOptions = container.querySelectorAll('.ai-option:not([style*="display: none"]):not(.filtered-hidden)');
        
        if (visibleOptions.length === 0) return;
        
        // Find currently highlighted option
        let currentIndex = -1;
        visibleOptions.forEach((option, index) => {
            if (option.classList.contains('keyboard-highlighted')) {
                currentIndex = index;
            }
        });
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                // Remove current highlight
                if (currentIndex >= 0) {
                    visibleOptions[currentIndex].classList.remove('keyboard-highlighted');
                }
                // Move to next option (or first if none selected)
                currentIndex = (currentIndex + 1) % visibleOptions.length;
                visibleOptions[currentIndex].classList.add('keyboard-highlighted');
                visibleOptions[currentIndex].scrollIntoView({ block: 'nearest' });
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                // Remove current highlight
                if (currentIndex >= 0) {
                    visibleOptions[currentIndex].classList.remove('keyboard-highlighted');
                }
                // Move to previous option (or last if none selected)
                currentIndex = currentIndex <= 0 ? visibleOptions.length - 1 : currentIndex - 1;
                visibleOptions[currentIndex].classList.add('keyboard-highlighted');
                visibleOptions[currentIndex].scrollIntoView({ block: 'nearest' });
                break;
                
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0) {
                    // Select the highlighted option
                    visibleOptions[currentIndex].click();
                } else if (visibleOptions.length === 1) {
                    // If only one option visible and none highlighted, select it
                    visibleOptions[0].click();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.closeCurrentDropdown();
                break;
        }
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
            case 'date':
                summaryElement = document.querySelector('[data-field="date"] .search-summary-value');
                break;
        }
        
        if (summaryElement) {
            // Special handling for date field to preserve input elements
            if (fieldType === 'date') {
                // Check if we have mini date inputs
                if (summaryElement.querySelector('.mini-date-inputs')) {
                    // NEVER replace mini date inputs with text - they are the new system
                    console.log('🚫 BLOCKED: Attempt to replace mini date inputs with text:', value);
                    return; // Exit early to preserve the date inputs
                } else {
                    // If no mini date inputs exist, restore them instead of setting text
                    console.log('🔄 Restoring mini date inputs instead of setting text:', value);
                    const today = new Date();
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    const todayStr = today.toISOString().split('T')[0];
                    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
                    
                    summaryElement.innerHTML = `
                        <div class="mini-date-inputs" id="mini-date-container">
                            <input type="date" id="summary-start-date" class="mini-date-input" value="${oneMonthAgoStr}" max="${todayStr}">
                            <span class="date-separator">to</span>
                            <input type="date" id="summary-end-date" class="mini-date-input" value="${todayStr}" max="${todayStr}">
                        </div>
                    `;
                    console.log('✅ Mini date inputs restored');
                    return;
                }
            } else {
                summaryElement.textContent = value;
            }
            
            // Add brief highlight animation
            summaryElement.style.animation = 'highlight 0.5s ease-in-out';
            setTimeout(() => {
                summaryElement.style.animation = '';
            }, 500);
            
            
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
            
            
        } catch (error) {
            console.error('❌ Error emitting state change event:', error);
        }
    }
    
    /**
     * Close current dropdown with enhanced error handling
     */
    closeCurrentDropdown() {
        try {
            // Reset click-outside disable flag
            this.temporarilyDisableClickOutside = false;
            
            // Clean up location preview when closing dropdown
            if (window.clearLocationPreview) {
                window.clearLocationPreview();
            } else if (this.mapManager && typeof this.mapManager.clearLocationPreview === 'function') {
                this.mapManager.clearLocationPreview();
            }
            
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
            // Reset click-outside disable flag
            this.temporarilyDisableClickOutside = false;
            
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
                // Skip click outside detection if temporarily disabled
                if (this.temporarilyDisableClickOutside) {
                    return;
                }
                
                if (this.currentDropdown && 
                    !this.currentDropdown.contains(e.target) && 
                    !e.target.closest('.search-summary-item')) {
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
                    this.forceCloseCurrentDropdown();
                }
            } catch (error) {
                console.warn('⚠️ Error in blur handler:', error);
                this.forceReset();
            }
        };
        
        window.addEventListener('blur', this.windowBlurHandler, { passive: true });
        
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
            
        } catch (error) {
            console.warn('⚠️ Error cleaning up global listeners:', error);
        }
    }
    
    /**
     * Destroy the dropdown manager and clean up all resources
     */
    destroy() {
        try {
            
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
            
        } catch (error) {
            console.error('❌ Error destroying InlineDropdownManager:', error);
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
