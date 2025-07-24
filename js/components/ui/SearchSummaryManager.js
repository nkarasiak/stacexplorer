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
            summaryElement.textContent = value;
            
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
        
        return {
            collection: collectionElement?.textContent || 'All Collections',
            location: locationElement?.textContent || 'Everywhere',
            date: dateElement?.textContent || 'Anytime'
        };
    }
    
    /**
     * Reset all search summary fields to defaults
     */
    resetToDefaults() {
        this.updateSearchSummary('collection', 'All Collections');
        this.updateSearchSummary('location', 'Everywhere');
        this.updateSearchSummary('date', 'Anytime');
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