/**
 * Enhanced positioning method for InlineDropdownManager
 * Fixes SOURCE search dropdown positioning and overlap issues
 */

/**
 * Enhanced position the inline dropdown relative to the trigger element
 * @param {HTMLElement} dropdown - Dropdown container
 * @param {HTMLElement} trigger - Trigger element
 */
positionInlineDropdownEnhanced(dropdown, trigger) {
    console.log('🎯 [ENHANCED] Starting dropdown positioning...');
    
    try {
        // Get all necessary measurements
        const measurements = this.gatherPositioningMeasurements(dropdown, trigger);
        console.log('📏 [ENHANCED] Measurements:', measurements);
        
        // Calculate optimal position using enhanced algorithm
        const position = this.calculateOptimalPosition(measurements);
        console.log('📍 [ENHANCED] Calculated position:', position);
        
        // Apply positioning with enhanced safety checks
        this.applyEnhancedPositioning(dropdown, position, measurements);
        
        // Verify positioning and apply corrections if needed
        this.verifyAndCorrectPositioning(dropdown, trigger, measurements);
        
        console.log('✅ [ENHANCED] Dropdown positioning completed successfully');
        
    } catch (error) {
        console.error('❌ [ENHANCED] Error in enhanced positioning:', error);
        // Fallback to emergency positioning
        this.applyEmergencyPositioning(dropdown, trigger);
    }
}

/**
 * Gather all measurements needed for positioning calculations
 */
gatherPositioningMeasurements(dropdown, trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { left: 0, width: 360, right: 360 };
    
    // Viewport measurements
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX || window.pageXOffset || 0,
        scrollY: window.scrollY || window.pageYOffset || 0
    };
    
    // Dropdown content measurements (temporary measurement)
    dropdown.style.visibility = 'hidden';
    dropdown.style.position = 'fixed';
    dropdown.style.left = '-9999px';
    dropdown.style.top = '-9999px';
    dropdown.style.display = 'block';
    dropdown.style.width = 'auto';
    dropdown.style.height = 'auto';
    dropdown.style.maxWidth = '480px';
    dropdown.style.maxHeight = '70vh';
    
    // Force reflow to get measurements
    dropdown.offsetHeight;
    
    const dropdownRect = dropdown.getBoundingClientRect();
    const preferredWidth = Math.min(Math.max(dropdownRect.width, 320), 480);
    const preferredHeight = Math.min(dropdownRect.height, viewport.height * 0.7);
    
    return {
        trigger: triggerRect,
        sidebar: sidebarRect,
        viewport,
        dropdown: {
            preferredWidth,
            preferredHeight,
            minWidth: 320,
            maxWidth: 480,
            maxHeight: viewport.height * 0.7
        },
        gaps: {
            minimum: 8,
            preferred: 16,
            sidebarEdge: 8
        }
    };
}

/**
 * Calculate optimal position using enhanced algorithm
 */
calculateOptimalPosition(measurements) {
    const { trigger, sidebar, viewport, dropdown, gaps } = measurements;
    
    // Strategy 1: Position to the right of the trigger (preferred for sidebar)
    let position = this.calculateRightPosition(measurements);
    
    // Check if right position fits
    if (position.left + dropdown.preferredWidth > viewport.width - gaps.minimum) {
        console.log('🔄 [ENHANCED] Right position doesn\'t fit, trying below');
        // Strategy 2: Position below the trigger
        position = this.calculateBelowPosition(measurements);
    }
    
    // Check if below position fits
    if (position.top + dropdown.preferredHeight > viewport.height - gaps.minimum) {
        console.log('🔄 [ENHANCED] Below position doesn\'t fit, trying above');
        // Strategy 3: Position above the trigger
        position = this.calculateAbovePosition(measurements);
    }
    
    // Final constraint checks and adjustments
    position = this.constrainToViewport(position, measurements);
    
    return position;
}

/**
 * Calculate position to the right of trigger (preferred for sidebar items)
 */
calculateRightPosition(measurements) {
    const { trigger, sidebar, viewport, dropdown, gaps } = measurements;
    
    return {
        left: sidebar.right + gaps.preferred,
        top: Math.max(
            gaps.minimum,
            Math.min(
                trigger.top,
                viewport.height - dropdown.preferredHeight - gaps.minimum
            )
        ),
        width: dropdown.preferredWidth,
        height: Math.min(dropdown.preferredHeight, viewport.height - gaps.minimum * 2),
        strategy: 'right'
    };
}

/**
 * Calculate position below the trigger
 */
calculateBelowPosition(measurements) {
    const { trigger, sidebar, viewport, dropdown, gaps } = measurements;
    
    // Use sidebar width with some margin
    const availableWidth = Math.min(
        sidebar.width - gaps.sidebarEdge * 2,
        dropdown.maxWidth
    );
    
    return {
        left: sidebar.left + gaps.sidebarEdge,
        top: trigger.bottom + gaps.preferred,
        width: Math.max(availableWidth, dropdown.minWidth),
        height: Math.min(
            dropdown.preferredHeight,
            viewport.height - trigger.bottom - gaps.preferred - gaps.minimum
        ),
        strategy: 'below'
    };
}

/**
 * Calculate position above the trigger
 */
