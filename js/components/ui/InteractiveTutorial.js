/**
 * InteractiveTutorial.js - Interactive guide for first-time users
 * Provides step-by-step guidance through STAC Explorer functionality
 */

export class InteractiveTutorial {
    constructor() {
        // Disable tutorial completely
        this.isDisabled = true;
        return;
        
        // Disable tutorial on mobile devices
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
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
                            <li>🛰️ Browse and select satellite collections with the new modal browser</li>
                            <li>📍 Search locations with enhanced dropdown and map preview</li>
                            <li>📅 Set time ranges using the intuitive mini date picker</li>
                            <li>🔍 Search and explore your satellite imagery results</li>
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
                title: 'Browse Collections 🛰️',
                content: `
                    <div class="tutorial-step">
                        <h3>Choose Your Satellite Data Source</h3>
                        <p>Now let's select a satellite data collection using the Browse Collections modal.</p>
                        <p>Look for the <strong>SOURCE button</strong> that will be highlighted and <strong>click it to open the modal</strong>.</p>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">🔘</div>
                            <span>The SOURCE button will be highlighted with a pulsing blue glow</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">✨</div>
                            <span>Look for recommended collections with gradient borders and star badges</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🚀</div>
                            <span>Simply click any collection to select it - the modal closes automatically!</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🔍</div>
                            <span>Use the search bar to filter collections by name or source</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 12px;">
                            <div class="info-icon">⏳</div>
                            <span>The "Continue" button will be enabled once you select a collection</span>
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
                    // Prevent multiple executions
                    if (this.collectionStepInProgress) {
                        return;
                    }
                    this.collectionStepInProgress = true;
                    
                    
                    // Reposition tutorial to not block the modal
                    this.repositionTutorialForModal();
                    
                    // Show collection button guidance
                    setTimeout(() => {
                        this.showCollectionButtonGuide();
                    }, 500);
                    
                    // Listen for modal interactions
                    this.listenForModalClose();
                    
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
                title: 'Search Location 📍',
                content: `
                    <div class="tutorial-step">
                        <h3>Find Your Area of Interest</h3>
                        <p>Now let's search for your location using the enhanced location finder.</p>
                        <p>Look for the <strong>location input field</strong> that will be highlighted and <strong>type your city name</strong>.</p>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">🔍</div>
                            <span>The location input will be highlighted with a pulsing blue glow</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🌍</div>
                            <span>Get intelligent suggestions from OpenStreetMap as you type</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🗺️</div>
                            <span>Click on any suggestion from the dropdown to select it</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🎯</div>
                            <span>Selected area automatically sets the search boundary box</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 12px;">
                            <div class="info-icon">⏳</div>
                            <span>The "Continue" button will be enabled once you select a location</span>
                        </div>
                    </div>
                `,
                target: '#summary-location-input',
                position: 'right',
                buttons: [
                    { text: 'Previous', action: 'previous', primary: false },
                    { text: 'Next Step', action: 'next', primary: true, disabled: true }
                ],
                action: () => {
                    // Reposition tutorial to not block location search
                    this.repositionTutorialForModal();
                    
                    // Focus on the location input and show guidance
                    setTimeout(() => {
                        this.showLocationSearchGuide();
                    }, 500);
                    
                    // Listen for location search close to restore tutorial
                    this.listenForLocationSearchClose();
                    
                    // Wait for user to select a location
                    this.waitForLocationSelection();
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
                        <h3>Choose Your Time Period</h3>
                        <p>Now let's set the date range using the enhanced mini date picker.</p>
                        <p>Look for the <strong>date input fields</strong> that will be highlighted and <strong>click to select dates</strong>.</p>
                        <div class="tutorial-highlight-info">
                            <div class="info-icon">📅</div>
                            <span>Start and end date inputs will be highlighted with a pulsing blue glow</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">🗓️</div>
                            <span>Click on each date field to open the calendar picker</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">⚡</div>
                            <span>Use preset buttons or pick custom date ranges</span>
                        </div>
                        <div class="tutorial-highlight-info" style="margin-top: 8px;">
                            <div class="info-icon">⏰</div>
                            <span>Tip: Try "Last 7 days" to find the most recent satellite imagery</span>
                        </div>
                    </div>
                `,
                target: '#mini-date-container',
                position: 'right',
                buttons: [
                    { text: 'Next Step', action: 'next', primary: true }
                ],
                action: () => {
                    // Reposition tutorial to not block date picker
                    this.repositionTutorialForModal();
                    
                    // Show date picker guidance
                    setTimeout(() => {
                        this.showDatePickerGuide();
                    }, 500);
                    
                    // Listen for date picker close to restore tutorial
                    this.listenForDatePickerClose();
                }
            },
            {
                id: 'run-search',
                title: 'Search for Images 🔍',
                content: `
                    <div class="tutorial-step">
                        <h3>Find Your Satellite Images</h3>
                        <p>Perfect! You've configured:</p>
                        <ul>
                            <li>🛰️ <strong>Collection:</strong> Selected from the browse modal</li>
                            <li>📍 <strong>Location:</strong> Found using enhanced location search</li>
                            <li>📅 <strong>Time:</strong> Set with the mini date picker</li>
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
                                <li><strong>Click on any image</strong> to display it on the map</li>
                                <li><strong>Use the visualization panel</strong> to change color combinations</li>
                                <li><strong>Explore different collections</strong> using the browse modal</li>
                                <li><strong>Search new locations</strong> with the enhanced location finder</li>
                                <li><strong>Adjust time ranges</strong> using the mini date picker</li>
                                <li><strong>Zoom and pan</strong> to explore your imagery in detail</li>
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
        if (this.isDisabled || this.isMobile || this.isActive) {
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(this.currentStep);
        
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
        
        // Reset step progress flags when changing steps
        this.collectionStepInProgress = false;
        
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
        
    }


    /**
     * Temporarily hide tutorial overlay to allow modal interaction
     */
    hideTutorialTemporarily() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    /**
     * Show tutorial overlay again
     */
    showTutorialAgain() {
        if (this.overlay && this.isActive) {
            this.overlay.style.display = 'flex';
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = '0';
            this.overlay.style.left = '0';
            this.overlay.style.width = '100%';
            this.overlay.style.height = '100%';
        }
    }

    /**
     * Reposition tutorial to be visible alongside the modal
     */
    repositionTutorialForModal() {
        if (this.overlay && this.tutorialPanel) {
            // Move tutorial to top-right corner, smaller and non-blocking
            this.overlay.style.background = 'none';
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = '20px';
            this.overlay.style.right = '20px';
            this.overlay.style.left = 'unset';
            this.overlay.style.width = 'auto';
            this.overlay.style.height = 'auto';
            this.overlay.style.alignItems = 'flex-start';
            this.overlay.style.justifyContent = 'flex-end';
            
            this.tutorialPanel.style.maxWidth = '350px';
            this.tutorialPanel.style.width = '350px';
            this.tutorialPanel.style.transform = 'none';
            this.tutorialPanel.style.position = 'relative';
            
        }
    }

    /**
     * Show visual guide for collection selection
     */
    showCollectionSelectionGuide() {
        // Add visual indicators and arrows pointing to recommended collections
        setTimeout(() => {
            const priorityCards = document.querySelectorAll('.collection-card.priority-collection');
            if (priorityCards.length > 0) {
                
                // Create floating guide overlay
                const guideOverlay = document.createElement('div');
                guideOverlay.id = 'tutorial-collection-guide';
                guideOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 2500;
                `;
                
                priorityCards.forEach((card, index) => {
                    // Highlight the card
                    card.style.animation = 'pulse 2s infinite';
                    card.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)';
                    card.style.transform = 'scale(1.02)';
                    card.style.zIndex = '2100';
                    
                    // Add floating arrow and text
                    const rect = card.getBoundingClientRect();
                    const arrow = document.createElement('div');
                    arrow.style.cssText = `
                        position: absolute;
                        top: ${rect.top - 60}px;
                        left: ${rect.left + rect.width/2 - 100}px;
                        width: 200px;
                        background: rgba(99, 102, 241, 0.95);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        text-align: center;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        animation: bounce 1s infinite;
                        pointer-events: none;
                        z-index: 2600;
                    `;
                    arrow.textContent = index === 0 ? '⭐ Click this recommended collection!' : '⭐ Recommended';
                    
                    // Add arrow pointer
                    const pointer = document.createElement('div');
                    pointer.style.cssText = `
                        position: absolute;
                        top: 100%;
                        left: 50%;
                        margin-left: -10px;
                        width: 0;
                        height: 0;
                        border-left: 10px solid transparent;
                        border-right: 10px solid transparent;
                        border-top: 10px solid rgba(99, 102, 241, 0.95);
                    `;
                    arrow.appendChild(pointer);
                    guideOverlay.appendChild(arrow);
                });
                
