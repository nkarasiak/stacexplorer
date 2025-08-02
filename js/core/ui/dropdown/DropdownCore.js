/**
 * DropdownCore - Core dropdown functionality
 * Handles basic dropdown creation, positioning, and lifecycle
 */

export class DropdownCore {
  constructor() {
    this.temporarilyDisableClickOutside = false;
    this.currentDropdown = null;
  }

  /**
   * Create and position a dropdown element
   */
  createDropdown(triggerElement, content, options = {}) {
    // Clean up any existing dropdown first
    this.cleanupDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'inline-dropdown-menu';
    dropdown.innerHTML = content;

    // Position dropdown
    this.positionDropdown(dropdown, triggerElement, options);

    // Add to DOM
    document.body.appendChild(dropdown);
    this.currentDropdown = dropdown;

    // Set up click outside handler
    this.setupClickOutsideHandler(dropdown, triggerElement);

    return dropdown;
  }

  /**
   * Position dropdown relative to trigger element
   */
  positionDropdown(dropdown, triggerElement, _options = {}) {
    const rect = triggerElement.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;

    // Adjust if dropdown would go off screen
    if (left + dropdownRect.width > window.innerWidth) {
      left = window.innerWidth - dropdownRect.width - 10;
    }

    if (top + dropdownRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownRect.height;
    }

    dropdown.style.position = 'absolute';
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.zIndex = '10000';
  }

  /**
   * Set up click outside handler to close dropdown
   */
  setupClickOutsideHandler(dropdown, triggerElement) {
    const clickOutsideHandler = event => {
      if (this.temporarilyDisableClickOutside) {
        return;
      }

      // Don't close if clicking on the trigger or dropdown
      if (triggerElement?.contains(event.target)) {
        return;
      }
      if (dropdown?.contains(event.target)) {
        return;
      }

      this.cleanupDropdown();
    };

    // Add listener with delay to avoid immediate closure
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 100);

    // Store handler for cleanup
    dropdown._clickOutsideHandler = clickOutsideHandler;
  }

  /**
   * Clean up current dropdown
   */
  cleanupDropdown() {
    if (this.currentDropdown) {
      // Remove click outside handler
      if (this.currentDropdown._clickOutsideHandler) {
        document.removeEventListener('click', this.currentDropdown._clickOutsideHandler);
      }

      // Remove from DOM
      if (this.currentDropdown.parentNode) {
        this.currentDropdown.parentNode.removeChild(this.currentDropdown);
      }

      this.currentDropdown = null;
    }
  }

  /**
   * Ensure dropdown is visible on screen
   */
  ensureDropdownVisible(dropdown) {
    if (!dropdown) {
      return;
    }

    const rect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Adjust horizontal position if needed
    if (rect.right > viewportWidth) {
      const overflow = rect.right - viewportWidth;
      const currentLeft = parseInt(dropdown.style.left) || 0;
      dropdown.style.left = `${currentLeft - overflow - 10}px`;
    }

    // Adjust vertical position if needed
    if (rect.bottom > viewportHeight) {
      const overflow = rect.bottom - viewportHeight;
      const currentTop = parseInt(dropdown.style.top) || 0;
      dropdown.style.top = `${currentTop - overflow - 10}px`;
    }
  }

  /**
   * Temporarily disable click outside detection
   */
  temporarilyDisableClickOutside(duration = 300) {
    this.temporarilyDisableClickOutside = true;
    setTimeout(() => {
      this.temporarilyDisableClickOutside = false;
    }, duration);
  }

  /**
   * Check if dropdown is currently open
   */
  isOpen() {
    return this.currentDropdown !== null;
  }

  /**
   * Get current dropdown element
   */
  getCurrentDropdown() {
    return this.currentDropdown;
  }
}
