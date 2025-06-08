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

// Update the location selection handler
function handleLocationSelection(location) {
    console.log('Location selected:', location); // Debug log
    
    // Update the location display
    const locationValue = document.querySelector('#summary-location .search-summary-value');
    if (locationValue) {
        locationValue.textContent = location;
        console.log('Updated location display to:', location); // Debug log
    }
    
    // Update the search parameters
    updateSearchParams('location', location);
    
    // Close the dropdown menu
    const locationDropdown = document.querySelector('.location-dropdown');
    if (locationDropdown) {
        locationDropdown.style.display = 'none';
    }
    
    // Trigger search with new parameters
    performSearch();
}

// Update the location dropdown HTML to include proper click handlers
function updateLocationDropdown() {
    const locationDropdown = document.querySelector('.location-dropdown');
    if (locationDropdown) {
        locationDropdown.innerHTML = `
            <div class="location-option" onclick="handleLocationSelection('THE WORLD')">THE WORLD</div>
            <div class="location-option" onclick="handleLocationSelection('EUROPE')">EUROPE</div>
            <div class="location-option" onclick="handleLocationSelection('ASIA')">ASIA</div>
            <div class="location-option" onclick="handleLocationSelection('NICE')">NICE</div>
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

// Make sure the function is called when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    updateLocationDropdown();
    
    // Add click handler to location summary
    const locationSummary = document.getElementById('summary-location');
    if (locationSummary) {
        locationSummary.addEventListener('click', function(e) {
            e.stopPropagation();
            const locationDropdown = document.querySelector('.location-dropdown');
            if (locationDropdown) {
                locationDropdown.style.display = 
                    locationDropdown.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
}); 