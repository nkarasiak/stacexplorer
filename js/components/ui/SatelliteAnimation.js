/**
 * SatelliteAnimation.js - Animated satellite with interactive control capabilities
 *
 * Features:
 * - Automatic animation when no search results are shown
 * - Interactive control mode with arrow key navigation
 * - Map following functionality that pans and rotates with satellite
 * - Command Palette integration for easy access
 * - Global keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
 *
 * Usage:
 * - Press Ctrl+Shift+S to enter satellite control mode
 * - Use arrow keys to move satellite around screen
 * - Left/Right arrows also rotate the satellite and map
 * - Press F to toggle map following mode
 * - Press R to reset satellite position and orientation
 * - Press ESC to exit control mode
 * - Access via Command Palette (Shift+/) -> "Toggle Satellite Control"
 */

import { offlineManager } from '../../utils/OfflineManager.js';

export class SatelliteAnimation {
  constructor() {
    this.container = null;
    this.satellite = null;
    this.animationInterval = null;
    this.isActive = false;
    this.currentColumn = 0;
    this.maxColumns = 5; // Number of columns to animate across
    this.columnWidth = 0;
    this.hasResults = false;
    this.isOffline = false;
    this.offlineUnsubscribe = null;

    // Satellite control properties
    this.isControlMode = false;
    this.satellitePosition = { x: 0, y: 0 };
    this.satelliteOrientation = 0; // degrees
    this.mapManager = null;
    this.controlSpeed = 5; // pixels per keypress
    this.rotationSpeed = 15; // degrees per keypress
    this.keyStates = new Set(); // Track held keys for smooth movement
    this.controlInterval = null;
    this.isFollowingMode = true; // Map follows satellite by default

    this.init();
    this.setupOfflineHandling();
  }

  /**
   * Initialize the satellite animation
   */
  init() {
    this.createSatelliteElements();
    this.calculateLayout();
    this.bindEvents();
    this.initSatelliteControl();

    // Start animation if no results are present
    setTimeout(() => {
      this.checkResultsAndStart();
    }, 1000); // Wait 1 second for DOM to be fully ready
  }

  /**
   * Initialize satellite control functionality
   */
  initSatelliteControl() {
    // Wait for map manager to be available
    window.addEventListener('mapManagerReady', event => {
      this.mapManager = event.detail.mapManager;
    });

    // Try to get existing map manager
    const { getMapManager } = window;
    if (getMapManager && typeof getMapManager === 'function') {
      this.mapManager = getMapManager();
    }

    // Set up keyboard event listeners
    this.setupKeyboardControls();

    // Initialize satellite position to center of screen
    this.satellitePosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    // Register satellite control with Command Palette
    this.registerWithCommandPalette();
  }

  /**
   * Register satellite control with Command Palette
   */
  registerWithCommandPalette() {
    // Wait for command palette to be available
    setTimeout(() => {
      const commandPalette =
        window.CommandPalette?.instance || document.querySelector('.command-palette')?._component;

      if (commandPalette && typeof commandPalette.registerCommand === 'function') {
        // Register satellite control category
        if (typeof commandPalette.registerCategory === 'function') {
          commandPalette.registerCategory('satellite', {
            label: 'Satellite Control',
            icon: '🛰️',
            order: 2.5,
          });
        }

        // Register satellite control command
        commandPalette.registerCommand({
          id: 'satellite-control-toggle',
          title: 'Toggle Satellite Control',
          description: 'Enter interactive satellite control mode with arrow keys',
          category: 'satellite',
          keywords: ['satellite', 'control', 'arrow', 'keys', 'navigation', 'map'],
          action: () => {
            if (this.isControlMode) {
              this.exitControlMode();
            } else {
              this.enterControlMode();
            }
          },
        });

        // Register satellite reset command
        commandPalette.registerCommand({
          id: 'satellite-reset',
          title: 'Reset Satellite Position',
          description: 'Reset satellite to center and clear orientation',
          category: 'satellite',
          keywords: ['satellite', 'reset', 'center', 'orientation'],
          action: () => {
            this.resetSatellitePosition();
          },
        });

        // Register follow mode toggle
        commandPalette.registerCommand({
          id: 'satellite-follow-toggle',
          title: 'Toggle Map Follow Mode',
          description: 'Toggle whether the map follows satellite movement',
          category: 'satellite',
          keywords: ['satellite', 'follow', 'map', 'tracking'],
          action: () => {
            this.toggleFollowMode();
          },
        });
      }
    }, 2000); // Wait 2 seconds for command palette to initialize
  }

