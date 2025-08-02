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
 * - Left/Right arrows: Rotate satellite orientation only (no map movement)
 * - Up/Down arrows: Move map forward/backward in satellite direction
 * - Satellite always stays centered on screen
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
    this.satelliteOrientation = -10; // degrees
    this.mapManager = null;
    this.controlSpeed = 5; // pixels per keypress
    this.rotationSpeed = 0.17; // degrees per frame (~10° per second at 60fps)
    this.keyStates = new Set(); // Track held keys for smooth movement
    this.controlInterval = null;
    this.isFollowingMode = true; // Map follows satellite by default
    this.mapKeyboardWasEnabled = false; // Track if map keyboard was enabled before control mode
    this.validationStartTime = Date.now() + 3000; // Wait 3 seconds before starting validation
    this.activeTimers = new Set(); // Track all active animation timers
    this.baseZoom = 2; // Zoom level where satellite size looks perfect
    this.baseScale = 1; // Base scale factor for perfect zoom level
    this.zoomListenerSetup = false; // Track if zoom listener has been set up

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

    // Also try to get it from the global mapManager variable
    if (!this.mapManager && window.mapManager) {
      this.mapManager = window.mapManager;
    }

    // Try to get it from window.stacExplorer.mapManager (most likely location)
    if (!this.mapManager && window.stacExplorer?.mapManager) {
      this.mapManager = window.stacExplorer.mapManager;
    }

    // Set up map zoom listener if map manager is available
    if (this.mapManager?.getMap) {
      this.setupMapZoomListener();
    }

    // Set up keyboard event listeners
    this.setupKeyboardControls();

    // Initialize satellite position to center of screen
    this.satellitePosition = {
      x: (window.innerWidth || 1920) / 2,
      y: (window.innerHeight || 1080) / 2,
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
          description: 'Control satellite with arrow keys: ←→ rotate, ↑↓ forward/back',
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
   * Setup map zoom listener for satellite scaling
   */
  setupMapZoomListener() {
    if (!this.mapManager?.getMap) {
      return;
    }

    const map = this.mapManager.getMap();
    if (!map) {
      return;
    }

    // Listen for zoom changes
    map.on('zoom', () => {
      if (this.isControlMode && this.satellite) {
        this.updateSatellitePosition(); // This will recalculate scale
      }
    });
  }

  /**
   * Setup keyboard controls for satellite movement
   */
  setupKeyboardControls() {
    // Listen for keydown events with capture to run before MapLibre
    document.addEventListener(
      'keydown',
      event => {
        this.handleKeyDown(event);
        this.handleGlobalShortcuts(event);
      },
      true
    ); // Use capture phase

    // Listen for keyup events
    document.addEventListener(
      'keyup',
      event => {
        this.handleKeyUp(event);
      },
      true
    ); // Use capture phase

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
      event.stopPropagation();
      event.stopImmediatePropagation();
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
      if (this.isControlMode) {
        // Process movement if keys are pressed
        if (this.keyStates.size > 0) {
          this.processKeyStates();
        }
        // Skip validation during control mode - we're managing position explicitly
      } else {
        // Only validate when NOT in control mode
        this.validateSatelliteState();
      }
    }, 16); // ~60 FPS
  }

  /**
   * Validate satellite state to prevent disappearing
   */
  validateSatelliteState() {
    // COMPLETELY DISABLE validation - it's causing more problems than it solves
    return;
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

    // Rotation keys - ONLY affect orientation, NO movement whatsoever
    if (this.keyStates.has('ArrowLeft')) {
      deltaRotation -= this.rotationSpeed;
    }
    if (this.keyStates.has('ArrowRight')) {
      deltaRotation += this.rotationSpeed;
    }

    // Movement keys - ONLY up/down keys move the map
    if (this.keyStates.has('ArrowUp')) {
      // Move backward opposite to the direction the satellite is pointing
      const radians = (this.satelliteOrientation * Math.PI) / 180;
      deltaX -= Math.sin(radians) * this.controlSpeed;
      deltaY += Math.cos(radians) * this.controlSpeed;
    }
    if (this.keyStates.has('ArrowDown')) {
      // Move forward in the direction the satellite is pointing
      const radians = (this.satelliteOrientation * Math.PI) / 180;
      deltaX += Math.sin(radians) * this.controlSpeed;
      deltaY -= Math.cos(radians) * this.controlSpeed;
    }

    // Apply rotation (left/right keys only)
    if (deltaRotation !== 0) {
      this.rotateSatellite(deltaRotation);
    }

    // Apply movement (up/down keys only) - ONLY if there's actual movement
    if (deltaX !== 0 || deltaY !== 0) {
      this.moveSatellite(deltaX, deltaY);
    }
  }

  /**
   * Move satellite (actually moves map underneath while satellite stays centered)
   */
  moveSatellite(deltaX, deltaY) {
    // Validate input deltas
    if (!isFinite(deltaX) || !isFinite(deltaY)) {
      console.warn('Invalid movement deltas:', deltaX, deltaY);
      return;
    }

    // Keep satellite always at screen center
    const screenWidth = window.innerWidth || 1920;
    const screenHeight = window.innerHeight || 1080;

    this.satellitePosition = {
      x: screenWidth / 2,
      y: screenHeight / 2,
    };

    // Update satellite visual position (always centered)
    this.updateSatellitePosition();

    // Move the map underneath the satellite instead of moving the satellite
    if (this.isFollowingMode && this.mapManager?.getMap) {
      this.updateMapPosition(deltaX, deltaY);
      // Also update map bearing to match satellite orientation during movement
      this.updateMapBearing();
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

    // Note: Map bearing is only updated during movement (up/down), not rotation (left/right)
  }

  /**
   * Update satellite visual position
   */
  updateSatellitePosition() {
    if (!this.satellite) {
      console.warn('Satellite element not found when trying to update position');
      return;
    }

    // Skip validation during control mode - we're explicitly controlling position
    if (!this.isControlMode) {
      // Validate position values before applying
      if (!isFinite(this.satellitePosition.x) || !isFinite(this.satellitePosition.y)) {
        console.warn('Invalid satellite position detected, resetting:', this.satellitePosition);
        this.satellitePosition = {
          x: (window.innerWidth || 1920) / 2,
          y: (window.innerHeight || 1080) / 2,
        };
      }

      // Validate orientation
      if (!isFinite(this.satelliteOrientation)) {
        console.warn(
          'Invalid satellite orientation detected, resetting:',
          this.satelliteOrientation
        );
        this.satelliteOrientation = -10;
      }
    }

    // Apply styles with validated values
    this.satellite.style.left = `${this.satellitePosition.x}px`;
    this.satellite.style.top = `${this.satellitePosition.y}px`;

    const scale = this.calculateSatelliteScale();
    this.satellite.style.transform = `translate(-50%, -50%) rotate(${this.satelliteOrientation}deg) scale(${scale})`;

    // Ensure satellite remains visible
    this.satellite.style.display = '';
    this.satellite.style.visibility = 'visible';
    this.satellite.style.opacity = '1';
  }

  /**
   * Update satellite visual rotation
   */
  updateSatelliteRotation() {
    if (!this.satellite) {
      return;
    }

    const scale = this.calculateSatelliteScale();
    this.satellite.style.transform = `translate(-50%, -50%) rotate(${this.satelliteOrientation}deg) scale(${scale})`;
  }

  /**
   * Calculate satellite scale based on map zoom level
   */
  calculateSatelliteScale() {
    if (!this.mapManager?.getMap) {
      return this.baseScale;
    }

    const map = this.mapManager.getMap();
    if (!map) {
      return this.baseScale;
    }

    const currentZoom = map.getZoom();

    // Scale formula: SMALLER satellite at lower zoom (farther away), LARGER at higher zoom (closer)
    // At baseZoom (2), scale = baseScale (1)
    // Each zoom level increases/decreases the scale
    const zoomDifference = currentZoom - this.baseZoom;
    const scale = this.baseScale * Math.pow(1.4, zoomDifference); // 1.4 makes satellite bigger when zooming in

    // Clamp scale between reasonable bounds
    return Math.max(0.3, Math.min(3.0, scale));
  }

  /**
   * Update map position based on satellite movement deltas
   * @param {number} deltaX - Movement delta in X direction (pixels)
   * @param {number} deltaY - Movement delta in Y direction (pixels)
   */
  updateMapPosition(deltaX, deltaY) {
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

      // Get the map bounds to calculate proper scale
      const bounds = map.getBounds();
      const mapWidth = bounds.getEast() - bounds.getWest();
      const mapHeight = bounds.getNorth() - bounds.getSouth();

      // Convert screen deltas to geographic deltas
      // Invert the deltas so map moves opposite to satellite movement intention
      const deltaLngPercent = -deltaX / window.innerWidth;
      const deltaLatPercent = deltaY / window.innerHeight; // Y axis inverted for map coordinates

      const deltaLng = deltaLngPercent * mapWidth * 0.5; // Movement factor
      const deltaLat = deltaLatPercent * mapHeight * 0.5; // Movement factor

      const newCenter = [
        Math.max(-180, Math.min(180, center.lng + deltaLng)),
        Math.max(-85, Math.min(85, center.lat + deltaLat)),
      ];

      // Use setCenter for immediate movement (no animation for responsive feel)
      map.setCenter(newCenter);
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
    this.showControlMessage(`Map follow mode: ${this.isFollowingMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Reset satellite position and orientation
   */
  resetSatellitePosition() {
    console.warn('resetSatellitePosition called during control mode:', this.isControlMode);

    // Always keep satellite at screen center
    this.satellitePosition = {
      x: (window.innerWidth || 1920) / 2,
      y: (window.innerHeight || 1080) / 2,
    };
    this.satelliteOrientation = -10;

    this.updateSatellitePosition();
    this.updateSatelliteRotation();

    if (this.isFollowingMode && this.mapManager?.getMap) {
      const map = this.mapManager.getMap();
      if (map && map.isStyleLoaded()) {
        map.setBearing(-10);
      }
    }

    if (this.isControlMode) {
      this.showControlMessage('Satellite centered and reset');
    }
  }

  /**
   * Enter satellite control mode
   */
  enterControlMode() {
    if (this.isControlMode) {
      return;
    }

    // Try to get map manager again before entering control mode
    if (!this.mapManager) {
      const { getMapManager } = window;
      if (getMapManager && typeof getMapManager === 'function') {
        this.mapManager = getMapManager();
      }
      if (!this.mapManager && window.mapManager) {
        this.mapManager = window.mapManager;
      }
      if (!this.mapManager && window.stacExplorer?.mapManager) {
        this.mapManager = window.stacExplorer.mapManager;
      }
    }

    // Set up zoom listener if not already done
    if (this.mapManager?.getMap && !this.zoomListenerSetup) {
      this.setupMapZoomListener();
      this.zoomListenerSetup = true;
    }

    this.isControlMode = true;
    this.stopAnimation(); // Stop automatic animation

    // Disable MapLibre's built-in keyboard navigation
    if (this.mapManager?.getMap) {
      const map = this.mapManager.getMap();
      if (map && map.keyboard) {
        this.mapKeyboardWasEnabled = map.keyboard.isEnabled();
        map.keyboard.disable();
      }
    }

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
      '🛰️ Satellite centered! ⬅️➡️ Rotate only | ⬆️⬇️ Move map | F: Toggle follow (ON) | R: Reset | ESC: Exit'
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

    // Re-enable MapLibre's keyboard navigation if it was enabled before
    if (this.mapManager?.getMap) {
      const map = this.mapManager.getMap();
      if (map && map.keyboard && this.mapKeyboardWasEnabled) {
        map.keyboard.enable();
      }
    }

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

      // Validate satellite position after resize
      if (this.isControlMode) {
        this.validateSatelliteAfterResize();
      }
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
   * Validate and adjust satellite position after window resize
   */
  validateSatelliteAfterResize() {
    if (!this.satellite || !this.isControlMode) {
      return;
    }

    const margin = 50;
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Check if satellite is now outside bounds due to resize
    if (
      this.satellitePosition.x > newWidth - margin ||
      this.satellitePosition.y > newHeight - margin ||
      this.satellitePosition.x < margin ||
      this.satellitePosition.y < margin
    ) {
      // Adjust position to stay within new bounds
      this.satellitePosition.x = Math.max(
        margin,
        Math.min(newWidth - margin, this.satellitePosition.x)
      );
      this.satellitePosition.y = Math.max(
        margin,
        Math.min(newHeight - margin, this.satellitePosition.y)
      );

      this.updateSatellitePosition();
      this.showControlMessage('Satellite position adjusted for screen resize');
    }
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
    // Don't start animation if in control mode
    if (this.isControlMode) {
      return;
    }

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

    // Clear all active animation timers
    this.activeTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    this.activeTimers.clear();

    // Only hide satellite if not in control mode
    if (!this.isControlMode) {
      // Hide satellite immediately
      this.satellite.classList.remove('visible', 'animate');
      this.satellite.classList.add('hidden');

      // Hide container after transition
      setTimeout(() => {
        if (!this.isActive && !this.isControlMode) {
          this.container.style.display = 'none';
        }
      }, 500);
    }
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
    this.activeTimers.add(this.animationInterval);
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
    const animateTimer = setTimeout(() => {
      this.satellite.classList.add('animate');
    }, 100);
    this.activeTimers.add(animateTimer);

    // Remove animation class and hide satellite after animation completes
    const hideTimer = setTimeout(() => {
      // Don't hide if we're in control mode
      if (this.isControlMode) {
        return;
      }
      this.satellite.classList.remove('animate', 'visible');
      this.satellite.classList.add('hidden');

      // Move to next column
      this.currentColumn = (this.currentColumn + 1) % this.maxColumns;

      // Schedule next flight
      this.scheduleNextFlight();
    }, 10000);
    this.activeTimers.add(hideTimer);
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
