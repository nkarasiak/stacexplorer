/**
 * Button Component - Modern, accessible button with consistent styling and behavior
 * Extends BaseUIComponent for lifecycle management and accessibility
 *
 * @author STAC Explorer Team
 * @version 1.0.0
 */

import { BaseUIComponent } from '../base/BaseUIComponent.js';
// import { focusManager } from '../base/FocusManager.js'; // unused

export class Button extends BaseUIComponent {
  /**
   * Create a new Button component
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Button configuration options
   */
  constructor(container, options = {}) {
    super(container, options);

    // Create button element if container is not a button
    if (this.container.tagName !== 'BUTTON') {
      this.createButtonElement();
    } else {
      this.buttonElement = this.container;
    }

    this.isPressed = false;
    this.rippleEffect = null;
  }

  /**
   * Get default options
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      className: 'btn',
      variant: 'primary', // primary, secondary, danger, success, ghost, link
      size: 'medium', // small, medium, large
      text: '',
      icon: null,
      iconPosition: 'left', // left, right, only
      disabled: false,
      loading: false,
      type: 'button', // button, submit, reset
      href: null, // For link-style buttons
      target: null, // Link target
      ariaLabel: null,
      ariaPressed: null, // For toggle buttons
      tooltip: null,
      ripple: true,
      fullWidth: false,
      rounded: false,
      elevated: false,
      compact: false,
    };
  }

  /**
   * Get initial state
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      ...super.getInitialState(),
      isPressed: false,
      isHovered: false,
      isFocused: false,
      isActive: false,
    };
  }

  /**
   * Create button element if container is not a button
   */
  createButtonElement() {
    this.buttonElement = document.createElement('button');
    this.buttonElement.type = this.options.type;

    // Move existing content to button
    while (this.container.firstChild) {
      this.buttonElement.appendChild(this.container.firstChild);
    }

    this.container.appendChild(this.buttonElement);
  }