calculateAbovePosition(measurements) {
    const { trigger, sidebar, viewport, dropdown, gaps } = measurements;
    
    const availableWidth = Math.min(
        sidebar.width - gaps.sidebarEdge * 2,
        dropdown.maxWidth
    );
    
    const availableHeight = trigger.top - gaps.preferred - gaps.minimum;
    
    return {
        left: sidebar.left + gaps.sidebarEdge,
        top: Math.max(gaps.minimum, trigger.top - dropdown.preferredHeight - gaps.preferred),
        width: Math.max(availableWidth, dropdown.minWidth),
        height: Math.min(dropdown.preferredHeight, availableHeight),
        strategy: 'above'
    };
}

/**
 * Constrain position to viewport bounds
 */
constrainToViewport(position, measurements) {
    const { viewport, gaps } = measurements;
    
    // Horizontal constraints
    if (position.left < gaps.minimum) {
        position.left = gaps.minimum;
    }
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
}

/**
 * Apply enhanced positioning with safety checks
 */
applyEnhancedPositioning(dropdown, position, measurements) {
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
    
    // Apply enhanced CSS class for additional styling
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
}

/**
 * Get appropriate entry transform based on positioning strategy
 */
getEntryTransform(strategy) {
    switch (strategy) {
        case 'right':
            return 'translateX(-20px) scale(0.95)';
        case 'above':
            return 'translateY(10px) scale(0.95)';
        case 'below':
        default:
            return 'translateY(-10px) scale(0.95)';
    }
}

/**
 * Verify positioning and apply corrections if needed
 */
verifyAndCorrectPositioning(dropdown, trigger, measurements) {
    // Wait for animation to complete
    setTimeout(() => {
        try {
            const finalRect = dropdown.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(dropdown);
            
            const isVisible = this.verifyDropdownVisibility(dropdown, finalRect, computedStyle);
            const isAccessible = this.verifyDropdownAccessibility(dropdown, trigger, finalRect);
            
            console.log('🔍 [ENHANCED] Position verification:', {
                visible: isVisible,
                accessible: isAccessible,
                finalRect,
                computedDisplay: computedStyle.display,
                computedVisibility: computedStyle.visibility,
                computedOpacity: computedStyle.opacity,
                computedZIndex: computedStyle.zIndex
            });
            
            if (!isVisible || !isAccessible) {
                console.warn('⚠️ [ENHANCED] Dropdown not properly positioned, applying corrections...');
                this.applyPositionCorrections(dropdown, trigger, finalRect, measurements);
            } else {
                console.log('✅ [ENHANCED] Dropdown positioning verified successfully');
            }
            
        } catch (error) {
            console.error('❌ [ENHANCED] Error in position verification:', error);
        }
    }, 350); // Wait for animation completion
}

/**
 * Verify dropdown visibility
 */
verifyDropdownVisibility(dropdown, rect, computedStyle) {
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        computedStyle.display !== 'none' &&
        computedStyle.visibility !== 'hidden' &&
        parseFloat(computedStyle.opacity) > 0 &&
        rect.left >= -10 && // Allow small negative values
        rect.top >= -10 &&
        rect.right <= window.innerWidth + 10 &&
        rect.bottom <= window.innerHeight + 10
    );
}

/**
 * Verify dropdown accessibility (not hidden behind other elements)
 */
verifyDropdownAccessibility(dropdown, trigger, rect) {
    try {
        // Check center point
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        
        // Check if dropdown or its children are accessible
        return dropdown.contains(elementAtCenter) || elementAtCenter === dropdown;
    } catch (error) {
        console.warn('⚠️ [ENHANCED] Could not verify accessibility:', error);
        return true; // Assume accessible if check fails
    }
}

/**
 * Apply position corrections when verification fails
 */
applyPositionCorrections(dropdown, trigger, currentRect, measurements) {
    console.log('🔧 [ENHANCED] Applying position corrections...');
    
    // Clear existing positioning
    dropdown.style.transform = 'none';
    dropdown.style.transition = 'none';
    
    // Apply emergency center positioning
    this.applyEmergencyPositioning(dropdown, trigger);
    
    // Show correction notification
    if (this.notificationService) {
        this.notificationService.showNotification(
            `📝 ${this.currentField?.toUpperCase() || 'Dropdown'} menu opened (corrected position)`,
            'info'
        );
    }
}

/**
 * Emergency positioning when all else fails
 */
applyEmergencyPositioning(dropdown, trigger) {
    console.warn('🚨 [ENHANCED] Applying emergency positioning...');
    
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    // Center dropdown on screen with mobile-friendly sizing
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
}

/**
 * Add emergency positioning indicator
 */
addEmergencyIndicator(dropdown) {
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
}

// Method to replace the existing positionInlineDropdown method
replacePositioningMethod() {
    // Store original method as backup
    this.originalPositionInlineDropdown = this.positionInlineDropdown;
    
    // Replace with enhanced version
    this.positionInlineDropdown = this.positionInlineDropdownEnhanced;
    
    console.log('🔄 [ENHANCED] Replaced dropdown positioning with enhanced version');
}

// Method to restore original positioning if needed
restoreOriginalPositioning() {
    if (this.originalPositionInlineDropdown) {
        this.positionInlineDropdown = this.originalPositionInlineDropdown;
        console.log('🔄 [ENHANCED] Restored original dropdown positioning');
    }
}
