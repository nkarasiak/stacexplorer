/**
 * Modal Component - Accessible modal dialogs with focus trapping and management
 * Extends BaseUIComponent for lifecycle management
 * 
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from '../base/BaseUIComponent.js';
import { focusManager } from '../base/FocusManager.js';

export class Modal extends BaseUIComponent {
    /**
     * Create a new Modal component
     * @param {HTMLElement|string} container - Container element or selector
     * @param {Object} options - Modal configuration options
     */
    constructor(container, options = {}) {
        super(container, options);
        
        this.isOpen = false;
        this.focusTrap = null;
        this.backdrop = null;
        this.dialog = null;
        this.closeButtons = [];
        
        // Event handlers bound to this instance
        this.boundHandleEscape = this.handleEscape.bind(this);
        this.boundHandleBackdropClick = this.handleBackdropClick.bind(this);
        this.boundHandleResize = this.handleResize.bind(this);
    }
    
    /**
     * Get default options
     * @returns {Object} Default options
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'modal',
            role: 'dialog',
            ariaLabel: null,
            ariaLabelledBy: null,
            ariaDescribedBy: null,
            
            // Modal behavior
            closeOnEscape: true,
            closeOnBackdrop: true,
            trapFocus: true,
            restoreFocus: true,
            
            // Animation
            animationDuration: 300,
            backdropAnimation: true,
            
            // Layout
            size: 'medium', // small, medium, large, xlarge, fullscreen
            position: 'center', // center, top, bottom
            scrollable: false,
            
            // Accessibility
            preventBodyScroll: true,
            announceOpen: true,
            announceClose: false,
            
            // Custom classes
            backdropClass: 'modal-backdrop',
            dialogClass: 'modal-dialog',
            headerClass: 'modal-header',
            bodyClass: 'modal-body',
            footerClass: 'modal-footer'
        };
    }
    
    /**
     * Get initial state
     * @returns {Object} Initial state
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            isOpen: false,
            isAnimating: false
        };
    }
    
    /**
     * Component-specific initialization
     */
    onInit() {
        this.createModalStructure();
        this.setupAccessibilityAttributes();
        this.setupCloseButtons();
        
        // Initially hide the modal
        this.container.style.display = 'none';
    }
    
    /**
     * Create modal DOM structure
     */
    createModalStructure() {
        // Ensure we have the correct modal structure
        if (!this.container.querySelector('.modal-backdrop')) {
            this.createBackdrop();
        }
        
        if (!this.container.querySelector('.modal-dialog')) {
            this.createDialog();
        }
        
        this.backdrop = this.container.querySelector('.modal-backdrop') || this.container;
        this.dialog = this.container.querySelector('.modal-dialog');
        
        // Add size and position classes
        this.dialog.classList.add(
            `${this.options.dialogClass}--${this.options.size}`,
            `${this.options.dialogClass}--${this.options.position}`
        );
        
        if (this.options.scrollable) {
            this.dialog.classList.add(`${this.options.dialogClass}--scrollable`);
        }
    }
    
    /**
     * Create backdrop element
     */
    createBackdrop() {
        // If container is not the backdrop, create one
        if (!this.container.classList.contains(this.options.backdropClass)) {
            const existingContent = Array.from(this.container.children);
            
            const backdrop = document.createElement('div');
            backdrop.className = this.options.backdropClass;
            
            // Move existing content to backdrop
            existingContent.forEach(child => backdrop.appendChild(child));
            
            this.container.appendChild(backdrop);
        }
    }
    
    /**
     * Create dialog element
     */
    createDialog() {
        const backdrop = this.container.querySelector('.modal-backdrop') || this.container;
        
        // If there's no dialog, create the structure
        if (!backdrop.querySelector('.modal-dialog')) {
            const existingContent = Array.from(backdrop.children);
            
            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = this.options.dialogClass;
            dialog.setAttribute('role', 'document');
            
            // Move existing content to dialog
            existingContent.forEach(child => dialog.appendChild(child));
            
            backdrop.appendChild(dialog);
        }
    }
    
    /**
     * Set up accessibility attributes
     */
    setupAccessibilityAttributes() {
        this.container.setAttribute('role', this.options.role);
        this.container.setAttribute('aria-modal', 'true');
        this.container.setAttribute('aria-hidden', 'true');
        
        if (this.options.ariaLabel) {
            this.container.setAttribute('aria-label', this.options.ariaLabel);
        }
        
        if (this.options.ariaLabelledBy) {
            this.container.setAttribute('aria-labelledby', this.options.ariaLabelledBy);
        }
        
        if (this.options.ariaDescribedBy) {
            this.container.setAttribute('aria-describedby', this.options.ariaDescribedBy);
        }
        
        // Add tabindex to make modal focusable
        if (!this.container.hasAttribute('tabindex')) {
            this.container.setAttribute('tabindex', '-1');
        }
    }
    
    /**
     * Set up close buttons
     */
    setupCloseButtons() {
        // Find all close buttons within the modal
        this.closeButtons = Array.from(
            this.dialog.querySelectorAll('[data-dismiss="modal"], .modal-close')
        );
        
        // Add default close button if none exists and there's a header
        const header = this.dialog.querySelector('.modal-header');
        if (header && this.closeButtons.length === 0) {
            this.createDefaultCloseButton(header);
        }
        
        // Set up event listeners for close buttons
        this.closeButtons.forEach(button => {
            this.addEventListener(button, 'click', this.close);
            
            // Ensure proper accessibility attributes
            if (!button.hasAttribute('aria-label')) {
                button.setAttribute('aria-label', 'Close modal');
            }
        });
    }
    
    /**
     * Create default close button
     * @param {HTMLElement} header - Header element
     */
    createDefaultCloseButton(header) {
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.setAttribute('type', 'button');
        closeButton.setAttribute('aria-label', 'Close modal');
        closeButton.innerHTML = '<i class="material-icons">close</i>';
        
        header.appendChild(closeButton);
        this.closeButtons.push(closeButton);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Backdrop click handler
        if (this.options.closeOnBackdrop) {
            this.addEventListener(this.backdrop, 'click', this.boundHandleBackdropClick);
        }
        
        // Resize handler
        this.addEventListener(window, 'resize', this.boundHandleResize);
    }
    
    /**
     * Open the modal
     * @param {Object} options - Open options
     * @returns {Promise} Promise that resolves when modal is opened
     */
    async open(options = {}) {
        if (this.isOpen || this.state.isAnimating) {
            return Promise.resolve();
        }
        
        const config = { ...this.options, ...options };
        
        this.log('Opening modal');
        this.setState({ isAnimating: true });
        
        // Prevent body scroll
        if (config.preventBodyScroll) {
            this.preventBodyScroll();
        }
        
        // Show the modal
        this.container.style.display = 'flex';
        this.container.setAttribute('aria-hidden', 'false');
        
        // Force reflow for animation
        this.container.offsetHeight;
        
        // Add open class for animation
        this.container.classList.add('modal--open');
        
        // Set up event listeners
        if (config.closeOnEscape) {
            document.addEventListener('keydown', this.boundHandleEscape);
        }
        
        // Set up focus trap
        if (config.trapFocus) {
            this.setupFocusTrap();
        }
        
        // Announce to screen readers
        if (config.announceOpen) {
            focusManager.announceToScreenReader('Modal opened', 'polite');
        }
        
        // Update state
        this.isOpen = true;
        this.setState({ isOpen: true });
        
        // Emit open event
        this.emit('open');
        
        // Wait for animation
        return new Promise(resolve => {
            this.addTimer(() => {
                this.setState({ isAnimating: false });
                this.log('Modal opened');
                this.emit('opened');
                resolve();
            }, config.animationDuration);
        });
    }
    
    /**
     * Close the modal
     * @param {Object} options - Close options
     * @returns {Promise} Promise that resolves when modal is closed
     */
    async close(options = {}) {
        if (!this.isOpen || this.state.isAnimating) {
            return Promise.resolve();
        }
        
        const config = { ...this.options, ...options };
        
        this.log('Closing modal');
        this.setState({ isAnimating: true });
        
        // Remove open class for animation
        this.container.classList.remove('modal--open');
        
        // Clean up event listeners
        document.removeEventListener('keydown', this.boundHandleEscape);
        
        // Clean up focus trap
        if (this.focusTrap) {
            this.focusTrap.deactivate();
            this.focusTrap = null;
        }
        
        // Restore body scroll
        if (config.preventBodyScroll) {
            this.restoreBodyScroll();
        }
        
        // Announce to screen readers
        if (config.announceClose) {
            focusManager.announceToScreenReader('Modal closed', 'polite');
        }
        
        // Update state
        this.isOpen = false;
        this.setState({ isOpen: false });
        
        // Emit close event
        this.emit('close');
        
        // Wait for animation then hide
        return new Promise(resolve => {
            this.addTimer(() => {
                this.container.style.display = 'none';
                this.container.setAttribute('aria-hidden', 'true');
                
                this.setState({ isAnimating: false });
                this.log('Modal closed');
                this.emit('closed');
                resolve();
            }, config.animationDuration);
        });
    }
    
    /**
     * Toggle modal open/closed state
     * @param {Object} options - Toggle options
     * @returns {Promise} Promise that resolves when toggle is complete
     */
    async toggle(options = {}) {
        return this.isOpen ? this.close(options) : this.open(options);
    }
    
    /**
     * Set up focus trap
     */
    setupFocusTrap() {
        this.focusTrap = focusManager.trapFocus(this.dialog, {
            focusOnActivate: true,
            returnFocusOnDeactivate: this.options.restoreFocus,
            escapeDeactivates: false // We handle escape ourselves
        });
        
        this.focusTrap.activate();
    }
    
    /**
     * Handle escape key press
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleEscape(event) {
        if (event.key === 'Escape' && this.options.closeOnEscape) {
            event.preventDefault();
            this.close();
        }
    }
    
    /**
     * Handle backdrop click
     * @param {MouseEvent} event - Mouse event
     */
    handleBackdropClick(event) {
        if (event.target === this.backdrop && this.options.closeOnBackdrop) {
            this.close();
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (this.isOpen) {
            // Recalculate modal position if needed
            this.updatePosition();
        }
    }
    
    /**
     * Update modal position
     */
    updatePosition() {
        // Implementation depends on positioning requirements
        // For now, CSS handles positioning
    }
    
    /**
     * Prevent body scroll
     */
    preventBodyScroll() {
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Prevent scroll on touch devices
        document.addEventListener('touchmove', this.preventTouchMove, { passive: false });
    }
    
    /**
     * Restore body scroll
     */
    restoreBodyScroll() {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        // Restore scroll on touch devices
        document.removeEventListener('touchmove', this.preventTouchMove);
    }
    
    /**
     * Prevent touch move for iOS scroll lock
     * @param {TouchEvent} event - Touch event
     */
    preventTouchMove(event) {
        event.preventDefault();
    }
    
    /**
     * Set modal content
     * @param {string|HTMLElement} content - Content to set
     */
    setContent(content) {
        const body = this.dialog.querySelector('.modal-body');
        
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else {
                body.innerHTML = '';
                body.appendChild(content);
            }
        } else {
            // If no body, set content in dialog
            if (typeof content === 'string') {
                this.dialog.innerHTML = content;
            } else {
                this.dialog.innerHTML = '';
                this.dialog.appendChild(content);
            }
        }
        
        // Re-setup close buttons
        this.setupCloseButtons();
    }
    
    /**
     * Set modal title
     * @param {string} title - Modal title
     */
    setTitle(title) {
        let titleElement = this.dialog.querySelector('.modal-title, .modal-header h1, .modal-header h2, .modal-header h3');
        
        if (!titleElement) {
            // Create title if it doesn't exist
            const header = this.dialog.querySelector('.modal-header');
            if (header) {
                titleElement = document.createElement('h2');
                titleElement.className = 'modal-title';
                header.insertBefore(titleElement, header.firstChild);
            }
        }
        
        if (titleElement) {
            titleElement.textContent = title;
            
            // Update aria-labelledby if not set
            if (!this.options.ariaLabelledBy) {
                if (!titleElement.id) {
                    titleElement.id = `modal-title-${this.componentId}`;
                }
                this.container.setAttribute('aria-labelledby', titleElement.id);
            }
        }
    }
    
    /**
     * Focus the modal
     */
    focus() {
        if (this.isOpen) {
            const firstFocusable = this.dialog.querySelector(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            
            if (firstFocusable) {
                firstFocusable.focus();
            } else {
                this.container.focus();
            }
        }
    }
    
    /**
     * Get modal state
     * @returns {Object} Modal state
     */
    getModalState() {
        return {
            isOpen: this.isOpen,
            isAnimating: this.state.isAnimating,
            hasFocusTrap: !!this.focusTrap
        };
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Close modal if open
        if (this.isOpen) {
            this.close({ restoreFocus: false });
        }
        
        // Clean up focus trap
        if (this.focusTrap) {
            this.focusTrap.deactivate();
            this.focusTrap = null;
        }
        
        // Restore body scroll
        this.restoreBodyScroll();
        
        // Remove global event listeners
        document.removeEventListener('keydown', this.boundHandleEscape);
        document.removeEventListener('touchmove', this.preventTouchMove);
    }
}