  /**
   * Component-specific initialization
   */
  onInit() {
    this.updateButtonAttributes();
    this.updateButtonClasses();
    this.renderContent();

    if (this.options.tooltip) {
      this.createTooltip();
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Click handler
    this.addEventListener(this.buttonElement, 'click', this.handleClick);

    // Keyboard handlers
    this.addEventListener(this.buttonElement, 'keydown', this.handleKeyDown);
    this.addEventListener(this.buttonElement, 'keyup', this.handleKeyUp);

    // Mouse/touch handlers
    this.addEventListener(this.buttonElement, 'mousedown', this.handleMouseDown);
    this.addEventListener(this.buttonElement, 'mouseup', this.handleMouseUp);
    this.addEventListener(this.buttonElement, 'mouseleave', this.handleMouseLeave);
    this.addEventListener(this.buttonElement, 'mouseenter', this.handleMouseEnter);

    // Focus handlers
    this.addEventListener(this.buttonElement, 'focus', this.handleFocus);
    this.addEventListener(this.buttonElement, 'blur', this.handleBlur);

    // Touch handlers for mobile
    this.addEventListener(this.buttonElement, 'touchstart', this.handleTouchStart);
    this.addEventListener(this.buttonElement, 'touchend', this.handleTouchEnd);

    // Ripple effect handlers
    if (this.options.ripple) {
      this.setupRippleEffect();
    }
  }

  /**
   * Update button attributes
   */
  updateButtonAttributes() {
    const btn = this.buttonElement;

    // Basic attributes
    btn.type = this.options.type;
    btn.disabled = this.options.disabled || this.state.isLoading;

    // ARIA attributes
    if (this.options.ariaLabel) {
      btn.setAttribute('aria-label', this.options.ariaLabel);
    }

    if (this.options.ariaPressed !== null) {
      btn.setAttribute('aria-pressed', this.options.ariaPressed.toString());
    }

    // Loading state
    if (this.state.isLoading) {
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.removeAttribute('aria-busy');
    }

    // Link attributes for link-style buttons
    if (this.options.href && this.options.variant === 'link') {
      btn.setAttribute('role', 'link');
      btn.setAttribute('data-href', this.options.href);

      if (this.options.target) {
        btn.setAttribute('data-target', this.options.target);
      }
    }
  }

  /**
   * Update button CSS classes
   */
  updateButtonClasses() {
    const btn = this.buttonElement;
    const classes = [this.options.className];

    // Variant classes
    classes.push(`${this.options.className}--${this.options.variant}`);

    // Size classes
    classes.push(`${this.options.className}--${this.options.size}`);

    // State classes
    if (this.state.isDisabled) {
      classes.push(`${this.options.className}--disabled`);
    }
    if (this.state.isLoading) {
      classes.push(`${this.options.className}--loading`);
    }
    if (this.state.isPressed) {
      classes.push(`${this.options.className}--pressed`);
    }
    if (this.state.isFocused) {
      classes.push(`${this.options.className}--focused`);
    }
    if (this.state.isHovered) {
      classes.push(`${this.options.className}--hovered`);
    }
    if (this.state.isActive) {
      classes.push(`${this.options.className}--active`);
    }

    // Option classes
    if (this.options.fullWidth) {
      classes.push(`${this.options.className}--full-width`);
    }
    if (this.options.rounded) {
      classes.push(`${this.options.className}--rounded`);
    }
    if (this.options.elevated) {
      classes.push(`${this.options.className}--elevated`);
    }
    if (this.options.compact) {
      classes.push(`${this.options.className}--compact`);
    }
    if (this.options.iconPosition === 'only') {
      classes.push(`${this.options.className}--icon-only`);
    }

    // Update classes
    btn.className = classes.join(' ');
  }

  /**
   * Render button content
   */
  renderContent() {
    let content = '';

    // Loading spinner
    if (this.state.isLoading) {
      content += '<span class="btn__spinner" aria-hidden="true"></span>';
    }

    // Icon
    if (
      this.options.icon &&
      (this.options.iconPosition === 'left' || this.options.iconPosition === 'only')
    ) {
      content += `<span class="btn__icon btn__icon--${this.options.iconPosition}" aria-hidden="true">`;
      content += `<i class="material-icons">${this.options.icon}</i>`;
      content += '</span>';
    }

    // Text
    if (this.options.text && this.options.iconPosition !== 'only') {
      const textClass = this.state.isLoading ? 'btn__text btn__text--hidden' : 'btn__text';
      content += `<span class="${textClass}">${this.options.text}</span>`;
    }

    // Right icon
    if (this.options.icon && this.options.iconPosition === 'right') {
      content += `<span class="btn__icon btn__icon--right" aria-hidden="true">`;
      content += `<i class="material-icons">${this.options.icon}</i>`;
      content += '</span>';
    }

    // Ripple container
    if (this.options.ripple) {
      content += '<span class="btn__ripple-container" aria-hidden="true"></span>';
    }

    this.buttonElement.innerHTML = content;
  }

  /**
   * Handle click events
   * @param {Event} event - Click event
   */
  handleClick(event) {
    if (this.state.isDisabled || this.state.isLoading) {
      event.preventDefault();
      return;
    }

    // Handle link-style buttons
    if (this.options.href && this.options.variant === 'link') {
      event.preventDefault();

      if (this.options.target === '_blank') {
        window.open(this.options.href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = this.options.href;
      }
    }

    // Toggle pressed state for toggle buttons
    if (this.options.ariaPressed !== null) {
      this.toggle();
    }

    // Create ripple effect
    if (this.options.ripple) {
      this.createRipple(event);
    }

    // Emit click event
    this.emit('click', {
      originalEvent: event,
      isPressed: this.isPressed,
    });
  }

  /**
   * Handle key down events
   * @param {Event} event - Keyboard event
   */
  handleKeyDown(event) {
    if (this.state.isDisabled || this.state.isLoading) {
      return;
    }

    // Activate on Space or Enter
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.setState({ isActive: true });

      if (this.options.ripple) {
        this.createRipple(event, true);
      }
    }
  }

  /**
   * Handle key up events
   * @param {Event} event - Keyboard event
   */
  handleKeyUp(event) {
    if (this.state.isDisabled || this.state.isLoading) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      this.setState({ isActive: false });

      // Trigger click
      setTimeout(() => {
        this.buttonElement.click();
      }, 0);
    }
  }

  /**
   * Handle mouse down events
   * @param {Event} event - Mouse event
   */
  handleMouseDown(event) {
    if (this.state.isDisabled || this.state.isLoading) {
      return;
    }

    this.setState({ isActive: true });

    if (this.options.ripple) {
      this.createRipple(event);
    }
  }

  /**
   * Handle mouse up events
   */
  handleMouseUp() {
    this.setState({ isActive: false });
  }

