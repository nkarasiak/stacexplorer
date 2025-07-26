/**
 * Enhanced Mobile Sidebar Manager
 * Handles mobile-first sidebar behavior with proper hamburger menu
 */

export class MobileSidebarManager {
    constructor() {
        this.sidebar = null;
        this.backdrop = null;
        this.mobileMenuBtn = null;
        this.mobileCloseBtn = null;
        this.sidebarToggle = null;
        this.isDesktop = window.innerWidth > 768;
        this.isOpen = false;
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        this.createMobileElements();
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        
        // Set initial state
        this.updateLayout();
    }
    
    createMobileElements() {
        // Create mobile hamburger menu button
        this.createMobileMenuButton();
        
        // Create backdrop overlay
        this.createBackdrop();
        
        // Add mobile close button to sidebar header
        this.addMobileCloseButton();
    }
    
    createMobileMenuButton() {
        this.mobileMenuBtn = document.createElement('button');
        this.mobileMenuBtn.className = 'mobile-menu-btn';
        this.mobileMenuBtn.innerHTML = '<i class="material-icons">menu</i>';
        this.mobileMenuBtn.setAttribute('aria-label', 'Open navigation menu');
        this.mobileMenuBtn.addEventListener('click', () => this.openSidebar());
        
        document.body.appendChild(this.mobileMenuBtn);
    }
    
    createBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'sidebar-backdrop';
        this.backdrop.addEventListener('click', () => this.closeSidebar());
        
