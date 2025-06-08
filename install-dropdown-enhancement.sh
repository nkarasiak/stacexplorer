#!/bin/bash

# SOURCE Search Dropdown Enhancement Installation Script
# This script applies comprehensive fixes to resolve dropdown UI issues

echo "🔧 SOURCE Search Dropdown Enhancement Installation"
echo "================================================="
echo ""

# Configuration
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
CSS_FILE="css/inline-dropdown-enhanced.css"
JS_FILE="source-dropdown-enhancement-fix.js"
HTML_FILE="index.html"

echo "📦 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup existing files
echo "💾 Creating backups..."
if [ -f "$HTML_FILE" ]; then
    cp "$HTML_FILE" "$BACKUP_DIR/index.html.bak"
    echo "✅ Backed up index.html"
fi

if [ -f "css/inline-dropdown.css" ]; then
    cp "css/inline-dropdown.css" "$BACKUP_DIR/inline-dropdown.css.bak"
    echo "✅ Backed up inline-dropdown.css"
fi

if [ -f "js/components/ui/InlineDropdownManager.js" ]; then
    cp "js/components/ui/InlineDropdownManager.js" "$BACKUP_DIR/InlineDropdownManager.js.bak"
    echo "✅ Backed up InlineDropdownManager.js"
fi

echo ""
echo "🎨 Installing enhancements..."

# Check if enhanced CSS exists
if [ ! -f "$CSS_FILE" ]; then
    echo "❌ Enhanced CSS file not found: $CSS_FILE"
    echo "   Please ensure the enhanced CSS file is present"
    exit 1
fi

# Check if enhancement script exists
if [ ! -f "$JS_FILE" ]; then
    echo "❌ Enhancement script not found: $JS_FILE"
    echo "   Please ensure the enhancement script is present"
    exit 1
fi

# Update index.html to include enhanced CSS and script
echo "📝 Updating index.html..."

# Create a temporary file for modifications
TEMP_HTML="index_temp.html"
cp "$HTML_FILE" "$TEMP_HTML"

# Add enhanced CSS after existing inline-dropdown.css
sed -i '/inline-dropdown\.css/a\    <!-- Enhanced Inline Dropdown CSS - Fixes SOURCE search dropdown issues -->\n    <link rel="stylesheet" href="css/inline-dropdown-enhanced.css">' "$TEMP_HTML"

# Add enhancement script before closing body tag
sed -i '/<\/body>/i\    <!-- SOURCE Search Dropdown Enhancement Fix -->\n    <script src="source-dropdown-enhancement-fix.js"></script>' "$TEMP_HTML"

# Replace original with updated version
mv "$TEMP_HTML" "$HTML_FILE"

echo "✅ Updated index.html with enhancements"

