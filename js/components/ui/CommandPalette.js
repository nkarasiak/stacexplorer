import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class CommandPalette extends BaseUIComponent {
    constructor(container = null, options = {}) {
        console.log('🎯 CommandPalette constructor called', { container, options });
        
        // Singleton pattern - prevent multiple instances
        if (CommandPalette.instance) {
            console.warn('CommandPalette: Instance already exists, returning existing instance');
            return CommandPalette.instance;
        }

        // Command palette creates its own container if none provided
        // Create a temporary div to satisfy BaseUIComponent, then replace it in render()
        const tempContainer = container || document.body;
        console.log('🎯 Using container:', tempContainer);
        
        super(tempContainer, options);
        this.needsOwnContainer = !container;
        
        // Store singleton instance
        CommandPalette.instance = this;
        console.log('🎯 CommandPalette instance created and stored');
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
        console.log('🎯 Getting initial state - palette should be closed');
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
        console.log('🎯 CommandPalette onInit called');
        
        this.registerDefaultCommands();
        this.setupKeyboardShortcuts();
        // Don't attach event listeners here - they'll be attached after render
        this.loadUserPreferences();
        
        // Force reset state to ensure it starts closed AFTER render
        setTimeout(() => {
            this.forceClose();
        }, 10);
        
        console.log('🎯 CommandPalette initialization complete');
    }

    // Override BaseUIComponent's onRender to prevent automatic re-rendering
    onRender() {
        console.log('🎯 onRender called - skipping to prevent re-render loops');
        // Do nothing - we control our own rendering
    }

    // Override BaseUIComponent's setState to prevent automatic re-rendering
    setState(newState, shouldRender = false) {
        console.log('🎯 setState called, shouldRender:', shouldRender);
        // Call parent setState but never trigger re-render
        super.setState(newState, false);
    }

    // Override BaseUIComponent's updateState to prevent automatic re-rendering  
    updateState(newState, shouldRender = false) {
        console.log('🎯 updateState called, shouldRender:', shouldRender);
        // Call parent updateState but never trigger re-render
        super.updateState(newState, false);
    }

    render() {
        console.log('🎯 CommandPalette render() called');
        
        // Only render once during initialization
        if (this.hasRendered) {
            console.log('🎯 Already rendered, skipping...');
            return;
        }
        
        // Prevent infinite render loops
        if (this.isRendering) {
            console.log('🎯 Currently rendering, skipping...');
            return;
        }
        this.isRendering = true;
        
        // Clean up any existing command palette elements first
        const existingPalettes = document.querySelectorAll('.command-palette');
        existingPalettes.forEach(el => el.remove());
        console.log('🎯 Cleaned up existing palettes:', existingPalettes.length);

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
        console.log('🎯 Palette container appended to:', targetContainer);
        
        this.paletteContainer = paletteContainer;
        this.input = paletteContainer.querySelector('.command-palette__input');
        this.resultsContainer = paletteContainer.querySelector('.command-palette__results');
        this.previewContainer = paletteContainer.querySelector('.command-palette__preview-content');
        this.backdrop = paletteContainer.querySelector('.command-palette__backdrop');
        
        console.log('🎯 Palette elements found:', {
            input: !!this.input,
            results: !!this.resultsContainer,
            preview: !!this.previewContainer,
            backdrop: !!this.backdrop
        });
        
        // Attach event listeners after elements are created
        this.attachEventListeners();
        
        this.isRendering = false;
        this.hasRendered = true; // Mark as rendered so it won't render again
        console.log('🎯 Render complete - will not render again');
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
            id: 'search-collections',
            title: 'Run Search',
            description: 'Search through STAC collections',
            category: 'search',
            keywords: ['collection', 'catalog', 'browse'],
            action: () => {
                console.log('🎯 Run Search command executing...');
                const searchBtn = document.getElementById('main-search-btn');
                if (searchBtn) {
                    searchBtn.click();
                    console.log('🎯 Search button clicked');
                } else {
                    console.error('🎯 Search button not found!');
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
                console.log('🎯 Open Settings command executing...');
                const settingsBtn = document.getElementById('settings-toggle') || document.querySelector('.settings-toggle');
                if (settingsBtn) {
                    settingsBtn.click();
                    console.log('🎯 Settings button clicked');
                } else {
                    console.error('🎯 Settings button not found!');
                    // Alternative: try to open settings modal directly
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                        settingsModal.style.display = 'flex';
                        console.log('🎯 Settings modal opened directly');
                    }
                }
            }
        });

        this.registerCommand({
            id: 'clear-cache',
            title: 'Clear Cache',
            description: 'Clear all cached data',
            category: 'settings',
            keywords: ['cache', 'clear', 'reset', 'storage'],
            action: () => {
                console.log('🎯 Clear Cache command executing...');
                if (window.stacExplorer && window.stacExplorer.cache && window.stacExplorer.cache.clearAll) {
                    window.stacExplorer.cache.clearAll();
                    console.log('🎯 Cache cleared successfully');
                    // Show a notification if possible
                    if (window.stacExplorer.notificationService) {
                        window.stacExplorer.notificationService.showNotification('Cache cleared successfully', 'success');
                    }
                } else {
                    console.error('🎯 Cache clearing functionality not available');
                }
            }
        });

        this.registerCommand({
            id: 'export-data',
            title: 'Export Data',
            description: 'Export current search results',
            category: 'navigation',
            keywords: ['export', 'download', 'save'],
            action: () => {
                console.log('🎯 Export Data command executing...');
                // Try to find export functionality in the results panel
                if (window.stacExplorer && window.stacExplorer.resultsPanel) {
                    // Try to trigger export if available
                    console.log('🎯 Results panel found, trying to export...');
                    // For now, just log that this would export
                    console.log('🎯 Export functionality would be triggered here');
                    alert('Export functionality would be implemented here');
                } else {
                    console.error('🎯 Results panel not found for export');
                    alert('No data available to export');
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
                console.log('🎯 Toggle Theme command executing...');
                const themeToggle = document.getElementById('theme-toggle');
                if (themeToggle) {
                    themeToggle.click();
                    console.log('🎯 Theme toggle button clicked');
                } else {
                    console.error('🎯 Theme toggle button not found!');
                }
            }
        });

        this.registerCommand({
            id: 'show-help',
            title: 'Show Help',
            description: 'Open help documentation',
            category: 'help',
            keywords: ['help', 'docs', 'documentation', 'guide'],
            action: () => {
                console.log('🎯 Show Help command executing...');
                // Open help in a new tab
                window.open('https://github.com/nkarasiak/stacexplorer/blob/main/README.md', '_blank');
                console.log('🎯 Help documentation opened in new tab');
            }
        });

        // Dropdown interaction commands
        this.registerCommand({
            id: 'open-source-dropdown',
            title: 'Select Collection',
            description: 'Open source/catalog selection',
            category: 'search',
            keywords: ['source', 'catalog', 'collection', 'data'],
            action: () => {
                console.log('🎯 Opening source dropdown...');
                const sourceElement = document.getElementById('summary-source');
                if (sourceElement) {
                    sourceElement.click();
                    console.log('🎯 Source dropdown opened');
                } else {
                    console.error('🎯 Source element not found!');
                }
            }
        });

        this.registerCommand({
            id: 'open-location-dropdown',
            title: 'Select Location',
            description: 'Open location selection',
            category: 'search',
            keywords: ['location', 'area', 'region', 'bbox'],
            action: () => {
                console.log('🎯 Opening location dropdown...');
                const locationElement = document.getElementById('summary-location');
                if (locationElement) {
                    locationElement.click();
                    console.log('🎯 Location dropdown opened');
                } else {
                    console.error('🎯 Location element not found!');
                }
            }
        });

        this.registerCommand({
            id: 'open-time-dropdown',
            title: 'Select Time Range',
            description: 'Open time range selection',
            category: 'search',
            keywords: ['time', 'date', 'period', 'range'],
            action: () => {
                console.log('🎯 Opening time dropdown...');
                const timeElement = document.getElementById('summary-date');
                if (timeElement) {
                    timeElement.click();
                    console.log('🎯 Time dropdown opened');
                } else {
                    console.error('🎯 Time element not found!');
                }
            }
        });

        // Time preset commands based on actual dropdown options
        this.registerCommand({
            id: 'set-anytime',
            title: 'Anytime',
            description: 'No date restriction',
            category: 'search',
            keywords: ['anytime', 'no', 'date', 'restriction', 'all'],
            action: () => {
                console.log('🎯 Setting time to anytime...');
                const startInput = document.getElementById('date-start');
                const endInput = document.getElementById('date-end');
                
                if (startInput && endInput) {
                    startInput.value = '';
                    endInput.value = '';
                    startInput.dispatchEvent(new Event('change'));
                    endInput.dispatchEvent(new Event('change'));
                    console.log('🎯 Set to anytime (no date restriction)');
                } else {
                    console.error('🎯 Date inputs not found!');
                }
            }
        });

        this.registerCommand({
            id: 'set-last-30-days',
            title: 'Last 30 Days',
            description: 'Past month including today',
            category: 'search',
            keywords: ['last', '30', 'days', 'month', 'past'],
            action: () => {
                console.log('🎯 Setting time to last 30 days...');
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
                    console.log('🎯 Set dates to last 30 days');
                } else {
                    console.error('🎯 Date inputs not found!');
                }
            }
        });

        this.registerCommand({
            id: 'set-custom-range',
            title: 'Custom Date Range',
            description: 'Select your own dates',
            category: 'search',
            keywords: ['custom', 'range', 'select', 'own', 'dates'],
            action: () => {
                console.log('🎯 Opening custom date range...');
                const timeElement = document.getElementById('summary-date');
                if (timeElement) {
                    timeElement.click();
                    console.log('🎯 Time dropdown opened for custom range selection');
                } else {
                    console.error('🎯 Time element not found!');
                }
            }
        });

        // Quick catalog selection commands
        this.registerCommand({
            id: 'select-copernicus',
            title: 'Copernicus Data Space',
            description: 'Select Copernicus as data source',
            category: 'search',
            keywords: ['copernicus', 'sentinel', 'esa'],
            action: () => {
                console.log('🎯 Selecting Copernicus catalog...');
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect) {
                    catalogSelect.value = 'copernicus';
                    catalogSelect.dispatchEvent(new Event('change'));
                    console.log('🎯 Copernicus catalog selected');
                } else {
                    console.error('🎯 Catalog select not found!');
                }
            }
        });

        this.registerCommand({
            id: 'select-element84',
            title: 'Element84 Earth Search',
            description: 'Select Element84 as data source',
            category: 'search',
            keywords: ['element84', 'earth', 'search'],
            action: () => {
                console.log('🎯 Selecting Element84 catalog...');
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect) {
                    catalogSelect.value = 'element84';
                    catalogSelect.dispatchEvent(new Event('change'));
                    console.log('🎯 Element84 catalog selected');
                } else {
                    console.error('🎯 Catalog select not found!');
                }
            }
        });

        this.registerCommand({
            id: 'select-planetary',
            title: 'Microsoft Planetary Computer',
            description: 'Select Microsoft Planetary Computer as data source',
            category: 'search',
            keywords: ['microsoft', 'planetary', 'computer'],
            action: () => {
                console.log('🎯 Selecting Planetary Computer catalog...');
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect) {
                    catalogSelect.value = 'planetary';
                    catalogSelect.dispatchEvent(new Event('change'));
                    console.log('🎯 Planetary Computer catalog selected');
                } else {
                    console.error('🎯 Catalog select not found!');
                }
            }
        });

        this.registerCommand({
            id: 'select-planetlabs',
            title: 'Planet Labs Open Data',
            description: 'Select Planet Labs as data source',
            category: 'search',
            keywords: ['planet', 'labs', 'open', 'data'],
            action: () => {
                console.log('🎯 Selecting Planet Labs catalog...');
                const catalogSelect = document.getElementById('catalog-select');
                if (catalogSelect) {
                    catalogSelect.value = 'planetlabs';
                    catalogSelect.dispatchEvent(new Event('change'));
                    console.log('🎯 Planet Labs catalog selected');
                } else {
                    console.error('🎯 Catalog select not found!');
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
        console.log('🎯 Registering command:', command.id, command.title);
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
        console.log('🎯 Command registered. Total commands:', this.state.commands.size);

        if (fullCommand.shortcut && this.options.enableKeyboardShortcuts) {
            this.registerShortcut(fullCommand.shortcut, fullCommand.action);
        }
    }

    setupKeyboardShortcuts() {
        console.log('🎯 Setting up keyboard shortcuts...');
        if (!this.options.enableKeyboardShortcuts) {
            console.log('🎯 Keyboard shortcuts disabled');
            return;
        }

        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        console.log('🎯 Keyboard shortcuts registered');
    }

    handleGlobalKeydown(event) {
        const shortcut = this.formatShortcut(event);
        console.log('🎯 Key pressed:', shortcut, 'Target shortcut:', this.options.shortcuts.toggle);

        // Check for toggle shortcut
        if (this.matchesShortcut(shortcut, this.options.shortcuts.toggle)) {
            console.log('🎯 Toggle shortcut matched! Opening command palette...');
            event.preventDefault();
            this.toggle();
            return;
        }

        // Handle shortcuts when palette is open
        if (this.state.isOpen) {
            this.handlePaletteKeydown(event);
        }
    }

    handlePaletteKeydown(event) {
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
    }

    formatShortcut(event) {
        const parts = [];
        if (event.metaKey || event.ctrlKey) parts.push(event.metaKey ? 'cmd' : 'ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    }

    matchesShortcut(shortcut, patterns) {
        return Array.isArray(patterns) ? patterns.includes(shortcut) : patterns === shortcut;
    }

    attachEventListeners() {
        console.log('🎯 Attaching event listeners to palette elements');
        if (this.input) {
            this.addEventListener(this.input, 'input', this.handleInput.bind(this));
            this.addEventListener(this.input, 'keydown', this.handleInputKeydown.bind(this));
            console.log('🎯 Input event listeners attached');
        } else {
            console.error('🎯 Input element not found for event listeners');
        }
        
        if (this.backdrop) {
            this.addEventListener(this.backdrop, 'click', (event) => {
                // Only close if clicking directly on the backdrop, not on child elements
                if (event.target === this.backdrop) {
                    console.log('🎯 Backdrop clicked - closing palette');
                    this.close();
                } else {
                    console.log('🎯 Click on child element, not closing');
                }
            });
            console.log('🎯 Backdrop event listener attached');
        }
        
        if (this.resultsContainer) {
            this.addEventListener(this.resultsContainer, 'click', this.handleResultClick.bind(this));
            this.addEventListener(this.resultsContainer, 'mouseover', this.handleResultHover.bind(this));
            console.log('🎯 Results event listeners attached');
        }
    }

    handleInput(event) {
        const query = event.target.value;
        console.log('🎯 Input changed:', query);
        this.state.query = query; // Direct state update to avoid re-render
        this.debounceSearch();
    }

    handleInputKeydown(event) {
        // Don't interfere with normal typing
        if (event.key.length === 1) return;
        
        // Let the global handler deal with navigation
    }

    handleResultClick(event) {
        console.log('🎯 Result clicked:', event.target);
        const resultElement = event.target.closest('.command-palette__result');
        if (!resultElement) {
            console.log('🎯 No result element found');
            return;
        }

        const index = parseInt(resultElement.dataset.index, 10);
        console.log('🎯 Result index:', index);
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
        console.log('🎯 performSearch called with query:', query);
        console.log('🎯 Available commands:', this.state.commands.size);
        
        this.state.loading = true;
        this.toggleLoading(true);

        try {
            let results = [];

            if (query.trim()) {
                results = this.searchCommands(query);
                console.log('🎯 Search results for query:', results.length);
            } else {
                results = this.getRecentCommands();
                console.log('🎯 Recent commands:', results.length);
                
                // If no recent commands, show all commands
                if (results.length === 0) {
                    results = Array.from(this.state.commands.values())
                        .filter(command => command.enabled)
                        .slice(0, this.options.maxResults);
                    console.log('🎯 Showing all commands:', results.length);
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
        console.log('🎯 executeSelected called');
        console.log('🎯 Selected index:', this.state.selectedIndex);
        console.log('🎯 Available results:', this.state.results.length);
        
        const selectedCommand = this.state.results[this.state.selectedIndex];
        if (!selectedCommand) {
            console.error('🎯 No selected command found!');
            return;
        }

        console.log('🎯 Executing command:', selectedCommand.id, selectedCommand.title);
        this.addToHistory(selectedCommand.id);
        
        try {
            if (typeof selectedCommand.action === 'function') {
                console.log('🎯 Calling command action...');
                selectedCommand.action();
                console.log('🎯 Command action completed');
            } else {
                console.error('🎯 Command action is not a function:', typeof selectedCommand.action);
            }
            
            this.emit('command-executed', { 
                command: selectedCommand.id, 
                commandData: selectedCommand 
            });
        } catch (error) {
            console.error('🎯 Command execution error:', error);
            this.emit('command-error', { 
                command: selectedCommand.id, 
                error 
            });
        }

        console.log('🎯 Closing command palette after execution');
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
        console.log('🎯 CommandPalette.open() called, current state:', this.state.isOpen);
        console.log('🎯 Palette container exists:', !!this.paletteContainer);
        
        // Check if palette container exists and is actually visible
        if (this.paletteContainer) {
            const isVisible = this.paletteContainer.style.display !== 'none' && 
                             this.paletteContainer.classList.contains('command-palette--open');
            console.log('🎯 Palette container visibility:', isVisible);
            
            if (this.state.isOpen && isVisible) {
                console.log('🎯 Palette already open and visible');
                return;
            }
        }

        console.log('🎯 Opening command palette...');
        // Update state without triggering render to avoid infinite loop
        this.state.isOpen = true;
        this.state.query = '';
        this.state.selectedIndex = 0;

        if (!this.paletteContainer) {
            console.error('🎯 No palette container found!');
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
                
                console.log('🎯 Input element details:', {
                    disabled: this.input.disabled,
                    readOnly: this.input.readOnly,
                    tabIndex: this.input.tabIndex,
                    style: this.input.style.cssText,
                    offsetParent: this.input.offsetParent
                });
                
                // Immediate focus
                this.input.focus();
                console.log('🎯 Initial focus attempt - Active element:', document.activeElement?.tagName, document.activeElement?.className);
                
                // Focus again after a short delay to ensure animation is complete
                setTimeout(() => {
                    this.input.focus();
                    this.input.select(); // Also select any existing text
                    console.log('🎯 Delayed focus with select - Active element:', document.activeElement === this.input ? 'INPUT' : document.activeElement?.tagName);
                }, 100);
                
                // Final focus attempt
                setTimeout(() => {
                    if (document.activeElement !== this.input) {
                        this.input.focus();
                        console.log('🎯 Final focus attempt - was not focused, now active element:', document.activeElement?.tagName);
                    } else {
                        console.log('🎯 Input successfully focused!');
                    }
                }, 250);
            } else {
                console.error('🎯 Input element not found for focusing!');
            }
            
            console.log('🎯 Command palette opened and focused');
            console.log('🎯 Palette container styles:', {
                display: this.paletteContainer.style.display,
                visibility: getComputedStyle(this.paletteContainer).visibility,
                opacity: getComputedStyle(this.paletteContainer).opacity,
                zIndex: getComputedStyle(this.paletteContainer).zIndex,
                position: getComputedStyle(this.paletteContainer).position
            });
            console.log('🎯 Palette container classes:', this.paletteContainer.classList.toString());
            
            // Re-enable rendering after a delay
            setTimeout(() => {
                this.isRendering = false;
                console.log('🎯 Rendering re-enabled');
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
        console.log('🎯 Force closing command palette');
        // Update state without triggering render to avoid infinite loop
        this.state.isOpen = false;
        
        if (this.paletteContainer) {
            this.paletteContainer.classList.remove('command-palette--open');
            this.paletteContainer.style.display = 'none';
            console.log('🎯 Palette container forced to close');
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