import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class CommandPalette extends BaseUIComponent {
    constructor(container, options = {}) {
        super(container, options);
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
                toggle: ['shift+/'],
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

    init() {
        this.render();
        this.registerDefaultCommands();
        this.setupKeyboardShortcuts();
        this.attachEventListeners();
        this.setupFloatingActionButton();
        this.loadUserPreferences();
    }

    render() {
        if (!this.container) {
            this.container = document.body;
        }

        const paletteContainer = document.createElement('div');
        paletteContainer.className = `command-palette command-palette--${this.options.position}`;
        paletteContainer.setAttribute('role', 'dialog');
        paletteContainer.setAttribute('aria-modal', 'true');
        paletteContainer.setAttribute('aria-labelledby', 'command-palette-title');
        paletteContainer.style.display = 'none';

        paletteContainer.innerHTML = `
            <div class="command-palette__backdrop"></div>
            <div class="command-palette__container">
                <div class="command-palette__header">
                    <h2 id="command-palette-title" class="command-palette__title visually-hidden">Command Palette</h2>
                    <div class="command-palette__search">
                        <svg class="command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            class="command-palette__input"
                            placeholder="${this.options.placeholder}"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            aria-expanded="false"
                            aria-haspopup="listbox"
                            aria-autocomplete="list"
                            role="combobox"
                        />
                        <div class="command-palette__loading">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>

                <div class="command-palette__content">
                    <div class="command-palette__results" role="listbox" aria-label="Command results">
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

        this.container.appendChild(paletteContainer);
        this.paletteContainer = paletteContainer;
        this.input = paletteContainer.querySelector('.command-palette__input');
        this.resultsContainer = paletteContainer.querySelector('.command-palette__results');
        this.previewContainer = paletteContainer.querySelector('.command-palette__preview-content');
        this.backdrop = paletteContainer.querySelector('.command-palette__backdrop');
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
            title: 'Search Collections',
            description: 'Search through STAC collections',
            category: 'search',
            keywords: ['collection', 'catalog', 'browse'],
            action: () => this.emit('command-executed', { command: 'search-collections' })
        });

        this.registerCommand({
            id: 'open-settings',
            title: 'Open Settings',
            description: 'Configure application preferences',
            category: 'settings',
            keywords: ['config', 'preferences', 'options'],
            action: () => this.emit('command-executed', { command: 'open-settings' })
        });

        this.registerCommand({
            id: 'clear-cache',
            title: 'Clear Cache',
            description: 'Clear all cached data',
            category: 'settings',
            keywords: ['cache', 'clear', 'reset', 'storage'],
            action: () => this.emit('command-executed', { command: 'clear-cache' })
        });

        this.registerCommand({
            id: 'export-data',
            title: 'Export Data',
            description: 'Export current search results',
            category: 'navigation',
            keywords: ['export', 'download', 'save'],
            action: () => this.emit('command-executed', { command: 'export-data' })
        });

        this.registerCommand({
            id: 'toggle-theme',
            title: 'Toggle Theme',
            description: 'Switch between light and dark mode',
            category: 'settings',
            keywords: ['theme', 'dark', 'light', 'appearance'],
            action: () => this.emit('command-executed', { command: 'toggle-theme' })
        });

        this.registerCommand({
            id: 'show-help',
            title: 'Show Help',
            description: 'Open help documentation',
            category: 'help',
            keywords: ['help', 'docs', 'documentation', 'guide'],
            action: () => this.emit('command-executed', { command: 'show-help' })
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
        if (!this.options.enableKeyboardShortcuts) return;

        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    }

    handleGlobalKeydown(event) {
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
        this.addEventListener(this.input, 'input', this.handleInput.bind(this));
        this.addEventListener(this.input, 'keydown', this.handleInputKeydown.bind(this));
        this.addEventListener(this.backdrop, 'click', this.close.bind(this));
        this.addEventListener(this.resultsContainer, 'click', this.handleResultClick.bind(this));
        this.addEventListener(this.resultsContainer, 'mouseover', this.handleResultHover.bind(this));
    }

    handleInput(event) {
        const query = event.target.value;
        this.updateState({ query });
        this.debounceSearch();
    }

    handleInputKeydown(event) {
        // Don't interfere with normal typing
        if (event.key.length === 1) return;
        
        // Let the global handler deal with navigation
    }

    handleResultClick(event) {
        const resultElement = event.target.closest('.command-palette__result');
        if (!resultElement) return;

        const index = parseInt(resultElement.dataset.index, 10);
        this.updateState({ selectedIndex: index });
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
        
        this.updateState({ loading: true });
        this.toggleLoading(true);

        try {
            let results = [];

            if (query.trim()) {
                results = this.searchCommands(query);
            } else {
                results = this.getRecentCommands();
            }

            this.updateState({ 
                results, 
                selectedIndex: 0,
                loading: false 
            });

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
        if (!selectedCommand) return;

        this.addToHistory(selectedCommand.id);
        
        try {
            selectedCommand.action();
            this.emit('command-executed', { 
                command: selectedCommand.id, 
                commandData: selectedCommand 
            });
        } catch (error) {
            this.emit('command-error', { 
                command: selectedCommand.id, 
                error 
            });
        }

        this.close();
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
        if (this.state.isOpen) return;

        this.updateState({ 
            isOpen: true, 
            query: '', 
            selectedIndex: 0 
        });

        this.paletteContainer.style.display = 'flex';
        this.input.value = '';
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.paletteContainer.classList.add('command-palette--open');
            this.input.focus();
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

    toggle() {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    setupFloatingActionButton() {
        // Set up FAB after DOM is ready
        setTimeout(() => {
            const fab = document.getElementById('command-palette-fab');
            if (fab) {
                this.addEventListener(fab, 'click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.open();
                });
                console.log('Command Palette FAB initialized');
            }
        }, 100);
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
        
        super.destroy();
    }
}

export const commandPalette = new CommandPalette();