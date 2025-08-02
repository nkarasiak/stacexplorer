/**
 * NotificationService.js - Handles system notifications
 */

export class NotificationService {
  constructor() {
    // Create notification container if it doesn't exist
    this.createNotificationContainer();

    // Listen for custom events
    document.addEventListener('showNotification', event => {
      if (event.detail) {
        this.showNotification(event.detail.message, event.detail.type || 'info');
      }
    });
  }

  /**
   * Create notification container
   */
  createNotificationContainer() {
    let notificationContainer = document.querySelector('.notification-container');

    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container';
      document.body.appendChild(notificationContainer);
    }
  }

  /**
   * Show a notification to the user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   */
  showNotification(message, type = 'info') {
    // Make sure container exists
    this.createNotificationContainer();
    const notificationContainer = document.querySelector('.notification-container');

    // Create the notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Set icon based on notification type
    let icon;
    switch (type) {
      case 'success':
        icon = 'check_circle';
        break;
      case 'error':
        icon = 'error';
        break;
      case 'warning':
        icon = 'warning';
        break;
      default:
        icon = 'info';
        break;
    }

    notification.innerHTML = `<i class="material-icons">${icon}</i> ${message}`;
    notificationContainer.appendChild(notification);

    // Remove the notification after a delay
    setTimeout(() => {
      notification.style.animation = 'fade-out 0.3s ease forwards';

      // Remove the element after animation completes
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }
}
