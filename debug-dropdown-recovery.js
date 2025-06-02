/**
 * Dropdown Recovery Debug Tool
 * Quick utility to recover from stuck dropdown states in the search-summary-interface
 * 
 * Usage in browser console:
 * - dropdownDebug.status() - Check current dropdown state
 * - dropdownDebug.recover() - Force recovery from stuck state
 * - dropdownDebug.test() - Run diagnostic tests
 */

window.dropdownDebug = {
    /**
     * Check current dropdown manager status
     */
    status() {
        console.log('🔍 Dropdown Manager Status:');
        
        const inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;
        
        if (!inlineDropdownManager) {
            console.log('❌ InlineDropdownManager not found in window.stacExplorer');
            return false;
        }
        
        console.log('✅ InlineDropdownManager found');
        console.log('📊 Current State:', {
            isLoading: inlineDropdownManager.isLoading,
            currentDropdown: !!inlineDropdownManager.currentDropdown,
            currentField: inlineDropdownManager.currentField,
            loadingStartTime: inlineDropdownManager.loadingStartTime,
            hasLoadingTimeout: !!inlineDropdownManager.loadingTimeout
        });
        
        // Check for visible dropdowns in DOM
        const visibleDropdowns = document.querySelectorAll('.inline-dropdown-container, .debug-inline-dropdown');
        console.log(`📋 Visible dropdowns in DOM: ${visibleDropdowns.length}`);
        
        // Check for active triggers
        const activeTriggers = document.querySelectorAll('.dropdown-active');
        console.log(`🎯 Active triggers: ${activeTriggers.length}`);
        
        // Check if state is stuck
        const isStuck = inlineDropdownManager.isLoading && 
                       inlineDropdownManager.loadingStartTime && 
                       (Date.now() - inlineDropdownManager.loadingStartTime) > 5000;
        
        if (isStuck) {
            console.warn('⚠️  Dropdown appears to be stuck! Use dropdownDebug.recover() to fix.');
        }
        
        return {
            available: true,
            isLoading: inlineDropdownManager.isLoading,
            hasCurrentDropdown: !!inlineDropdownManager.currentDropdown,
            visibleDropdowns: visibleDropdowns.length,
            activeTriggers: activeTriggers.length,
            isStuck: isStuck
        };
    },
    
    /**
     * Force recovery from stuck dropdown state
     */
    recover() {
        console.log('🔧 Attempting dropdown recovery...');
        
        const inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;
        
        if (!inlineDropdownManager) {
            console.error('❌ InlineDropdownManager not available for recovery');
            return false;
        }
        
        try {
            // Use the new forceReset method
            if (typeof inlineDropdownManager.forceReset === 'function') {
                inlineDropdownManager.forceReset();
                console.log('✅ Used InlineDropdownManager.forceReset()');
            } else {
                // Fallback manual recovery
                console.log('🔄 Using manual recovery fallback...');
                
                // Clear timeouts
                if (inlineDropdownManager.loadingTimeout) {
                    clearTimeout(inlineDropdownManager.loadingTimeout);
                    inlineDropdownManager.loadingTimeout = null;
                }
                
                // Remove all dropdown elements
                const allDropdowns = document.querySelectorAll('.inline-dropdown-container, .debug-inline-dropdown');
                allDropdowns.forEach(dropdown => {
                    if (dropdown.parentNode) {
                        dropdown.parentNode.removeChild(dropdown);
                    }
                });
                
                // Clear active states
                const activeItems = document.querySelectorAll('.dropdown-active');
                activeItems.forEach(item => {
                    item.classList.remove('dropdown-active');
                    item.style.cssText = '';
                });
                
                // Reset internal state
                inlineDropdownManager.currentDropdown = null;
                inlineDropdownManager.currentField = null;
                inlineDropdownManager.isLoading = false;
                inlineDropdownManager.loadingStartTime = null;
            }
            
            console.log('✅ Recovery completed successfully');
            
            // Verify recovery
            setTimeout(() => {
                const status = this.status();
                if (!status.isLoading && status.visibleDropdowns === 0 && status.activeTriggers === 0) {
                    console.log('🎉 Recovery verification: All clear!');
                } else {
                    console.warn('⚠️  Recovery may not be complete, some issues remain');
                }
            }, 100);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error during recovery:', error);
            return false;
        }
    },
    
    /**
     * Run diagnostic tests
     */
    test() {
        console.log('🧪 Running dropdown diagnostic tests...');
        
        const results = [];
        
        // Test 1: Manager availability
        const inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;
        results.push({
            test: 'Manager Availability',
            passed: !!inlineDropdownManager,
            details: inlineDropdownManager ? 'Found' : 'Not found in window.stacExplorer'
        });
        
        if (!inlineDropdownManager) {
            console.log('❌ Cannot run further tests without InlineDropdownManager');
            return results;
        }
        
        // Test 2: Methods availability
        const requiredMethods = ['showInlineDropdown', 'closeCurrentDropdown', 'forceReset'];
        const methodsAvailable = requiredMethods.every(method => 
            typeof inlineDropdownManager[method] === 'function'
        );
        results.push({
            test: 'Required Methods',
            passed: methodsAvailable,
            details: requiredMethods.map(m => 
                `${m}: ${typeof inlineDropdownManager[m] === 'function' ? '✅' : '❌'}`
            ).join(', ')
        });
        
        // Test 3: State consistency
        const hasStuckState = inlineDropdownManager.isLoading && 
                             (!inlineDropdownManager.loadingStartTime || 
                              (Date.now() - inlineDropdownManager.loadingStartTime) > 10000);
        results.push({
            test: 'State Consistency',
            passed: !hasStuckState,
            details: hasStuckState ? 'Loading state appears stuck' : 'State looks normal'
        });
        
        // Test 4: DOM cleanliness  
        const orphanedDropdowns = document.querySelectorAll('.inline-dropdown-container, .debug-inline-dropdown');
        const orphanedTriggers = document.querySelectorAll('.dropdown-active');
        results.push({
            test: 'DOM Cleanliness',
            passed: orphanedDropdowns.length === 0 && orphanedTriggers.length === 0,
            details: `Dropdowns: ${orphanedDropdowns.length}, Active triggers: ${orphanedTriggers.length}`
        });
        
        // Test 5: Event listeners
        const hasGlobalHandlers = !!(inlineDropdownManager.globalClickHandler || 
                                   inlineDropdownManager.globalEscapeHandler);
        results.push({
            test: 'Event Listeners',
            passed: hasGlobalHandlers,
            details: hasGlobalHandlers ? 'Global handlers found' : 'No global handlers detected'
        });
        
        console.log('📊 Test Results:');
        results.forEach(result => {
            const icon = result.passed ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.details}`);
        });
        
        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;
        
        console.log(`🏁 Overall: ${passedCount}/${totalCount} tests passed`);
        
        if (passedCount < totalCount) {
            console.log('💡 Tip: Run dropdownDebug.recover() to fix issues');
        }
        
        return results;
    },
    
    /**
     * Monitor dropdown activity (useful for debugging)
     */
    monitor(duration = 30000) {
        console.log(`👀 Monitoring dropdown activity for ${duration/1000} seconds...`);
        
        const inlineDropdownManager = window.stacExplorer?.inlineDropdownManager;
        if (!inlineDropdownManager) {
            console.error('❌ Cannot monitor: InlineDropdownManager not available');
            return;
        }
        
        let eventCount = 0;
        const startTime = Date.now();
        
        // Monitor click events on search summary items
        const searchItems = document.querySelectorAll('.search-summary-item');
        const clickHandler = (e) => {
            eventCount++;
            const field = e.target.closest('.search-summary-item')?.dataset?.field || 'unknown';
            console.log(`🖱️  [${eventCount}] Search item clicked: ${field}`);
        };
        
        searchItems.forEach(item => {
            item.addEventListener('click', clickHandler);
        });
        
        // Monitor dropdown state changes
        let lastState = {
            isLoading: inlineDropdownManager.isLoading,
            hasDropdown: !!inlineDropdownManager.currentDropdown,
            field: inlineDropdownManager.currentField
        };
        
        const stateMonitor = setInterval(() => {
            const currentState = {
                isLoading: inlineDropdownManager.isLoading,
                hasDropdown: !!inlineDropdownManager.currentDropdown,
                field: inlineDropdownManager.currentField
            };
            
            if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
                console.log('🔄 State change:', currentState);
                lastState = currentState;
            }
        }, 500);
        
        // Stop monitoring after duration
        setTimeout(() => {
            clearInterval(stateMonitor);
            searchItems.forEach(item => {
                item.removeEventListener('click', clickHandler);
            });
            
            const duration_s = (Date.now() - startTime) / 1000;
            console.log(`🏁 Monitoring stopped after ${duration_s.toFixed(1)}s. Events captured: ${eventCount}`);
        }, duration);
        
        return {
            stop: () => {
                clearInterval(stateMonitor);
                searchItems.forEach(item => {
                    item.removeEventListener('click', clickHandler);
                });
                console.log('⏹️  Monitoring stopped manually');
            }
        };
    }
};

console.log('🔧 Dropdown Debug Tool loaded!');
console.log('Available commands:');
console.log('  dropdownDebug.status() - Check current state');
console.log('  dropdownDebug.recover() - Force recovery');
console.log('  dropdownDebug.test() - Run diagnostics');
console.log('  dropdownDebug.monitor() - Monitor activity');
