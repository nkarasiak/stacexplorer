import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class CommandPalette extends BaseUIComponent {
    constructor(container = null, options = {}) {
        
        // Singleton pattern - prevent multiple instances
        if (CommandPalette.instance) {
            console.warn('CommandPalette: Instance already exists, returning existing instance');
            return CommandPalette.instance;
        }

        // Command palette creates its own container if none provided
        // Create a temporary div to satisfy BaseUIComponent, then replace it in render()
        const tempContainer = container || document.body;
        
        super(tempContainer, options);
        this.needsOwnContainer = !container;
        
        // Store singleton instance
        CommandPalette.instance = this;
    }

    getDefaultOptions() {
        return {
            placeholder: 'Type a command...',
            maxResults: 8,
            enableFuzzySearch: true,
            enableHistory: true,
            enableKeyboardShortcuts: true,
            theme: 'auto',
            position: 'center',
            showCategories: true,
            enablePreview: true,
            debounceMs: 150,
            shortcuts: {
                toggle: ['shift+/', 'shift+?'],
                close: ['escape'],
                execute: ['enter'],
                nextResult: ['arrowdown', 'tab'],
                prevResult: ['arrowup', 'shift+tab'],
                nextCategory: ['cmd+arrowdown', 'ctrl+arrowdown'],
                prevCategory: ['cmd+arrowup', 'ctrl+arrowup']
            }
        };
    }

    getInitialState() {
        return {
            isOpen: false,
            query: '',
            results: [],
            selectedIndex: 0,
            selectedCategory: null,
            categories: new Map(),
            commands: new Map(),
            history: JSON.parse(localStorage.getItem('command-palette-history') || '[]'),
            recentCommands: [],
            loading: false
        };
    }

    onInit() {
        
        this.registerDefaultCommands();
        this.setupKeyboardShortcuts();
        // Don't attach event listeners here - they'll be attached after render
        this.loadUserPreferences();
        
        // Force reset state to ensure it starts closed AFTER render
        setTimeout(() => {
            this.forceClose();
        }, 10);
        
    }

    // Override BaseUIComponent's onRender to prevent automatic re-rendering
    onRender() {
        // Do nothing - we control our own rendering
    }

    // Override BaseUIComponent's setState to prevent automatic re-rendering
    setState(newState, shouldRender = false) {
        // Call parent setState but never trigger re-render
        super.setState(newState, false);
    }

    // Override BaseUIComponent's updateState to prevent automatic re-rendering  
    updateState(newState, shouldRender = false) {
        // Call parent updateState but never trigger re-render
        super.updateState(newState, false);
    }

    render() {
        
        // Only render once during initialization
        if (this.hasRendered) {
            return;
        }
        
        // Prevent infinite render loops
        if (this.isRendering) {
            return;
        }
        this.isRendering = true;
        
        // Clean up any existing command palette elements first
        const existingPalettes = document.querySelectorAll('.command-palette');
        existingPalettes.forEach(el => el.remove());

        // Generate unique IDs to avoid conflicts
        const inputId = `command-palette-input-${this.componentId}`;
        const titleId = `command-palette-title-${this.componentId}`;
        const resultsId = `command-palette-results-${this.componentId}`;

        const paletteContainer = document.createElement('div');
        paletteContainer.className = `command-palette command-palette--${this.options.position}`;
        paletteContainer.setAttribute('role', 'dialog');
        paletteContainer.setAttribute('aria-modal', 'true');
        paletteContainer.setAttribute('aria-labelledby', titleId);
        paletteContainer.style.display = 'none';

        paletteContainer.innerHTML = `
            <div class="command-palette__backdrop"></div>
            <div class="command-palette__container">
                <div class="command-palette__header">
                    <h2 id="${titleId}" class="command-palette__title visually-hidden">Command Palette</h2>
                    <div class="command-palette__search">
                        <svg class="command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            id="${inputId}"
                            class="command-palette__input"
                            placeholder="${this.options.placeholder}"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-autocomplete="list"
                            aria-controls="${resultsId}"
                            role="combobox"
                        />
                        <div class="command-palette__loading">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>

                <div class="command-palette__content">
                    <div class="command-palette__results" id="${resultsId}" role="listbox" aria-label="Command results">
                        <div class="command-palette__empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <p>No commands found</p>
                            <small>Try a different search term</small>
                        </div>
                    </div>

                    ${this.options.enablePreview ? `
                        <div class="command-palette__preview">
                            <div class="command-palette__preview-content">
                                <div class="command-palette__preview-empty">
                                    <p>Select a command to see details</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="command-palette__footer">
                    <div class="command-palette__shortcuts">
                        <span class="command-palette__shortcut">
                            <kbd>↵</kbd> Execute
                        </span>
                        <span class="command-palette__shortcut">
                            <kbd>↑↓</kbd> Navigate
                        </span>
                        <span class="command-palette__shortcut">
                            <kbd>Esc</kbd> Close
                        </span>
                        <span class="command-palette__shortcut">
                            <kbd>Shift + /</kbd> Open
                        </span>
                    </div>
                </div>
            </div>
        `;

        // Append to document.body if we need our own container, otherwise to the provided container
        const targetContainer = this.needsOwnContainer ? document.body : this.container;
        targetContainer.appendChild(paletteContainer);
        
        this.paletteContainer = paletteContainer;
        this.input = paletteContainer.querySelector('.command-palette__input');
        this.resultsContainer = paletteContainer.querySelector('.command-palette__results');
        this.previewContainer = paletteContainer.querySelector('.command-palette__preview-content');
        this.backdrop = paletteContainer.querySelector('.command-palette__backdrop');
        
        
        // Attach event listeners after elements are created
        this.attachEventListeners();
        
        this.isRendering = false;
        this.hasRendered = true; // Mark as rendered so it won't render again
    }

    registerDefaultCommands() {
        this.registerCategory('navigation', {
            label: 'Navigation',
            icon: '🧭',
            order: 1
        });

        this.registerCategory('search', {
            label: 'Search & Filter',
            icon: '🔍',
            order: 2
        });

        this.registerCategory('settings', {
            label: 'Settings',
            icon: '⚙️',
            order: 3
        });

        this.registerCategory('help', {
            label: 'Help & Support',
            icon: '❓',
            order: 4
        });

        // Default STAC Explorer commands
        this.registerCommand({
            id: 'run-search',
            title: 'Execute Search',
            description: 'Run search with current parameters',
            category: 'search',
            keywords: ['search', 'run', 'execute', 'go', 'find'],
            action: () => {
                const searchBtn = document.getElementById('main-search-btn') ||
                                 document.querySelector('.search-button') ||
                                 document.querySelector('[data-action="search"]');
                if (searchBtn) {
                    searchBtn.click();
                } else {
                    console.error('Search button not found!');
                    // Try alternative search trigger
                    const searchForm = document.getElementById('search-form');
                    if (searchForm) {
                        searchForm.dispatchEvent(new Event('submit'));
                    }
                }
            }
        });

        this.registerCommand({
            id: 'open-settings',
            title: 'Open Settings',
            description: 'Configure application preferences',
            category: 'settings',
            keywords: ['config', 'preferences', 'options'],
            action: () => {
                const settingsBtn = document.getElementById('settings-toggle') || document.querySelector('.settings-toggle');
                if (settingsBtn) {
                    settingsBtn.click();
                } else {
                    console.error('Settings button not found!');
                    // Alternative: try to open settings modal directly
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                        settingsModal.style.display = 'flex';
                    }
                }
            }
        });

        this.registerCommand({
            id: 'clear-cache',
            title: 'Clear Browser Cache',
            description: 'Clear all cached data and reload',
            category: 'settings',
            keywords: ['cache', 'clear', 'reset', 'storage', 'refresh'],
            action: () => {
                if (confirm('This will clear all cached data and reload the page. Continue?')) {
                    // Clear localStorage
                    localStorage.clear();
                    // Clear sessionStorage
                    sessionStorage.clear();
                    // Clear any caches if available
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        }).then(() => {
                            window.location.reload(true);
                        });
                    } else {
                        window.location.reload(true);
                    }
                }
            }
        });

        this.registerCommand({
            id: 'reset-search',
            title: 'Reset Search',
            description: 'Clear all search parameters',
            category: 'search',
            keywords: ['reset', 'clear', 'search', 'parameters'],
            action: () => {
                // Clear location
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.value = '';
                    locationInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Clear dates
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                if (startInput && endInput) {
                    startInput.value = '';
                    endInput.value = '';
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                }
                
                // Clear any additional filters
                if (window.clearLocationPreview) {
                    window.clearLocationPreview();
                }
                if (window.updateSearchSummaryDisplay) {
                    window.updateSearchSummaryDisplay();
                }
            }
        });

        this.registerCommand({
            id: 'export-data',
            title: 'Export Search Results',
            description: 'Export current search results as GeoJSON',
            category: 'navigation',
            keywords: ['export', 'download', 'save', 'geojson'],
            action: () => {
                // Try to find export button
                const exportButton = document.querySelector('[data-action="export"]') || 
                                   document.querySelector('.export-button') ||
                                   document.getElementById('export-results');
                if (exportButton) {
                    exportButton.click();
                } else {
                    console.error('Export button not found');
                    alert('Export functionality not available');
                }
            }
        });

        this.registerCommand({
            id: 'view-results',
            title: 'View Search Results',
            description: 'Open or focus the results panel',
            category: 'navigation',
            keywords: ['results', 'view', 'panel', 'data'],
            action: () => {
                const resultsPanel = document.getElementById('results-panel') ||
                                   document.querySelector('.results-panel') ||
                                   document.querySelector('#search-results');
                if (resultsPanel) {
                    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // If it's collapsible, expand it
                    if (resultsPanel.classList.contains('collapsed')) {
                        resultsPanel.classList.remove('collapsed');
                    }
                } else {
                    console.error('Results panel not found');
                }
            }
        });

        this.registerCommand({
            id: 'open-map',
            title: 'Focus Map View',
            description: 'Switch to or focus the map view',
            category: 'navigation',
            keywords: ['map', 'view', 'focus', 'geography'],
            action: () => {
                const mapContainer = document.getElementById('map') ||
                                   document.querySelector('.map-container') ||
                                   document.querySelector('#mapContainer');
                if (mapContainer) {
                    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Try to focus the map if it has a focus method
                    if (window.map && window.map.getContainer) {
                        window.map.getContainer().focus();
                    }
                } else {
                    console.error('Map container not found');
                }
            }
        });

        this.registerCommand({
            id: 'toggle-theme',
            title: 'Toggle Theme',
            description: 'Switch between light and dark mode',
            category: 'settings',
            keywords: ['theme', 'dark', 'light', 'appearance'],
            action: () => {
                const themeToggle = document.getElementById('theme-toggle');
                if (themeToggle) {
                    themeToggle.click();
                } else {
                    console.error('Theme toggle button not found!');
                }
            }
        });

        this.registerCommand({
            id: 'show-help',
            title: 'Show Help & Documentation',
            description: 'Open help documentation in new tab',
            category: 'help',
            keywords: ['help', 'docs', 'documentation', 'guide', 'readme'],
            action: () => {
                window.open('https://github.com/nkarasiak/stacexplorer/blob/main/README.md', '_blank');
            }
        });

        this.registerCommand({
            id: 'show-shortcuts',
            title: 'Keyboard Shortcuts',
            description: 'Show available keyboard shortcuts',
            category: 'help',
            keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands'],
            action: () => {
                const shortcutsInfo = `
Keyboard Shortcuts:

🔍 Search:
• Shift + / : Open Command Palette
• Escape : Close Command Palette
• ↑↓ : Navigate results
• Enter : Execute command

📍 Navigation:
• Focus location search
• Set date ranges
• Browse collections
• View results

⚙️ Settings:
• Toggle theme
• Clear cache
• Reset search
                `;
                alert(shortcutsInfo);
            }
        });

        this.registerCommand({
            id: 'about-stac-explorer',
            title: 'About STAC Explorer',
            description: 'Information about this application',
            category: 'help',
            keywords: ['about', 'info', 'version', 'stac', 'explorer'],
            action: () => {
                const aboutInfo = `
STAC Explorer v2.9.1

A modern STAC Catalog Explorer with enhanced development workflow.

• 🌍 Search geospatial data catalogs
• 📍 Interactive location search
• 📅 Flexible date range selection
• 🗂️ Browse multiple data sources
• 🎨 Dark/Light theme support

Built with modern web technologies for exploring STAC-compliant data catalogs.
                `;
                alert(aboutInfo);
            }
        });

        // Modern UI interaction commands
        this.registerCommand({
            id: 'focus-location-search',
            title: 'Search Location',
            description: 'Focus location search input',
            category: 'search',
            keywords: ['location', 'area', 'region', 'place', 'city', 'country'],
            action: () => {
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.focus();
                    locationInput.select();
                } else {
                    console.error('Location input not found!');
                }
            }
        });

        this.registerCommand({
            id: 'open-source-selector',
            title: 'Select Data Source',
            description: 'Open source/catalog selection',
            category: 'search',
            keywords: ['source', 'catalog', 'collection', 'data'],
            action: () => {
                const sourceElement = document.getElementById('summary-source');
                if (sourceElement) {
                    sourceElement.click();
                } else {
                    console.error('Source element not found!');
                }
            }
        });

        this.registerCommand({
            id: 'focus-start-date',
            title: 'Set Start Date',
            description: 'Focus start date input',
            category: 'search',
            keywords: ['start', 'date', 'from', 'beginning'],
            action: () => {
                const startDateInput = document.getElementById('date-start');
                if (startDateInput) {
                    startDateInput.focus();
                } else {
                    console.error('Start date input not found!');
                }
            }
        });

        this.registerCommand({
            id: 'focus-end-date',
            title: 'Set End Date',
            description: 'Focus end date input',
            category: 'search',
            keywords: ['end', 'date', 'to', 'until'],
            action: () => {
                const endDateInput = document.getElementById('date-end');
                if (endDateInput) {
                    endDateInput.focus();
                } else {
                    console.error('End date input not found!');
                }
            }
        });

        // Time preset commands with modern date handling
        this.registerCommand({
            id: 'clear-dates',
            title: 'Clear Date Range',
            description: 'Remove all date restrictions',
            category: 'search',
            keywords: ['clear', 'anytime', 'no', 'date', 'restriction', 'all', 'remove'],
            action: () => {
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput) {
                    startInput.value = '';
                    endInput.value = '';
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                    // Update search summary display
                    const summaryDateElement = document.querySelector('#summary-date .search-summary-value');
                    if (summaryDateElement) {
                        summaryDateElement.textContent = 'Anytime';
                    }
                } else {
                    console.error('Date inputs not found!');
                }
            }
        });

        this.registerCommand({
            id: 'set-last-30-days',
            title: 'Last 30 Days',
            description: 'Set date range to past month',
            category: 'search',
            keywords: ['last', '30', 'days', 'month', 'past', 'recent'],
            action: () => {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                const formatDate = (date) => date.toISOString().split('T')[0];
                
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput) {
                    startInput.value = formatDate(startDate);
                    endInput.value = formatDate(endDate);
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                    // Trigger the search summary update
                    if (window.updateSearchSummaryDisplay) {
                        window.updateSearchSummaryDisplay();
                    }
                } else {
                    console.error('Date inputs not found!');
                }
            }
        });

        this.registerCommand({
            id: 'set-last-year',
            title: 'Last Year',
            description: 'Set date range to past year',
            category: 'search',
            keywords: ['last', 'year', '365', 'days', 'annual'],
            action: () => {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                
                const formatDate = (date) => date.toISOString().split('T')[0];
                
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput) {
                    startInput.value = formatDate(startDate);
                    endInput.value = formatDate(endDate);
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                    if (window.updateSearchSummaryDisplay) {
                        window.updateSearchSummaryDisplay();
                    }
                } else {
                    console.error('Date inputs not found!');
                }
            }
        });

        this.registerCommand({
            id: 'set-this-year',
            title: 'This Year',
            description: 'Set date range to current year',
            category: 'search',
            keywords: ['this', 'year', 'current', '2025'],
            action: () => {
                const now = new Date();
                const startDate = new Date(now.getFullYear(), 0, 1); // January 1st
                const endDate = new Date();
                
                const formatDate = (date) => date.toISOString().split('T')[0];
                
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput) {
                    startInput.value = formatDate(startDate);
                    endInput.value = formatDate(endDate);
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                    if (window.updateSearchSummaryDisplay) {
                        window.updateSearchSummaryDisplay();
                    }
                } else {
                    console.error('Date inputs not found!');
                }
            }
        });

        // Location preset commands
        this.registerCommand({
            id: 'search-paris',
            title: 'Search Paris',
            description: 'Set location to Paris, France',
            category: 'search',
            keywords: ['paris', 'france', 'city'],
            action: () => {
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.value = 'Paris, France';
                    locationInput.focus();
                    locationInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.error('Location input not found!');
                }
            }
        });

        this.registerCommand({
            id: 'search-london',
            title: 'Search London',
            description: 'Set location to London, UK',
            category: 'search',
            keywords: ['london', 'uk', 'england', 'britain'],
            action: () => {
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.value = 'London, UK';
                    locationInput.focus();
                    locationInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.error('Location input not found!');
                }
            }
        });

        this.registerCommand({
            id: 'search-new-york',
            title: 'Search New York',
            description: 'Set location to New York, USA',
            category: 'search',
            keywords: ['new', 'york', 'usa', 'america', 'nyc'],
            action: () => {
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.value = 'New York, USA';
                    locationInput.focus();
                    locationInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.error('Location input not found!');
                }
            }
        });

        this.registerCommand({
            id: 'clear-location',
            title: 'Clear Location',
            description: 'Remove location filter',
            category: 'search',
            keywords: ['clear', 'remove', 'location', 'anywhere'],
            action: () => {
                const locationInput = document.getElementById('summary-location-input');
                if (locationInput) {
                    locationInput.value = '';
                    locationInput.dispatchEvent(new Event('input', { bubbles: true }));
                    // Clear any stored location data
                    if (window.clearLocationPreview) {
                        window.clearLocationPreview();
                    }
                } else {
                    console.error('Location input not found!');
                }
            }
        });

        // Quick catalog selection commands (updated for modern source selection)
        this.registerCommand({
            id: 'browse-collections',
            title: 'Browse Collections',
            description: 'Open collection browser modal',
            category: 'search',
            keywords: ['browse', 'collections', 'catalog', 'modal'],
            action: () => {
                // Try to trigger collection browser
                const browseButton = document.querySelector('[data-action="browse-collections"]');
                if (browseButton) {
                    browseButton.click();
                } else {
                    // Fallback to source element click
                    const sourceElement = document.getElementById('summary-source');
                    if (sourceElement) {
                        sourceElement.click();
                    } else {
                        console.error('Collection browser not found!');
                    }
                }
            }
        });

        this.registerCommand({
            id: 'focus-collection-search',
            title: 'Focus Collection Search',
            description: 'Focus search field in collection browser',
            category: 'search',
            keywords: ['focus', 'search', 'collection', 'find', 'filter'],
            action: () => {
                // Try to focus search in open modal
                const searchInput = document.querySelector('#collection-search');
                if (searchInput && searchInput.offsetParent !== null) {
                    // Input exists and is visible
                    searchInput.focus();
                } else {
                    // Open collection browser first, then focus
                    const sourceElement = document.getElementById('summary-source');
                    if (sourceElement) {
                        sourceElement.click();
                        // Focus after modal opens
                        setTimeout(() => {
                            const searchInput = document.querySelector('#collection-search');
                            if (searchInput) {
                                searchInput.focus();
                            }
                        }, 500);
                    } else {
                        console.error('Collection browser not found!');
                    }
                }
            }
        });
    }

    registerCategory(id, config) {
        this.state.categories.set(id, {
            id,
            label: config.label,
            icon: config.icon || '📁',
            order: config.order || 999,
            description: config.description || ''
        });
    }

    registerCommand(command) {
        const fullCommand = {
            id: command.id,
            title: command.title,
            description: command.description || '',
            category: command.category || 'general',
            keywords: command.keywords || [],
            action: command.action || (() => {}),
            shortcut: command.shortcut || null,
            icon: command.icon || null,
            preview: command.preview || null,
            enabled: command.enabled !== false
        };

        this.state.commands.set(command.id, fullCommand);

        if (fullCommand.shortcut && this.options.enableKeyboardShortcuts) {
            this.registerShortcut(fullCommand.shortcut, fullCommand.action);
        }
    }

    setupKeyboardShortcuts() {
        if (!this.options.enableKeyboardShortcuts) {
            return;
        }

        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    }

    handleGlobalKeydown(event) {
        // Safety check to ensure we have a valid event
        if (!event) {
            console.warn('Invalid event in handleGlobalKeydown');
            return;
        }

        try {
            const shortcut = this.formatShortcut(event);

            // Check for toggle shortcut
            if (this.matchesShortcut(shortcut, this.options.shortcuts.toggle)) {
                event.preventDefault();
                this.toggle();
                return;
            }

            // Handle shortcuts when palette is open
            if (this.state.isOpen) {
                this.handlePaletteKeydown(event);
            }
        } catch (error) {
            console.error('Error in handleGlobalKeydown:', error);
        }
    }

    handlePaletteKeydown(event) {
        if (!event) {
            console.warn('Invalid event in handlePaletteKeydown');
            return;
        }

        try {
            const shortcut = this.formatShortcut(event);

            if (this.matchesShortcut(shortcut, this.options.shortcuts.close)) {
                event.preventDefault();
                this.close();
            } else if (this.matchesShortcut(shortcut, this.options.shortcuts.execute)) {
                event.preventDefault();
                this.executeSelected();
            } else if (this.matchesShortcut(shortcut, this.options.shortcuts.nextResult)) {
                event.preventDefault();
                this.selectNext();
            } else if (this.matchesShortcut(shortcut, this.options.shortcuts.prevResult)) {
                event.preventDefault();
                this.selectPrevious();
            }
        } catch (error) {
            console.error('Error in handlePaletteKeydown:', error);
        }
    }

    formatShortcut(event) {
        const parts = [];
        if (event.metaKey || event.ctrlKey) parts.push(event.metaKey ? 'cmd' : 'ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        
        // Safety check for event.key
        if (event.key) {
            parts.push(event.key.toLowerCase());
        } else {
            // Fallback for when event.key is undefined
            console.warn('Event key is undefined, using keyCode fallback');
            parts.push(String.fromCharCode(event.keyCode || event.which || 0).toLowerCase());
        }
        
        return parts.join('+');
    }

    matchesShortcut(shortcut, patterns) {
        return Array.isArray(patterns) ? patterns.includes(shortcut) : patterns === shortcut;
    }

    attachEventListeners() {
        if (this.input) {
            this.addEventListener(this.input, 'input', this.handleInput.bind(this));
            this.addEventListener(this.input, 'keydown', this.handleInputKeydown.bind(this));
        } else {
            console.error('Input element not found for event listeners');
        }
        
        if (this.backdrop) {
            this.addEventListener(this.backdrop, 'click', (event) => {
                // Only close if clicking directly on the backdrop, not on child elements
                if (event.target === this.backdrop) {
                    this.close();
                } else {
                }
            });
        }
        
        if (this.resultsContainer) {
            this.addEventListener(this.resultsContainer, 'click', this.handleResultClick.bind(this));
            this.addEventListener(this.resultsContainer, 'mouseover', this.handleResultHover.bind(this));
        }
    }

    handleInput(event) {
        const query = event.target.value;
        this.state.query = query; // Direct state update to avoid re-render
        this.debounceSearch();
    }

    handleInputKeydown(event) {
        // Don't interfere with normal typing
        if (event.key.length === 1) return;
        
        // Let the global handler deal with navigation
    }

    handleResultClick(event) {
        const resultElement = event.target.closest('.command-palette__result');
        if (!resultElement) {
            return;
        }

        const index = parseInt(resultElement.dataset.index, 10);
        this.state.selectedIndex = index; // Direct state update
        this.executeSelected();
    }

    handleResultHover(event) {
        const resultElement = event.target.closest('.command-palette__result');
        if (!resultElement) return;

        const index = parseInt(resultElement.dataset.index, 10);
        this.updateState({ selectedIndex: index });
        this.updateSelection();
        this.updatePreview();
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, this.options.debounceMs);
    }

    async performSearch() {
        const { query } = this.state;
        
        this.state.loading = true;
        this.toggleLoading(true);

        try {
            let results = [];

            if (query.trim()) {
                results = this.searchCommands(query);
            } else {
                results = this.getRecentCommands();
                
                // If no recent commands, show all commands
                if (results.length === 0) {
                    results = Array.from(this.state.commands.values())
                        .filter(command => command.enabled)
                        .slice(0, this.options.maxResults);
                }
            }

            this.state.results = results;
            this.state.selectedIndex = 0;
            this.state.loading = false;

            this.renderResults();
            this.updateSelection();
            this.updatePreview();
        } finally {
            this.toggleLoading(false);
        }
    }

    searchCommands(query) {
        const normalizedQuery = query.toLowerCase();
        const results = [];

        for (const command of this.state.commands.values()) {
            if (!command.enabled) continue;

            const score = this.calculateRelevanceScore(command, normalizedQuery);
            if (score > 0) {
                results.push({ ...command, score });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, this.options.maxResults);
    }

    calculateRelevanceScore(command, query) {
        let score = 0;
        const { title, description, keywords } = command;

        // Exact title match
        if (title.toLowerCase() === query) {
            score += 100;
        }
        // Title starts with query
        else if (title.toLowerCase().startsWith(query)) {
            score += 80;
        }
        // Title contains query
        else if (title.toLowerCase().includes(query)) {
            score += 60;
        }

        // Description contains query
        if (description.toLowerCase().includes(query)) {
            score += 30;
        }

        // Keywords match
        keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(query)) {
                score += 40;
            }
        });

        // Fuzzy matching for typos
        if (this.options.enableFuzzySearch && score === 0) {
            const fuzzyScore = this.fuzzyMatch(title.toLowerCase(), query);
            if (fuzzyScore > 0.7) {
                score += fuzzyScore * 20;
            }
        }

        return score;
    }

    fuzzyMatch(text, pattern) {
        const textLen = text.length;
        const patternLen = pattern.length;
        
        if (patternLen > textLen) return 0;
        if (patternLen === textLen) return text === pattern ? 1 : 0;

        let score = 0;
        let textIndex = 0;
        let patternIndex = 0;

        while (patternIndex < patternLen && textIndex < textLen) {
            if (text[textIndex] === pattern[patternIndex]) {
                score++;
                patternIndex++;
            }
            textIndex++;
        }

        return patternIndex === patternLen ? score / patternLen : 0;
    }

    getRecentCommands() {
        const recentIds = this.state.history.slice(-this.options.maxResults);
        return recentIds
            .map(id => this.state.commands.get(id))
            .filter(command => command && command.enabled)
            .reverse();
    }

    renderResults() {
        const { results } = this.state;

        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="command-palette__empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <p>No commands found</p>
                    <small>Try a different search term</small>
                </div>
            `;
            return;
        }

        const groupedResults = this.options.showCategories ? this.groupByCategory(results) : new Map([['all', results]]);
        let html = '';

        for (const [categoryId, commands] of groupedResults) {
            if (this.options.showCategories && categoryId !== 'all') {
                const category = this.state.categories.get(categoryId);
                html += `
                    <div class="command-palette__category">
                        <span class="command-palette__category-icon">${category?.icon || '📁'}</span>
                        <span class="command-palette__category-label">${category?.label || categoryId}</span>
                    </div>
                `;
            }

            commands.forEach((command, index) => {
                const globalIndex = results.indexOf(command);
                html += `
                    <div 
                        class="command-palette__result" 
                        data-index="${globalIndex}"
                        role="option"
                        aria-selected="false"
                    >
                        <div class="command-palette__result-content">
                            ${command.icon ? `<span class="command-palette__result-icon">${command.icon}</span>` : ''}
                            <div class="command-palette__result-main">
                                <div class="command-palette__result-title">${this.highlightMatch(command.title, this.state.query)}</div>
                                ${command.description ? `<div class="command-palette__result-description">${command.description}</div>` : ''}
                            </div>
                            ${command.shortcut ? `<div class="command-palette__result-shortcut"><kbd>${command.shortcut}</kbd></div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        this.resultsContainer.innerHTML = html;
    }

    groupByCategory(results) {
        const grouped = new Map();
        
        // Sort categories by order
        const sortedCategories = Array.from(this.state.categories.values())
            .sort((a, b) => a.order - b.order);

        // Initialize with ordered categories
        sortedCategories.forEach(category => {
            grouped.set(category.id, []);
        });

        // Group results
        results.forEach(result => {
            const categoryId = result.category || 'general';
            if (!grouped.has(categoryId)) {
                grouped.set(categoryId, []);
            }
            grouped.get(categoryId).push(result);
        });

        // Remove empty categories
        for (const [categoryId, commands] of grouped) {
            if (commands.length === 0) {
                grouped.delete(categoryId);
            }
        }

        return grouped;
    }

    highlightMatch(text, query) {
        if (!query.trim()) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    updateSelection() {
        const results = this.resultsContainer.querySelectorAll('.command-palette__result');
        results.forEach((result, index) => {
            const isSelected = index === this.state.selectedIndex;
            result.classList.toggle('command-palette__result--selected', isSelected);
            result.setAttribute('aria-selected', isSelected.toString());
        });

        // Scroll selected item into view
        const selectedResult = results[this.state.selectedIndex];
        if (selectedResult) {
            selectedResult.scrollIntoView({ block: 'nearest' });
        }
    }

    updatePreview() {
        if (!this.options.enablePreview || !this.previewContainer) return;

        const selectedCommand = this.state.results[this.state.selectedIndex];
        
        if (!selectedCommand) {
            this.previewContainer.innerHTML = `
                <div class="command-palette__preview-empty">
                    <p>Select a command to see details</p>
                </div>
            `;
            return;
        }

        const category = this.state.categories.get(selectedCommand.category);
        
        this.previewContainer.innerHTML = `
            <div class="command-palette__preview-header">
                <h3>${selectedCommand.title}</h3>
                ${category ? `<span class="command-palette__preview-category">${category.icon} ${category.label}</span>` : ''}
            </div>
            <div class="command-palette__preview-description">
                ${selectedCommand.description || 'No description available'}
            </div>
            ${selectedCommand.shortcut ? `
                <div class="command-palette__preview-shortcut">
                    <strong>Shortcut:</strong> <kbd>${selectedCommand.shortcut}</kbd>
                </div>
            ` : ''}
            ${selectedCommand.keywords.length > 0 ? `
                <div class="command-palette__preview-keywords">
                    <strong>Keywords:</strong> ${selectedCommand.keywords.join(', ')}
                </div>
            ` : ''}
        `;
    }

    selectNext() {
        const maxIndex = this.state.results.length - 1;
        const nextIndex = this.state.selectedIndex < maxIndex ? this.state.selectedIndex + 1 : 0;
        this.updateState({ selectedIndex: nextIndex });
        this.updateSelection();
        this.updatePreview();
    }

    selectPrevious() {
        const maxIndex = this.state.results.length - 1;
        const prevIndex = this.state.selectedIndex > 0 ? this.state.selectedIndex - 1 : maxIndex;
        this.updateState({ selectedIndex: prevIndex });
        this.updateSelection();
        this.updatePreview();
    }

    executeSelected() {
        
        const selectedCommand = this.state.results[this.state.selectedIndex];
        if (!selectedCommand) {
            console.error('No selected command found!');
            return;
        }

        this.addToHistory(selectedCommand.id);
        
        try {
            if (typeof selectedCommand.action === 'function') {
                selectedCommand.action();
            } else {
                console.error('Command action is not a function:', typeof selectedCommand.action);
            }
            
            this.emit('command-executed', { 
                command: selectedCommand.id, 
                commandData: selectedCommand 
            });
        } catch (error) {
            console.error('Command execution error:', error);
            this.emit('command-error', { 
                command: selectedCommand.id, 
                error 
            });
        }

        // Add small delay to allow dropdown to establish before closing
        setTimeout(() => {
            this.close();
        }, 100);
    }

    addToHistory(commandId) {
        if (!this.options.enableHistory) return;

        let history = [...this.state.history];
        
        // Remove existing entry
        history = history.filter(id => id !== commandId);
        
        // Add to end
        history.push(commandId);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history = history.slice(-50);
        }

        this.updateState({ history });
        localStorage.setItem('command-palette-history', JSON.stringify(history));
    }

    toggleLoading(loading) {
        this.paletteContainer.classList.toggle('command-palette--loading', loading);
    }

    open() {
        
        // Check if palette container exists and is actually visible
        if (this.paletteContainer) {
            const isVisible = this.paletteContainer.style.display !== 'none' && 
                             this.paletteContainer.classList.contains('command-palette--open');
            
            if (this.state.isOpen && isVisible) {
                return;
            }
        }

        // Update state without triggering render to avoid infinite loop
        this.state.isOpen = true;
        this.state.query = '';
        this.state.selectedIndex = 0;

        if (!this.paletteContainer) {
            console.error('No palette container found!');
            return;
        }

        // Prevent any further renders during this operation
        this.isRendering = true;

        this.paletteContainer.style.display = 'flex';
        this.input.value = '';
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.paletteContainer.classList.add('command-palette--open');
            
            // Force focus on the input with multiple attempts
            if (this.input) {
                // Ensure input is focusable
                this.input.disabled = false;
                this.input.readOnly = false;
                this.input.tabIndex = 0;
                
                
                // Immediate focus
                this.input.focus();
                
                // Focus again after a short delay to ensure animation is complete
                setTimeout(() => {
                    this.input.focus();
                    this.input.select(); // Also select any existing text
                }, 100);
                
                // Final focus attempt
                setTimeout(() => {
                    if (document.activeElement !== this.input) {
                        this.input.focus();
                    } else {
                    }
                }, 250);
            } else {
                console.error('Input element not found for focusing!');
            }
            
            
            // Re-enable rendering after a delay
            setTimeout(() => {
                this.isRendering = false;
            }, 100);
        });

        this.performSearch(); // Load recent commands
        this.emit('palette-opened');
    }

    close() {
        if (!this.state.isOpen) return;

        this.updateState({ isOpen: false });
        this.paletteContainer.classList.remove('command-palette--open');

        setTimeout(() => {
            this.paletteContainer.style.display = 'none';
        }, 200);

        this.emit('palette-closed');
    }

    forceClose() {
        // Update state without triggering render to avoid infinite loop
        this.state.isOpen = false;
        
        if (this.paletteContainer) {
            this.paletteContainer.classList.remove('command-palette--open');
            this.paletteContainer.style.display = 'none';
        }
    }

    toggle() {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }


    loadUserPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('command-palette-preferences') || '{}');
            // Apply saved preferences
            if (preferences.theme) {
                this.paletteContainer.setAttribute('data-theme', preferences.theme);
            }
        } catch (error) {
            console.warn('Failed to load command palette preferences:', error);
        }
    }

    registerShortcut(shortcut, action) {
        // Register global shortcut handling would go here
        // This is a simplified version
    }

    destroy() {
        clearTimeout(this.searchTimeout);
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        
        if (this.paletteContainer && this.paletteContainer.parentNode) {
            this.paletteContainer.remove();
        }
        
        // Clear singleton instance
        CommandPalette.instance = null;
        
        super.destroy();
    }
}

// Singleton instance will be created in app.js