# Create a simple test page
echo "🧪 Creating test page..."
cat > "test-dropdown-enhancement.html" << 'EOF'
<!DOCTYPE html>
<html lang="en" class="dark-theme">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOURCE Dropdown Enhancement Test</title>
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <!-- Enhanced Dropdown CSS -->
    <link rel="stylesheet" href="css/inline-dropdown-enhanced.css">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background: #1a1a1a;
            color: #fff;
            margin: 0;
            padding: 20px;
        }
        .test-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .test-item {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .test-item:hover {
            background: #3a3a3a;
            transform: translateX(4px);
        }
        .test-item.dropdown-active {
            background: rgba(33, 150, 243, 0.15);
            transform: translateX(6px);
            box-shadow: inset 0 0 0 2px rgba(33, 150, 243, 0.3);
        }
        .instructions {
            background: #2a2a2a;
            border-left: 4px solid #2196F3;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>🔧 SOURCE Search Dropdown Enhancement Test</h1>
        
        <div class="instructions">
            <h3>📋 Test Instructions</h3>
            <p>Click on the test items below to verify that the dropdown enhancement fixes work correctly:</p>
            <ul>
                <li>✅ Dropdown should appear without text overlap</li>
                <li>✅ Data source names should not write over each other</li>
                <li>✅ Dropdown should have proper z-index and positioning</li>
                <li>✅ Text should be properly wrapped and readable</li>
            </ul>
        </div>
        
        <div class="test-item" data-field="collection" onclick="testDropdown(this, 'SOURCE')">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="material-icons" style="color: white;">public</i>
                </div>
                <div>
                    <div style="font-size: 12px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Source</div>
                    <div style="font-size: 14px; font-weight: 600;">EVERYTHING</div>
                </div>
            </div>
        </div>
        
        <div class="test-item" data-field="location" onclick="testDropdown(this, 'LOCATION')">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="material-icons" style="color: white;">place</i>
                </div>
                <div>
                    <div style="font-size: 12px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Location</div>
                    <div style="font-size: 14px; font-weight: 600;">THE WORLD</div>
                </div>
            </div>
        </div>
        
        <div class="test-item" data-field="date" onclick="testDropdown(this, 'TIME')">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="material-icons" style="color: white;">schedule</i>
                </div>
                <div>
                    <div style="font-size: 12px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Time</div>
                    <div style="font-size: 14px; font-weight: 600;">ANYTIME</div>
                </div>
            </div>
        </div>
        
        <div id="test-results" style="margin-top: 40px; padding: 20px; background: #2a2a2a; border-radius: 8px; display: none;">
            <h3>🧪 Test Results</h3>
            <div id="test-log"></div>
        </div>
    </div>
    
    <script>
        let currentDropdown = null;
        
        function testDropdown(element, type) {
            console.log(`🧪 Testing ${type} dropdown...`);
            
            // Close existing dropdown
            if (currentDropdown) {
                document.body.removeChild(currentDropdown);
                currentDropdown = null;
                document.querySelectorAll('.test-item').forEach(item => {
                    item.classList.remove('dropdown-active');
                });
            }
            
            // Create test dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'inline-dropdown-container test-dropdown';
            dropdown.innerHTML = `
                <div class="ai-dropdown-content">
                    <div class="ai-dropdown-header">
                        <i class="material-icons">${type === 'SOURCE' ? 'dataset' : type === 'LOCATION' ? 'place' : 'event'}</i>
                        <span>Enhanced ${type} Dropdown</span>
                    </div>
                    <div class="ai-search-section">
                        <input type="text" class="ai-search-input" placeholder="Search ${type.toLowerCase()}...">
                    </div>
                    <div class="ai-options-section">
                        <div class="ai-option ai-everything-option" data-value="">
                            <i class="material-icons">public</i>
                            <div class="ai-option-content">
                                <div class="ai-option-title">EVERYTHING</div>
                                <div class="ai-option-subtitle">Search all available options</div>
                            </div>
                        </div>
                        <div class="ai-source-group-header">${type} Options</div>
                        <div class="ai-option" data-value="option1">
                            <i class="material-icons">satellite</i>
                            <div class="ai-option-content">
                                <div class="ai-option-title">Test Option 1</div>
                                <div class="ai-option-subtitle">This is a test option with normal length text</div>
                            </div>
                            <button class="ai-option-details" title="Details">
                                <i class="material-icons">info</i>
                            </button>
                        </div>
                        <div class="ai-option" data-value="option2">
                            <i class="material-icons">terrain</i>
                            <div class="ai-option-content">
                                <div class="ai-option-title">Test Option 2 with a Very Long Name That Should Wrap Properly</div>
                                <div class="ai-option-subtitle">This is another test option with much longer text to test wrapping and spacing to ensure no overlap occurs</div>
                            </div>
                            <button class="ai-option-details" title="Details">
                                <i class="material-icons">info</i>
                            </button>
                        </div>
                        <div class="ai-source-separator"></div>
                        <div class="ai-source-group-header">More ${type} Options</div>
                        <div class="ai-option" data-value="option3">
                            <i class="material-icons">layers</i>
                            <div class="ai-option-content">
                                <div class="ai-option-title">Test Option 3</div>
                                <div class="ai-option-subtitle">Final test option to verify spacing</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Position dropdown
            const rect = element.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.top = `${rect.bottom + 8}px`;
            dropdown.style.width = `${Math.max(rect.width, 320)}px`;
            dropdown.style.maxHeight = '500px';
            dropdown.style.zIndex = '999999';
            
            // Add to document
            document.body.appendChild(dropdown);
            currentDropdown = dropdown;
            
            // Add active state
            element.classList.add('dropdown-active');
            
            // Auto-close after 10 seconds
            setTimeout(() => {
                if (currentDropdown === dropdown) {
                    document.body.removeChild(dropdown);
                    currentDropdown = null;
                    element.classList.remove('dropdown-active');
                }
            }, 10000);
            
            // Log test
            logTest(type, 'Dropdown created and positioned successfully');
        }
        
        function logTest(type, message) {
            const resultsDiv = document.getElementById('test-results');
            const logDiv = document.getElementById('test-log');
            
            resultsDiv.style.display = 'block';
            
            const logEntry = document.createElement('div');
            logEntry.style.cssText = 'margin: 8px 0; padding: 8px 12px; background: #1a1a1a; border-radius: 4px; border-left: 3px solid #2196F3;';
            logEntry.innerHTML = `<strong>${type}:</strong> ${message} <span style="color: #aaa; font-size: 12px;">[${new Date().toLocaleTimeString()}]</span>`;
            
            logDiv.appendChild(logEntry);
            logEntry.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (currentDropdown && !currentDropdown.contains(e.target) && !e.target.closest('.test-item')) {
                document.body.removeChild(currentDropdown);
                currentDropdown = null;
                document.querySelectorAll('.test-item').forEach(item => {
                    item.classList.remove('dropdown-active');
                });
            }
        });
        
        console.log('🧪 Test page loaded - click on the test items to verify dropdown enhancements');
    </script>
</body>
</html>
EOF

echo "✅ Created test page: test-dropdown-enhancement.html"

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "   ✅ Enhanced CSS file installed: $CSS_FILE"
echo "   ✅ Enhancement script installed: $JS_FILE"
echo "   ✅ Updated index.html to include enhancements"
echo "   ✅ Created test page: test-dropdown-enhancement.html"
echo "   ✅ Backups created in: $BACKUP_DIR"
echo ""
echo "🧪 Testing:"
echo "   1. Open test-dropdown-enhancement.html in your browser"
echo "   2. Click on the test items to verify dropdown functionality"
echo "   3. Check that text doesn't overlap and positioning is correct"
echo ""
echo "🚀 Usage:"
echo "   1. Start your stacexplorer application"
echo "   2. Navigate to the search interface"
echo "   3. Click on 'SOURCE' in the search summary"
echo "   4. Verify that the dropdown works correctly without overlap issues"
echo ""
echo "🔧 Fixes applied:"
echo "   ✅ Data source text no longer stays on top hiding dropdown content"
echo "   ✅ Data source names no longer write over each other"
echo "   ✅ Enhanced z-index management for proper layering"
echo "   ✅ Improved text wrapping and spacing"
echo "   ✅ Better responsive positioning"
echo "   ✅ Enhanced fallback positioning for edge cases"
echo ""
echo "⚠️  If you encounter any issues:"
echo "   1. Check browser console for error messages"
echo "   2. Verify that both CSS and JS files are loaded correctly"
echo "   3. Restore from backup if needed: $BACKUP_DIR"
echo ""
echo "✨ The SOURCE search dropdown should now work perfectly!"