/**
 * Modal Manager - Global modal management utility
 */
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.modalStack = [];
        this.zIndexBase = 1050;
    }
    
    /**
     * Register a modal
     * @param {Modal} modal - Modal instance
     */
    register(modal) {
        if (modal instanceof Modal) {
            this.modals.set(modal.componentId, modal);
            
            // Listen for modal events
            modal.container.addEventListener('component:open', () => {
                this.handleModalOpen(modal);
            });
            
            modal.container.addEventListener('component:closed', () => {
                this.handleModalClosed(modal);
            });
        }
    }
    
    /**
     * Handle modal opening
     * @param {Modal} modal - Modal instance
     */
    handleModalOpen(modal) {
        this.modalStack.push(modal);
        
        // Set appropriate z-index
        const zIndex = this.zIndexBase + this.modalStack.length * 10;
        modal.container.style.zIndex = zIndex;
        
        // Close other modals if needed
        // (implement modal stacking behavior as needed)
    }
    
    /**
     * Handle modal closing
     * @param {Modal} modal - Modal instance
     */
    handleModalClosed(modal) {
        const index = this.modalStack.indexOf(modal);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
        
        // Focus previous modal if exists
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            topModal.focus();
        }
    }
    
    /**
     * Close all modals
     */
    closeAll() {
        const modals = [...this.modalStack];
        return Promise.all(modals.map(modal => modal.close()));
    }
    
    /**
     * Get open modals
     * @returns {Modal[]} Array of open modals
     */
    getOpenModals() {
        return [...this.modalStack];
    }
}

// Global modal manager instance
export const modalManager = new ModalManager();

export default Modal;