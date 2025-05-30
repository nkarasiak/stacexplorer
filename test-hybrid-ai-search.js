/**
 * AI Smart Search Hybrid Model Test Script
 * Run this in the browser console to test the new functionality
 */

function testHybridAISmartSearch() {
    console.log('🧪 Testing AI Smart Search Hybrid Model...');
    
    // Check if AI Smart Search is available
    const aiButton = document.getElementById('ai-search-btn');
    if (!aiButton) {
        console.error('❌ AI Smart Search button not found');
        return false;
    }
    
    console.log('✅ AI Smart Search button found');
    
    // Simulate clicking the AI button to open interface
    aiButton.click();
    
    // Wait for interface to load
    setTimeout(() => {
        testHybridFields();
    }, 500);
    
    return true;
}

function testHybridFields() {
    console.log('🔧 Testing hybrid field functionality...');
    
    // Test DATA field (should show dropdown)
    testDataFieldDropdown();
    
    // Test other fields (should enable direct editing)
    setTimeout(() => testDirectEditFields(), 1000);
}

function testDataFieldDropdown() {
    console.log('🗂️ Testing DATA field dropdown...');
    
    const dataField = document.getElementById('ai-field-collection');
    if (!dataField) {
        console.error('❌ DATA field not found');
        return;
    }
    
    // Click DATA field
    dataField.click();
    
    setTimeout(() => {
        // Check if dropdown is shown
        const dropdown = document.getElementById('ai-dropdown-collection');
        if (dropdown && dataField.classList.contains('active')) {
            console.log('✅ DATA field dropdown activated successfully');
            
            // Check for collection items
            const collectionItems = dropdown.querySelectorAll('.ai-dropdown-item');
            console.log(`📋 Found ${collectionItems.length} collection items`);
            
            if (collectionItems.length > 0) {
                console.log('✅ Collections are available for selection');
                
                // Test clicking on first collection
                const firstCollection = collectionItems[0];
                if (firstCollection && firstCollection.dataset.value) {
                    console.log(`🎯 Testing selection of: ${firstCollection.dataset.value}`);
                    firstCollection.click();
                    
                    setTimeout(() => {
                        if (!dataField.classList.contains('active')) {
                            console.log('✅ DATA field dropdown closed after selection');
                            console.log(`📋 Selected collection: ${dataField.textContent}`);
                        } else {
                            console.error('❌ Dropdown did not close after selection');
                        }
                    }, 200);
                } else {
                    console.error('❌ First collection item missing data-value');
                }
            } else {
                console.error('❌ No collection items found in dropdown');
            }
        } else {
            console.error('❌ DATA field dropdown not activated');
        }
    }, 300);
}

function testDirectEditFields() {
    console.log('✏️ Testing direct edit fields...');
    
    const fieldsToTest = [
        { id: 'ai-field-location', name: 'EVERYWHERE', testText: 'everywhere' },
        { id: 'ai-field-date', name: 'ANYTIME', testText: 'last week' },
        { id: 'ai-field-params', name: 'PARAMETERS', testText: '15%' }
    ];
    
    fieldsToTest.forEach((fieldTest, index) => {
        setTimeout(() => {
            testDirectEditField(fieldTest);
        }, index * 800);
    });
}

function testDirectEditField(fieldTest) {
    console.log(`✏️ Testing ${fieldTest.name} field for direct editing...`);
    
    const field = document.getElementById(fieldTest.id);
    if (!field) {
        console.error(`❌ ${fieldTest.name} field not found`);
        return;
    }
    
    // Click the field
    field.click();
    
    setTimeout(() => {
        // Check if field is in editing mode
        if (field.contentEditable === 'true' && field.classList.contains('ai-field-editing')) {
            console.log(`✅ ${fieldTest.name} field entered editing mode successfully`);
            
            // Test typing
            field.textContent = fieldTest.testText;
            
            // Simulate Enter key to finish editing
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            field.dispatchEvent(enterEvent);
            
            setTimeout(() => {
                const finalText = field.textContent;
                if (field.contentEditable === 'false' && !field.classList.contains('ai-field-editing')) {
                    console.log(`✅ ${fieldTest.name} field exited editing mode`);
                    console.log(`📝 Final text: "${finalText}"`);
                } else {
                    console.error(`❌ ${fieldTest.name} field did not exit editing mode properly`);
                }
            }, 200);
            
        } else {
            console.error(`❌ ${fieldTest.name} field did not enter editing mode`);
            console.log(`   contentEditable: ${field.contentEditable}`);
            console.log(`   has editing class: ${field.classList.contains('ai-field-editing')}`);
        }
    }, 200);
}

// Test hover hints
function testHoverHints() {
    console.log('💡 Testing hover hints...');
    
    const dataField = document.getElementById('ai-field-collection');
    const locationField = document.getElementById('ai-field-location');
    
    if (dataField && locationField) {
        // Check computed styles for hover hints
        const dataHint = window.getComputedStyle(dataField, '::after').content;
        const locationHint = window.getComputedStyle(locationField, '::after').content;
        
        console.log('📝 Hover hints:', {
            data: dataHint,
            location: locationHint
        });
    }
}

// Export functions for manual testing
window.testHybridAI = testHybridAISmartSearch;
window.testHoverHints = testHoverHints;

console.log('🔧 Hybrid AI Smart Search test functions loaded!');
console.log('💡 Run testHybridAI() to test the new hybrid functionality');
console.log('💡 Expected behavior:');
console.log('   - DATA field: Shows dropdown with collections');
console.log('   - Other fields: Enable direct text editing');
