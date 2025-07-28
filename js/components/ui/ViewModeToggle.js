/**
 * ViewModeToggle.js - Toggle between map search and catalog browse modes
 */

export class ViewModeToggle {
    constructor() {
        this.currentMode = 'map';
        this.onModeChange = null;
        
        this.init();
    }
    
    init() {
        this.createToggle();
        this.setupEventListeners();
    }
    
    createToggle() {
        console.log('🔧 Creating ViewModeToggle');
        
        const existingToggle = document.getElementById('view-mode-toggle');
        if (existingToggle) {
            console.log('🗑️ Removing existing toggle');
            existingToggle.remove();
        }
        
        const toggle = document.createElement('div');
        toggle.id = 'view-mode-toggle';
        toggle.className = 'view-mode-toggle';
        
        toggle.innerHTML = `
            <div class="toggle-container">
                <button id="map-mode-btn" class="toggle-btn active" style="display: none;">
                    <i class="material-icons">map</i>
                    <span>Map Search</span>
                </button>
                <button id="catalog-mode-btn" class="toggle-btn" style="display: none;">
                    <i class="material-icons">folder_open</i>
                    <span>Catalog Browse</span>
                </button>
            </div>
        `;
        
        // Try multiple possible containers for the toggle
        const searchContainer = document.getElementById('search-container');
        const searchPanel = document.getElementById('search-panel');
        const sidebarContent = document.querySelector('.sidebar-content');
        
        console.log('🎯 Container search results:', {
            searchContainer: !!searchContainer,
            searchPanel: !!searchPanel,
            sidebarContent: !!sidebarContent
        });
        
        if (searchContainer) {
            console.log('✅ Adding toggle to search-container');
            searchContainer.insertBefore(toggle, searchContainer.firstChild);
        } else if (searchPanel) {
            console.log('✅ Adding toggle to search-panel');
            searchPanel.insertBefore(toggle, searchPanel.firstChild);
        } else if (sidebarContent) {
            console.log('✅ Adding toggle to sidebar-content');
            sidebarContent.insertBefore(toggle, sidebarContent.firstChild);
        } else {
            console.log('⚠️ No container found, adding to body');
            document.body.appendChild(toggle);
        }
        
        console.log('📍 Toggle element:', toggle, 'Added to DOM:', document.getElementById('view-mode-toggle'));
        
        this.toggle = toggle;
    }
    
    setupEventListeners() {
        document.getElementById('map-mode-btn').addEventListener('click', () => {
            this.setMode('map');
        });
        
        document.getElementById('catalog-mode-btn').addEventListener('click', () => {
            this.setMode('catalog');
        });
    }
    
    setMode(mode, silent = false) {
        if (this.currentMode === mode) return;
        
        this.currentMode = mode;
        this.updateToggleState();
        
        // Only emit event and call handlers if not in silent mode
        if (!silent) {
            // Emit event for PathRouter
            document.dispatchEvent(new CustomEvent('viewModeChanged', {
                detail: { mode: mode }
            }));
            
            if (this.onModeChange) {
                this.onModeChange(mode);
            }
        }
    }
    
    updateToggleState() {
        const mapBtn = document.getElementById('map-mode-btn');
        const catalogBtn = document.getElementById('catalog-mode-btn');
        
        mapBtn.classList.toggle('active', this.currentMode === 'map');
        catalogBtn.classList.toggle('active', this.currentMode === 'catalog');
        
        this.updateLayoutMode();
    }
    
    updateLayoutMode() {
        const searchPanel = document.getElementById('search-panel');
        const mapContainer = document.getElementById('map-container');
        const catalogBrowser = document.getElementById('catalog-browser-panel');
        
        if (this.currentMode === 'catalog') {
            if (searchPanel) searchPanel.classList.add('catalog-mode');
            if (mapContainer) mapContainer.classList.add('catalog-mode');
            if (catalogBrowser) catalogBrowser.classList.remove('hidden');
        } else {
            if (searchPanel) searchPanel.classList.remove('catalog-mode');
            if (mapContainer) mapContainer.classList.remove('catalog-mode');
            if (catalogBrowser) catalogBrowser.classList.add('hidden');
        }
    }
    
    getCurrentMode() {
        return this.currentMode;
    }
    
    setModeChangeHandler(handler) {
        this.onModeChange = handler;
    }
}