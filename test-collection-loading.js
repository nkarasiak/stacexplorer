/**
 * AI Smart Search Collection Loading Test Script
 * Tests that collections are loaded from both Copernicus and Element84 data sources
 */

function testCollectionLoading() {
    console.log('🧪 Testing AI Smart Search Collection Loading...');
    
    // Check if AI Smart Search is available
    const aiButton = document.getElementById('ai-search-btn');
    if (!aiButton) {
        console.error('❌ AI Smart Search button not found');
        return false;
    }
    
    console.log('✅ AI Smart Search button found');
    
    // Click to open AI Smart Search (this will trigger collection loading)
    console.log('🔄 Opening AI Smart Search to trigger collection loading...');
    aiButton.click();
    
    // Wait for collections to load and interface to open
    setTimeout(() => {
        testCollectionDropdown();
    }, 3000); // Give more time for collection loading
    
    return true;
}

function testCollectionDropdown() {
    console.log('🗂️ Testing collection dropdown...');
    
    const dataField = document.getElementById('ai-field-collection');
    if (!dataField) {
        console.error('❌ DATA field not found');
        return;
    }
    
    // Click DATA field to open dropdown
    console.log('👆 Clicking DATA field to open dropdown...');
    dataField.click();
    
    setTimeout(() => {
        const dropdown = document.getElementById('ai-dropdown-collection');
        if (dropdown && dataField.classList.contains('active')) {
            console.log('✅ DATA field dropdown opened successfully');
            
            // Check for collection items
            const collectionItems = dropdown.querySelectorAll('.ai-dropdown-item');
            console.log(`📊 Found ${collectionItems.length} collection items in dropdown`);
            
            if (collectionItems.length > 0) {
                analyzeCollections(collectionItems);
            } else {
                console.error('❌ No collection items found - collections may not have loaded');
                console.log('🔍 Checking if collections are being loaded...');
                checkCollectionLoadingProcess();
            }
        } else {
            console.error('❌ DATA field dropdown did not open');
        }
    }, 500);
}

function analyzeCollections(collectionItems) {
    console.log('🔍 Analyzing loaded collections...');
    
    const sources = new Set();
    const collectionsBySource = {};
    
    collectionItems.forEach((item, index) => {
        const collectionId = item.dataset.value;
        const source = item.dataset.source;
        const title = item.querySelector('.collection-title')?.textContent || 'Unknown';
        
        if (source) {
            sources.add(source);
            if (!collectionsBySource[source]) {
                collectionsBySource[source] = [];
            }
            collectionsBySource[source].push({
                id: collectionId,
                title: title
            });
        }
        
        if (index < 5) { // Show first 5 collections as examples
            console.log(`  ${index + 1}. ${title} (${source}) - ID: ${collectionId}`);
        }
    });
    
    console.log('📈 Collection Summary:');
    console.log(`  Total Collections: ${collectionItems.length}`);
    console.log(`  Data Sources: ${Array.from(sources).join(', ')}`);
    
    sources.forEach(source => {
        const count = collectionsBySource[source]?.length || 0;
        console.log(`  ${source}: ${count} collections`);
        
        // Show a few examples from each source
        if (collectionsBySource[source] && collectionsBySource[source].length > 0) {
            console.log(`    Examples: ${collectionsBySource[source].slice(0, 3).map(c => c.id).join(', ')}`);
        }
    });
    
    // Test collection selection
    if (collectionItems.length > 0) {
        testCollectionSelection(collectionItems[0]);
    }
}

function testCollectionSelection(firstCollection) {
    console.log('🎯 Testing collection selection...');
    
    const collectionId = firstCollection.dataset.value;
    const source = firstCollection.dataset.source;
    
    console.log(`🖱️ Clicking on collection: ${collectionId} from ${source}`);
    firstCollection.click();
    
    setTimeout(() => {
        const dataField = document.getElementById('ai-field-collection');
        if (dataField && !dataField.classList.contains('active')) {
            console.log('✅ Collection selected successfully, dropdown closed');
            console.log(`📋 Selected collection display: "${dataField.textContent}"`);
        } else {
            console.error('❌ Collection selection failed or dropdown did not close');
        }
    }, 200);
}

function checkCollectionLoadingProcess() {
    console.log('🔍 Checking collection loading process...');
    
    // Check if there's an active loading indicator
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator && loadingIndicator.style.display !== 'none') {
        console.log('⏳ Loading indicator is active - collections may still be loading');
    }
    
    // Check for network errors
    console.log('🌐 Check browser Network tab for any failed requests to:');
    console.log('  - https://stac.dataspace.copernicus.eu/v1/collections');
    console.log('  - https://earth-search.aws.element84.com/v1/collections');
    
    // Check console for error messages
    console.log('⚠️ Check browser console for any error messages about collection loading');
}

// Test search functionality
function testSearchFunctionality() {
    console.log('🔍 Testing search functionality...');
    
    const searchInput = document.querySelector('.ai-collection-search-input');
    if (searchInput) {
        console.log('🔎 Testing collection search...');
        
        // Test searching for "sentinel"
        searchInput.value = 'sentinel';
        searchInput.dispatchEvent(new Event('input'));
        
        setTimeout(() => {
            const visibleItems = document.querySelectorAll('#ai-dropdown-collection .ai-dropdown-item[style*="block"], #ai-dropdown-collection .ai-dropdown-item:not([style*="none"])');
            console.log(`📊 Search for "sentinel" returned ${visibleItems.length} collections`);
            
            if (visibleItems.length > 0) {
                console.log('✅ Collection search is working');
                visibleItems.forEach((item, index) => {
                    if (index < 3) {
                        const title = item.querySelector('.collection-title')?.textContent;
                        console.log(`  - ${title}`);
                    }
                });
            } else {
                console.warn('⚠️ No collections found for "sentinel" search');
            }
            
            // Clear search
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }, 300);
    }
}

// Export test functions
window.testCollectionLoading = testCollectionLoading;
window.testSearchFunctionality = testSearchFunctionality;

console.log('🔧 Collection loading test functions loaded!');
console.log('💡 Run testCollectionLoading() to test collection loading from both data sources');
console.log('💡 Expected: Collections from both Copernicus and Element84 should appear in dropdown');
