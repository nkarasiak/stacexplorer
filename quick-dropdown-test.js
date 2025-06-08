/**
 * Quick AI Smart Search Dropdown Test
 * Run this in browser console to quickly test the dropdown functionality
 */

function quickDropdownTest() {
    console.log('🧪 Quick AI Smart Search Dropdown Test');
    console.log('=====================================');
    
    // Step 1: Check if AI button exists
    const aiButton = document.getElementById('ai-search-btn');
    if (!aiButton) {
        console.error('❌ AI Search button not found - make sure you are on the STAC Explorer page');
        return;
    }
    
    console.log('✅ AI Search button found');
    
    // Step 2: Open AI Search
    console.log('🖱️ Opening AI Smart Search...');
    aiButton.click();
    
    // Wait for interface to load
    setTimeout(() => {
        testDropdownAfterOpen();
    }, 2000);
}

function testDropdownAfterOpen() {
    console.log('🔍 Testing dropdown after interface opened...');
    
    // Check if interface opened
    const dataField = document.getElementById('ai-field-collection');
    if (!dataField) {
        console.error('❌ AI interface did not open properly');
        return;
    }
    
    console.log('✅ AI interface opened');
    
    // Test clicking DATA field
    console.log('🖱️ Clicking DATA field...');
    dataField.click();
    
    // Check immediately and after delay
    setTimeout(() => {
        const dropdown = document.getElementById('ai-dropdown-collection');
        const hasActiveClass = dataField.classList.contains('active');
        const dropdownDisplay = dropdown ? window.getComputedStyle(dropdown).display : 'not found';
        
        console.log('📊 Test Results:');
        console.log(`  - DATA field has active class: ${hasActiveClass}`);
        console.log(`  - Dropdown display style: ${dropdownDisplay}`);
        
        if (hasActiveClass && dropdownDisplay === 'block') {
            console.log('🎉 SUCCESS! Dropdown is working!');
            console.log('👀 Look for the dropdown below the DATA field');
            
            // Count collections
            const items = dropdown?.querySelectorAll('.ai-dropdown-item') || [];
            console.log(`📋 Found ${items.length} collections in dropdown`);
            
            if (items.length > 0) {
                console.log('✅ Collections loaded successfully!');
                console.log('💡 You can now click on any collection to select it');
                
                // Show first few collections
                for (let i = 0; i < Math.min(3, items.length); i++) {
                    const title = items[i].querySelector('.collection-title')?.textContent;
                    console.log(`  ${i + 1}. ${title}`);
                }
            } else {
                console.warn('⚠️ Dropdown is visible but no collections loaded');
            }
        } else {
            console.error('❌ Dropdown is not showing properly');
            console.log('🔧 Running debug script...');
            
            // Force show dropdown
            if (dropdown) {
                dropdown.style.display = 'block';
                dropdown.style.position = 'absolute';
                dropdown.style.zIndex = '1001';
                dropdown.style.background = 'white';
                dropdown.style.border = '1px solid #ccc';
                dropdown.style.borderRadius = '8px';
                dropdown.style.minWidth = '300px';
                dropdown.style.maxHeight = '400px';
                dropdown.style.overflow = 'auto';
                console.log('🛠️ Forced dropdown to show - check if it\'s visible now');
            }
        }
    }, 500);
}

// Auto-run if AI interface is already open
function autoTest() {
    const aiInterface = document.querySelector('.ai-fullscreen');
    if (aiInterface) {
        console.log('🔍 AI interface already open, testing dropdown directly...');
        testDropdownAfterOpen();
    } else {
        console.log('🚀 Starting fresh test...');
        quickDropdownTest();
    }
}

// Export for manual use
window.quickDropdownTest = quickDropdownTest;
window.autoTest = autoTest;

console.log('🔧 Quick dropdown test loaded!');
console.log('💡 Run quickDropdownTest() or autoTest() to test the dropdown');

// Auto-run the test
autoTest();