  /**
   * Handle mouse enter events
   */
  handleMouseEnter() {
    if (!this.state.isDisabled && !this.state.isLoading) {
      this.setState({ isHovered: true });
    }
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave() {
    this.setState({
      isHovered: false,
      isActive: false,
    });
  }

  /**
   * Handle focus events
   */
  handleFocus() {
    this.setState({ isFocused: true });
    this.emit('focus');
  }

  /**
   * Handle blur events
   */
  handleBlur() {
    this.setState({
      isFocused: false,
      isActive: false,
    });
    this.emit('blur');
  }

  /**
   * Handle touch start events
   * @param {Event} event - Touch event
   */
  handleTouchStart(event) {
    if (this.state.isDisabled || this.state.isLoading) {
      return;
    }

    this.setState({ isActive: true });

    if (this.options.ripple) {
      this.createRipple(event);
    }
  }

  /**
   * Handle touch end events
   */
  handleTouchEnd() {
    this.setState({ isActive: false });
  }

  /**
   * Set up ripple effect
   */
  setupRippleEffect() {
    // Ripple styles will be added via CSS
  }

  /**
   * Create ripple effect
   * @param {Event} event - Event that triggered the ripple
   * @param {boolean} center - Whether to center the ripple
   */
  createRipple(event, center = false) {
    const rippleContainer = this.buttonElement.querySelector('.btn__ripple-container');
    if (!rippleContainer) {
      return;
    }

    const rect = this.buttonElement.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const radius = size / 2;

    let x, y;

    if (center) {
      x = rect.width / 2;
      y = rect.height / 2;
    } else {
      const clientX = event.clientX || event.touches?.[0].clientX;
      const clientY = event.clientY || event.touches?.[0].clientY;

      x = clientX - rect.left;
      y = clientY - rect.top;
    }

    const ripple = document.createElement('span');
    ripple.className = 'btn__ripple';
    ripple.style.cssText = `
            left: ${x - radius}px;
            top: ${y - radius}px;
            width: ${size}px;
            height: ${size}px;
        `;

    rippleContainer.appendChild(ripple);

    // Remove ripple after animation
    this.addTimer(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
   * Create tooltip
   */
  createTooltip() {
    this.buttonElement.setAttribute('title', this.options.tooltip);

    // TODO: Implement custom tooltip component
    // For now, using native title attribute
  }

  /**
   * Toggle button pressed state
   */
  toggle() {
    this.isPressed = !this.isPressed;
    this.setState({ isPressed: this.isPressed });

    this.buttonElement.setAttribute('aria-pressed', this.isPressed.toString());

    this.emit('toggle', { isPressed: this.isPressed });
  }

  /**
   * Set pressed state
   * @param {boolean} pressed - Pressed state
   */
  setPressed(pressed) {
    this.isPressed = pressed;
    this.setState({ isPressed: pressed });

    if (this.options.ariaPressed !== null) {
      this.buttonElement.setAttribute('aria-pressed', pressed.toString());
    }
  }

  /**
   * Set text content
   * @param {string} text - New text
   */
  setText(text) {
    this.options.text = text;
    this.renderContent();
  }

  /**
   * Set icon
   * @param {string} icon - New icon name
   */
  setIcon(icon) {
    this.options.icon = icon;
    this.renderContent();
  }

  /**
   * Set variant
   * @param {string} variant - New variant
   */
  setVariant(variant) {
    this.options.variant = variant;
    this.updateButtonClasses();
    this.updateButtonAttributes();
  }

  /**
   * Override setState to update classes and attributes
   */
  setState(newState, shouldRender = true) {
    super.setState(newState, false); // Don't auto-render

    this.updateButtonClasses();
    this.updateButtonAttributes();

    if (shouldRender) {
      this.renderContent();
    }
  }

  /**
   * Override enable method
   */
  enable() {
    super.enable();
    this.buttonElement.disabled = false;
  }

  /**
   * Override disable method
   */
  disable() {
    super.disable();
    this.buttonElement.disabled = true;
  }

  /**
   * Override setLoading method
   */
  setLoading(isLoading = true) {
    super.setLoading(isLoading);
    this.buttonElement.disabled = isLoading || this.state.isDisabled;
    this.renderContent();
  }

  /**
   * Focus the button
   */
  focus() {
    this.buttonElement.focus();
  }

  /**
   * Click the button programmatically
   */
  click() {
    if (!this.state.isDisabled && !this.state.isLoading) {
      this.buttonElement.click();
    }
  }

  /**
   * Get button element reference
   * @returns {HTMLElement} Button element
   */
  getButtonElement() {
    return this.buttonElement;
  }
}

/**
 * Button Factory - Create buttons with common configurations
 */
export class ButtonFactory {
  /**
   * Create primary button
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static primary(container, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'primary',
    });
  }

  /**
   * Create secondary button
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static secondary(container, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'secondary',
    });
  }

  /**
   * Create danger button
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static danger(container, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'danger',
    });
  }

  /**
   * Create success button
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static success(container, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'success',
    });
  }

  /**
   * Create ghost button
   * @param {HTMLElement|string} container - Container element
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static ghost(container, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'ghost',
    });
  }

  /**
   * Create icon button
   * @param {HTMLElement|string} container - Container element
   * @param {string} icon - Icon name
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static icon(container, icon, options = {}) {
    return new Button(container, {
      ...options,
      icon,
      iconPosition: 'only',
      ariaLabel: options.ariaLabel || options.tooltip || 'Button',
    });
  }

  /**
   * Create link button
   * @param {HTMLElement|string} container - Container element
   * @param {string} href - Link URL
   * @param {Object} options - Button options
   * @returns {Button} Button instance
   */
  static link(container, href, options = {}) {
    return new Button(container, {
      ...options,
      variant: 'link',
      href,
    });
  }
}

export default Button;
