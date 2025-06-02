/**
 * Debug Helper for Inline Dropdown Functionality
 * Run this in the browser console to verify everything is working
 */

function debugInlineDropdowns() {
    console.log('🔍 Debugging Inline Dropdown Integration');
    console.log('=======================================');
    
    // Check if the InlineDropdownManager is available
    const inlineManager = window.stacExplorer?.inlineDropdownManager;
    if (inlineManager) {
        console.log('✅ InlineDropdownManager found:', inlineManager);
    } else {
        console.error('❌ InlineDropdownManager not found in window.stacExplorer');
        console.log('Available in stacExplorer:', Object.keys(window.stacExplorer || {}));
        return;
    }
    
    // Check if CSS is loaded
    const cssLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(link => link.href.includes('inline-dropdown.css'));
    
    if (cssLoaded) {
        console.log('✅ inline-dropdown.css is loaded');
    } else {
        console.error('❌ inline-dropdown.css not found');
        console.log('Loaded stylesheets:', 
            Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .map(link => link.href.split('/').pop())
        );
    }
    
    // Check search summary items
    const summaryItems = document.querySelectorAll('.search-summary-item');
    console.log(`📋 Found ${summaryItems.length} search summary items:`);
    
    summaryItems.forEach((item, index) => {
        const field = item.dataset.field;
        const value = item.querySelector('.search-summary-value')?.textContent;
        console.log(`  ${index + 1}. Field: ${field}, Value: ${value}`);
        
        // Check if it has click handlers
        const hasClickHandler = item.onclick !== null || 
                               item.hasEventListeners?.('click') ||
                               item._events?.click;
        console.log(`     Click handler: ${hasClickHandler ? '✅' : '❓'}`);
    });
    
    // Test a click on the first item
    if (summaryItems.length > 0) {
        console.log('🧪 Testing click on first search summary item...');
        
        const firstItem = summaryItems[0];
        const field = firstItem.dataset.field;
        
        // Simulate click
        firstItem.click();
        
        console.log(`📝 Clicked on ${field} field`);
        
        // Check if dropdown appeared
        setTimeout(() => {
            const dropdown = document.querySelector('.inline-dropdown-container');
            if (dropdown) {
                console.log('🎉 SUCCESS! Inline dropdown appeared:', dropdown);
                console.log('Dropdown field:', dropdown.dataset.field);
                
                // Close the dropdown after a moment
                setTimeout(() => {
                    if (inlineManager.closeCurrentDropdown) {
                        inlineManager.closeCurrentDropdown();
                        console.log('🚪 Closed test dropdown');
                    }
                }, 2000);
            } else {
                console.error('❌ FAILURE: No inline dropdown appeared');
                console.log('Expected to find: .inline-dropdown-container');
                
                // Check if fullscreen opened instead
                const fullscreen = document.querySelector('.ai-fullscreen');
                if (fullscreen) {
                    console.log('⚠️ Fullscreen AI search opened instead - integration may not be complete');
                }
            }
        }, 500);
    }
    
    console.log('🔍 Debug complete - check results above');
}

// Auto-run after a delay to ensure everything is loaded
setTimeout(() => {
    console.log('🚀 Auto-running inline dropdown debug...');
    debugInlineDropdowns();
}, 3000);

// Export for manual use
window.debugInlineDropdowns = debugInlineDropdowns;

console.log('🔧 Inline dropdown debug helper loaded');
console.log('💡 Run debugInlineDropdowns() manually if needed');
