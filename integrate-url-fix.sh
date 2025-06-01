#!/bin/bash

# URL Synchronization Fix Integration Script
# Integrates the URL sync fix into the STAC Explorer application

echo "🔧 STAC Explorer URL Synchronization Fix"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the stacexplorer root directory"
    exit 1
fi

echo "📂 Current directory: $(pwd)"

# Backup index.html
echo "📋 Creating backup of index.html..."
cp index.html index.html.backup
echo "✅ Backup created: index.html.backup"

# Check if the fix is already integrated
if grep -q "url-sync-fix.js" index.html; then
    echo "⚠️  URL sync fix is already integrated in index.html"
    echo "🔄 Updating the fix script only..."
else
    echo "🔗 Adding URL sync fix to index.html..."
    
    # Find the line with the last script tag and add our fix after it
    # Look for the enhanced-app-init.js script specifically
    if grep -q "enhanced-app-init.js" index.html; then
        # Add after enhanced-app-init.js
        sed -i '/enhanced-app-init.js/a\    <script src="url-sync-fix.js"></script>' index.html
        echo "✅ URL sync fix added after enhanced-app-init.js"
    else
        # Add before closing body tag as fallback
        sed -i 's|</body>|    <script src="url-sync-fix.js"></script>\n</body>|' index.html
        echo "✅ URL sync fix added before closing body tag"
    fi
fi

