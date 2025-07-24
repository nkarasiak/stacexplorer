/**
 * PresetButtonHandler.js - Handles time preset button functionality
 * Manages preset time buttons (1 Day, 1 Week, 1 Month, etc.) with immediate action
 */

export class PresetButtonHandler {
    constructor(notificationService, updateSearchSummary, formatDateForInput, formatDateDisplay) {
        this.notificationService = notificationService;
        this.updateSearchSummary = updateSearchSummary;
        this.formatDateForInput = formatDateForInput;
        this.formatDateDisplay = formatDateDisplay;
        this.presetJustSelected = false;
        
        this.setupPersistentEventHandler();
    }
    
    /**
     * Setup persistent event handler for preset buttons using event delegation
     * This survives DOM updates and re-initialization
     */
    setupPersistentEventHandler() {
        // Use event delegation on document to catch all preset button clicks
        document.addEventListener('click', (e) => {
            // Check if clicked element is a preset button
            const presetBtn = e.target.closest('.ai-preset-btn');
            if (!presetBtn) return;
            
            // Prevent default and stop propagation
            e.preventDefault();
            e.stopPropagation();
            
            // Get days from data attribute
            const days = parseInt(presetBtn.dataset.days);
            if (isNaN(days)) return;
            
            this.handlePresetButtonClick(days);
            
        }, true); // Use capture phase to ensure it runs first
    }
    
    /**
     * Handle preset button click
     * @param {number} days - Number of days for the preset
     */
    handlePresetButtonClick(days) {
        // Calculate dates
        const startDate = new Date();
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        
        // Format dates
        const startDateStr = this.formatDateForInput(startDate);
        const endDateStr = this.formatDateForInput(endDate);
        
        // Update form inputs immediately
        const startInput = document.getElementById('date-start');
        const endInput = document.getElementById('date-end');
        if (startInput) startInput.value = startDateStr;
        if (endInput) endInput.value = endDateStr;
        
        // Close any open dropdown immediately
        const dropdownEvent = new CustomEvent('closeDropdown');
        document.dispatchEvent(dropdownEvent);
        
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
    }
    
    /**
     * Check if preset was just selected (to prevent dropdown reopening)
     */
    isPresetJustSelected() {
        return this.presetJustSelected;
    }
}