import { BaseUIComponent } from '../base/BaseUIComponent.js';

export class NotificationSystem extends BaseUIComponent {
  constructor(container, options = {}) {
    super(container, options);
  }

  getDefaultOptions() {
    return {
      position: 'top-right',
      maxNotifications: 5,
      defaultDuration: 5000,
      enableSounds: false,
      enableAnimations: true,
      groupByType: false,
      pauseOnHover: true,
      closeOnClick: true,
      showProgress: true,
      autoRemove: true,
    };
  }

  getInitialState() {
    return {
      notifications: new Map(),
      queue: [],
      isPaused: false,
      nextId: 1,
    };
  }

  init() {
    this.render();
    this.setupGlobalContainer();
    this.attachEventListeners();
  }

  render() {
    if (!this.container) {
      this.container = document.body;
    }

    const existingContainer = document.querySelector('.notification-system');
    if (existingContainer) {
      existingContainer.remove();
    }

    const systemContainer = document.createElement('div');
    systemContainer.className = `notification-system notification-system--${this.options.position}`;
    systemContainer.setAttribute('aria-live', 'polite');
    systemContainer.setAttribute('aria-atomic', 'false');
    systemContainer.setAttribute('role', 'region');
    systemContainer.setAttribute('aria-label', 'Notifications');

    this.container.appendChild(systemContainer);
    this.systemContainer = systemContainer;
  }