  /**
   * Setup keyboard controls for satellite movement
   */
  setupKeyboardControls() {
    // Listen for keydown events
    document.addEventListener('keydown', event => {
      this.handleKeyDown(event);
      this.handleGlobalShortcuts(event);
    });

    // Listen for keyup events
    document.addEventListener('keyup', event => {
      this.handleKeyUp(event);
    });

    // Start control loop for smooth movement
    this.startControlLoop();
  }

  /**
   * Handle global keyboard shortcuts
   */
  handleGlobalShortcuts(event) {
    // Ctrl+Shift+S or Cmd+Shift+S to toggle satellite control
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyS') {
      event.preventDefault();
      if (this.isControlMode) {
        this.exitControlMode();
      } else {
        this.enterControlMode();
      }
      return;
    }
  }

  /**
   * Handle keydown events for satellite control
   */
  handleKeyDown(event) {
    // Only handle arrow keys when satellite is visible and control mode is active
    if (!this.isControlMode || !this.satellite) {
      return;
    }

    const key = event.code;

    // Prevent default behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();
      this.keyStates.add(key);
    }

    // Handle special keys
    switch (key) {
      case 'KeyF': // Toggle follow mode
        event.preventDefault();
        this.toggleFollowMode();
        break;
      case 'KeyR': // Reset satellite position and orientation
        event.preventDefault();
        this.resetSatellitePosition();
        break;
      case 'Escape': // Exit control mode
        event.preventDefault();
        this.exitControlMode();
        break;
    }
  }

  /**
   * Handle keyup events
   */
  handleKeyUp(event) {
    if (!this.isControlMode) {
      return;
    }

    const key = event.code;
    this.keyStates.delete(key);
  }

  /**
   * Start the control loop for smooth movement
   */
  startControlLoop() {
    if (this.controlInterval) {
      return;
    }

    this.controlInterval = setInterval(() => {
      if (this.isControlMode && this.keyStates.size > 0) {
        this.processKeyStates();
      }
    }, 16); // ~60 FPS
  }

  /**
   * Process current key states for smooth movement
   */
  processKeyStates() {
    if (!this.satellite || !this.isControlMode) {
      return;
    }

    let deltaX = 0;
    let deltaY = 0;
    let deltaRotation = 0;

    // Movement keys
    if (this.keyStates.has('ArrowLeft')) {
      deltaX -= this.controlSpeed;
      deltaRotation -= this.rotationSpeed;
    }
    if (this.keyStates.has('ArrowRight')) {
      deltaX += this.controlSpeed;
      deltaRotation += this.rotationSpeed;
    }
    if (this.keyStates.has('ArrowUp')) {
      deltaY -= this.controlSpeed;
    }
    if (this.keyStates.has('ArrowDown')) {
      deltaY += this.controlSpeed;
    }

    // Apply movement
    if (deltaX !== 0 || deltaY !== 0) {
      this.moveSatellite(deltaX, deltaY);
    }

    // Apply rotation
    if (deltaRotation !== 0) {
      this.rotateSatellite(deltaRotation);
    }
  }

  /**
   * Move satellite by delta amounts
   */
  moveSatellite(deltaX, deltaY) {
    // Update position
    this.satellitePosition.x += deltaX;
    this.satellitePosition.y += deltaY;

    // Keep satellite within screen bounds
    const margin = 50;
    this.satellitePosition.x = Math.max(
      margin,
      Math.min(window.innerWidth - margin, this.satellitePosition.x)
    );
    this.satellitePosition.y = Math.max(
      margin,
      Math.min(window.innerHeight - margin, this.satellitePosition.y)
    );

    // Update satellite visual position
    this.updateSatellitePosition();

    // Update map if following mode is enabled
    if (this.isFollowingMode && this.mapManager?.getMap) {
      this.updateMapPosition();
    }
  }

  /**
   * Rotate satellite by delta degrees
   */
  rotateSatellite(deltaRotation) {
    this.satelliteOrientation += deltaRotation;
    this.satelliteOrientation = this.satelliteOrientation % 360;

    // Update satellite visual rotation
    this.updateSatelliteRotation();

    // Update map bearing if following mode is enabled
    if (this.isFollowingMode && this.mapManager?.getMap) {
      this.updateMapBearing();
    }
  }

  /**
   * Update satellite visual position
   */
  updateSatellitePosition() {
    if (!this.satellite) {
      return;
    }

    this.satellite.style.left = `${this.satellitePosition.x}px`;
    this.satellite.style.top = `${this.satellitePosition.y}px`;
    this.satellite.style.transform = `translate(-50%, -50%) rotate(${this.satelliteOrientation}deg)`;
  }

  /**
   * Update satellite visual rotation
   */
  updateSatelliteRotation() {
    if (!this.satellite) {
      return;
    }

    this.satellite.style.transform = `translate(-50%, -50%) rotate(${this.satelliteOrientation}deg)`;
  }

  /**
   * Update map position to follow satellite
   */
  updateMapPosition() {
    if (!this.mapManager?.getMap) {
      return;
    }

    const map = this.mapManager.getMap();
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    try {
      // Get current map center
      const center = map.getCenter();

      // Calculate movement based on satellite position relative to screen center
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      const deltaScreenX = this.satellitePosition.x - screenCenterX;
      const deltaScreenY = this.satellitePosition.y - screenCenterY;

      // More sophisticated coordinate conversion based on actual map projection
      // Get the map bounds to calculate proper scale
      const bounds = map.getBounds();
      const mapWidth = bounds.getEast() - bounds.getWest();
      const mapHeight = bounds.getNorth() - bounds.getSouth();

      // Calculate deltas as percentage of screen then convert to geographic units
      const deltaLngPercent = deltaScreenX / window.innerWidth;
      const deltaLatPercent = -deltaScreenY / window.innerHeight; // Invert Y axis

      const deltaLng = deltaLngPercent * mapWidth * 0.05; // Damping factor
      const deltaLat = deltaLatPercent * mapHeight * 0.05; // Damping factor

      const newCenter = [
        Math.max(-180, Math.min(180, center.lng + deltaLng)),
        Math.max(-85, Math.min(85, center.lat + deltaLat)),
      ];

      // Use panTo for smoother movement instead of setCenter
      map.panTo(newCenter, { duration: 100 });
    } catch (error) {
      console.warn('Error updating map position:', error);
    }
  }

  /**
   * Update map bearing to match satellite orientation
   */
  updateMapBearing() {
    const map = this.mapManager.getMap();
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    try {
      map.setBearing(this.satelliteOrientation);
    } catch (error) {
      console.warn('Error updating map bearing:', error);
    }
  }

  /**
   * Toggle follow mode on/off
   */
  toggleFollowMode() {
    this.isFollowingMode = !this.isFollowingMode;
    this.showControlMessage(`Follow mode: ${this.isFollowingMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Reset satellite position and orientation
   */
  resetSatellitePosition() {
    this.satellitePosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    this.satelliteOrientation = 0;

    this.updateSatellitePosition();
    this.updateSatelliteRotation();

    if (this.isFollowingMode && this.mapManager?.getMap) {
      const map = this.mapManager.getMap();
      if (map && map.isStyleLoaded()) {
        map.setBearing(0);
      }
    }

    this.showControlMessage('Satellite reset to center');
  }

  /**
   * Enter satellite control mode
   */
  enterControlMode() {
    if (this.isControlMode) {
      return;
    }

    this.isControlMode = true;
    this.stopAnimation(); // Stop automatic animation

    // Position satellite at center of screen
    this.resetSatellitePosition();

    // Make satellite visible and controllable
    this.container.style.display = 'block';
    this.satellite.classList.remove('hidden', 'animate');
    this.satellite.classList.add('visible', 'controllable');

    // Add control mode styling
    this.satellite.style.position = 'fixed';
    this.satellite.style.zIndex = '1000';
    this.satellite.style.transition = 'none';
    this.satellite.style.cursor = 'move';

    this.showControlMessage(
      '🛰️ Satellite control active! ⬅️➡️⬆️⬇️ Move | F: Follow mode | R: Reset | ESC: Exit | Ctrl+Shift+S: Toggle'
    );
  }

  /**
   * Exit satellite control mode
   */
  exitControlMode() {
    if (!this.isControlMode) {
      return;
    }

    this.isControlMode = false;
    this.keyStates.clear();

    // Remove control mode styling
    this.satellite.classList.remove('visible', 'controllable');
    this.satellite.classList.add('hidden');
    this.satellite.style.position = '';
    this.satellite.style.zIndex = '';
    this.satellite.style.transition = '';
    this.satellite.style.cursor = '';
    this.satellite.style.transform = '';

    // Hide container
    this.container.style.display = 'none';

    this.showControlMessage('Satellite control mode deactivated');

    // Resume normal animation if no results
    setTimeout(() => {
      this.checkResultsAndStart();
    }, 1000);
  }

  /**
   * Show control message to user
   */
  showControlMessage(message) {
    // Remove existing message
    const existing = document.getElementById('satellite-control-message');
    if (existing) {
      existing.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.id = 'satellite-control-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      z-index: 10000;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      animation: fadeInOut 3s ease-in-out;
    `;

    // Add CSS animation for fade in/out
    if (!document.getElementById('satellite-control-styles')) {
      const style = document.createElement('style');
      style.id = 'satellite-control-styles';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
        .satellite.controllable {
          box-shadow: 0 0 20px rgba(0, 123, 255, 0.6);
          filter: brightness(1.2);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(messageEl);

    // Remove message after animation
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 3000);
  }

  /**
   * Setup offline status handling
   */
  setupOfflineHandling() {
    this.isOffline = offlineManager.getOfflineStatus();

    // Listen for offline/online status changes
    this.offlineUnsubscribe = offlineManager.onStatusChange((_status, isOffline) => {
      this.isOffline = isOffline;
      this.updateSatelliteAppearance();

      // In offline mode, always show satellite animation (no search results possible)
      if (isOffline) {
        this.hasResults = false;
        this.startAnimation();
      } else {
        // When back online, check actual results state
        this.checkResultsAndStart();
      }
    });

    // Initial appearance update
    this.updateSatelliteAppearance();
  }

  /**
   * Update satellite appearance based on offline status
   */
  updateSatelliteAppearance() {
    if (!this.satellite) {
      return;
    }

    if (this.isOffline) {
      this.satellite.classList.add('satellite-offline');
      this.satellite.title = '📡 Satellite offline - Need internet connection';
      this.addOfflineMessage();
    } else {
      this.satellite.classList.remove('satellite-offline');
      this.satellite.title = '🛰️ Satellite online';
      this.removeOfflineMessage();
    }
  }

  /**
   * Add offline message bubble to satellite
   */
  addOfflineMessage() {
    // Remove existing message if any
    this.removeOfflineMessage();

    if (!this.container) {
      return;
    }

    const message = document.createElement('div');
    message.className = 'satellite-offline-message';
    message.id = 'satellite-offline-message';
    message.innerHTML = '📡 Link offline, please connect';

    // Position the message above the satellite
    message.style.top = '-40px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';

    this.container.appendChild(message);
  }

  /**
   * Remove offline message bubble from satellite
   */
  removeOfflineMessage() {
    const existingMessage = document.getElementById('satellite-offline-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Create the satellite DOM elements
   */
  createSatelliteElements() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'satellite-container';
    this.container.id = 'satellite-container';

    // Create satellite image
    this.satellite = document.createElement('img');
    // Use base path for GitHub Pages compatibility
    const basePath =
      window.location.hostname.endsWith('.github.io') &&
      window.location.pathname.startsWith('/stacexplorer/')
        ? '/stacexplorer'
        : '';
    this.satellite.src = `${basePath}/static/images/earthdaily_satellite.webp`;
    this.satellite.className = 'satellite hidden';
    this.satellite.alt = 'Satellite';

    // Add satellite to container
    this.container.appendChild(this.satellite);

    // Add container to body
    document.body.appendChild(this.container);

    // Update appearance based on offline status
    this.updateSatelliteAppearance();
  }

  /**
   * Calculate layout based on screen size
   */
  calculateLayout() {
    this.columnWidth = window.innerWidth / this.maxColumns;
  }

  /**
   * Bind window resize event
   */
  bindEvents() {
    window.addEventListener('resize', () => {
      this.calculateLayout();
    });

    // Listen for search result changes
    document.addEventListener('resultsUpdated', event => {
      this.onResultsUpdated(event.detail);
    });

    // Listen for search cleared
    document.addEventListener('resultsCleared', () => {
      this.onResultsCleared();
    });
  }

  /**
   * Handle results updated event
   * @param {Object} detail - Event detail with results info
   */
  onResultsUpdated(detail) {
    const hasResults = detail && detail.count > 0;

    this.hasResults = hasResults;

    if (hasResults) {
      this.stopAnimation();
      document.body.classList.add('has-results');
    } else {
      this.startAnimation();
      document.body.classList.remove('has-results');
    }
  }

  /**
   * Handle results cleared event
   */
  onResultsCleared() {
    this.hasResults = false;
    document.body.classList.remove('has-results');
    this.startAnimation();
  }

  /**
   * Check current results state and start animation if needed
   */
  checkResultsAndStart() {
    // Check if there are any results currently displayed
    const resultsCount = document.getElementById('results-count');
    const count = resultsCount ? parseInt(resultsCount.textContent) || 0 : 0;

    this.hasResults = count > 0;

    if (!this.hasResults) {
      // Start animation after a short delay to ensure page is loaded
      setTimeout(() => {
        this.startAnimation();
      }, 2000);
    } else {
      document.body.classList.add('has-results');
    }
  }

  /**
   * Start the satellite animation
   */
  startAnimation() {
    // In offline mode, always show animation regardless of results
    if (this.isActive || (!this.isOffline && this.hasResults)) {
      return;
    }

    this.isActive = true;
    this.currentColumn = 0;

    // Show container
    this.container.style.display = 'block';

    // Start the animation cycle immediately
    this.executeFlight();
  }

  /**
   * Stop the satellite animation
   */
  stopAnimation() {
    this.isActive = false;

    if (this.animationInterval) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }

    // Hide satellite immediately
    this.satellite.classList.remove('visible', 'animate');
    this.satellite.classList.add('hidden');

    // Hide container after transition
    setTimeout(() => {
      if (!this.isActive) {
        this.container.style.display = 'none';
      }
    }, 500);
  }

  /**
   * Schedule the next satellite flight
   */
  scheduleNextFlight() {
    // In offline mode, ignore hasResults check
    if (!this.isActive || (!this.isOffline && this.hasResults)) {
      return;
    }

    // Wait 10 seconds between flights
    this.animationInterval = setTimeout(() => {
      this.executeFlight();
    }, 10000);
  }

  /**
   * Execute a single satellite flight
   */
  executeFlight() {
    // In offline mode, ignore hasResults check
    if (!this.isActive || (!this.isOffline && this.hasResults)) {
      return;
    }

    // Position satellite at bottom of current column (right to left)
    const rightToLeftColumn = this.maxColumns - 1 - this.currentColumn; // Reverse the column order
    const columnCenter = rightToLeftColumn * this.columnWidth + this.columnWidth / 2;
    this.satellite.style.left = `${columnCenter}px`;

    // Reset position and show satellite (starting from right)
    this.satellite.style.transform = 'translateY(100vh) translateX(100px)';
    this.satellite.classList.remove('hidden');
    this.satellite.classList.add('visible');

    // Start animation after a brief moment
    setTimeout(() => {
      this.satellite.classList.add('animate');
    }, 100);

    // Remove animation class and hide satellite after animation completes
    setTimeout(() => {
      this.satellite.classList.remove('animate', 'visible');
      this.satellite.classList.add('hidden');

      // Move to next column
      this.currentColumn = (this.currentColumn + 1) % this.maxColumns;

      // Schedule next flight
      this.scheduleNextFlight();
    }, 10000);
  }

  /**
   * Test method to manually trigger a satellite flight
   */
  testFlight() {
    this.hasResults = false;
    this.isActive = false;
    this.startAnimation();
  }

  /**
   * Force satellite animation to start regardless of results state
   */
  forceStart() {
    this.hasResults = false;
    this.isActive = false;
    this.startAnimation();
  }

  /**
   * Debug method to check satellite visibility and positioning
   */
  debugSatellite() {
    // Make satellite very visible for testing
    this.satellite.style.cssText += `
            background: red !important;
            width: 100px !important;
            height: 100px !important;
            opacity: 1 !important;
            z-index: 100 !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: none !important;
            border: 5px solid yellow !important;
        `;
  }

  /**
   * Destroy the satellite animation
   */
  destroy() {
    this.stopAnimation();

    // Clean up control functionality
    if (this.controlInterval) {
      clearInterval(this.controlInterval);
      this.controlInterval = null;
    }

    this.keyStates.clear();
    this.isControlMode = false;

    // Clean up offline message
    this.removeOfflineMessage();

    // Clean up offline event listener
    if (this.offlineUnsubscribe) {
      this.offlineUnsubscribe();
      this.offlineUnsubscribe = null;
    }

    // Clean up control message and styles
    const controlMessage = document.getElementById('satellite-control-message');
    if (controlMessage) {
      controlMessage.remove();
    }

    const controlStyles = document.getElementById('satellite-control-styles');
    if (controlStyles) {
      controlStyles.remove();
    }

    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.satellite = null;
    this.mapManager = null;
  }
}
