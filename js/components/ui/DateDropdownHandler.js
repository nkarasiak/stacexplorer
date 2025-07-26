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
        const today = new Date('2025-07-25');
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const defaultStart = this.formatDateForInput(oneMonthAgo);
        const defaultEnd = this.formatDateForInput(today);
        
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
                    <!-- Mini Text Calendar -->
                    <div class="ai-calendar-section">
                        <h4 class="ai-section-title">Date Range</h4>
                        <div class="ai-mini-calendar">
                            <div class="ai-date-input-row">
                                <label for="ai-start-date" class="ai-date-label">Start Date:</label>
                                <input type="date" 
                                       id="ai-start-date" 
                                       class="ai-date-text-input" 
                                       value="${defaultStart}"
                                       max="${defaultEnd}">
                            </div>
                            <div class="ai-date-input-row">
                                <label for="ai-end-date" class="ai-date-label">End Date:</label>
                                <input type="date" 
                                       id="ai-end-date" 
                                       class="ai-date-text-input" 
                                       value="${defaultEnd}"
                                       max="${defaultEnd}">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="ai-dropdown-actions">
                        <button type="button" class="ai-btn ai-btn-secondary ai-cancel-btn">Cancel</button>
                        <button type="button" class="ai-btn ai-btn-primary ai-apply-btn">Apply</button>
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
        const startDateInput = dropdown.querySelector('#ai-start-date');
        const endDateInput = dropdown.querySelector('#ai-end-date');
        const applyBtn = dropdown.querySelector('.ai-apply-btn');
        const cancelBtn = dropdown.querySelector('.ai-cancel-btn');
        
        if (!startDateInput || !endDateInput) return;
        
        // Set default selection based on the input values
        this.currentSelection = {
            type: 'custom',
            start: new Date(startDateInput.value),
            end: new Date(endDateInput.value)
        };
        
        // Add event listeners for date inputs
        const updateSelection = () => {
            const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
            const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
            
            if (startDate && endDate && startDate <= endDate) {
                this.currentSelection = {
                    type: 'custom',
                    start: startDate,
                    end: endDate
                };
                // Update end date max to ensure start date is not after end date
                endDateInput.min = startDateInput.value;
            }
        };
        
        startDateInput.addEventListener('change', updateSelection);
        endDateInput.addEventListener('change', updateSelection);
        
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
        // No cleanup needed for native date inputs
    }
}