/**
 * AI Smart Search Debug Script
 * Run this in browser console to debug dropdown issues
 */

function debugAISmartSearch() {
    console.log('🐛 Debugging AI Smart Search Dropdown...');
    console.log('==========================================');
    
    // Step 1: Check if AI Search is open
    const aiInterface = document.querySelector('.ai-fullscreen');
    if (!aiInterface) {
        console.error('❌ AI Smart Search interface not found. Please open it first by clicking the brain icon.');
        return false;
    }
    console.log('✅ AI Smart Search interface is open');
    
    // Step 2: Check if DATA field exists
    const dataField = document.getElementById('ai-field-collection');
    if (!dataField) {
        console.error('❌ DATA field not found');
        return false;
    }
    console.log('✅ DATA field found:', dataField);
    
    // Step 3: Check if dropdown exists
    const dropdown = document.getElementById('ai-dropdown-collection');
    if (!dropdown) {
        console.error('❌ Collection dropdown not found');
        return false;
    }
    console.log('✅ Collection dropdown found:', dropdown);
    
    // Step 4: Check collection items
    const collectionItems = dropdown.querySelectorAll('.ai-dropdown-item');
    console.log(`📊 Found ${collectionItems.length} collection items`);
    
    // Step 5: Check CSS styles
    const dropdownStyles = window.getComputedStyle(dropdown);
    console.log('📊 Dropdown current styles:');
    console.log('  - display:', dropdownStyles.display);
    console.log('  - visibility:', dropdownStyles.visibility);
    console.log('  - position:', dropdownStyles.position);
    console.log('  - z-index:', dropdownStyles.zIndex);
    
    // Step 6: Check if field has active class
    const hasActiveClass = dataField.classList.contains('active');
    console.log('📊 DATA field has active class:', hasActiveClass);
    
    // Step 7: Test click functionality
    console.log('🖱️ Testing click functionality...');
    dataField.click();
    
    setTimeout(() => {
        const hasActiveClassAfterClick = dataField.classList.contains('active');
        const dropdownStylesAfterClick = window.getComputedStyle(dropdown);
        
        console.log('📊 After clicking:');
        console.log('  - Field has active class:', hasActiveClassAfterClick);
        console.log('  - Dropdown display:', dropdownStylesAfterClick.display);
        
        if (hasActiveClassAfterClick && dropdownStylesAfterClick.display === 'block') {
            console.log('✅ Dropdown should be visible now!');
            console.log('🎯 Try looking for the dropdown below the DATA field');
        } else {
            console.error('❌ Dropdown still not showing after click');
            console.log('🔧 Attempting manual fix...');
            manuallyShowDropdown();
        }
    }, 200);
    
    return true;
}

function manuallyShowDropdown() {
    console.log('🔧 Manually showing dropdown...');
    
    const dataField = document.getElementById('ai-field-collection');
    const dropdown = document.getElementById('ai-dropdown-collection');
    
    if (dataField && dropdown) {
        // Force add active class
        dataField.classList.add('active');
        
        // Force show dropdown with inline styles
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.zIndex = '1000';
        dropdown.style.background = 'white';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '8px';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        dropdown.style.minWidth = '300px';
        dropdown.style.maxHeight = '400px';
        dropdown.style.overflow = 'auto';
        
        console.log('🎯 Dropdown should now be visible with forced styles!');
        
        // Check collection items
        const items = dropdown.querySelectorAll('.ai-dropdown-item');
        console.log(`📋 Collections in dropdown: ${items.length}`);
        
        items.forEach((item, index) => {
            if (index < 5) {
                const title = item.querySelector('.collection-title')?.textContent;
                const id = item.querySelector('.collection-id')?.textContent;
                console.log(`  ${index + 1}. ${title} (${id})`);
            }
        });
        
        if (items.length === 0) {
            console.error('❌ No collection items found - collections may not have loaded');
            checkCollectionLoading();
        } else {
            console.log('✅ Collections are available - dropdown should be working now!');
        }
    }
}

function checkCollectionLoading() {
    console.log('🔍 Checking collection loading...');
    
    // Check if there's a loading notification
    console.log('💡 Expected sequence:');
    console.log('1. Click AI Search button');
    console.log('2. See notification: "Loading collections from all data sources..."');
    console.log('3. See notification: "Loaded X collections from all sources! 🎉"');
    console.log('4. Click DATA field to see dropdown');
    
    console.log('🌐 If collections aren\'t loading, check:');
    console.log('- Browser Network tab for failed requests');
    console.log('- Console for JavaScript errors');
    console.log('- Internet connection');
}

function testCollectionClick() {
    console.log('🧪 Testing collection click...');
    
    const dropdown = document.getElementById('ai-dropdown-collection');
    const firstItem = dropdown?.querySelector('.ai-dropdown-item');
    
    if (firstItem) {
        console.log('🖱️ Clicking first collection item...');
        const title = firstItem.querySelector('.collection-title')?.textContent;
        console.log(`📋 Clicking: ${title}`);
        
        firstItem.click();
        
        setTimeout(() => {
            const dataField = document.getElementById('ai-field-collection');
            const newText = dataField.textContent;
            const hasActiveClass = dataField.classList.contains('active');
            
            console.log('📊 After clicking collection:');
            console.log('  - Field text:', newText);
            console.log('  - Still has active class:', hasActiveClass);
            console.log('  - Expected: active class should be removed');
            
            if (!hasActiveClass) {
                console.log('✅ Collection selection worked!');
            } else {
                console.error('❌ Collection selection failed');
            }
        }, 200);
    } else {
        console.error('❌ No collection items found to test');
    }
}

// Export functions
window.debugAISmartSearch = debugAISmartSearch;
window.manuallyShowDropdown = manuallyShowDropdown;
window.testCollectionClick = testCollectionClick;

console.log('🔧 AI Smart Search debug functions loaded!');
console.log('💡 Run debugAISmartSearch() to diagnose dropdown issues');
console.log('💡 Run manuallyShowDropdown() to force show the dropdown');
console.log('💡 Run testCollectionClick() to test collection selection');
