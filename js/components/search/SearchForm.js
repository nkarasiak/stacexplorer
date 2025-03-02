/**
 * SearchForm.js - Component for search criteria inputs
 */

export class SearchForm {
    /**
     * Create a new SearchForm
     * @param {Object} mapManager - Map manager for coordinating with the map 
     */
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.initFromUrl();
        this.initEventListeners();
    }
    
    /**
     * Initialize form state from URL parameters
     */
    initFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Restore cloud cover state if present in URL
        const cloudCover = urlParams.get('cloudCover');
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverInput = document.getElementById('cloud-cover');
        const cloudCoverControls = document.getElementById('cloud-cover-controls');
        const cloudCoverValue = document.getElementById('cloud-cover-value');
        
        if (cloudCoverEnabled && cloudCoverInput && cloudCoverControls && cloudCoverValue) {
            if (cloudCover !== null) {
                // Enable cloud cover filter
                cloudCoverEnabled.checked = true;
                cloudCoverInput.disabled = false;
                cloudCoverControls.style.display = 'block';
                cloudCoverControls.classList.add('enabled');
                
                // Set the value
                cloudCoverInput.value = cloudCover;
                cloudCoverValue.textContent = `${cloudCover}%`;
            } else {
                // Reset to default state
                cloudCoverEnabled.checked = false;
                cloudCoverInput.disabled = true;
                cloudCoverControls.style.display = 'none';
                cloudCoverControls.classList.remove('enabled');
                cloudCoverInput.value = '100';
                cloudCoverValue.textContent = '100%';
            }
        }
    }
    
    /**
     * Update URL with current form state
     */
    updateUrl() {
        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams(url.search);
        
        // Update cloud cover in URL if enabled
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverInput = document.getElementById('cloud-cover');
        
        if (cloudCoverEnabled?.checked && cloudCoverInput && !cloudCoverInput.disabled) {
            urlParams.set('cloudCover', cloudCoverInput.value);
        } else {
            urlParams.delete('cloudCover');
        }
        
        // Update URL without reloading the page
        url.search = urlParams.toString();
        window.history.replaceState({}, '', url);
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Manual bbox input handling
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            bboxInput.addEventListener('change', (event) => {
                if (this.mapManager) {
                    this.mapManager.updateBBoxFromInput(event.target.value);
                }
            });
        }
        
        // Listen for map draw events
        document.addEventListener('bboxDrawn', (event) => {
            if (event.detail?.bbox) {
                this.updateBBoxInput(event.detail.bbox);
            }
        });

        // Cloud cover handling
        const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
        const cloudCoverControls = document.getElementById('cloud-cover-controls');
        const cloudCoverInput = document.getElementById('cloud-cover');
        const cloudCoverValue = document.getElementById('cloud-cover-value');

        if (cloudCoverEnabled && cloudCoverControls && cloudCoverInput && cloudCoverValue) {
            // Toggle cloud cover controls visibility
            cloudCoverEnabled.addEventListener('change', () => {
                const isEnabled = cloudCoverEnabled.checked;
                cloudCoverControls.style.display = isEnabled ? 'block' : 'none';
                cloudCoverControls.classList.toggle('enabled', isEnabled);
                cloudCoverInput.disabled = !isEnabled;
                
                // Update URL when cloud cover is toggled
                this.updateUrl();
            });

            // Update cloud cover value display and URL
            cloudCoverInput.addEventListener('input', () => {
                cloudCoverValue.textContent = `${cloudCoverInput.value}%`;
                // Update URL when cloud cover value changes
                this.updateUrl();
            });
        }
    }
    
    /**
     * Update the bbox input field with coordinates
     * @param {Array} bbox - Bounding box coordinates [west, south, east, north]
     */
    updateBBoxInput(bbox) {
        if (!bbox?.length === 4) return;
        
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            bboxInput.value = bbox.map(coord => parseFloat(coord).toFixed(6)).join(',');
        }
    }
    
    /**
     * Get search parameters from form
     * @returns {Object} - Search parameters
     */
    getSearchParams() {
        const params = { limit: 50 };
        
        try {
            // Add text search if provided
            const searchText = document.getElementById('search-input')?.value.trim();
            if (searchText) {
                params.query = {
                    "or": [
                        { "contains": ["title", searchText] },
                        { "contains": ["description", searchText] }
                    ]
                };
            }
            
            // Add date range if provided
            const startDate = document.getElementById('date-start')?.value;
            const endDate = document.getElementById('date-end')?.value;
            if (startDate || endDate) {
                params.datetime = `${startDate ? startDate + 'T00:00:00Z' : ''}/${endDate ? endDate + 'T23:59:59Z' : ''}`;
            }
            
            // Add bbox if provided
            const bboxValue = document.getElementById('bbox-input')?.value.trim();
            if (bboxValue) {
                const bbox = bboxValue.split(',').map(Number);
                if (bbox.length === 4 && !bbox.some(isNaN)) {
                    params.bbox = bbox;
                }
            }

            // Add cloud cover if enabled and provided
            const cloudCoverEnabled = document.getElementById('cloud-cover-enabled');
            const cloudCoverInput = document.getElementById('cloud-cover');
            
            if (cloudCoverEnabled?.checked && cloudCoverInput && !cloudCoverInput.disabled) {
                const cloudCoverValue = parseInt(cloudCoverInput.value);
                if (!isNaN(cloudCoverValue)) {
                    params["filter-lang"] = "cql2-json";
                    params.filter = {
                        "op": "and",
                        "args": [
                            {
                                "op": ">=",
                                "args": [{ "property": "eo:cloud_cover" }, 0]
                            },
                            {
                                "op": "<",
                                "args": [{ "property": "eo:cloud_cover" }, cloudCoverValue]
                            }
                        ]
                    };
                }
            }

            // Add collections if they exist in the form
            const collections = document.getElementById('collections')?.value;
            if (collections) {
                params.collections = collections.split(',').map(c => c.trim());
            }

            // Update URL with current state
            this.updateUrl();
        } catch (error) {
            console.error('Error getting search params:', error);
        }
        
        return params;
    }
}