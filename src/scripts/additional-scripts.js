/* Additional Scripts JavaScript - Extracted from index.html */

// Wait for the application to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Wait a bit more to ensure all components are initialized
  setTimeout(function () {
    // Get the button (now it's hidden but still needs to work)
    const criteriaBboxBtn = document.getElementById('criteria-draw-bbox-btn');

    if (criteriaBboxBtn) {
      // Remove any existing event listeners
      const newBtn = criteriaBboxBtn.cloneNode(true);
      criteriaBboxBtn.parentNode.replaceChild(newBtn, criteriaBboxBtn);

      // Add a new event listener
      newBtn.addEventListener('click', function () {
        if (window.stacExplorer && window.stacExplorer.mapManager) {
          // Access the map manager directly
          const mapManager = window.stacExplorer.mapManager;

          // Start drawing mode
          mapManager.startDrawingBbox();
        } else {
          console.error('Map manager not available');
        }
      });
    } else {
      console.error('Could not find the criteria-draw-bbox-btn element');
    }

    // Note: Preset button handlers are now initialized in the main DOMContentLoaded section

    // Set up collection info button
    const collectionInfoBtn = document.getElementById('collection-info-btn');
    if (collectionInfoBtn) {
      collectionInfoBtn.addEventListener('click', function () {
        // This can be a no-op since the inline AI search handles collection details
      });
    }

    // Set up visible date preset buttons
    // setupDatePresetButtons(); // Disabled - using new inline date input system

    // Set up source preset buttons
    setupSourcePresetButtons();

    // Set up visible drawing and info tools
    setupVisibleTools();
  }, 1000); // Wait 1 second to ensure everything is loaded
});

// OLD Date Preset Button Setup - DISABLED
// This function is disabled in favor of the new inline date input system
function setupDatePresetButtons() {
  // Old preset button handlers are disabled
  // New handlers are initialized in the DOMContentLoaded section below
}

// Source Preset Button Setup
function setupSourcePresetButtons() {
  const sourceButtons = document.querySelectorAll('.source-mini-btn');

  sourceButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent triggering the parent click

      const collection = this.getAttribute('data-collection');
      const buttonId = this.id;

      if (buttonId === 'source-more') {
        // Handle "+" button - open the source dropdown
        const summarySource = document.getElementById('summary-source');
        if (summarySource) {
          // Trigger the dropdown by simulating a click on the source card
          summarySource.click();
        }
        return;
      }

      if (collection) {
        // Remove active class from all source preset buttons
        sourceButtons.forEach(btn => {
          if (btn.id !== 'source-more') {
            btn.classList.remove('active');
          }
        });
        // Add active class to clicked button
        this.classList.add('active');

        // Select the collection in the hidden dropdown
        setSelectedCollection(collection);

        // Update the search summary display
        updateSourceSummaryDisplay(this.textContent, this.title);
      }
    });
  });
}

// Set selected collection in hidden form
function setSelectedCollection(collectionId) {
  const collectionSelect = document.getElementById('collection-select');
  if (collectionSelect) {
    // Find option with matching value or create one if it doesn't exist
    let option = Array.from(collectionSelect.options).find(opt => opt.value === collectionId);

    if (!option) {
      // Create a new option for this collection ID
      option = new Option(collectionId, collectionId);
      collectionSelect.appendChild(option);
    }

    collectionSelect.value = collectionId;
    collectionSelect.dispatchEvent(new Event('change'));
  }
}

// Update source summary display
function updateSourceSummaryDisplay(buttonText, fullName) {
  const sourceValueElement = document.querySelector(
    '.search-summary-item:has(.search-summary-label:contains("Source")) .search-summary-value'
  );
  if (!sourceValueElement) {
    // Alternative selector if :has() is not supported
    const sourceItems = document.querySelectorAll('.search-summary-item');
    for (const item of sourceItems) {
      const label = item.querySelector('.search-summary-label');
      if (label && label.textContent.includes('Source')) {
        const valueElement = item.querySelector('.search-summary-value');
        if (valueElement) {
          valueElement.textContent = `🛰️ ${fullName}`;
          break;
        }
      }
    }
  } else {
    sourceValueElement.textContent = `🛰️ ${fullName}`;
  }
}