                document.body.appendChild(guideOverlay);
                
                // Remove guide when user selects a collection or after timeout
                const removeGuide = () => {
                    this.cleanupCollectionGuides();
                };
                
                // Remove after 10 seconds or when collection is selected
                setTimeout(removeGuide, 10000);
                
                // Listen for collection selection
                const selectionHandler = () => {
                    removeGuide();
                    document.removeEventListener('modalCollectionSelected', selectionHandler);
                };
                document.addEventListener('modalCollectionSelected', selectionHandler);
            }
        }, 1000);
    }

    /**
     * Show visual guide for collection button
     */
    showCollectionButtonGuide() {
        const sourceButton = document.getElementById('summary-source');
        if (!sourceButton) {
            return;
        }

        // Add debugging to track modal state
        const modal = document.getElementById('collection-browser-modal');
            modalExists: !!modal,
            modalHasOpenClass: modal && modal.classList.contains('open'),
            modalDisplay: modal ? modal.style.display : 'N/A'
        });

        // Check if modal is already open - if so, skip button guide and show collection guide
        if (modal && modal.classList.contains('open')) {
            setTimeout(() => {
                this.showCollectionSelectionGuide();
            }, 500);
            return;
        }


        // Monitor for unexpected modal opening with detailed logging
        let modalOpenedAutomatically = false;
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('open') && !modalOpenedAutomatically) {
                        modalOpenedAutomatically = true;
                        this.cleanupCollectionButtonGuide();
                        setTimeout(() => {
                            this.showCollectionSelectionGuide();
                        }, 500);
                        modalObserver.disconnect();
                    }
                }
            });
        });
        
        if (modal) {
            modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
            
            // Clean up observer after 20 seconds
            setTimeout(() => {
                modalObserver.disconnect();
            }, 20000);
        }

        // Create floating guide overlay
        const guideOverlay = document.createElement('div');
        guideOverlay.id = 'tutorial-collection-button-guide';
        guideOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2500;
        `;

        // Mark button as tutorial-controlled to prevent external auto-clicks
        sourceButton.setAttribute('data-tutorial-controlled', 'true');
        
        // Highlight the SOURCE button
        sourceButton.style.animation = 'pulse 2s infinite';
        sourceButton.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.6), 0 0 30px rgba(139, 92, 246, 0.3)';
        sourceButton.style.transform = 'scale(1.05)';
        sourceButton.style.zIndex = '2100';

        // Add floating arrow and text
        const rect = sourceButton.getBoundingClientRect();
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: ${rect.bottom + 15}px;
            left: ${rect.left + rect.width/2 - 150}px;
            width: 300px;
            background: rgba(99, 102, 241, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: bounce 1s infinite;
            pointer-events: none;
            z-index: 2600;
        `;
        arrow.innerHTML = `
            <div>🛰️ Click here to browse collections!</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">Opens the collection browser modal</div>
        `;

        // Add arrow pointer (pointing up to the button)
        const pointer = document.createElement('div');
        pointer.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            margin-left: -10px;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid rgba(99, 102, 241, 0.95);
        `;
        arrow.appendChild(pointer);
        guideOverlay.appendChild(arrow);

        document.body.appendChild(guideOverlay);

        // Set up click handler to detect when user clicks the button
        const buttonClickHandler = (event) => {
            
            // Remove button guide immediately when clicked
            this.cleanupCollectionButtonGuide();
            
            // Wait for modal to open, then show collection selection guides
            setTimeout(() => {
                this.showCollectionSelectionGuide();
            }, 1000);
            
            sourceButton.removeEventListener('click', buttonClickHandler);
        };
        
        sourceButton.addEventListener('click', buttonClickHandler);

        // Remove guide after 15 seconds if user doesn't click
        setTimeout(() => {
            this.cleanupCollectionButtonGuide();
            sourceButton.removeEventListener('click', buttonClickHandler);
        }, 15000);
    }

    /**
     * Show visual guide for location search
     */
    showLocationSearchGuide() {
        const locationInput = document.getElementById('summary-location-input');
        if (!locationInput) {
            return;
        }


        // Create floating guide overlay
        const guideOverlay = document.createElement('div');
        guideOverlay.id = 'tutorial-location-guide';
        guideOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2500;
        `;

        // Highlight the location input
        locationInput.style.animation = 'pulse 2s infinite';
        locationInput.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.6), 0 0 30px rgba(139, 92, 246, 0.3)';
        locationInput.style.transform = 'scale(1.05)';
        locationInput.style.zIndex = '2100';

        // Add floating arrow and text
        const rect = locationInput.getBoundingClientRect();
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: ${rect.bottom + 15}px;
            left: ${rect.left + rect.width/2 - 150}px;
            width: 300px;
            background: rgba(99, 102, 241, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: bounce 1s infinite;
            pointer-events: none;
            z-index: 2600;
        `;
        arrow.innerHTML = `
            <div>🔍 Type your city name here!</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">e.g., "Paris", "New York", "Tokyo"</div>
        `;

        // Add arrow pointer (pointing up to the input)
        const pointer = document.createElement('div');
        pointer.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            margin-left: -10px;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid rgba(99, 102, 241, 0.95);
        `;
        arrow.appendChild(pointer);
        guideOverlay.appendChild(arrow);

        document.body.appendChild(guideOverlay);

        // Focus the input to make it active
        locationInput.focus();
        locationInput.click();

        // Remove guide when user starts typing or selects a location
        const removeGuide = () => {
            const guide = document.getElementById('tutorial-location-guide');
            if (guide) {
                guide.remove();
            }
            if (locationInput) {
                locationInput.style.animation = '';
                locationInput.style.boxShadow = '';
                locationInput.style.transform = '';
                locationInput.style.zIndex = '';
            }
        };

        // Remove after 15 seconds or when user interacts
        setTimeout(removeGuide, 15000);

        // Listen for user input
        const inputHandler = () => {
            removeGuide();
            locationInput.removeEventListener('input', inputHandler);
        };
        locationInput.addEventListener('input', inputHandler);

        // Listen for location selection
        const selectionHandler = () => {
            removeGuide();
            document.removeEventListener('location-selected', selectionHandler);
        };
        document.addEventListener('location-selected', selectionHandler);
    }

    /**
     * Show visual guide for date picker
     */
    showDatePickerGuide() {
        const startDateInput = document.getElementById('summary-start-date');
        const endDateInput = document.getElementById('summary-end-date');
        const dateContainer = document.getElementById('mini-date-container');
        
        if (!startDateInput || !endDateInput || !dateContainer) {
            return;
        }


        // Create floating guide overlay
        const guideOverlay = document.createElement('div');
        guideOverlay.id = 'tutorial-date-guide';
        guideOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2500;
        `;

        // Highlight both date inputs
        [startDateInput, endDateInput].forEach((input, index) => {
            input.style.animation = 'pulse 2s infinite';
            input.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.6), 0 0 30px rgba(139, 92, 246, 0.3)';
            input.style.transform = 'scale(1.05)';
            input.style.zIndex = '2100';
        });

        // Add floating arrow and text
        const containerRect = dateContainer.getBoundingClientRect();
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: ${containerRect.bottom + 15}px;
            left: ${containerRect.left + containerRect.width/2 - 175}px;
            width: 350px;
            background: rgba(99, 102, 241, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: bounce 1s infinite;
            pointer-events: none;
            z-index: 2600;
        `;
        arrow.innerHTML = `
            <div>📅 Click on the date fields to set your time range!</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">Pick start date → end date for your search period</div>
        `;

        // Add arrow pointer (pointing up to the date inputs)
        const pointer = document.createElement('div');
        pointer.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            margin-left: -10px;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid rgba(99, 102, 241, 0.95);
        `;
        arrow.appendChild(pointer);
        guideOverlay.appendChild(arrow);

        document.body.appendChild(guideOverlay);

        // Focus the first date input to make it active
        startDateInput.focus();
        startDateInput.click();

        // Remove guide when user interacts with date inputs
        const removeGuide = () => {
            const guide = document.getElementById('tutorial-date-guide');
            if (guide) {
                guide.remove();
            }
            [startDateInput, endDateInput].forEach(input => {
                if (input) {
                    input.style.animation = '';
                    input.style.boxShadow = '';
                    input.style.transform = '';
                    input.style.zIndex = '';
                }
            });
        };

        // Remove after 15 seconds or when user interacts
        setTimeout(removeGuide, 15000);

        // Listen for user interaction with date inputs
        [startDateInput, endDateInput].forEach(input => {
            const changeHandler = () => {
                removeGuide();
                input.removeEventListener('change', changeHandler);
            };
            const focusHandler = () => {
                // Don't remove immediately on focus, wait for actual change
                setTimeout(() => {
                    if (input.value) {
                        removeGuide();
                        input.removeEventListener('focus', focusHandler);
                    }
                }, 1000);
            };
            input.addEventListener('change', changeHandler);
            input.addEventListener('focus', focusHandler);
        });
    }

    /**
     * Listen for modal close events to show tutorial again
     */
    listenForModalClose() {
        // Listen for collection selection event first
        const collectionSelectionHandler = (event) => {
            this.cleanupCollectionButtonGuide();
            this.cleanupCollectionGuides();
            
            // Reset step progress flag
            this.collectionStepInProgress = false;
            
            // Wait a bit for modal to close, then restore tutorial
            setTimeout(() => {
                this.restoreTutorialPosition();
            }, 500);
            
            document.removeEventListener('modalCollectionSelected', collectionSelectionHandler);
        };
        document.addEventListener('modalCollectionSelected', collectionSelectionHandler);
        
        // Also check if modal is still open periodically as fallback
        const checkModalClosed = () => {
            const modal = document.getElementById('collection-browser-modal');
            const isModalOpen = modal && modal.classList.contains('open');
            
            if (!isModalOpen) {
                // Modal is closed, clean up guides and restore tutorial
                this.cleanupCollectionButtonGuide();
                this.cleanupCollectionGuides();
                this.collectionStepInProgress = false;
                this.restoreTutorialPosition();
                document.removeEventListener('modalCollectionSelected', collectionSelectionHandler);
                return;
            }
            
            // Check again in 500ms
            setTimeout(checkModalClosed, 500);
        };
        
        // Start checking after a small delay
        setTimeout(checkModalClosed, 1000);
    }

    /**
     * Clean up collection selection guides
     */
    cleanupCollectionGuides() {
        // Remove guide overlay
        const guide = document.getElementById('tutorial-collection-guide');
        if (guide) {
            guide.remove();
        }
        
        // Reset collection card styles
        const priorityCards = document.querySelectorAll('.collection-card.priority-collection');
        priorityCards.forEach(card => {
            card.style.animation = '';
            card.style.boxShadow = '';
            card.style.transform = '';
            card.style.zIndex = '';
        });
        
    }

    /**
     * Clean up collection button guide
     */
    cleanupCollectionButtonGuide() {
        // Remove button guide overlay
        const guide = document.getElementById('tutorial-collection-button-guide');
        if (guide) {
            guide.remove();
        }
        
        // Reset SOURCE button styles
        const sourceButton = document.getElementById('summary-source');
        if (sourceButton) {
            sourceButton.style.animation = '';
            sourceButton.style.boxShadow = '';
            sourceButton.style.transform = '';
            sourceButton.style.zIndex = '';
            sourceButton.removeAttribute('data-tutorial-controlled');
        }
        
    }

    /**
     * Clean up location search guides
     */
    cleanupLocationGuides() {
        // Remove guide overlay
        const guide = document.getElementById('tutorial-location-guide');
        if (guide) {
            guide.remove();
        }
        
        // Reset location input styles
        const locationInput = document.getElementById('summary-location-input');
        if (locationInput) {
            locationInput.style.animation = '';
            locationInput.style.boxShadow = '';
            locationInput.style.transform = '';
            locationInput.style.zIndex = '';
        }
        
    }

    /**
     * Clean up date picker guides
     */
    cleanupDateGuides() {
        // Remove guide overlay
        const guide = document.getElementById('tutorial-date-guide');
        if (guide) {
            guide.remove();
        }
        
        // Reset date input styles
        const startDateInput = document.getElementById('summary-start-date');
        const endDateInput = document.getElementById('summary-end-date');
        [startDateInput, endDateInput].forEach(input => {
            if (input) {
                input.style.animation = '';
                input.style.boxShadow = '';
                input.style.transform = '';
                input.style.zIndex = '';
            }
        });
        
    }

    /**
     * Restore tutorial to its normal position and state
     */
    restoreTutorialPosition() {
        if (this.overlay && this.tutorialPanel && this.isActive) {
            // Reset overlay styles to normal
            this.overlay.style.background = 'var(--overlay-background, rgba(0, 0, 0, 0.7))';
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = '0';
            this.overlay.style.left = '0';
            this.overlay.style.right = 'unset';
            this.overlay.style.width = '100%';
            this.overlay.style.height = '100%';
            this.overlay.style.alignItems = 'center';
            this.overlay.style.justifyContent = 'center';
            this.overlay.style.display = 'flex';
            
            // Reset panel styles
            this.tutorialPanel.style.maxWidth = '500px';
            this.tutorialPanel.style.width = '90%';
            this.tutorialPanel.style.transform = 'none';
            this.tutorialPanel.style.position = 'relative';
            
            // Reposition panel based on current step
            const currentStep = this.steps[this.currentStep];
            if (currentStep) {
                this.positionPanel(currentStep);
            }
            
        }
    }

    /**
     * Listen for location search close events to show tutorial again
     */
    listenForLocationSearchClose() {
        // Listen for location selection event
        const locationSelectionHandler = (event) => {
            this.cleanupLocationGuides();
            
            // Wait a bit then restore tutorial
            setTimeout(() => {
                this.restoreTutorialPosition();
            }, 500);
            
            document.removeEventListener('location-selected', locationSelectionHandler);
        };
        document.addEventListener('location-selected', locationSelectionHandler);
        
        // Also check if location dropdown is still active periodically as fallback
        const checkLocationSearchClosed = () => {
            // Check for active location dropdown/input
            const locationInput = document.getElementById('summary-location-input');
            const locationDropdown = document.querySelector('.search-suggestions');
            const isLocationActive = (locationInput && document.activeElement === locationInput) || 
                                   (locationDropdown && locationDropdown.style.display !== 'none' && locationDropdown.style.visibility !== 'hidden');
            
            if (!isLocationActive) {
                // Location search is closed, restore tutorial
                this.cleanupLocationGuides();
                this.restoreTutorialPosition();
                document.removeEventListener('location-selected', locationSelectionHandler);
                return;
            }
            
            // Check again in 500ms
            setTimeout(checkLocationSearchClosed, 500);
        };
        
        // Start checking after a small delay
        setTimeout(checkLocationSearchClosed, 2000);
    }

    /**
     * Listen for date picker close events to show tutorial again
     */
    listenForDatePickerClose() {
        // Listen for date change events
        const dateChangeHandler = (event) => {
            this.cleanupDateGuides();
            
            // Wait a bit then restore tutorial
            setTimeout(() => {
                this.restoreTutorialPosition();
            }, 500);
        };
        
        const startDateInput = document.getElementById('summary-start-date');
        const endDateInput = document.getElementById('summary-end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', dateChangeHandler);
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', dateChangeHandler);
        }
        
        // Also check if date picker is still active periodically as fallback
        const checkDatePickerClosed = () => {
            // Check for active date picker elements
            const isDateActive = (startDateInput && document.activeElement === startDateInput) || 
                                (endDateInput && document.activeElement === endDateInput);
            
            if (!isDateActive) {
                // Date picker is closed, restore tutorial
                this.cleanupDateGuides();
                this.restoreTutorialPosition();
                
                // Clean up event listeners
                if (startDateInput) {
                    startDateInput.removeEventListener('change', dateChangeHandler);
                }
                if (endDateInput) {
                    endDateInput.removeEventListener('change', dateChangeHandler);
                }
                return;
            }
            
            // Check again in 500ms
            setTimeout(checkDatePickerClosed, 500);
        };
        
        // Start checking after a small delay
        setTimeout(checkDatePickerClosed, 2000);
    }

    /**
     * Wait for user to select a collection during tutorial
     */
    waitForCollectionSelection() {
        
        const enableButton = () => {
            const nextButton = document.querySelector('.tutorial-btn.btn-primary');
            if (nextButton) {
                nextButton.removeAttribute('disabled');
                nextButton.classList.remove('disabled');
                nextButton.textContent = 'Continue';
            }
        };
        
        const checkCollectionSelected = () => {
            // Check URL for cs and cn parameters
            const urlParams = new URLSearchParams(window.location.search);
            const hasCatalogParam = urlParams.has('cs');
            const hasCollectionParam = urlParams.has('cn');
            
            if (hasCatalogParam && hasCollectionParam) {
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
        
        const enableButton = () => {
            const nextButton = document.querySelector('.tutorial-btn.btn-primary');
            if (nextButton) {
                nextButton.removeAttribute('disabled');
                nextButton.classList.remove('disabled');
                nextButton.textContent = 'Continue';
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
            case 'previous':
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
    }

    /**
     * Check if tutorial should be shown
     */
    static shouldShowTutorial() {
        // Tutorial is disabled globally
        return false;
        // return !localStorage.getItem('stac-explorer-tutorial-completed');
    }

    /**
     * Bind global events
     */
    bindEvents() {
        if (this.isDisabled || this.isMobile) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.close();
            }
        });
        
        // Initialize tutorial button
        this.initializeTutorialButton();
        
        // Check if this is a first visit and auto-start tutorial
        if (!this.isDisabled && this.isFirstVisit()) {
            setTimeout(() => this.start(), 1500);
        }
    }
    
    /**
     * Initialize the tutorial button
     */
    initializeTutorialButton() {
        const tutorialBtn = document.getElementById('tutorial-btn');
        if (tutorialBtn) {
            if (this.isDisabled || this.isMobile) {
                // Hide tutorial button when disabled or on mobile
                tutorialBtn.style.display = 'none';
            } else {
                tutorialBtn.addEventListener('click', () => this.start());
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
                z-index: 1500;
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
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-10px);
                }
                60% {
                    transform: translateY(-5px);
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