        document.body.appendChild(this.backdrop);
    }
    
    addMobileCloseButton() {
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader) {
            this.mobileCloseBtn = document.createElement('button');
            this.mobileCloseBtn.className = 'mobile-close-btn';
            this.mobileCloseBtn.innerHTML = '<i class="material-icons">close</i>';
            this.mobileCloseBtn.setAttribute('aria-label', 'Close navigation menu');
            this.mobileCloseBtn.addEventListener('click', () => this.closeSidebar());
            
            sidebarHeader.appendChild(this.mobileCloseBtn);
        }
    }
    
    setupEventListeners() {
        // Throttled window resize handler for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const wasDesktop = this.isDesktop;
                this.isDesktop = window.innerWidth > 768;
                
                if (wasDesktop !== this.isDesktop) {
                    this.updateLayout();
                }
            }, 100); // Debounce resize events
        });
        
        // Listen for URL changes to update mobile toggle visibility
        window.addEventListener('popstate', () => {
            if (!this.isDesktop) {
                this.updateLayout();
            }
        });
        
        // Listen for pushstate events (programmatic navigation)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            if (!this.isDesktop) {
                setTimeout(() => this.updateLayout(), 100);
            }
        };
        
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            if (!this.isDesktop) {
                setTimeout(() => this.updateLayout(), 100);
            }
        };
        
        // Existing desktop toggle
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                if (this.isDesktop) {
                    this.toggleDesktopSidebar();
                }
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isDesktop && this.isOpen) {
                this.closeSidebar();
            }
        });
        
        // Touch/swipe gestures (basic implementation)
        this.setupSwipeGestures();
        
        // Focus management
        this.setupFocusManagement();
    }
    
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isSwipping = false;
        let lastTouchTime = 0;
        const touchThrottle = 16; // ~60fps throttling
        
        // Enhanced touch start with better detection
        document.addEventListener('touchstart', (e) => {
            if (!this.isDesktop) {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                currentX = startX;
                currentY = startY;
                isSwipping = true;
                lastTouchTime = Date.now();
                
                // Add subtle feedback for edge swipes
                if (startX < 20 && !this.isOpen) {
                    document.body.style.transition = 'transform 0.2s ease';
                    document.body.style.transform = 'translateX(2px)';
                    setTimeout(() => {
                        document.body.style.transform = 'translateX(0)';
                        setTimeout(() => {
                            document.body.style.transition = '';
                        }, 200);
                    }, 100);
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isSwipping || this.isDesktop) return;
            
            // Throttle touch move events for better performance
            const now = Date.now();
            if (now - lastTouchTime < touchThrottle) return;
            lastTouchTime = now;
            
            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;
            
            // Add live drag feedback for sidebar
            if (this.isOpen) {
                const diffX = currentX - startX;
                if (diffX < 0) {
                    const dragAmount = Math.max(diffX, -200);
                    const opacity = 1 + (dragAmount / 200) * 0.3;
                    this.sidebar.style.transform = `translateX(${dragAmount}px)`;
                    this.sidebar.style.opacity = opacity;
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!isSwipping || this.isDesktop) return;
            
            const diffX = currentX - startX;
            const diffY = Math.abs(currentY - startY);
            const threshold = 100; // Minimum swipe distance
            const velocityThreshold = 50; // Minimum velocity for quick swipes
            
            // Reset any drag transforms
            if (this.sidebar.style.transform) {
                this.sidebar.style.transform = '';
                this.sidebar.style.opacity = '';
            }
            
            // Check if this is primarily a horizontal swipe
            const isHorizontalSwipe = Math.abs(diffX) > diffY;
            
            if (isHorizontalSwipe) {
                // Swipe right to open (from left edge)
                if (diffX > threshold && startX < 50 && !this.isOpen) {
                    this.openSidebar();
                    this.provideTactileFeedback();
                }
                // Quick swipe right from anywhere when closed
                else if (diffX > velocityThreshold && !this.isOpen && startX < 100) {
                    this.openSidebar();
                    this.provideTactileFeedback();
                }
                // Swipe left to close (when sidebar is open)
                else if (diffX < -threshold && this.isOpen) {
                    this.closeSidebar();
                    this.provideTactileFeedback();
                }
                // Quick swipe left when open
                else if (diffX < -velocityThreshold && this.isOpen) {
                    this.closeSidebar();
                    this.provideTactileFeedback();
                }
            }
            
            isSwipping = false;
        }, { passive: true });
        
        // Add pinch-to-zoom prevention on sidebar
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1 && this.isOpen) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Add subtle haptic-like feedback
    provideTactileFeedback() {
        // Visual feedback since we can't access haptic APIs in web
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: var(--primary-500);
            border-radius: 50%;
            opacity: 0.8;
            pointer-events: none;
            z-index: 10000;
            animation: tactilePulse 0.3s ease-out;
        `;
        
        // Add animation keyframes if not already present
        if (!document.querySelector('#tactile-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'tactile-feedback-styles';
            style.textContent = `
                @keyframes tactilePulse {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0.8;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.4;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }
    
    setupFocusManagement() {
        // Trap focus within sidebar when open on mobile
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !this.isDesktop && this.isOpen) {
                this.trapFocus(e);
            }
        });
    }
    
    trapFocus(event) {
        const focusableElements = this.sidebar.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
    
    openSidebar() {
        if (this.isDesktop) return;
        
        this.isOpen = true;
        this.sidebar.classList.add('mobile-open');
        this.backdrop.classList.add('active');
        document.body.classList.add('sidebar-open');
        
        // Update ARIA attributes
        this.mobileMenuBtn.setAttribute('aria-expanded', 'true');
        this.sidebar.setAttribute('aria-hidden', 'false');
        
        // Focus first focusable element in sidebar
        const firstFocusable = this.sidebar.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable && firstFocusable !== this.mobileCloseBtn) {
            setTimeout(() => firstFocusable.focus(), 100);
        } else if (this.mobileCloseBtn) {
            setTimeout(() => this.mobileCloseBtn.focus(), 100);
        }
        
        // Announce to screen readers
        this.announceToScreenReader('Navigation menu opened');
    }
    
    closeSidebar() {
        if (this.isDesktop) return;
        
        this.isOpen = false;
        this.sidebar.classList.remove('mobile-open');
        this.backdrop.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        
        // Update ARIA attributes
        this.mobileMenuBtn.setAttribute('aria-expanded', 'false');
        this.sidebar.setAttribute('aria-hidden', 'true');
        
        // Return focus to menu button
        this.mobileMenuBtn.focus();
        
        // Announce to screen readers
        this.announceToScreenReader('Navigation menu closed');
    }
    
    toggleDesktopSidebar() {
        if (!this.isDesktop) return;
        
        this.sidebar.classList.toggle('collapsed');
        
        // Update button icon
        const icon = this.sidebarToggle.querySelector('i');
        if (icon) {
            // Icon rotation is handled by CSS
        }
        
        // Announce change to screen readers
        const isCollapsed = this.sidebar.classList.contains('collapsed');
        this.announceToScreenReader(
            isCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded'
        );
    }
    
    updateLayout() {
        if (this.isDesktop) {
            // Desktop layout
            this.closeSidebar(); // Close mobile sidebar if open
            this.sidebar.classList.remove('mobile-open');
            this.backdrop.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            
            // Hide mobile elements
            this.mobileMenuBtn.style.display = 'none';
            if (this.mobileCloseBtn) {
                this.mobileCloseBtn.style.display = 'none';
            }
            
            // Show desktop toggle
            if (this.sidebarToggle) {
                this.sidebarToggle.style.display = 'flex';
            }
            
            // Update ARIA attributes
            this.sidebar.removeAttribute('aria-hidden');
            
        } else {
            // Mobile layout
            this.sidebar.classList.remove('collapsed'); // Remove desktop collapsed state
            
            // Check if we should show mobile menu toggle based on current page
            const shouldShowMobileToggle = this.shouldShowMobileToggle();
            
            // Show/hide mobile hamburger menu based on page context
            this.mobileMenuBtn.style.display = shouldShowMobileToggle ? 'flex' : 'none';
            
            // Mobile close button visibility depends on sidebar state
            if (this.mobileCloseBtn) {
                this.mobileCloseBtn.style.display = (this.isOpen && shouldShowMobileToggle) ? 'flex' : 'none';
            }
            
            // Hide desktop toggle
            if (this.sidebarToggle) {
                this.sidebarToggle.style.display = 'none';
            }
            
            // Update ARIA attributes
            this.sidebar.setAttribute('aria-hidden', this.isOpen ? 'false' : 'true');
            if (shouldShowMobileToggle) {
                this.mobileMenuBtn.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
            }
        }
    }
    
    announceToScreenReader(message) {
        // Create a temporary element for screen reader announcements
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        document.body.appendChild(announcement);
        announcement.textContent = message;
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    /**
     * Determine if the mobile menu toggle should be shown
     * Show the toggle on all pages - users always need access to navigation
     * @returns {boolean} Whether to show the mobile toggle
     */
    shouldShowMobileToggle() {
        // Always show mobile toggle - users need access to navigation on all pages
        // This was previously hiding the toggle on the root page, which was wrong
        const shouldShow = true;
        
        
        return shouldShow;
    }

    // Public API methods
    isMobile() {
        return !this.isDesktop;
    }
    
    isMobileSidebarOpen() {
        return !this.isDesktop && this.isOpen;
    }
    
    forceClose() {
        if (!this.isDesktop) {
            this.closeSidebar();
        }
    }
    
    // Method to handle programmatic sidebar control
    setSidebarState(state) {
        if (this.isDesktop) {
            if (state === 'collapsed') {
                this.sidebar.classList.add('collapsed');
            } else if (state === 'expanded') {
                this.sidebar.classList.remove('collapsed');
            }
        } else {
            if (state === 'open') {
                this.openSidebar();
            } else if (state === 'closed') {
                this.closeSidebar();
            }
        }
    }
}

// Initialize mobile sidebar manager when DOM is loaded
let mobileSidebarManager;

document.addEventListener('DOMContentLoaded', () => {
    mobileSidebarManager = new MobileSidebarManager();
    
    // Export to global scope for debugging and external access
    window.mobileSidebarManager = mobileSidebarManager;
});

// Export for module usage
export { mobileSidebarManager };
