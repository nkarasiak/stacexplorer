/**
 * SOURCE Search Dropdown Enhancement Fix - Part 2
 * Continuation of the comprehensive fix script
 */

            if (position.left + position.width > viewport.width - gaps.minimum) {
                position.left = viewport.width - position.width - gaps.minimum;
                if (position.left < gaps.minimum) {
                    position.left = gaps.minimum;
                    position.width = viewport.width - gaps.minimum * 2;
                }
            }
            
            // Vertical constraints
            if (position.top < gaps.minimum) {
                position.top = gaps.minimum;
            }
            if (position.top + position.height > viewport.height - gaps.minimum) {
                position.top = viewport.height - position.height - gaps.minimum;
                if (position.top < gaps.minimum) {
                    position.top = gaps.minimum;
                    position.height = viewport.height - gaps.minimum * 2;
                }
            }
            
            return position;
        };
        
        // Apply enhanced positioning
        dropdownManager.applyEnhancedPositioning = function(dropdown, position, measurements) {
            console.log(`🎨 [ENHANCED] Applying ${position.strategy} positioning:`, position);
            
            // Reset dropdown visibility and positioning
            dropdown.style.position = 'fixed';
            dropdown.style.visibility = 'visible';
            dropdown.style.display = 'block';
            dropdown.style.opacity = '0';
            
            // Apply calculated position
            dropdown.style.left = `${position.left}px`;
            dropdown.style.top = `${position.top}px`;
            dropdown.style.width = `${position.width}px`;
            dropdown.style.maxHeight = `${position.height}px`;
            
            // Enhanced z-index management
            dropdown.style.zIndex = '999999';
            
            // Ensure dropdown is properly styled
            dropdown.style.overflow = 'visible';
            dropdown.style.pointerEvents = 'auto';
            
            // Apply enhanced CSS class
            dropdown.classList.add('enhanced-positioned');
            dropdown.setAttribute('data-position-strategy', position.strategy);
            
            // Animate in
            dropdown.style.transform = this.getEntryTransform(position.strategy);
            dropdown.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Force reflow before animation
            dropdown.offsetHeight;
            
            // Trigger entrance animation
            requestAnimationFrame(() => {
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0) scale(1)';
            });
        };
        
        // Get entry transform
        dropdownManager.getEntryTransform = function(strategy) {
            switch (strategy) {
                case 'above':
                    return 'translateY(10px) scale(0.95)';
                case 'below':
                default:
                    return 'translateY(-10px) scale(0.95)';
            }
        };
        
        // Verify and correct positioning
        dropdownManager.verifyAndCorrectPositioning = function(dropdown, trigger, measurements) {
            // Wait for animation to complete
            setTimeout(() => {
                try {
                    const finalRect = dropdown.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(dropdown);
                    
                    const isVisible = this.verifyDropdownVisibility(dropdown, finalRect, computedStyle);
                    
                    console.log('🔍 [ENHANCED] Position verification:', {
                        visible: isVisible,
                        finalRect,
                        computedDisplay: computedStyle.display,
                        computedVisibility: computedStyle.visibility,
                        computedOpacity: computedStyle.opacity,
                        computedZIndex: computedStyle.zIndex
                    });
                    
                    if (!isVisible) {
                        console.warn('⚠️ [ENHANCED] Dropdown not properly positioned, applying corrections...');
                        this.applyEmergencyPositioning(dropdown, trigger);
                    } else {
                        console.log('✅ [ENHANCED] Dropdown positioning verified successfully');
                    }
                    
                } catch (error) {
                    console.error('❌ [ENHANCED] Error in position verification:', error);
                }
            }, 350);
        };
        
        // Verify dropdown visibility
        dropdownManager.verifyDropdownVisibility = function(dropdown, rect, computedStyle) {
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                computedStyle.display !== 'none' &&
                computedStyle.visibility !== 'hidden' &&
                parseFloat(computedStyle.opacity) > 0 &&
                rect.left >= -10 &&
                rect.top >= -10 &&
                rect.right <= window.innerWidth + 10 &&
                rect.bottom <= window.innerHeight + 10
            );
        };
        
        // Emergency positioning
        dropdownManager.applyEmergencyPositioning = function(dropdown, trigger) {
            console.warn('🚨 [ENHANCED] Applying emergency positioning...');
            
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            // Center dropdown on screen
            const width = Math.min(400, viewport.width - 32);
            const height = Math.min(500, viewport.height - 64);
            
            dropdown.style.position = 'fixed';
            dropdown.style.left = '50%';
            dropdown.style.top = '20%';
            dropdown.style.transform = 'translateX(-50%)';
            dropdown.style.width = `${width}px`;
            dropdown.style.maxWidth = 'calc(100vw - 32px)';
            dropdown.style.maxHeight = `${height}px`;
            dropdown.style.zIndex = '999999';
            dropdown.style.display = 'block';
            dropdown.style.visibility = 'visible';
            dropdown.style.opacity = '1';
            dropdown.style.pointerEvents = 'auto';
            
            // Enhanced emergency styling
            dropdown.style.backgroundColor = 'var(--md-surface, #1e1e1e)';
            dropdown.style.border = '3px solid var(--md-primary, #2196F3)';
            dropdown.style.borderRadius = '12px';
            dropdown.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.5)';
            
            // Add emergency indicator
            this.addEmergencyIndicator(dropdown);
            
            console.log('🚨 [ENHANCED] Emergency positioning applied');
        };
        
        // Add emergency indicator
        dropdownManager.addEmergencyIndicator = function(dropdown) {
            const existingIndicator = dropdown.querySelector('.fallback-indicator');
            if (!existingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'fallback-indicator';
                indicator.style.cssText = `
                    background: linear-gradient(45deg, #ff9800, #f57c00) !important;
                    color: white !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    text-align: center !important;
                    border-radius: 6px 6px 0 0 !important;
                    position: relative !important;
                    z-index: 1000 !important;
                    letter-spacing: 0.5px !important;
                    text-transform: uppercase !important;
                `;
                indicator.textContent = '📋 DROPDOWN (CENTERED)';
                dropdown.insertBefore(indicator, dropdown.firstChild);
            }
        };
        
        console.log('✅ Enhanced positioning helper methods added');
    }
    
    /**
     * Apply immediate CSS fixes
     */
    function applyImmediateCSS() {
        console.log('🎨 Applying immediate CSS fixes...');
        
        const style = document.createElement('style');
        style.id = 'dropdown-enhancement-immediate';
        style.textContent = `
            /* Immediate CSS fixes for dropdown issues */
            .inline-dropdown-container {
                z-index: 999999 !important;
                position: fixed !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
                background: var(--md-surface, #1e1e1e) !important;
                border: 2px solid var(--md-primary, #2196F3) !important;
                border-radius: 12px !important;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4) !important;
                backdrop-filter: blur(16px) !important;
                min-width: 320px !important;
                max-width: 480px !important;
                max-height: 70vh !important;
                overflow: visible !important;
            }
            
            /* Fix header overlap issues */
            .inline-dropdown-container .ai-dropdown-header {
                position: sticky !important;
                top: 0 !important;
                z-index: 10 !important;
                padding: 16px 20px !important;
                background: var(--md-primary, #2196F3) !important;
                color: white !important;
                font-weight: 600 !important;
                border-bottom: 2px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 10px 10px 0 0 !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            
            /* Fix option spacing and overlap */
            .inline-dropdown-container .ai-option {
                display: flex !important;
                align-items: center !important;
                padding: 14px 20px !important;
                margin: 2px 8px !important;
                min-height: 56px !important;
                position: relative !important;
                z-index: 1 !important;
                border-radius: 8px !important;
                width: calc(100% - 16px) !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            
            .inline-dropdown-container .ai-option:hover {
                background: var(--md-hover-overlay, rgba(33, 150, 243, 0.1)) !important;
                transform: translateX(4px) scale(1.02) !important;
            }
            
            /* Fix text overlap in options */
            .inline-dropdown-container .ai-option-title {
                font-weight: 600 !important;
                color: var(--md-text-primary, #ffffff) !important;
                font-size: 15px !important;
                line-height: 1.4 !important;
                margin: 0 0 2px 0 !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
            }
            
            .inline-dropdown-container .ai-option-subtitle {
                font-size: 13px !important;
                color: var(--md-text-secondary, #aaaaaa) !important;
                line-height: 1.3 !important;
                margin: 0 !important;
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
            }
            
            /* Fix content area spacing */
            .inline-dropdown-container .ai-options-section {
                max-height: 400px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 8px 0 !important;
                position: relative !important;
                z-index: 6 !important;
                margin: 0 !important;
            }
            
            /* Fix search section */
            .inline-dropdown-container .ai-search-section {
                padding: 16px 20px !important;
                border-bottom: 1px solid var(--md-border-color, rgba(255, 255, 255, 0.1)) !important;
                background: var(--md-surface-overlay, rgba(255, 255, 255, 0.05)) !important;
                position: relative !important;
                z-index: 8 !important;
                margin: 0 !important;
            }
            
            /* Enhanced active state */
            .search-summary-item.dropdown-active {
                background: rgba(33, 150, 243, 0.15) !important;
                transform: translateX(6px) !important;
                box-shadow: inset 0 0 0 2px rgba(33, 150, 243, 0.3) !important;
                border-radius: 8px !important;
                border: none !important;
                z-index: 999998 !important;
            }
            
            /* Mobile responsive fixes */
            @media (max-width: 768px) {
                .inline-dropdown-container {
                    left: 8px !important;
                    right: 8px !important;
                    max-width: calc(100vw - 16px) !important;
                    width: calc(100vw - 16px) !important;
                    max-height: 60vh !important;
                }
                
                .inline-dropdown-container .ai-option {
                    min-height: 64px !important;
                    padding: 16px !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ Immediate CSS fixes applied');
    }
    
    /**
     * Test dropdown functionality
     */
    function testDropdownFunctionality() {
        console.log('🧪 Testing dropdown functionality...');
        
        setTimeout(() => {
            const sourceItem = document.querySelector('[data-field="collection"]');
            if (sourceItem) {
                console.log('📱 Testing SOURCE dropdown click...');
                
                // Add test click handler
                const testHandler = (e) => {
                    console.log('🎯 SOURCE dropdown test click detected');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Create test dropdown for verification
                    createTestDropdown(sourceItem);
                    
                    // Remove test handler after first use
                    sourceItem.removeEventListener('click', testHandler);
                };
                
                // Add temporary test handler
                sourceItem.addEventListener('click', testHandler, { once: true });
                
                console.log('✅ Test handler added to SOURCE dropdown');
            } else {
                console.warn('⚠️ SOURCE dropdown element not found for testing');
            }
        }, 1000);
    }
    
    /**
     * Create test dropdown to verify fixes
     */
    function createTestDropdown(triggerElement) {
        console.log('🧪 Creating test dropdown...');
        
        const testDropdown = document.createElement('div');
        testDropdown.className = 'inline-dropdown-container test-dropdown';
        testDropdown.innerHTML = `
            <div class="ai-dropdown-content">
                <div class="ai-dropdown-header">
                    <i class="material-icons">dataset</i>
                    <span>Test SOURCE Dropdown</span>
                </div>
                <div class="ai-options-section">
                    <div class="ai-option ai-everything-option" data-value="">
                        <i class="material-icons">public</i>
                        <div class="ai-option-content">
                            <div class="ai-option-title">EVERYTHING</div>
                            <div class="ai-option-subtitle">Search all available datasets</div>
                        </div>
                    </div>
                    <div class="ai-source-group-header">Test Data Sources</div>
                    <div class="ai-option" data-value="test1">
                        <i class="material-icons">satellite</i>
                        <div class="ai-option-content">
                            <div class="ai-option-title">Test Dataset 1</div>
                            <div class="ai-option-subtitle">Sample dataset for testing dropdown layout</div>
                        </div>
                    </div>
                    <div class="ai-option" data-value="test2">
                        <i class="material-icons">terrain</i>
                        <div class="ai-option-content">
                            <div class="ai-option-title">Test Dataset 2 with Very Long Name</div>
                            <div class="ai-option-subtitle">Another sample dataset to test text wrapping and spacing</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Position the test dropdown
        positionTestDropdown(testDropdown, triggerElement);
        
        // Add to document
        document.body.appendChild(testDropdown);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (testDropdown.parentNode) {
                testDropdown.parentNode.removeChild(testDropdown);
                console.log('🧪 Test dropdown closed automatically');
            }
        }, 5000);
        
        console.log('✅ Test dropdown created and positioned');
    }
    
    /**
     * Position test dropdown
     */
    function positionTestDropdown(dropdown, trigger) {
        const triggerRect = trigger.getBoundingClientRect();
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { left: 0, width: 360 };
        
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${sidebarRect.left + 8}px`;
        dropdown.style.top = `${triggerRect.bottom + 8}px`;
        dropdown.style.width = `${sidebarRect.width - 16}px`;
        dropdown.style.maxHeight = '400px';
        dropdown.style.zIndex = '999999';
        
        console.log('📍 Test dropdown positioned');
    }
    
    /**
     * Main initialization function
     */
    function initializeEnhancements() {
        console.log('🚀 Starting SOURCE search dropdown enhancements...');
        
        // Apply immediate CSS fixes first
        applyImmediateCSS();
        
        // Load enhanced CSS
        loadEnhancedCSS()
            .then(() => {
                console.log('✅ Enhanced CSS loaded successfully');
                
                // Enhance dropdown manager
                enhanceDropdownManager();
                
                // Test functionality
                if (ENHANCEMENT_CONFIG.autoApply) {
                    testDropdownFunctionality();
                }
                
                console.log('🎉 SOURCE search dropdown enhancements completed!');
                
                // Show success notification
                setTimeout(() => {
                    if (window.stacExplorer && window.stacExplorer.notificationService) {
                        window.stacExplorer.notificationService.showNotification(
                            '✨ SOURCE search dropdown enhanced - try clicking on SOURCE!',
                            'success'
                        );
                    }
                }, 2000);
                
            })
            .catch((error) => {
                console.error('❌ Error loading enhanced CSS:', error);
                console.log('⚠️ Continuing with immediate fixes only...');
                
                // Still try to enhance dropdown manager
                enhanceDropdownManager();
            });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancements);
    } else {
        initializeEnhancements();
    }
    
    // Export for manual access
    window.dropdownEnhancement = {
        initialize: initializeEnhancements,
        applyCSS: applyImmediateCSS,
        loadEnhanced: loadEnhancedCSS,
        test: testDropdownFunctionality,
        config: ENHANCEMENT_CONFIG
    };
    
    console.log('📦 SOURCE search dropdown enhancement script loaded');
    
})();
