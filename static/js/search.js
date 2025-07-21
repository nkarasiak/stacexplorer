// Update the location selection handler
function handleLocationSelection(location) {
    console.log('Location selected:', location); // Debug log

    // Update the location display
    const locationValue = document.querySelector('#summary-location .search-summary-value');
    if (locationValue) {
        locationValue.textContent = location;
        console.log('Updated location display to:', location); // Debug log
    } else {
        console.log('Location value element not found'); // Debug log
    }

    // Update the search parameters
    updateSearchParams('location', location);
    
    // Close the dropdown menu
    const locationDropdown = document.querySelector('.location-dropdown');
    if (locationDropdown) {
        locationDropdown.style.display = 'none';
        console.log('Closed dropdown'); // Debug log
    } else {
        console.log('Dropdown element not found'); // Debug log
    }

    // Trigger search with new parameters
    performSearch();
}

// Add click event listeners when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded'); // Debug log

    // Add click handler to location summary
    const locationSummary = document.getElementById('summary-location');
    if (locationSummary) {
        locationSummary.addEventListener('click', function(e) {
            console.log('Location summary clicked'); // Debug log
            e.stopPropagation(); // Prevent event bubbling
            
            const locationDropdown = document.querySelector('.location-dropdown');
            if (locationDropdown) {
                const currentDisplay = locationDropdown.style.display;
                locationDropdown.style.display = currentDisplay === 'none' ? 'block' : 'none';
                console.log('Toggled dropdown display to:', locationDropdown.style.display); // Debug log
            }
        });
    } else {
        console.log('Location summary element not found'); // Debug log
    }

    // Add click handlers to location options
    const locationOptions = document.querySelectorAll('.location-option');
    locationOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            console.log('Location option clicked:', this.textContent); // Debug log
            e.stopPropagation(); // Prevent event bubbling
            handleLocationSelection(this.textContent.trim());
        });
    });

    updateLocationDropdown();
});

// Add click handler to close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const locationDropdown = document.querySelector('.location-dropdown');
    const locationSummary = document.getElementById('summary-location');
    
    if (locationDropdown && 
        !locationDropdown.contains(e.target) && 
        !locationSummary.contains(e.target)) {
        locationDropdown.style.display = 'none';
        console.log('Closed dropdown (outside click)'); // Debug log
    }
});

function handleWKTInput(wkt) {
    console.log('Handling WKT input:', wkt); // Debug log
    
    // Update the map with the WKT geometry
    displayGeometryOnMap(wkt);
    
    // Update the location parameter in the URL
    updateSearchParams('location', wkt);
    
    // Update the location display in the UI
    const locationValue = document.querySelector('#summary-location .search-summary-value');
    if (locationValue) {
        locationValue.textContent = 'Custom Area';
    }
    
    // Close any open dropdowns
    const locationDropdown = document.querySelector('.location-dropdown');
    if (locationDropdown) {
        locationDropdown.style.display = 'none';
    }
}

function displayGeometryOnMap(wkt) {
    console.log('Displaying geometry on map:', wkt); // Debug log
    
    // Your existing map display logic here
    // ...
    
    // After displaying the geometry, update the search parameters
    updateSearchParams('location', wkt);
}

function updateSearchParams(field, value) {
    console.log('Updating search params:', field, value); // Debug log
    
    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Update the parameter
    if (value) {
        urlParams.set(field, value);
    } else {
        urlParams.delete(field);
    }
    
    // Update the URL without reloading the page
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Update the UI to reflect the change
    updateSearchSummary(field, value);
}

function updateSearchSummary(field, value) {
    console.log('Updating search summary:', field, value); // Debug log
    
    const summaryElement = document.querySelector(`#summary-${field}`);
    if (summaryElement) {
        const valueElement = summaryElement.querySelector('.search-summary-value');
        if (valueElement) {
            // For geometry formats, show the appropriate label
            if (field === 'location' && value && value.startsWith('POLYGON')) {
                valueElement.textContent = 'Custom Area';
            } else if (field === 'location' && value && (value === 'WKT' || value === 'GEOJSON' || value.includes('geometry'))) {
                valueElement.textContent = value;
            } else {
                valueElement.textContent = value || 'THE WORLD';
            }
            console.log('Updated summary value to:', valueElement.textContent); // Debug log
        }
    }
}

function performSearch() {
    console.log('Performing search with params:', window.location.search); // Debug log
    
    // Get current search parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Update the map view if location is specified
    const location = urlParams.get('location');
    if (location) {
        console.log('Updating map for location:', location); // Debug log
        // Add your map update logic here
    }
    
    // Perform the actual search
    // ... rest of your search logic ...
}

// Add the showGeometryInputModal function
function showGeometryInputModal() {
    console.log('Showing geometry input modal'); // Debug log
    
    // Create and show the modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Enter Geometry</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <textarea id="geometry-input" placeholder="Paste WKT geometry here..." rows="5" style="width: 100%;"></textarea>
                <button id="apply-geometry" class="btn btn-primary">Apply</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close');
    const applyBtn = modal.querySelector('#apply-geometry');
    const textarea = modal.querySelector('#geometry-input');
    
    closeBtn.onclick = function() {
        modal.remove();
    };
    
    applyBtn.onclick = function() {
        const wkt = textarea.value.trim();
        if (wkt) {
            handleWKTInput(wkt);
            modal.remove();
        }
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// Update the location dropdown HTML to include the copy option
function updateLocationDropdown() {
    const locationDropdown = document.querySelector('.location-dropdown');
    if (locationDropdown) {
        locationDropdown.innerHTML = `
            <div class="location-option">THE WORLD</div>
            <div class="location-option">EUROPE</div>
            <div class="location-option">ASIA</div>
            <div class="location-divider"></div>
            <div class="location-option" onclick="showGeometryInputModal()">
                <i class="material-icons">content_copy</i>
                Copy Geometry
            </div>
        `;
    }
}

// Add CSS for the modal
const style = document.createElement('style');
style.textContent = `
    .modal {
        display: block;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
    }
    
    .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 500px;
        border-radius: 4px;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .close {
        color: #aaa;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }
    
    .close:hover {
        color: black;
    }
    
    .location-divider {
        height: 1px;
        background-color: #ddd;
        margin: 8px 0;
    }
    
    .location-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        cursor: pointer;
    }
    
    .location-option:hover {
        background-color: #f5f5f5;
    }
    
    .location-option i {
        font-size: 18px;
    }
`;
document.head.appendChild(style); 