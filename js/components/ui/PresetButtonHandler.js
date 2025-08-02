/**
 * PresetButtonHandler.js - Handles time preset button functionality
 * Manages preset time buttons (1 Day, 1 Week, 1 Month, etc.) with immediate action
 */

export class PresetButtonHandler {
  constructor(notificationService, updateSearchSummary, formatDateForInput, formatDateDisplay) {
    this.notificationService = notificationService;
    this.updateSearchSummary = updateSearchSummary;
    this.formatDateForInput = formatDateForInput;
    this.formatDateDisplay = formatDateDisplay;
    this.presetJustSelected = false;

    this.setupPersistentEventHandler();
  }

  /**
   * Setup persistent event handler for preset buttons using event delegation
   * This survives DOM updates and re-initialization
   */
  setupPersistentEventHandler() {
    // Use event delegation on document to catch all preset button clicks
    document.addEventListener(
      'click',
      e => {
        // Check if clicked element is a preset button
        const presetBtn = e.target.closest('.preset-mini-btn');
        if (!presetBtn) {
          return;
        }

        // Prevent default and stop propagation
        e.preventDefault();
        e.stopPropagation();

        // Remove active class from all preset buttons and add to clicked one
        document
          .querySelectorAll('.preset-mini-btn')
          .forEach(btn => btn.classList.remove('active'));
        presetBtn.classList.add('active');

        // Handle different preset types
        if (presetBtn.dataset.days) {
          const days = parseInt(presetBtn.dataset.days);
          if (!Number.isNaN(days)) {
            this.handleDaysPreset(days);
          }
        } else if (presetBtn.dataset.year) {
          this.handleYearPreset(presetBtn.dataset.year);
        }
      },
      true
    ); // Use capture phase to ensure it runs first
  }

  /**
   * Handle days preset button click
   * @param {number} days - Number of days for the preset
   */
  handleDaysPreset(days) {
    // Calculate dates (going back in time)
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    this.updateDatesAndTriggerSearch(startDate, endDate);
  }

  /**
   * Handle year preset button click
   * @param {string} year - Year preset ('current' or specific year like '2024')
   */
  handleYearPreset(year) {
    let startDate, endDate;

    if (year === 'current') {
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, 0, 1); // January 1st
      endDate = new Date(currentYear, 11, 31); // December 31st
    } else {
      const yearNum = parseInt(year);
      if (Number.isNaN(yearNum)) {
        return;
      }

      startDate = new Date(yearNum, 0, 1); // January 1st
      endDate = new Date(yearNum, 11, 31); // December 31st
    }

    this.updateDatesAndTriggerSearch(startDate, endDate);
  }

  /**
   * Common method to update dates and trigger search
   */
  updateDatesAndTriggerSearch(startDate, endDate) {
    // Format dates
    const startDateStr = this.formatDateForInput(startDate);
    const endDateStr = this.formatDateForInput(endDate);

    // Update form inputs immediately
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');
    if (startInput) {
      startInput.value = startDateStr;
    }
    if (endInput) {
      endInput.value = endDateStr;
    }

    // Update mini date fields
    const summaryStartInput = document.getElementById('summary-start-date');
    const summaryEndInput = document.getElementById('summary-end-date');
    if (summaryStartInput) {
      summaryStartInput.value = startDateStr;
    }
    if (summaryEndInput) {
      summaryEndInput.value = endDateStr;
    }

    // Close any open dropdown immediately
    const dropdownEvent = new CustomEvent('closeDropdown');
    document.dispatchEvent(dropdownEvent);

    // Set flag to prevent reopening
    this.presetJustSelected = true;

    // Delay search summary update and events
    setTimeout(() => {
      // Update search summary
      const dateRange = `${this.formatDateDisplay(startDate)} to ${this.formatDateDisplay(endDate)}`;
      this.updateSearchSummary('date', dateRange.toUpperCase());

      // Trigger search parameter change event
      document.dispatchEvent(
        new CustomEvent('searchParameterChanged', {
          detail: {
            type: 'date',
            dateType: 'custom',
            dateStart: startDateStr,
            dateEnd: endDateStr,
          },
        })
      );

      // Clear the prevention flag
      this.presetJustSelected = false;
    }, 300);
  }

  /**
   * Check if preset was just selected (to prevent dropdown reopening)
   */
  isPresetJustSelected() {
    return this.presetJustSelected;
  }
}
