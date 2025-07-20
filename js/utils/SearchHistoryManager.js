/**
 * SearchHistoryManager.js - Manages search history with local storage
 * Provides functionality to save, retrieve, and manage search queries
 */

export class SearchHistoryManager {
    constructor() {
        this.maxHistoryItems = 10; // Maximum number of search history items to keep
        this.storageKey = 'stac_search_history';
        this.init();
    }
    
    /**
     * Initialize the search history manager
     */
    init() {
        console.log('🕒 Initializing Search History Manager');
        
        // Listen for search events to save to history
        document.addEventListener('searchExecuted', (event) => {
            this.saveSearchToHistory(event.detail);
        });
        
        // Listen for search re-execution requests
        document.addEventListener('reExecuteSearch', (event) => {
            this.restoreSearchFromHistory(event.detail);
        });
        
        // Clean up old entries on initialization
        this.cleanupOldEntries();
    }
    
    /**
     * Save a search query to history
     * @param {Object} searchParams - Search parameters object
     */
    saveSearchToHistory(searchParams) {
        if (!searchParams || this.isEmpty(searchParams)) {
            console.log('🕒 Skipping empty search - not saving to history');
            return;
        }
        
        console.log('📝 Raw search params before sanitization:', searchParams);
        console.log('📝 Collection info:', {
            collection: searchParams.collection,
            collections: searchParams.collections,
            collectionTitle: searchParams.collectionTitle
        });
        
        const sanitizedParams = this.sanitizeSearchParams(searchParams);
        console.log('🧹 Sanitized search params:', sanitizedParams);
        
        const searchEntry = {
            id: this.generateSearchId(),
            timestamp: Date.now(),
            params: sanitizedParams,
            title: this.generateSearchTitle(sanitizedParams),
            resultCount: searchParams.resultCount || 0
        };
        
        console.log('🕒 Saving search to history:', searchEntry);
        
        let history = this.getHistory();
        
        // Remove duplicate searches (same parameters)
        history = history.filter(entry => !this.isDuplicateSearch(entry.params, searchEntry.params));
        
        // Add new search to the beginning
        history.unshift(searchEntry);
        
        // Keep only the most recent searches
        if (history.length > this.maxHistoryItems) {
            history = history.slice(0, this.maxHistoryItems);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(history));
            console.log('✅ Search saved to history successfully');
        } catch (error) {
            console.error('❌ Failed to save search history:', error);
        }
    }
    
    /**
     * Get search history from localStorage
     * @returns {Array} Array of search history entries
     */
    getHistory() {
        try {
            const historyJson = localStorage.getItem(this.storageKey);
            if (!historyJson) return [];
            
            const history = JSON.parse(historyJson);
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.error('❌ Failed to load search history:', error);
            return [];
        }
    }
    
    /**
     * Get recent searches (default: last 5)
     * @param {number} limit - Number of recent searches to return
     * @returns {Array} Array of recent search entries
     */
    getRecentSearches(limit = 5) {
        const history = this.getHistory();
        return history.slice(0, limit);
    }
    
    /**
     * Clear all search history
     */
    clearHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ Search history cleared');
            
            // Dispatch event to update UI
            document.dispatchEvent(new CustomEvent('searchHistoryCleared'));
        } catch (error) {
            console.error('❌ Failed to clear search history:', error);
        }
    }
    
    /**
     * Remove a specific search from history
     * @param {string} searchId - ID of the search to remove
     */
    removeFromHistory(searchId) {
        let history = this.getHistory();
        history = history.filter(entry => entry.id !== searchId);
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(history));
            console.log('🗑️ Search removed from history:', searchId);
            
            // Dispatch event to update UI
            document.dispatchEvent(new CustomEvent('searchHistoryUpdated'));
        } catch (error) {
            console.error('❌ Failed to remove search from history:', error);
        }
    }
    
    /**
     * Re-execute a search from history
     * @param {string} searchId - ID of the search to re-execute
     */
    reExecuteSearch(searchId) {
        const history = this.getHistory();
        const searchEntry = history.find(entry => entry.id === searchId);
        
        if (!searchEntry) {
            console.error('❌ Search not found in history:', searchId);
            return;
        }
        
        console.log('🔄 Re-executing search from history:', searchEntry);
        
        // Dispatch event to re-execute the search
        document.dispatchEvent(new CustomEvent('reExecuteSearch', {
            detail: searchEntry.params
        }));
    }
    
    /**
     * Restore search parameters from history and populate the UI
     * @param {Object} searchParams - Search parameters to restore
     */
    restoreSearchFromHistory(searchParams) {
        try {
            console.log('🔄 Restoring search from history:', searchParams);
            
            // Restore collection selection
            console.log('🔄 Looking for collection in params:', {
                collection: searchParams.collection,
                collections: searchParams.collections,
                allParams: Object.keys(searchParams)
            });
            
            if (searchParams.collection) {
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect) {
                    console.log('🎯 Restoring collection:', searchParams.collection);
                    collectionSelect.value = searchParams.collection;
                    collectionSelect.dispatchEvent(new Event('change'));
                } else {
                    console.warn('⚠️ Collection select element not found');
                }
            } else if (searchParams.collections && searchParams.collections.length > 0) {
                // Fallback for older format
                const collectionSelect = document.getElementById('collection-select');
                if (collectionSelect) {
                    console.log('🎯 Restoring collection (legacy format):', searchParams.collections[0]);
                    collectionSelect.value = searchParams.collections[0];
                    collectionSelect.dispatchEvent(new Event('change'));
                }
            } else {
                console.warn('⚠️ No collection found in search params to restore');
            }
            
            // Restore catalog selection if available
            if (searchParams.catalog) {
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect) {
                    catalogSelect.value = searchParams.catalog;
                    catalogSelect.dispatchEvent(new Event('change'));
                }
            }
            
            // Restore date range
            if (searchParams.datetime) {
                const [start, end] = searchParams.datetime.split('/');
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput && start && end) {
                    startInput.value = start.split('T')[0];
                    endInput.value = end.split('T')[0];
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                }
            }
            
            // Restore bbox if available
            if (searchParams.bbox && Array.isArray(searchParams.bbox)) {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) {
                    bboxInput.value = searchParams.bbox.join(',');
                    bboxInput.dispatchEvent(new Event('change'));
                }
            }
            
            // Restore cloud cover settings
            if (searchParams.cloudCover !== undefined) {
                const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
                const cloudCoverSlider = document.getElementById('cloud-cover');
                const cloudCoverValue = document.getElementById('cloud-cover-value');
                
                if (cloudCoverEnabled && cloudCoverSlider && cloudCoverValue) {
                    cloudCoverEnabled.checked = true;
                    cloudCoverSlider.value = searchParams.cloudCover;
                    cloudCoverValue.textContent = `${searchParams.cloudCover}%`;
                    cloudCoverEnabled.dispatchEvent(new Event('change'));
                    cloudCoverSlider.dispatchEvent(new Event('input'));
                }
            }
            
            // Update summary interface if available - with more robust updates
            if (window.inlineDropdownManager) {
                setTimeout(() => {
                    // Force update the collection summary specifically
                    const collectionSelect = document.getElementById('collection-select');
                    if (collectionSelect && collectionSelect.value) {
                        const selectedOption = collectionSelect.selectedOptions[0];
                        if (selectedOption) {
                            // Get collection info for display
                            const collectionTitle = selectedOption.textContent || collectionSelect.value;
                            
                            // Remove any emoji/special characters and clean up the title
                            const cleanTitle = collectionTitle.replace(/[🛰️📡🌍⚙️]/g, '').trim();
                            
                            // Force update the collection summary
                            window.inlineDropdownManager.updateSearchSummary('collection', cleanTitle.toUpperCase());
                        }
                    }
                    
                    // Update other summaries if they exist in the params
                    if (searchParams.bbox) {
                        window.inlineDropdownManager.updateSearchSummary('location', 'MAP SELECTION');
                    }
                    if (searchParams.datetime) {
                        const [start, end] = searchParams.datetime.split('/');
                        if (start && end) {
                            const startDate = start.split('T')[0];
                            const endDate = end.split('T')[0];
                            const dateRange = `${startDate} to ${endDate}`;
                            window.inlineDropdownManager.updateSearchSummary('date', dateRange.toUpperCase());
                        }
                    }
                }, 300);
            }
            
            // Auto-execute the search after a brief delay to allow UI to update
            setTimeout(() => {
                const mainSearchBtn = document.getElementById('main-search-btn');
                if (mainSearchBtn) {
                    mainSearchBtn.click();
                }
            }, 500);
            
            console.log('✅ Search parameters restored from history');
            
        } catch (error) {
            console.error('❌ Failed to restore search from history:', error);
        }
    }
    
    /**
     * Generate a unique ID for a search entry
     * @returns {string} Unique search ID
     */
    generateSearchId() {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate a human-readable title for a search
     * @param {Object} searchParams - Search parameters
     * @returns {string} Search title
     */
    generateSearchTitle(searchParams) {
        const parts = [];
        
        // Collection/Source
        let collectionName = null;
        if (searchParams.collection && searchParams.collection !== '') {
            collectionName = searchParams.collection;
        } else if (searchParams.collections && Array.isArray(searchParams.collections) && searchParams.collections.length > 0) {
            collectionName = searchParams.collections[0];
        }
        
        if (collectionName) {
            parts.push(`📂 ${searchParams.collectionTitle || collectionName}`);
        } else {
            parts.push('📂 All Collections');
        }
        
        // Location
        if (searchParams.bbox && Array.isArray(searchParams.bbox)) {
            parts.push('🗺️ Custom Area');
        } else if (searchParams.geometry) {
            parts.push('🗺️ Custom Geometry');
        } else {
            parts.push('🌍 Worldwide');
        }
        
        // Date range
        if (searchParams.datetime) {
            if (searchParams.datetime.includes('/')) {
                const [start, end] = searchParams.datetime.split('/');
                const startDate = start.split('T')[0];
                const endDate = end.split('T')[0];
                if (startDate === endDate) {
                    parts.push(`📅 ${startDate}`);
                } else {
                    parts.push(`📅 ${startDate} to ${endDate}`);
                }
            } else {
                parts.push(`📅 ${searchParams.datetime.split('T')[0]}`);
            }
        } else {
            parts.push('🕐 Anytime');
        }
        
        // Cloud cover
        if (searchParams.cloudCover !== undefined && searchParams.cloudCover !== null) {
            parts.push(`☁️ <${searchParams.cloudCover}%`);
        }
        
        return parts.join(' • ');
    }
    
    /**
     * Sanitize search parameters for storage
     * @param {Object} searchParams - Raw search parameters
     * @returns {Object} Sanitized search parameters
     */
    sanitizeSearchParams(searchParams) {
        const sanitized = {};
        
        // Copy relevant search parameters
        const allowedKeys = [
            'collection', 'collections', 'collectionTitle', 'catalog', 'datetime', 
            'bbox', 'geometry', 'cloudCover', 'limit', 'query'
        ];
        
        allowedKeys.forEach(key => {
            if (searchParams[key] !== undefined && searchParams[key] !== null && searchParams[key] !== '') {
                sanitized[key] = searchParams[key];
            }
        });
        
        // Normalize collections format - convert collections array to single collection
        if (sanitized.collections && Array.isArray(sanitized.collections) && sanitized.collections.length > 0) {
            sanitized.collection = sanitized.collections[0];
            console.log('🔄 Normalized collections array to single collection:', sanitized.collection);
        }
        
        return sanitized;
    }
    
    /**
     * Check if search parameters are empty
     * @param {Object} searchParams - Search parameters to check
     * @returns {boolean} True if search is empty
     */
    isEmpty(searchParams) {
        if (!searchParams) return true;
        
        const relevantKeys = ['collection', 'collections', 'bbox', 'geometry', 'datetime', 'cloudCover', 'query'];
        
        return !relevantKeys.some(key => {
            const value = searchParams[key];
            return value !== undefined && value !== null && value !== '' && 
                   !(Array.isArray(value) && value.length === 0);
        });
    }
    
    /**
     * Check if two search parameter objects are duplicates
     * @param {Object} params1 - First search parameters
     * @param {Object} params2 - Second search parameters
     * @returns {boolean} True if searches are duplicates
     */
    isDuplicateSearch(params1, params2) {
        const keys = ['collection', 'bbox', 'geometry', 'datetime', 'cloudCover'];
        
        return keys.every(key => {
            const val1 = params1[key];
            const val2 = params2[key];
            
            // Handle arrays (like bbox)
            if (Array.isArray(val1) && Array.isArray(val2)) {
                return JSON.stringify(val1) === JSON.stringify(val2);
            }
            
            return val1 === val2;
        });
    }
    
    /**
     * Clean up old entries (older than 30 days)
     */
    cleanupOldEntries() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let history = this.getHistory();
        
        const originalLength = history.length;
        history = history.filter(entry => entry.timestamp > thirtyDaysAgo);
        
        if (history.length !== originalLength) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(history));
                console.log(`🧹 Cleaned up ${originalLength - history.length} old search entries`);
            } catch (error) {
                console.error('❌ Failed to cleanup old entries:', error);
            }
        }
    }
    
    /**
     * Get search statistics
     * @returns {Object} Search statistics
     */
    getStatistics() {
        const history = this.getHistory();
        
        return {
            totalSearches: history.length,
            averageResultCount: history.length > 0 ? 
                Math.round(history.reduce((sum, entry) => sum + (entry.resultCount || 0), 0) / history.length) : 0,
            mostRecentSearch: history.length > 0 ? new Date(history[0].timestamp) : null,
            oldestSearch: history.length > 0 ? new Date(history[history.length - 1].timestamp) : null
        };
    }
}

// Create and export a singleton instance
export const searchHistoryManager = new SearchHistoryManager();