# Create a test HTML file for debugging
cat > test-url-sync.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Sync Test - STAC Explorer</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .test-section h3 { margin-top: 0; color: #2196F3; }
        button { padding: 8px 16px; margin: 5px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1976D2; }
        .result { margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; white-space: pre-wrap; }
        .success { background: #e8f5e8; color: #2e7d32; }
        .error { background: #ffebee; color: #c62828; }
        .info { background: #e3f2fd; color: #1565c0; }
    </style>
</head>
<body>
    <h1>🔧 STAC Explorer URL Synchronization Test</h1>
    
    <div class="test-section">
        <h3>🔍 URL State Verification</h3>
        <p>Check if the URL state management is working correctly:</p>
        <button onclick="runVerification()">Verify URL Sync</button>
        <div id="verification-result" class="result"></div>
    </div>

    <div class="test-section">
        <h3>🧪 URL Sync Test</h3>
        <p>Test URL synchronization with simulated location change:</p>
        <button onclick="runTest()">Run Test</button>
        <div id="test-result" class="result"></div>
    </div>

    <div class="test-section">
        <h3>🔄 Manual Sync</h3>
        <p>Force a manual URL synchronization:</p>
        <button onclick="runManualSync()">Manual Sync</button>
        <div id="sync-result" class="result"></div>
    </div>

    <div class="test-section">
        <h3>🎯 Current URL State</h3>
        <p>View the current URL parameters:</p>
        <button onclick="showCurrentURL()">Show URL State</button>
        <div id="url-state" class="result"></div>
    </div>

    <div class="test-section">
        <h3>📝 Console Logs</h3>
        <p>Monitor console output (open browser developer tools to see detailed logs)</p>
        <button onclick="window.location.href='index.html'">Go to Main App</button>
    </div>

    <script>
        // Wait for the main app to be available
        function waitForApp(callback) {
            if (window.stacExplorer && window.verifyURLSync) {
                callback();
            } else {
                setTimeout(() => waitForApp(callback), 500);
            }
        }

        function runVerification() {
            const resultDiv = document.getElementById('verification-result');
            resultDiv.textContent = 'Running verification...';
            resultDiv.className = 'result info';

            try {
                if (typeof window.verifyURLSync === 'function') {
                    const verification = window.verifyURLSync();
                    resultDiv.textContent = JSON.stringify(verification, null, 2);
                    resultDiv.className = verification.synchronized ? 'result success' : 'result error';
                } else {
                    resultDiv.textContent = 'Error: verifyURLSync function not available.\nMake sure the main app is loaded and the URL sync fix is applied.';
                    resultDiv.className = 'result error';
                }
            } catch (error) {
                resultDiv.textContent = `Error: ${error.message}`;
                resultDiv.className = 'result error';
            }
        }

        function runTest() {
            const resultDiv = document.getElementById('test-result');
            resultDiv.textContent = 'Running test...';
            resultDiv.className = 'result info';

            try {
                if (typeof window.testURLSync === 'function') {
                    window.testURLSync();
                    resultDiv.textContent = 'Test started!\nCheck the URL bar and console logs for results.\nThis may take a few seconds...';
                    resultDiv.className = 'result info';

                    // Show results after delay
                    setTimeout(() => {
                        try {
                            const verification = window.verifyURLSync();
                            resultDiv.textContent = `Test completed!\n\n${JSON.stringify(verification, null, 2)}`;
                            resultDiv.className = verification.synchronized ? 'result success' : 'result error';
                        } catch (e) {
                            resultDiv.textContent = `Test completed, but verification failed: ${e.message}`;
                            resultDiv.className = 'result error';
                        }
                    }, 2000);
                } else {
                    resultDiv.textContent = 'Error: testURLSync function not available.\nMake sure the main app is loaded and the URL sync fix is applied.';
                    resultDiv.className = 'result error';
                }
            } catch (error) {
                resultDiv.textContent = `Error: ${error.message}`;
                resultDiv.className = 'result error';
            }
        }

        function runManualSync() {
            const resultDiv = document.getElementById('sync-result');
            resultDiv.textContent = 'Running manual sync...';
            resultDiv.className = 'result info';

            try {
                if (typeof window.syncURLState === 'function') {
                    const success = window.syncURLState();
                    resultDiv.textContent = success ? 'Manual sync completed successfully!' : 'Manual sync failed!';
                    resultDiv.className = success ? 'result success' : 'result error';
                } else {
                    resultDiv.textContent = 'Error: syncURLState function not available.\nMake sure the main app is loaded and the URL sync fix is applied.';
                    resultDiv.className = 'result error';
                }
            } catch (error) {
                resultDiv.textContent = `Error: ${error.message}`;
                resultDiv.className = 'result error';
            }
        }

        function showCurrentURL() {
            const resultDiv = document.getElementById('url-state');
            
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlState = {
                    currentURL: window.location.href,
                    parameters: Object.fromEntries(urlParams.entries()),
                    parameterCount: urlParams.size
                };

                resultDiv.textContent = JSON.stringify(urlState, null, 2);
                resultDiv.className = 'result info';
            } catch (error) {
                resultDiv.textContent = `Error: ${error.message}`;
                resultDiv.className = 'result error';
            }
        }

        // Log initialization
        console.log('🧪 URL Sync Test page loaded');
        console.log('📝 Open the main app (index.html) first, then return to this test page');
    </script>

    <!-- Include the URL sync fix -->
    <script src="url-sync-fix.js"></script>
</body>
</html>
EOF

echo "✅ Test file created: test-url-sync.html"

# Check if package.json exists for npm scripts
if [ -f "package.json" ]; then
    echo "📦 Adding npm script for URL sync test..."
    
    # Check if the script already exists
    if grep -q "url-sync-test" package.json; then
        echo "⚠️  URL sync test script already exists in package.json"
    else
        # Add the script (this is a simple approach, might need manual adjustment)
        echo "ℹ️  You can manually add this script to package.json:"
        echo '    "url-sync-test": "open test-url-sync.html"'
    fi
fi

echo ""
echo "🎉 URL Synchronization Fix Integration Complete!"
echo ""
echo "📋 What was done:"
echo "   ✅ Created url-sync-fix.js with comprehensive fixes"
echo "   ✅ Integrated the fix into index.html"
echo "   ✅ Created test-url-sync.html for debugging"
echo "   ✅ Backed up original index.html"
echo ""
echo "🔧 Available debugging functions (in browser console):"
echo "   • syncURLState() - Force manual URL synchronization"
echo "   • verifyURLSync() - Check URL synchronization status"  
echo "   • testURLSync() - Run automated test"
echo ""
echo "🧪 Testing:"
echo "   1. Open the app: open index.html"
echo "   2. Use left menu to change location"
echo "   3. Check if URL updates in address bar"
echo "   4. For detailed testing: open test-url-sync.html"
echo ""
echo "📝 Monitoring:"
echo "   • Open browser developer tools (F12)"
echo "   • Watch console for [URL-FIX] messages"
echo "   • All events and errors are logged with prefixes"
echo ""

if [ -f "index.html.backup" ]; then
    echo "🔄 To rollback: mv index.html.backup index.html"
fi

echo ""
echo "✨ The fix is ready! Please test the URL synchronization now."
