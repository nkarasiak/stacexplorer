/* App Handlers JavaScript - Extracted from index.html */

// GitHub Pages SPA Redirect Handler
(function () {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect != location.href) {
    history.replaceState(null, null, redirect);
  }
})();

// Check if we need to handle query-based redirect from 404.html
(function () {
  var l = window.location;
  if (l.search) {
    var q = {};
    l.search
      .slice(1)
      .split('&')
      .forEach(function (v) {
        var a = v.split('=');
        q[a[0]] = a.slice(1).join('=').replace(/~and~/g, '&');
      });
    if (q.p !== undefined) {
      // Remove the query parameter redirect and replace with the actual path
      var newUrl =
        l.protocol +
        '//' +
        l.hostname +
        (l.port ? ':' + l.port : '') +
        l.pathname +
        q.p +
        (q.q ? '?' + q.q : '') +
        l.hash;
      window.history.replaceState(null, null, newUrl);
    }
  }
})();

// Ultra-fast browser mode detection - runs immediately without waiting for DOM
(function () {
  const path = window.location.pathname;
  const isBrowserMode = path.startsWith('/browser');

  if (isBrowserMode) {
    // Hide the page immediately to prevent flash
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';

    // Add browser-mode class to body for early styling
    document.documentElement.classList.add('browser-mode-loading');

    console.log('🚀 Early browser mode detection - hiding page for fast loading:', path);

    // Set flag for later use in main app
    window.__STAC_EARLY_BROWSER_MODE = true;

    // Show only after our fast init is complete
    window.__STAC_SHOW_PAGE = function () {
      document.documentElement.style.visibility = 'visible';
      document.documentElement.style.opacity = '1';
      document.documentElement.style.transition = 'opacity 0.3s ease';
      document.documentElement.classList.remove('browser-mode-loading');
    };
  }
})();

/**
 * Enhanced Mobile Sidebar Manager
 * Hamburger menu only appears when sidebar is hidden
 */
class MobileSidebarManager {
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