// Set date range for last N days
function setDateRange(days) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = today.toISOString().split('T')[0];

  // Update mini date inputs (new system)
  const summaryStartInput = document.getElementById('summary-start-date');
  const summaryEndInput = document.getElementById('summary-end-date');
  if (summaryStartInput) summaryStartInput.value = startDateStr;
  if (summaryEndInput) summaryEndInput.value = endDateStr;

  // Update hidden form inputs (for compatibility)
  const formStartInput = document.getElementById('date-start');
  const formEndInput = document.getElementById('date-end');
  if (formStartInput) formStartInput.value = startDateStr;
  if (formEndInput) formEndInput.value = endDateStr;

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
}

// Set date range for a specific year
function setYearRange(year) {
  const startDateStr = `${year}-01-01`;
  let endDateStr;

  // If it's the current year, use today's date as end date
  const currentYear = new Date().getFullYear();
  if (year === currentYear) {
    endDateStr = new Date().toISOString().split('T')[0];
  } else {
    endDateStr = `${year}-12-31`;
  }

  // Update mini date inputs (new system)
  const summaryStartInput = document.getElementById('summary-start-date');
  const summaryEndInput = document.getElementById('summary-end-date');
  if (summaryStartInput) summaryStartInput.value = startDateStr;
  if (summaryEndInput) summaryEndInput.value = endDateStr;

  // Update hidden form inputs (for compatibility)
  const formStartInput = document.getElementById('date-start');
  const formEndInput = document.getElementById('date-end');
  if (formStartInput) formStartInput.value = startDateStr;
  if (formEndInput) formEndInput.value = endDateStr;

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
}

// Update the search summary display with current date selection
function updateSearchSummaryDisplay() {
  const startDate = document.getElementById('date-start').value;
  const endDate = document.getElementById('date-end').value;
  const summaryDateElement = document.querySelector('#summary-date .search-summary-value');

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    // Format dates nicely
    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Check for common presets
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const todayStr = today.toISOString().split('T')[0];
    const endStr2 = end.toISOString().split('T')[0];

    let displayText;
    if (endStr2 === todayStr && daysDiff === 6) {
      displayText = '📅 Last 7 Days';
    } else if (endStr2 === todayStr && daysDiff === 29) {
      displayText = '📅 Last 30 Days';
    } else if (startDate.endsWith('-01-01') && endDate.endsWith('-12-31')) {
      const year = startDate.split('-')[0];
      displayText = `📅 Year ${year}`;
    } else {
      displayText = `📅 ${startStr} - ${endStr}`;
    }

    if (summaryDateElement) {
      summaryDateElement.textContent = displayText;
    }
  }
}

// Setup visible drawing and info tools
function setupVisibleTools() {
  // Inline draw bbox button in location card
  const inlineDrawBtn = document.getElementById('draw-bbox-inline');
  const hiddenDrawBtn = document.getElementById('criteria-draw-bbox-btn');

  if (inlineDrawBtn && hiddenDrawBtn) {
    inlineDrawBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent triggering the parent card click

      // Trigger the hidden button's functionality
      hiddenDrawBtn.click();

      // Visual feedback
      this.style.background = 'var(--primary-500, #2196F3)';
      this.style.color = 'white';
      setTimeout(() => {
        this.style.background = '';
        this.style.color = '';
      }, 2000);
    });
  }

}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function () {
  // Wait for app to be ready then set up enhanced functionality
  setTimeout(() => {
    updateSearchSummaryDisplay(); // Update initial display
  }, 2000);
});