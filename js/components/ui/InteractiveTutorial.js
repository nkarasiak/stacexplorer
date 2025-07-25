/**
 * InteractiveTutorial.js - Interactive guide for first-time users
 * Provides step-by-step guidance through STAC Explorer functionality
 */

export class InteractiveTutorial {
    constructor() {
        // Disable tutorial on mobile devices
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
            console.log('📱 Tutorial disabled on mobile devices');
            return;
        }
        
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tutorialPanel = null;
        this.userCity = null;
        this.userCityBbox = null;
        this.steps = this.initializeSteps();
        this.bindEvents();
    }

    /**
     * Initialize tutorial steps
     */
    initializeSteps() {
        return [
            {
                id: 'welcome',
                title: 'Welcome to STAC Explorer! 🛰️',
                content: `
                    <div class="tutorial-welcome">
                        <div class="tutorial-icon">🌍</div>
                        <h3>Let's explore satellite imagery together!</h3>
                        <p>This quick tutorial will show you how to:</p>
                        <ul>
                            <li>🛰️ Select Sentinel-2 satellite data</li>
                            <li>📍 Choose your city location</li>
                            <li>📅 View images from the past 7 days</li>
                        </ul>
                        <p>Ready to start your Earth observation journey?</p>
                    </div>
                `,
                target: null,
                position: 'center',
                buttons: [
                    { text: 'Start Tutorial', action: 'next', primary: true },
                    { text: 'Skip', action: 'close', primary: false }
                ]
            },
            {
                id: 'select-theme',
                title: 'Choose Your Theme 🎨',
                content: `
                    <div class="tutorial-step">
                        <h3>Pick Your Preferred Theme</h3>
                        <p>Choose the theme that's most comfortable for your eyes.</p>
                        <div class="theme-selection">
                            <div class="theme-option" data-theme="light">
                                <div class="theme-preview light-preview">
                                    <div class="preview-header"></div>
                                    <div class="preview-content"></div>
                                </div>
                                <span class="theme-label">☀️ Light Mode</span>
                            </div>
                            <div class="theme-option" data-theme="dark">
                                <div class="theme-preview dark-preview">
                                    <div class="preview-header"></div>
                                    <div class="preview-content"></div>
                                </div>
                                <span class="theme-label">🌙 Dark Mode</span>
                            </div>
                        </div>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">💡</div>
                            <span>You can always change this later using the theme toggle button</span>
                        </div>
                    </div>
                `,
                target: null,
                position: 'center',
                buttons: [
                    { text: 'Continue', action: 'next', primary: true }
                ]
            },
            {
                id: 'select-sentinel2',
                title: 'Select Sentinel-2 Data 🛰️',
                content: `
                    <div class="tutorial-step">
                        <h3>Choose Your Satellite Data Source</h3>
                        <p>Sentinel-2 provides high-quality optical imagery perfect for viewing your city from space.</p>
                        <p><strong>Click on the SOURCE card</strong> to open the beautiful collection browser and <strong>select the ⭐ recommended Sentinel-2 collection</strong>.</p>
                        <div class="tutorial-highlight-info" style="margin-top: 12px;">
                            <div class="info-icon">✨</div>
                            <span>Look for the yellow "Recommended" collections at the top!</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">⏳</div>
                            <span>The "Continue" button will be enabled once you select a collection</span>
                        </div>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">ℹ️</div>
                            <span>Tip: Use the expand icon to go full-screen for better browsing</span>
                        </div>
                    </div>
                `,
                target: '#summary-source',
                position: 'right',
                buttons: [
                    { text: 'Previous', action: 'previous', primary: false },
                    { text: 'Next Step', action: 'next', primary: true, disabled: true }
                ],
                action: () => {
                    // Open the new collection browser modal
                    this.openCollectionModal();
                    
                    // Wait for user to select a collection
                    this.waitForCollectionSelection();
                },
                validation: () => {
                    // Check if a collection has been selected by looking for cs and cn parameters in URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const hasCatalogParam = urlParams.has('cs');
                    const hasCollectionParam = urlParams.has('cn');
                    
                    return hasCatalogParam && hasCollectionParam;
                }
            },
            {
                id: 'select-location',
                title: 'Set Your Location 📍',
                content: `
                    <div class="tutorial-step">
                        <h3>Focus on Your City</h3>
                        <p>Now let's set the map to focus on <strong>your city</strong>.</p>
                        <p><strong>Search for your city name</strong> in the location dropdown and <strong>select it from the results</strong>.</p>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">🎯</div>
                            <span>This will search for satellite images specifically over your area</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 12px;">
                            <div class="info-icon">⏳</div>
                            <span>The "Continue" button will be enabled once you select a location</span>
                        </div>
                    </div>
                `,
                target: '#summary-location',
                position: 'right',
                buttons: [
                    { text: 'Previous', action: 'previous', primary: false },
                    { text: 'Next Step', action: 'next', primary: true, disabled: true }
                ],
                action: () => {
                    const locationSummary = document.getElementById('summary-location');
                    if (locationSummary) {
                        locationSummary.click();
                        
                        // Wait for user to select a location
                        this.waitForLocationSelection();
                    }
                },
                validation: () => {
                    // Check if a location has been selected by looking for ln parameter in URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const hasLocationParam = urlParams.has('ln');
                    
                    // Also check bbox-input as fallback
                    const bboxInput = document.getElementById('bbox-input');
                    const hasBboxValue = bboxInput && bboxInput.value.trim() !== '';
                    
                    return hasLocationParam || hasBboxValue;
                }
            },
            {
                id: 'select-date-range',
                title: 'Set Time Range 📅',
                content: `
                    <div class="tutorial-step">
                        <h3>Choose Last 7 Days</h3>
                        <p>Let's look for recent satellite images from the past week.</p>
                        <p><strong>Click on the date summary</strong> to open the time selector.</p>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">⏰</div>
                            <span>Sentinel-2 captures new images every 5 days, so we should find recent data</span>
                        </div>
                    </div>
                `,
                target: '#summary-date',
                position: 'right',
                buttons: [
                    { text: 'Next Step', action: 'next', primary: true }
                ],
                action: () => {
                    const dateSummary = document.getElementById('summary-date');
                    if (dateSummary) {
                        dateSummary.click();
                    }
                }
            },
            {
                id: 'run-search',
                title: 'Search for Images 🔍',
                content: `
                    <div class="tutorial-step">
                        <h3>Find Your Satellite Images</h3>
                        <p>Perfect! You've set up:</p>
                        <ul>
                            <li>🛰️ <strong>Data:</strong> Sentinel-2</li>
                            <li>📍 <strong>Location:</strong> Your selected city</li>
                            <li>📅 <strong>Time:</strong> Last 7 days</li>
                        </ul>
                        <p><strong>Click the "Search" button</strong> to find your satellite images!</p>
                    </div>
                `,
                target: '#main-search-btn',
                position: 'top',
                buttons: [
                    { text: 'Search Now!', action: 'next', primary: true }
                ],
                action: () => {
                    const searchButton = document.getElementById('main-search-btn');
                    if (searchButton) {
                        searchButton.click();
                    }
                }
            },
            {
                id: 'explore-results',
                title: 'Explore Your Results! 🎉',
                content: `
                    <div class="tutorial-step">
                        <h3>Congratulations!</h3>
                        <p>You've successfully found satellite images of your selected city!</p>
                        <div class="tutorial-tips">
                            <h4>💡 What you can do next:</h4>
                            <ul>
                                <li><strong>Click on any image</strong> to see it on the map</li>
                                <li><strong>Use the visualization panel</strong> to change color combinations</li>
                                <li><strong>Zoom in</strong> to see more detail</li>
                                <li><strong>Try different time ranges</strong> to see changes over time</li>
                            </ul>
                        </div>
                        <p>Happy exploring! 🌍</p>
                    </div>
                `,
                target: '#results-card',
                position: 'left',
                buttons: [
                    { text: 'Finish Tutorial', action: 'close', primary: true }
                ]
            }
        ];
    }

    /**
     * Start the tutorial
     */
    start() {
        if (this.isMobile || this.isActive) return;
        
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(this.currentStep);
        
        console.log('🎓 Interactive tutorial started');
    }

    /**
     * Create the tutorial overlay
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-panel" id="tutorial-panel">
                <div class="tutorial-header">
                    <div class="tutorial-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="tutorial-progress-fill"></div>
                        </div>
                        <span class="progress-text" id="tutorial-progress-text">Step 1 of ${this.steps.length}</span>
                    </div>
                    <button class="tutorial-close" id="tutorial-close">×</button>
                </div>
                <div class="tutorial-content" id="tutorial-content"></div>
                <div class="tutorial-footer" id="tutorial-footer"></div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        this.tutorialPanel = document.getElementById('tutorial-panel');
        
        this.addStyles();
        document.getElementById('tutorial-close').addEventListener('click', () => this.close());
    }

    /**
     * Show a specific step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        this.updateProgress();
        document.getElementById('tutorial-content').innerHTML = step.content;
        this.updateButtons(step);
        this.positionPanel(step);
        this.highlightTarget(step.target);
        
        if (step.action) {
            setTimeout(step.action, 500);
        }
        
        if (step.id === 'select-theme') {
            this.initializeThemeSelection();
        }
        
        console.log(`🎓 Tutorial step: ${step.id} (${stepIndex + 1}/${this.steps.length})`);
    }

    /**
     * Initialize theme selection functionality
     */
    initializeThemeSelection() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        // Get current theme
        const currentTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
        
        // Set initial selection
        themeOptions.forEach(option => {
            if (option.dataset.theme === currentTheme) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                // Remove selection from all options
                themeOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selection to clicked option
                option.classList.add('selected');
                
                // Apply theme
                const selectedTheme = option.dataset.theme;
                this.applyTheme(selectedTheme);
            });
        });
    }

    /**
     * Apply selected theme
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark') {
            html.classList.remove('light-theme');
            html.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark-theme');
            html.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
        
        // Update theme toggle icon if it exists
        const themeToggleIcon = document.querySelector('#theme-toggle i');
        if (themeToggleIcon) {
            themeToggleIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        
        console.log(`🎨 Tutorial theme changed to: ${theme}`);
    }

    /**
     * Open the new collection browser modal for Sentinel-2 selection
     */
    openCollectionModal() {
        setTimeout(() => {
            const summarySource = document.getElementById('summary-source');
            if (summarySource) {
                // Click the SOURCE card to open the new modal
                summarySource.click();
                console.log('🎯 Tutorial: Opened collection browser modal for Sentinel-2 selection');
                
                // Add a small delay and highlight the recommended collections
                setTimeout(() => {
                    this.highlightRecommendedCollections();
                }, 1000);
            } else {
                console.warn('⚠️ Tutorial: Could not find summary-source element');
            }
        }, 500);
    }
    
    /**
     * Highlight the recommended collections in the modal
     */
    highlightRecommendedCollections() {
        const priorityCards = document.querySelectorAll('.collection-card.priority-collection');
        if (priorityCards.length > 0) {
            console.log('🌟 Tutorial: Highlighting recommended collections');
            priorityCards.forEach(card => {
                card.style.animation = 'pulse 2s infinite';
                card.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.5)';
            });
            
            // Remove highlight after a few seconds
            setTimeout(() => {
                priorityCards.forEach(card => {
                    card.style.animation = '';
                    card.style.boxShadow = '';
                });
            }, 6000);
        }
    }

    /**
     * Wait for user to select a collection during tutorial
     */
    waitForCollectionSelection() {
        console.log('🎯 Tutorial: Waiting for user to select a collection...');
        
        const enableButton = () => {
            const nextButton = document.querySelector('.tutorial-btn.btn-primary');
            if (nextButton) {
                nextButton.removeAttribute('disabled');
                nextButton.classList.remove('disabled');
                nextButton.textContent = 'Continue';
                console.log('🎯 Tutorial: Next button enabled for collection');
            }
        };
        
        const checkCollectionSelected = () => {
            // Check URL for cs and cn parameters
            const urlParams = new URLSearchParams(window.location.search);
            const hasCatalogParam = urlParams.has('cs');
            const hasCollectionParam = urlParams.has('cn');
            
            if (hasCatalogParam && hasCollectionParam) {
                console.log('✅ Tutorial: Collection detected (URL params cs & cn)');
                enableButton();
                return true;
            }
            return false;
        };
        
        // Check immediately in case collection is already selected
        if (checkCollectionSelected()) {
            return;
        }
        
        // Listen for URL changes (popstate event)
        const urlHandler = () => {
            if (checkCollectionSelected()) {
                window.removeEventListener('popstate', urlHandler);
            }
        };
        window.addEventListener('popstate', urlHandler);
        
        // Periodic check as fallback
        const periodicCheck = setInterval(() => {
            if (checkCollectionSelected()) {
                clearInterval(periodicCheck);
                window.removeEventListener('popstate', urlHandler);
            }
        }, 1000);
    }

    /**
     * Wait for user to select a location during tutorial
     */
    waitForLocationSelection() {
        console.log('🎯 Tutorial: Waiting for user to select a location...');
        
        const enableButton = () => {
            const nextButton = document.querySelector('.tutorial-btn.btn-primary');
            if (nextButton) {
                nextButton.removeAttribute('disabled');
                nextButton.classList.remove('disabled');
                nextButton.textContent = 'Continue';
                console.log('🎯 Tutorial: Next button enabled');
            }
        };
        
        const checkLocationSelected = () => {
            // Check URL for ln parameter
            const urlParams = new URLSearchParams(window.location.search);
            const hasLocationParam = urlParams.has('ln');
            
            // Check bbox-input as fallback  
            const bboxInput = document.getElementById('bbox-input');
            const hasBboxValue = bboxInput && bboxInput.value.trim() !== '';
            
            if (hasLocationParam || hasBboxValue) {
                console.log('✅ Tutorial: Location detected (URL param or bbox)');
                enableButton();
                return true;
            }
            return false;
        };
        
        // Check immediately in case location is already selected
        if (checkLocationSelected()) {
            return;
        }
        
        // Listen for URL changes (popstate event)
        const urlHandler = () => {
            if (checkLocationSelected()) {
                window.removeEventListener('popstate', urlHandler);
            }
        };
        window.addEventListener('popstate', urlHandler);
        
        // Listen for location selection event
        const locationHandler = (event) => {
            console.log('✅ Tutorial: Location selected by user:', event.detail);
            enableButton();
            document.removeEventListener('location-selected', locationHandler);
            window.removeEventListener('popstate', urlHandler);
        };
        document.addEventListener('location-selected', locationHandler);
        
        // Also listen for changes to bbox-input as fallback
        const bboxInput = document.getElementById('bbox-input');
        if (bboxInput) {
            const bboxHandler = () => {
                if (checkLocationSelected()) {
                    bboxInput.removeEventListener('input', bboxHandler);
                    window.removeEventListener('popstate', urlHandler);
                    document.removeEventListener('location-selected', locationHandler);
                }
            };
            bboxInput.addEventListener('input', bboxHandler);
        }
        
        // Periodic check as additional fallback
        const periodicCheck = setInterval(() => {
            if (checkLocationSelected()) {
                clearInterval(periodicCheck);
                window.removeEventListener('popstate', urlHandler);
                document.removeEventListener('location-selected', locationHandler);
            }
        }, 1000);
    }

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progressFill = document.getElementById('tutorial-progress-fill');
        const progressText = document.getElementById('tutorial-progress-text');
        
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    }

    /**
     * Update tutorial buttons
     */
    updateButtons(step) {
        const footer = document.getElementById('tutorial-footer');
        
        const buttonsHtml = step.buttons.map(button => {
            const disabled = button.disabled ? 'disabled' : '';
            const className = `tutorial-btn ${button.primary ? 'btn-primary' : 'btn-secondary'} ${disabled}`;
            return `<button class="${className}" data-action="${button.action}" ${disabled}>${button.text}</button>`;
        }).join('');
        
        footer.innerHTML = buttonsHtml;
        
        footer.querySelectorAll('.tutorial-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.disabled) return;
                
                const action = button.dataset.action;
                this.handleButtonClick(action, step);
            });
        });
    }

    /**
     * Handle button clicks
     */
    handleButtonClick(action, step) {
        switch (action) {
            case 'next':
                if (step.validation && !step.validation()) {
                    return;
                }
                this.nextStep();
                break;
            case 'prev':
                this.prevStep();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.close();
        }
    }

    /**
     * Go to previous step
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Position the tutorial panel
     */
    positionPanel(step) {
        if (!step.target || step.position === 'center') {
            // Account for sidebar when centering
            const sidebar = document.querySelector('.sidebar');
            const sidebarWidth = sidebar && !sidebar.classList.contains('collapsed') ? 380 : 70;
            const availableWidth = window.innerWidth - sidebarWidth;
            const centerX = sidebarWidth + (availableWidth / 2);
            
            this.tutorialPanel.style.position = 'fixed';
            this.tutorialPanel.style.top = '50%';
            this.tutorialPanel.style.left = `${centerX}px`;
            this.tutorialPanel.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const target = document.querySelector(step.target);
        if (!target) {
            this.positionPanel({ position: 'center' });
            return;
        }
        
        const targetRect = target.getBoundingClientRect();
        const panelRect = this.tutorialPanel.getBoundingClientRect();
        
        let top, left;
        
        switch (step.position) {
            case 'right':
                left = targetRect.right + 20;
                top = targetRect.top + (targetRect.height / 2) - (panelRect.height / 2);
                break;
            case 'left':
                left = targetRect.left - panelRect.width - 20;
                top = targetRect.top + (targetRect.height / 2) - (panelRect.height / 2);
                break;
            case 'top':
                left = targetRect.left + (targetRect.width / 2) - (panelRect.width / 2);
                top = targetRect.top - panelRect.height - 20;
                break;
            case 'bottom':
                left = targetRect.left + (targetRect.width / 2) - (panelRect.width / 2);
                top = targetRect.bottom + 20;
                break;
            default:
                left = targetRect.right + 20;
                top = targetRect.top;
        }
        
        // Account for sidebar width (380px when expanded, 70px when collapsed)
        const sidebar = document.querySelector('.sidebar');
        const sidebarWidth = sidebar && !sidebar.classList.contains('collapsed') ? 380 : 70;
        const minLeft = sidebarWidth + 20; // Add 20px padding from sidebar edge
        
        left = Math.max(minLeft, Math.min(left, window.innerWidth - panelRect.width - 20));
        top = Math.max(20, Math.min(top, window.innerHeight - panelRect.height - 20));
        
        this.tutorialPanel.style.position = 'fixed';
        this.tutorialPanel.style.left = `${left}px`;
        this.tutorialPanel.style.top = `${top}px`;
        this.tutorialPanel.style.transform = 'none';
    }

    /**
     * Highlight target element
     */
    highlightTarget(targetSelector) {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (targetSelector) {
            const target = document.querySelector(targetSelector);
            if (target) {
                target.classList.add('tutorial-highlight');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    /**
     * Close tutorial
     */
    close() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
            this.tutorialPanel = null;
        }
        
        localStorage.setItem('stac-explorer-tutorial-completed', 'true');
        console.log('🎓 Tutorial completed/closed');
    }

    /**
     * Check if tutorial should be shown
     */
    static shouldShowTutorial() {
        return !localStorage.getItem('stac-explorer-tutorial-completed');
    }

    /**
     * Bind global events
     */
    bindEvents() {
        if (this.isMobile) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.close();
            }
        });
        
        // Initialize tutorial button
        this.initializeTutorialButton();
        
        // Check if this is a first visit and auto-start tutorial
        if (this.isFirstVisit()) {
            setTimeout(() => this.start(), 1500);
        }
    }
    
    /**
     * Initialize the tutorial button
     */
    initializeTutorialButton() {
        const tutorialBtn = document.getElementById('tutorial-btn');
        if (tutorialBtn) {
            if (this.isMobile) {
                // Hide tutorial button on mobile
                tutorialBtn.style.display = 'none';
                console.log('📱 Tutorial button hidden on mobile');
            } else {
                tutorialBtn.addEventListener('click', () => this.start());
                console.log('🎓 Tutorial button initialized');
            }
        }
    }
    
    /**
     * Check if this is the user's first visit
     */
    isFirstVisit() {
        return !localStorage.getItem('stac-explorer-tutorial-completed');
    }

    /**
     * Add tutorial styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tutorial-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--overlay-background, rgba(0, 0, 0, 0.7));
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .tutorial-panel {
                background: var(--surface-primary, #fff);
                border: 1px solid var(--border-primary, rgba(0, 0, 0, 0.1));
                border-radius: var(--border-radius, 12px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: tutorialSlideIn 0.3s ease-out;
            }
            
            @keyframes tutorialSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .tutorial-header {
                padding: 20px 20px 10px;
                border-bottom: 1px solid var(--border-secondary, rgba(0, 0, 0, 0.1));
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .tutorial-progress {
                flex: 1;
                margin-right: 20px;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background-color: var(--border-secondary, rgba(0, 0, 0, 0.1));
                border-radius: var(--radius-sm, 3px);
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--success-color, #4CAF50), var(--primary-500, #2196F3));
                border-radius: var(--radius-sm, 3px);
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 12px;
                color: var(--text-tertiary, rgba(0, 0, 0, 0.6));
                font-weight: 500;
            }
            
            .tutorial-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-tertiary, rgba(0, 0, 0, 0.6));
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--radius-full, 50%);
                transition: background-color 0.2s;
            }
            
            .tutorial-close:hover {
                background-color: var(--hover-background, rgba(0, 0, 0, 0.05));
            }
            
            .tutorial-content {
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                max-height: 400px;
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
            }
            
            .tutorial-footer {
                padding: 20px;
                border-top: 1px solid var(--border-secondary, rgba(0, 0, 0, 0.1));
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .tutorial-btn {
                padding: 10px 20px;
                border: none;
                border-radius: var(--radius-md, 6px);
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }
            
            .tutorial-btn.btn-primary {
                background: var(--primary-500, #2196F3);
                color: white;
            }
            
            .tutorial-btn.btn-primary:hover:not(:disabled) {
                background: var(--primary-400, #42A5F5);
                transform: translateY(-1px);
            }
            
            .tutorial-btn.btn-secondary {
                background: var(--surface-secondary, rgba(0, 0, 0, 0.05));
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
                border: 1px solid var(--border-primary, rgba(0, 0, 0, 0.15));
            }
            
            .tutorial-btn.btn-secondary:hover:not(:disabled) {
                background: var(--hover-background, rgba(0, 0, 0, 0.08));
            }
            
            .tutorial-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .tutorial-welcome {
                text-align: center;
            }
            
            .tutorial-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .tutorial-welcome h3 {
                color: var(--primary-500, #2196F3);
                margin-bottom: 16px;
            }
            
            .tutorial-welcome p {
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
                margin-bottom: 12px;
            }
            
            .tutorial-welcome ul {
                text-align: left;
                margin: 16px 0;
                padding-left: 20px;
            }
            
            .tutorial-welcome li {
                margin: 8px 0;
                color: var(--text-secondary, rgba(0, 0, 0, 0.8));
            }
            
            .theme-selection {
                display: flex;
                gap: 20px;
                justify-content: center;
                margin: 24px 0;
            }
            
            .theme-option {
                cursor: pointer;
                padding: 16px;
                border: 2px solid var(--border-secondary, rgba(0, 0, 0, 0.1));
                border-radius: var(--radius-lg, 8px);
                background: var(--surface-secondary, rgba(0, 0, 0, 0.02));
                transition: all 0.2s ease;
                text-align: center;
                min-width: 120px;
            }
            
            .theme-option:hover {
                border-color: var(--primary-400, #42A5F5);
                background: var(--surface-elevated, rgba(0, 0, 0, 0.05));
                transform: translateY(-2px);
            }
            
            .theme-option.selected {
                border-color: var(--primary-500, #2196F3);
                background: var(--primary-100, rgba(33, 150, 243, 0.1));
                box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
            }
            
            .theme-preview {
                width: 80px;
                height: 50px;
                border-radius: var(--radius-sm, 4px);
                margin: 0 auto 12px;
                overflow: hidden;
                border: 1px solid var(--border-primary, rgba(0, 0, 0, 0.15));
                position: relative;
            }
            
            .light-preview {
                background: linear-gradient(135deg, #fafbff 0%, #f0f4ff 50%, #e8f0fe 100%);
            }
            
            .light-preview .preview-header {
                height: 15px;
                background: linear-gradient(135deg, #2196F3, #1976D2);
            }
            
            .light-preview .preview-content {
                height: 35px;
                background: #ffffff;
                position: relative;
            }
            
            .light-preview .preview-content::after {
                content: '';
                position: absolute;
                top: 8px;
                left: 8px;
                right: 8px;
                height: 4px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 2px;
            }
            
            .dark-preview {
                background: linear-gradient(135deg, #0a0a1f 0%, #1a1a3a 30%, #2d1b69 70%, #1e3a8a 100%);
            }
            
            .dark-preview .preview-header {
                height: 15px;
                background: linear-gradient(135deg, #4facfe, #6bcfff);
            }
            
            .dark-preview .preview-content {
                height: 35px;
                background: rgba(30, 30, 60, 0.9);
                position: relative;
            }
            
            .dark-preview .preview-content::after {
                content: '';
                position: absolute;
                top: 8px;
                left: 8px;
                right: 8px;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
            }
            
            .theme-label {
                font-weight: 500;
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
                font-size: 14px;
                display: block;
            }
            
            .tutorial-step h3 {
                color: var(--primary-500, #2196F3);
                margin-bottom: 12px;
            }
            
            .tutorial-step p {
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
                margin-bottom: 12px;
            }
            
            .tutorial-step p strong {
                color: var(--text-primary, rgba(0, 0, 0, 0.87));
                font-weight: 600;
            }
            
            .tutorial-highlight-info {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 16px;
                padding: 12px;
                background: var(--color-info-50, rgba(33, 150, 243, 0.1));
                border-radius: var(--radius-lg, 8px);
                border-left: 4px solid var(--info-color, #2196F3);
            }
            
            .tutorial-highlight-info span {
                color: var(--text-secondary, rgba(0, 0, 0, 0.8));
                font-size: 14px;
            }
            
            .info-icon {
                font-size: 16px;
                color: var(--info-color, #2196F3);
            }
            
            /* Dark theme compatibility */
            html.dark-theme .tutorial-highlight-info {
                background: rgba(96, 165, 250, 0.15);
                border-left-color: var(--info-color, #60a5fa);
            }
            
            html.dark-theme .tutorial-highlight-info span {
                color: var(--text-secondary, rgba(255, 255, 255, 0.85));
            }
            
            html.dark-theme .info-icon {
                color: var(--info-color, #60a5fa);
            }
            
            html.dark-theme .tutorial-tips {
                background: rgba(16, 216, 118, 0.15);
                border-left-color: var(--success-color, #10d876);
            }
            
            html.dark-theme .tutorial-tips h4 {
                color: var(--success-color, #10d876);
            }
            
            html.dark-theme .tutorial-tips li {
                color: var(--text-secondary, rgba(255, 255, 255, 0.85));
            }
            
            .tutorial-tips {
                margin-top: 16px;
                padding: 16px;
                background: var(--color-success-50, rgba(76, 175, 80, 0.1));
                border-radius: var(--radius-lg, 8px);
                border-left: 4px solid var(--success-color, #4CAF50);
            }
            
            .tutorial-tips h4 {
                margin: 0 0 12px 0;
                color: var(--success-color, #2E7D32);
            }
            
            .tutorial-tips ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .tutorial-tips li {
                margin: 8px 0;
                color: var(--text-secondary, rgba(0, 0, 0, 0.8));
            }
            
            .tutorial-highlight {
                position: relative;
                z-index: 9999;
                box-shadow: 0 0 0 4px var(--primary-100, rgba(33, 150, 243, 0.4)) !important;
                border-radius: var(--radius-base, 4px) !important;
                animation: tutorialPulse 2s infinite;
            }
            
            @keyframes tutorialPulse {
                0%, 100% {
                    box-shadow: 0 0 0 4px var(--primary-100, rgba(33, 150, 243, 0.4));
                }
                50% {
                    box-shadow: 0 0 0 8px var(--primary-100, rgba(33, 150, 243, 0.2));
                }
            }
            
            @media (max-width: 768px) {
                .tutorial-panel {
                    width: 95%;
                    max-width: none;
                    margin: 20px;
                }
                
                .tutorial-content {
                    max-height: 300px;
                }
                
                .tutorial-footer {
                    flex-direction: column;
                }
                
                .tutorial-btn {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}