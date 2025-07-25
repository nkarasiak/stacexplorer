/**
 * DateDropdownHandler.js - Handles date dropdown functionality
 * Manages date selection, calendar integration, and date presets
 */

export class DateDropdownHandler {
    constructor(notificationService, searchSummaryManager) {
        this.notificationService = notificationService;
        this.searchSummaryManager = searchSummaryManager;
        this.flatpickrInstance = null;
        this.currentSelection = {
            type: 'anytime',
            start: null,
            end: null
        };
    }
    
    /**
     * Create date dropdown HTML
     * @returns {string} HTML string for date dropdown
     */
    createDateDropdownHTML() {
        return `
            <div class="ai-dropdown-container ai-date-dropdown" style="display: none;">
                <div class="ai-dropdown-header">
                    <span class="ai-dropdown-title">
                        <i class="material-icons">event</i>
                        Select Time Range
                    </span>
                    <button class="ai-dropdown-close" type="button">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                
                <div class="ai-dropdown-content">
                    <!-- Quick Date Presets -->
                    <div class="ai-preset-section">
                        <h4 class="ai-section-title">Quick Presets</h4>
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
                    
                    <!-- Date Picker Section -->
                    <div class="ai-calendar-section">
                        <h4 class="ai-section-title">Custom Range</h4>
                        <div class="ai-date-inputs">
                            <input type="text" 
                                   id="ai-date-range-input" 
                                   class="ai-date-input" 
                                   placeholder="Select date range or type YYYY-MM-DD to YYYY-MM-DD...">
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="ai-dropdown-actions">
                        <button type="button" class="ai-btn ai-btn-secondary ai-cancel-btn">Cancel</button>
                        <button type="button" class="ai-btn ai-btn-primary ai-apply-btn" disabled>Apply</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize date dropdown functionality
     * @param {HTMLElement} dropdown - Dropdown container element
     */
    initializeDateDropdown(dropdown) {
        const dateRangeInput = dropdown.querySelector('#ai-date-range-input');
        const applyBtn = dropdown.querySelector('.ai-apply-btn');
        const cancelBtn = dropdown.querySelector('.ai-cancel-btn');
        
        if (!dateRangeInput) return;
        
        // Initialize Flatpickr
        this.flatpickrInstance = flatpickr(dateRangeInput, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            showMonths: 2,
            static: true,
            position: 'below',
            allowInput: true,
            onChange: (selectedDates) => {
                const hasValidRange = selectedDates.length === 2;
                if (applyBtn) {
                    applyBtn.disabled = !hasValidRange;
                }
                
                if (hasValidRange) {
                    this.currentSelection = {
                        type: 'custom',
                        start: selectedDates[0],
                        end: selectedDates[1]
                    };
                }
            }
        });
        
        // Apply button handler
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyDateSelection();
            });
        }
        
        // Cancel button handler
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelDateSelection();
            });
        }
    }
    
    /**
     * Apply the current date selection
     */
    applyDateSelection() {
        if (this.currentSelection.type === 'custom' && this.currentSelection.start && this.currentSelection.end) {
            const startDateStr = this.formatDateForInput(this.currentSelection.start);
            const endDateStr = this.formatDateForInput(this.currentSelection.end);
            
            // Update form inputs
            const startInput = document.getElementById('date-start');
            const endInput = document.getElementById('date-end');
            if (startInput) startInput.value = startDateStr;
            if (endInput) endInput.value = endDateStr;
            
            // Update search summary
            const dateRange = `${this.formatDateDisplay(this.currentSelection.start)} to ${this.formatDateDisplay(this.currentSelection.end)}`;
            this.searchSummaryManager.updateSearchSummary('date', dateRange.toUpperCase());
            
            // Trigger search parameter change event
            document.dispatchEvent(new CustomEvent('searchParameterChanged', {
                detail: {
                    type: 'date',
                    dateType: 'custom',
                    dateStart: startDateStr,
                    dateEnd: endDateStr
                }
            }));
            
            // Close dropdown
            document.dispatchEvent(new CustomEvent('closeDropdown'));
        }
    }
    
    /**
     * Cancel date selection and close dropdown
     */
    cancelDateSelection() {
        // Reset to previous state
        this.resetToAnytime();
        
        // Close dropdown
        document.dispatchEvent(new CustomEvent('closeDropdown'));
    }
    
    /**
     * Reset date selection to "Anytime"
     */
    resetToAnytime() {
        this.currentSelection = {
            type: 'anytime',
            start: null,
            end: null
        };
        
        // Clear form inputs
        const startInput = document.getElementById('date-start');
        const endInput = document.getElementById('date-end');
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
        
        // Update search summary
        this.searchSummaryManager.updateSearchSummary('date', 'Anytime');
        
        // Trigger change events
        if (startInput) startInput.dispatchEvent(new Event('change'));
        if (endInput) endInput.dispatchEvent(new Event('change'));
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
    
    /**
     * Cleanup when dropdown is destroyed
     */
    cleanup() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.destroy();
            this.flatpickrInstance = null;
        }
    }
}