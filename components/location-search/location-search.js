// Location Search Component
class LocationSearch {
    constructor() {
        this.map = null;
        this.draw = null;
        this.searchArea = null;
    }

    init(map) {
        this.map = map;
        this.initializeDrawingTools();
        this.setupEventListeners();
    }

    initializeDrawingTools() {
        // Initialize drawing tools
        this.draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            }
        });
        this.map.addControl(this.draw);
    }

    setupEventListeners() {
        this.map.on('draw.create', (e) => {
            this.searchArea = e.features[0];
            this.updateSearchArea();
        });

        this.map.on('draw.delete', () => {
            this.searchArea = null;
            this.updateSearchArea();
        });
    }

    updateSearchArea() {
        // Emit event for other components
        const event = new CustomEvent('searchAreaUpdated', {
            detail: { searchArea: this.searchArea }
        });
        document.dispatchEvent(event);
    }

    getSearchArea() {
        return this.searchArea;
    }

    clearSearchArea() {
        this.draw.deleteAll();
        this.searchArea = null;
    }
}

export default LocationSearch; 