    // Set initial state and icon based on current sidebar state
    this.updateLayout();
    this.setCorrectToggleIcon();
  }

  setCorrectToggleIcon() {
    if (!this.sidebarToggle) return;

    const toggleIcon = this.sidebarToggle.querySelector('i');
    if (!toggleIcon) return;

    if (this.isDesktop) {
      // On desktop, check sidebar state
      const isHidden = this.sidebar.classList.contains('hidden');
      toggleIcon.textContent = isHidden ? 'chevron_right' : 'chevron_left';
    }
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
    } else {
      console.error('Sidebar header not found!');
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
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.isDesktop && this.isOpen) {
        this.closeSidebar();
      }
    });

    // Touch/swipe gestures (basic implementation)
    this.setupSwipeGestures();
  }

  setupSwipeGestures() {
    let startX = 0;
    let currentX = 0;
    let isSwipping = false;

    document.addEventListener(
      'touchstart',
      e => {
        if (!this.isDesktop) {
          startX = e.touches[0].clientX;
          isSwipping = true;
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'touchmove',
      e => {
        if (!isSwipping || this.isDesktop) return;
        currentX = e.touches[0].clientX;
      },
      { passive: true }
    );

    document.addEventListener(
      'touchend',
      () => {
        if (!isSwipping || this.isDesktop) return;

        const diffX = currentX - startX;
        const threshold = 100;

        // Swipe right to open (from left edge)
        if (diffX > threshold && startX < 50 && !this.isOpen) {
          this.openSidebar();
        }

        // Swipe left to close (when sidebar is open)
        if (diffX < -threshold && this.isOpen) {
          this.closeSidebar();
        }

        isSwipping = false;
      },
      { passive: true }
    );
  }

  openSidebar() {
    if (this.isDesktop) return;

    this.isOpen = true;
    this.sidebar.classList.add('mobile-open');
    this.backdrop.classList.add('active');
    document.body.classList.add('sidebar-open');

    // Hide hamburger menu when sidebar is open
    this.mobileMenuBtn.style.display = 'none';

    // Show mobile close button when sidebar is open
    if (this.mobileCloseBtn) {
      this.mobileCloseBtn.style.display = 'flex';
    } else {
      console.error('No close button to show!');
    }

    // Update ARIA attributes
    this.sidebar.setAttribute('aria-hidden', 'false');

    // Focus first focusable element in sidebar
    setTimeout(() => {
      const firstFocusable = this.sidebar.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable && firstFocusable !== this.mobileCloseBtn) {
        firstFocusable.focus();
      } else if (this.mobileCloseBtn) {
        this.mobileCloseBtn.focus();
      }
    }, 100);
  }

  closeSidebar() {
    if (this.isDesktop) return;

    this.isOpen = false;
    this.sidebar.classList.remove('mobile-open');
    this.backdrop.classList.remove('active');
    document.body.classList.remove('sidebar-open');

    // Show hamburger menu when sidebar is closed
    this.mobileMenuBtn.style.display = 'flex';

    // Hide mobile close button when sidebar is closed
    if (this.mobileCloseBtn) {
      this.mobileCloseBtn.style.display = 'none';
    }

    // Update ARIA attributes
    this.sidebar.setAttribute('aria-hidden', 'true');

    // Return focus to menu button
    this.mobileMenuBtn.focus();
  }

  toggleDesktopSidebar() {
    if (!this.isDesktop) return;

    const isCurrentlyHidden = this.sidebar.classList.contains('hidden');

    if (isCurrentlyHidden) {
      // Show the sidebar
      this.sidebar.classList.remove('hidden');
      // Update toggle button icon to show it can hide
      const toggleIcon = this.sidebarToggle.querySelector('i');
      if (toggleIcon) {
        toggleIcon.textContent = 'chevron_left';
      }
    } else {
      // Hide the sidebar
      this.sidebar.classList.add('hidden');
      // Update toggle button icon to show it can show
      const toggleIcon = this.sidebarToggle.querySelector('i');
      if (toggleIcon) {
        toggleIcon.textContent = 'chevron_right';
      }
    }

    // Force a recompute
    setTimeout(() => {}, 100);
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

      // Set correct toggle icon for desktop
      this.setCorrectToggleIcon();
    } else {
      // Mobile layout
      this.sidebar.classList.remove('collapsed'); // Remove desktop collapsed state
      this.sidebar.classList.remove('hidden'); // Remove desktop hidden state

      // Check if we should show mobile menu toggle based on current page
      const shouldShowMobileToggle = this.shouldShowMobileToggle();

      // Show/hide mobile hamburger menu based on page context
      this.mobileMenuBtn.style.display = shouldShowMobileToggle ? 'flex' : 'none';

      // Mobile close button visibility depends on sidebar state
      if (this.mobileCloseBtn) {
        this.mobileCloseBtn.style.display =
          this.isOpen && shouldShowMobileToggle ? 'flex' : 'none';
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

  /**
   * Determine if the mobile menu toggle should be shown
   * Hide the toggle when user is on the root/landing page (no URL parameters)
   * @returns {boolean} Whether to show the mobile toggle
   */
  shouldShowMobileToggle() {
    // Check if there are any URL parameters that indicate we're not on the landing page
    const urlParams = new URLSearchParams(window.location.search);
    const hasSearchParams = urlParams.toString().length > 0;

    // Check if there's a hash that indicates a specific view/state
    const hasHash = window.location.hash && window.location.hash.length > 1;

    // Show mobile toggle when there are URL parameters or hash (indicating user is in a specific view)
    // Hide mobile toggle on the landing page (no parameters)
    const shouldShow = hasSearchParams || hasHash;

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
}

// Initialize mobile sidebar manager when DOM is loaded
let mobileSidebarManager;

document.addEventListener('DOMContentLoaded', () => {
  mobileSidebarManager = new MobileSidebarManager();

  // Export to global scope for debugging and external access
  window.mobileSidebarManager = mobileSidebarManager;
});

// Logo click handler - return to homepage
document.addEventListener('DOMContentLoaded', () => {
  const appLogo = document.getElementById('app-logo');
  if (appLogo) {
    appLogo.addEventListener('click', () => {
      // Navigate to homepage (/viewer) - with correct base path
      const basePath =
        window.location.hostname.endsWith('.github.io') &&
        window.location.pathname.startsWith('/stacexplorer/')
          ? '/stacexplorer'
          : '';
      window.location.href = basePath + '/viewer';
    });
  }

  // Browser/Viewer mode toggle button handler
  const browserToggle = document.getElementById('browser-toggle');
  if (browserToggle) {
    // Detect current mode and extract path components
    const currentPath = window.location.pathname;
    const basePath =
      window.location.hostname.endsWith('.github.io') &&
      window.location.pathname.startsWith('/stacexplorer/')
        ? '/stacexplorer'
        : '';
    const isBrowserMode = currentPath.includes('/browser');

    // Update button appearance based on current mode
    const icon = browserToggle.querySelector('i');
    if (isBrowserMode) {
      // In browser mode, show viewer toggle
      icon.textContent = 'map';
      browserToggle.title = 'Switch to Map Viewer';
    } else {
      // In viewer mode, show browser toggle
      icon.textContent = 'web';
      browserToggle.title = 'Browse Catalogs';
    }

    browserToggle.addEventListener('click', () => {
      // Preserve query parameters and hash
      const queryString = window.location.search;
      const hash = window.location.hash;

      // Extract the path segments after the mode (browser/viewer)
      let pathSegments = '';

      if (isBrowserMode) {
        // Extract everything after /browser
        const browserIndex = currentPath.indexOf('/browser');
        if (browserIndex !== -1) {
          const afterBrowser = currentPath.substring(browserIndex + '/browser'.length);
          pathSegments = afterBrowser;
        }
        // Navigate to viewer mode preserving the path, query, and hash
        const newPath = pathSegments ? basePath + '/viewer' + pathSegments : basePath + '/';
        window.location.href = newPath + queryString + hash;
      } else {
        // Extract everything after /viewer, or from root if no /viewer
        const viewerIndex = currentPath.indexOf('/viewer');
        if (viewerIndex !== -1) {
          const afterViewer = currentPath.substring(viewerIndex + '/viewer'.length);
          pathSegments = afterViewer;
        } else {
          // Handle root path or other viewer paths - preserve any catalog/collection/item paths
          const withoutBase = currentPath.replace(basePath, '');
          if (withoutBase !== '/' && withoutBase !== '') {
            // Remove leading slash if present
            pathSegments = withoutBase.startsWith('/') ? withoutBase : '/' + withoutBase;
          }
        }
        // Navigate to browser mode preserving the path, query, and hash
        window.location.href = basePath + '/browser' + pathSegments + queryString + hash;
      }
    });
  }

  // Settings button handler - navigate to /settings with correct base path
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      // Navigate to settings (/settings) - with correct base path
      const basePath =
        window.location.hostname.endsWith('.github.io') &&
        window.location.pathname.startsWith('/stacexplorer/')
          ? '/stacexplorer'
          : '';
      window.location.href = basePath + '/settings';
    });
  }

  // Dynamically set meta tag URLs based on current location
  const currentUrl = window.location.origin + window.location.pathname;
  // Use base path for static images
  const basePath =
    window.location.hostname.endsWith('.github.io') &&
    window.location.pathname.startsWith('/stacexplorer/')
      ? '/stacexplorer'
      : '';
  const imageUrl =
    window.location.origin + basePath + '/static/images/earthdaily_satellite.webp';

  // Update canonical URL
  const canonicalLink = document.getElementById('canonical-url');
  if (canonicalLink) canonicalLink.href = currentUrl;

  // Update Open Graph URLs
  const ogUrl = document.getElementById('og-url');
  if (ogUrl) ogUrl.content = currentUrl;

  const ogImage = document.getElementById('og-image');
  if (ogImage) ogImage.content = imageUrl;

  // Update Twitter URLs
  const twitterUrl = document.getElementById('twitter-url');
  if (twitterUrl) twitterUrl.content = currentUrl;

  const twitterImage = document.getElementById('twitter-image');
  if (twitterImage) twitterImage.content = imageUrl;

  // Update JSON-LD structured data
  const scriptTag = document.querySelector('script[type="application/ld+json"]');
  if (scriptTag) {
    try {
      const jsonData = JSON.parse(scriptTag.textContent);
      jsonData.url = currentUrl;
      jsonData.screenshot = imageUrl;
      scriptTag.textContent = JSON.stringify(jsonData, null, 2);
    } catch (e) {
      console.warn('Could not update JSON-LD structured data:', e);
    }
  }

  // Update sitemap.xml dynamically (for client-side processing)
  // Note: This won't affect the actual sitemap.xml file, but can help with dynamic content
  console.log('Dynamic URLs set for current location:', currentUrl);
});