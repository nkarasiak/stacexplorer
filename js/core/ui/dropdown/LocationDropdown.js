/**
 * LocationDropdown - Location search and handling
 * Handles geocoding, geometry parsing, and location selection
 */

import { isWKT, wktToGeoJSON, isGeoJSON, parseGeoJSON } from '../../../utils/GeometryUtils.js';

export class LocationDropdown {
    constructor(geocodingService, mapManager, notificationService) {
        this.geocodingService = geocodingService;
        this.mapManager = mapManager;
        this.notificationService = notificationService;
        this.selectedLocationResult = null;
    }

    /**
     * Create location dropdown content
     */
    createLocationDropdownContent() {
        return `
            <div class="dropdown-section">
                <div class="dropdown-header">
                    <h3>Search Location</h3>
                </div>
                
                <div class="location-search-container">
                    <input type="text" 
                           id="location-search-input" 
                           class="location-search-input" 
                           placeholder="Search city, country, or paste coordinates/geometry..."
                           autocomplete="off">
                    <div class="search-suggestions" id="location-suggestions" style="display: none;"></div>
                </div>
                
                <div class="location-tools">
                    <button id="draw-bbox-btn" class="location-tool-btn">
                        <i class="material-icons">crop_free</i>
                        Draw Area on Map
                    </button>
                    <button id="from-view-btn" class="location-tool-btn">
                        <i class="material-icons">visibility</i>
                        Use Current Map View
                    </button>
                </div>
                
                <div class="quick-locations">
                    <h4>Quick Locations</h4>
                    <div class="quick-location-grid">
                        <button class="quick-location-btn" data-location="global">🌍 Global</button>
                        <button class="quick-location-btn" data-location="north-america">🌎 North America</button>
                        <button class="quick-location-btn" data-location="europe">🌍 Europe</button>
                        <button class="quick-location-btn" data-location="asia">🌏 Asia</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up location dropdown event handlers
     */
    setupLocationDropdownHandlers(dropdown) {
        const searchInput = dropdown.querySelector('#location-search-input');
        const suggestions = dropdown.querySelector('#location-suggestions');
        const drawBboxBtn = dropdown.querySelector('#draw-bbox-btn');
        const fromViewBtn = dropdown.querySelector('#from-view-btn');
        const quickLocationBtns = dropdown.querySelectorAll('.quick-location-btn');

        // Search input handling
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    suggestions.style.display = 'none';
                    return;
                }

                // Check for geometry formats first
                const geometryResult = this.parseGeometry(query);
                if (geometryResult) {
                    this.handlePastedGeometry(geometryResult, query);
                    return;
                }

                // Search for locations
                searchTimeout = setTimeout(() => {
                    this.searchLocations(query, suggestions);
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value.trim();
                    if (query) {
                        this.searchLocations(query, suggestions);
                    }
                }
            });
        }

        // Drawing tools
        if (drawBboxBtn) {
            drawBboxBtn.addEventListener('click', () => {
                this.startDrawingBbox();
            });
        }

        if (fromViewBtn) {
            fromViewBtn.addEventListener('click', () => {
                this.useCurrentMapView();
            });
        }

        // Quick locations
        quickLocationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const location = btn.dataset.location;
                this.selectQuickLocation(location);
            });
        });
    }

    /**
     * Search for locations using geocoding service
     */
    async searchLocations(query, suggestionsContainer) {
        try {
            const results = await this.geocodingService.search(query);
            this.displayLocationSuggestions(results, suggestionsContainer);
        } catch (error) {
            console.error('Error searching locations:', error);
            suggestionsContainer.innerHTML = '<div class="suggestion-error">Search failed. Please try again.</div>';
            suggestionsContainer.style.display = 'block';
        }
    }

    /**
     * Display location suggestions
     */
    displayLocationSuggestions(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="no-suggestions">No locations found</div>';
        } else {
            container.innerHTML = results.map(result => `
                <div class="location-suggestion" data-result='${JSON.stringify(result)}'>
                    <div class="suggestion-name">${result.display_name || result.name}</div>
                    ${result.type ? `<div class="suggestion-type">${result.type}</div>` : ''}
                </div>
            `).join('');

            // Add click handlers to suggestions
            container.querySelectorAll('.location-suggestion').forEach(suggestion => {
                suggestion.addEventListener('click', () => {
                    const result = JSON.parse(suggestion.dataset.result);
                    this.selectLocation(result);
                });
            });
        }
        
        container.style.display = 'block';
    }

    /**
     * Parse geometry from text input
     */
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
    }

    /**
     * Handle pasted geometry
     */
    handlePastedGeometry(geometryResult, originalText) {
        const displayText = `${geometryResult.format.toUpperCase()} geometry`;
        this.selectedLocationResult = {
            display_name: displayText,
            shortName: displayText,
            formattedName: displayText,
            geometry: geometryResult.geoJSON,
            bbox: this.extractBboxFromGeometry(geometryResult.geoJSON),
            wkt: geometryResult.format === 'WKT' ? originalText : null
        };
        
        this.notificationService?.showNotification(
            `✅ ${geometryResult.format} geometry detected and parsed successfully`,
            'success'
        );
    }

    /**
     * Extract bbox from geometry
     */
    extractBboxFromGeometry(geometry) {
        if (!geometry || !geometry.coordinates) return null;
        
        let coords = [];
        if (geometry.type === 'Point') {
            coords = [geometry.coordinates];
        } else if (geometry.type === 'Polygon') {
            coords = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            coords = geometry.coordinates[0][0];
        }
        
        if (coords.length === 0) return null;
        
        const lngs = coords.map(coord => coord[0]);
        const lats = coords.map(coord => coord[1]);
        
        return [
            Math.min(...lngs), // west
            Math.min(...lats), // south
            Math.max(...lngs), // east
            Math.max(...lats)  // north
        ];
    }

    /**
     * Select a location from search results
     */
    selectLocation(result) {
        this.selectedLocationResult = result;
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('locationSelected', {
            detail: { locationResult: result }
        }));
        
        console.log('Location selected:', result);
    }

    /**
     * Start drawing bbox on map
     */
    startDrawingBbox() {
        if (this.mapManager && this.mapManager.startDrawingBbox) {
            this.mapManager.startDrawingBbox((bbox) => {
                this.handleDrawnBbox(bbox);
            });
        }
    }

    /**
     * Handle drawn bbox
     */
    handleDrawnBbox(bbox) {
        this.selectedLocationResult = {
            display_name: 'Custom drawn area',
            shortName: 'Drawn area',
            formattedName: 'Custom drawn area',
            bbox: bbox,
            geometry: this.bboxToGeometry(bbox)
        };
        
        document.dispatchEvent(new CustomEvent('locationSelected', {
            detail: { locationResult: this.selectedLocationResult }
        }));
    }

    /**
     * Use current map view as location
     */
    useCurrentMapView() {
        if (this.mapManager && this.mapManager.getMap) {
            const map = this.mapManager.getMap();
            if (map) {
                const bounds = map.getBounds();
                const bbox = [
                    bounds.getWest(),
                    bounds.getSouth(),
                    bounds.getEast(),
                    bounds.getNorth()
                ];
                
                this.selectedLocationResult = {
                    display_name: 'Current map view',
                    shortName: 'Map view',
                    formattedName: 'Current map view',
                    bbox: bbox,
                    geometry: this.bboxToGeometry(bbox)
                };
                
                document.dispatchEvent(new CustomEvent('locationSelected', {
                    detail: { locationResult: this.selectedLocationResult }
                }));
            }
        }
    }

    /**
     * Select quick location
     */
    selectQuickLocation(location) {
        const quickLocations = {
            'global': {
                display_name: 'Global',
                bbox: [-180, -90, 180, 90]
            },
            'north-america': {
                display_name: 'North America',
                bbox: [-170, 15, -50, 75]
            },
            'europe': {
                display_name: 'Europe',
                bbox: [-25, 35, 45, 75]
            },
            'asia': {
                display_name: 'Asia',
                bbox: [60, 10, 180, 75]
            }
        };
        
        const locationData = quickLocations[location];
        if (locationData) {
            this.selectedLocationResult = {
                ...locationData,
                shortName: locationData.display_name,
                formattedName: locationData.display_name,
                geometry: this.bboxToGeometry(locationData.bbox)
            };
            
            document.dispatchEvent(new CustomEvent('locationSelected', {
                detail: { locationResult: this.selectedLocationResult }
            }));
        }
    }

    /**
     * Convert bbox to geometry
     */
    bboxToGeometry(bbox) {
        return {
            type: 'Polygon',
            coordinates: [[
                [bbox[0], bbox[1]], // sw
                [bbox[2], bbox[1]], // se
                [bbox[2], bbox[3]], // ne
                [bbox[0], bbox[3]], // nw
                [bbox[0], bbox[1]]  // close
            ]]
        };
    }

    /**
     * Get selected location result
     */
    getSelectedLocationResult() {
        return this.selectedLocationResult;
    }

    /**
     * Clear selected location
     */
    clearSelectedLocation() {
        this.selectedLocationResult = null;
    }
}