  setupGlobalContainer() {
    if (this.options.pauseOnHover) {
      this.addEventListener(this.systemContainer, 'mouseenter', () => {
        this.pauseAll();
      });

      this.addEventListener(this.systemContainer, 'mouseleave', () => {
        this.resumeAll();
      });
    }
  }

  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);

    if (this.state.notifications.size >= this.options.maxNotifications) {
      this.state.queue.push(notification);
      return notification.id;
    }

    this.displayNotification(notification);
    return notification.id;
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', {
      duration: 0,
      ...options,
    });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  loading(message, options = {}) {
    return this.show(message, 'loading', {
      duration: 0,
      showProgress: false,
      ...options,
    });
  }

  createNotification(message, type, options) {
    const id = `notification-${this.state.nextId++}`;
    const notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      duration: options.duration !== undefined ? options.duration : this.options.defaultDuration,
      persistent: options.persistent || false,
      actions: options.actions || [],
      icon: options.icon || this.getDefaultIcon(type),
      title: options.title || '',
      description: options.description || '',
      data: options.data || {},
      onClose: options.onClose || null,
      onClick: options.onClick || null,
      showProgress:
        options.showProgress !== undefined ? options.showProgress : this.options.showProgress,
      ...options,
    };

    return notification;
  }

  getDefaultIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
            </svg>`,
      loading: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"></path>
            </svg>`,
    };

    return icons[type] || icons.info;
  }

  displayNotification(notification) {
    this.state.notifications.set(notification.id, notification);

    const element = this.createNotificationElement(notification);
    this.systemContainer.appendChild(element);

    requestAnimationFrame(() => {
      if (this.options.enableAnimations) {
        element.classList.add('notification--visible');
      }
    });

    if (notification.duration > 0 && this.options.autoRemove) {
      this.scheduleRemoval(notification);
    }

    if (this.options.enableSounds) {
      this.playNotificationSound(notification.type);
    }

    this.emit('notificationShown', { notification });
  }

  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification notification--${notification.type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', notification.type === 'error' ? 'assertive' : 'polite');
    element.setAttribute('data-notification-id', notification.id);

    if (this.options.closeOnClick) {
      element.style.cursor = 'pointer';
    }

    element.innerHTML = `
            <div class="notification__content">
                <div class="notification__header">
                    <div class="notification__icon" aria-hidden="true">
                        ${notification.icon}
                    </div>
                    <div class="notification__main">
                        ${notification.title ? `<div class="notification__title">${notification.title}</div>` : ''}
                        <div class="notification__message">${notification.message}</div>
                        ${notification.description ? `<div class="notification__description">${notification.description}</div>` : ''}
                    </div>
                    <button class="notification__close" type="button" aria-label="Close notification">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                ${
                  notification.actions.length > 0
                    ? `
                    <div class="notification__actions">
                        ${notification.actions
                          .map(
                            action => `
                            <button class="notification__action" data-action="${action.id}" type="button">
                                ${action.label}
                            </button>
                        `
                          )
                          .join('')}
                    </div>
                `
                    : ''
                }

                ${
                  notification.showProgress && notification.duration > 0
                    ? `
                    <div class="notification__progress">
                        <div class="notification__progress-bar" style="animation-duration: ${notification.duration}ms;"></div>
                    </div>
                `
                    : ''
                }
            </div>
        `;

    this.attachNotificationListeners(element, notification);
    return element;
  }

  attachNotificationListeners(element, notification) {
    const closeButton = element.querySelector('.notification__close');
    const actionButtons = element.querySelectorAll('.notification__action');

    this.addEventListener(closeButton, 'click', e => {
      e.stopPropagation();
      this.remove(notification.id);
    });

    if (this.options.closeOnClick) {
      this.addEventListener(element, 'click', () => {
        if (notification.onClick) {
          notification.onClick(notification);
        }
        this.remove(notification.id);
      });
    } else if (notification.onClick) {
      this.addEventListener(element, 'click', () => {
        notification.onClick(notification);
      });
    }

    actionButtons.forEach(button => {
      this.addEventListener(button, 'click', e => {
        e.stopPropagation();
        const actionId = button.dataset.action;
        const action = notification.actions.find(a => a.id === actionId);
        if (action?.handler) {
          action.handler(notification);
        }
        if (action && action.closeOnClick !== false) {
          this.remove(notification.id);
        }
      });
    });

    if (this.options.pauseOnHover && notification.duration > 0) {
      this.addEventListener(element, 'mouseenter', () => {
        this.pauseNotification(notification.id);
      });

      this.addEventListener(element, 'mouseleave', () => {
        this.resumeNotification(notification.id);
      });
    }
  }

  scheduleRemoval(notification) {
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    notification.timeoutId = setTimeout(() => {
      this.remove(notification.id);
    }, notification.duration);

    notification.scheduledAt = Date.now();
  }

  pauseNotification(id) {
    const notification = this.state.notifications.get(id);
    if (!notification || notification.isPaused) {
      return;
    }

    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
      notification.remainingTime = notification.duration - (Date.now() - notification.scheduledAt);
      notification.isPaused = true;
    }
  }

  resumeNotification(id) {
    const notification = this.state.notifications.get(id);
    if (!notification || !notification.isPaused) {
      return;
    }

    notification.isPaused = false;
    if (notification.remainingTime > 0) {
      notification.timeoutId = setTimeout(() => {
        this.remove(notification.id);
      }, notification.remainingTime);
      notification.scheduledAt = Date.now();
    }
  }

  pauseAll() {
    if (this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this.state.notifications.forEach(notification => {
      this.pauseNotification(notification.id);
    });
  }

  resumeAll() {
    if (!this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    this.state.notifications.forEach(notification => {
      this.resumeNotification(notification.id);
    });
  }

  remove(id) {
    const notification = this.state.notifications.get(id);
    if (!notification) {
      return;
    }

    const element = this.systemContainer.querySelector(`[data-notification-id="${id}"]`);
    if (!element) {
      return;
    }

    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    if (this.options.enableAnimations) {
      element.classList.add('notification--removing');
      element.addEventListener(
        'animationend',
        () => {
          this.finalizeRemoval(id, element);
        },
        { once: true }
      );
    } else {
      this.finalizeRemoval(id, element);
    }
  }

  finalizeRemoval(id, element) {
    const notification = this.state.notifications.get(id);

    if (element?.parentNode) {
      element.remove();
    }

    this.state.notifications.delete(id);

    if (notification?.onClose) {
      notification.onClose(notification);
    }

    this.emit('notificationRemoved', { notificationId: id, notification });

    this.processQueue();
  }

  processQueue() {
    if (this.state.queue.length === 0) {
      return;
    }
    if (this.state.notifications.size >= this.options.maxNotifications) {
      return;
    }

    const nextNotification = this.state.queue.shift();
    this.displayNotification(nextNotification);
  }

  update(id, updates) {
    const notification = this.state.notifications.get(id);
    if (!notification) {
      return false;
    }

    const element = this.systemContainer.querySelector(`[data-notification-id="${id}"]`);
    if (!element) {
      return false;
    }

    Object.assign(notification, updates);

    if (updates.message || updates.title || updates.description) {
      const titleElement = element.querySelector('.notification__title');
      const messageElement = element.querySelector('.notification__message');
      const descriptionElement = element.querySelector('.notification__description');

      if (updates.title && titleElement) {
        titleElement.textContent = updates.title;
      }
      if (updates.message && messageElement) {
        messageElement.textContent = updates.message;
      }
      if (updates.description && descriptionElement) {
        descriptionElement.textContent = updates.description;
      }
    }

    if (updates.type) {
      element.className = `notification notification--${updates.type}`;
    }

    return true;
  }

  clear() {
    this.state.notifications.forEach(notification => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
      }
    });

    this.systemContainer.innerHTML = '';
    this.state.notifications.clear();
    this.state.queue = [];

    this.emit('notificationsCleared');
  }

  clearByType(type) {
    const toRemove = [];
    this.state.notifications.forEach(notification => {
      if (notification.type === type) {
        toRemove.push(notification.id);
      }
    });

    toRemove.forEach(id => this.remove(id));
  }

  getNotification(id) {
    return this.state.notifications.get(id);
  }

  getAllNotifications() {
    return Array.from(this.state.notifications.values());
  }

  getNotificationsByType(type) {
    return this.getAllNotifications().filter(n => n.type === type);
  }

  playNotificationSound(type) {
    if (!this.options.enableSounds) {
      return;
    }

    const audioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      return;
    }

    const context = new audioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    const frequencies = {
      success: 800,
      error: 400,
      warning: 600,
      info: 500,
      loading: 300,
    };

    oscillator.frequency.setValueAtTime(frequencies[type] || 500, context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }

  destroy() {
    this.clear();
    if (this.systemContainer?.parentNode) {
      this.systemContainer.remove();
    }
    super.destroy();
  }
}

export const notifications = new NotificationSystem();
