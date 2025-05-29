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
        // Window resize handler
        window.addEventListener('resize', () => {
            const wasDesktop = this.isDesktop;
            this.isDesktop = window.innerWidth > 768;
            
            if (wasDesktop !== this.isDesktop) {
                this.updateLayout();
            }
        });
        
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
        let currentX = 0;
        let isSwipping = false;
        
        document.addEventListener('touchstart', (e) => {
            if (!this.isDesktop) {
                startX = e.touches[0].clientX;
                isSwipping = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isSwipping || this.isDesktop) return;
            currentX = e.touches[0].clientX;
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            if (!isSwipping || this.isDesktop) return;
            
            const diffX = currentX - startX;
            const threshold = 100; // Minimum swipe distance
            
            // Swipe right to open (from left edge)
            if (diffX > threshold && startX < 50 && !this.isOpen) {
                this.openSidebar();
            }
            
            // Swipe left to close (when sidebar is open)
            if (diffX < -threshold && this.isOpen) {
                this.closeSidebar();
            }
            
            isSwipping = false;
        }, { passive: true });
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
            
            // Show mobile elements
            this.mobileMenuBtn.style.display = 'flex';
            if (this.mobileCloseBtn) {
                this.mobileCloseBtn.style.display = 'flex';
            }
            
            // Hide desktop toggle
            if (this.sidebarToggle) {
                this.sidebarToggle.style.display = 'none';
            }
            
            // Update ARIA attributes
            this.sidebar.setAttribute('aria-hidden', 'true');
            this.mobileMenuBtn.setAttribute('aria-expanded', 'false');
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
