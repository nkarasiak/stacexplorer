/**
 * SearchSummaryManager.js - Manages search summary display and updates
 * Handles updating the search summary interface with current selections
 */

export class SearchSummaryManager {
    constructor() {
        this.debounceTimeout = null;
        this.debounceDelay = 150; // ms
    }
    
    /**
     * Update search summary display and emit URL state event
     * @param {string} fieldType - Field type to update ('collection', 'location', 'date')
     * @param {string} value - New value to display
     */
    updateSearchSummary(fieldType, value) {
        // Debounce updates to prevent excessive DOM manipulation
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.debounceTimeout = setTimeout(() => {
            this._doUpdateSearchSummary(fieldType, value);
        }, this.debounceDelay);
    }
    
    /**
     * Internal method to perform the actual search summary update
     * @param {string} fieldType - Field type to update
     * @param {string} value - New value to display
     */
    _doUpdateSearchSummary(fieldType, value) {
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
            default:
                console.warn(`Unknown field type: ${fieldType}`);
                return;
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
            
            // Add visual feedback
            summaryElement.classList.add('updated');
            setTimeout(() => {
                summaryElement.classList.remove('updated');
            }, 300);
        }
        
        // Emit URL state update event
        document.dispatchEvent(new CustomEvent('urlStateUpdate', {
            detail: { 
                field: fieldType, 
                value: value,
                timestamp: Date.now()
            }
        }));
    }
    
    /**
     * Get current search summary values
     * @returns {Object} Current summary values
     */
    getCurrentSummaryValues() {
        const collectionElement = document.querySelector('[data-field="collection"] .search-summary-value');
        const locationElement = document.querySelector('[data-field="location"] .search-summary-value');
        const dateElement = document.querySelector('[data-field="date"] .search-summary-value');
        
        // Special handling for date field with inputs
        let dateValue = 'Anytime';
        if (dateElement) {
            const startInput = dateElement.querySelector('#summary-start-date');
            const endInput = dateElement.querySelector('#summary-end-date');
            
            if (startInput && endInput && startInput.value && endInput.value) {
                dateValue = `${startInput.value} to ${endInput.value}`;
            } else {
                dateValue = dateElement.textContent || 'Anytime';
            }
        }
        
        return {
            collection: collectionElement?.textContent || 'All Collections',
            location: locationElement?.textContent || 'Everywhere',
            date: dateValue
        };
    }
    
    /**
     * Reset all search summary fields to defaults
     */
    resetToDefaults() {
        this.updateSearchSummary('collection', 'All Collections');
        this.updateSearchSummary('location', 'Everywhere');
        // Don't reset date to 'Anytime' if we have date inputs - preserve them
        const dateElement = document.querySelector('[data-field="date"] .search-summary-value');
        if (!dateElement || !dateElement.querySelector('.mini-date-inputs')) {
            this.updateSearchSummary('date', 'Anytime');
        }
    }
    
    /**
     * Update multiple fields at once
     * @param {Object} updates - Object with field updates
     */
    updateMultiple(updates) {
        Object.entries(updates).forEach(([fieldType, value]) => {
            this.updateSearchSummary(fieldType, value);
        });
    }
}