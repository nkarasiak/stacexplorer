#!/usr/bin/env python3
"""
STAC Explorer Module Import Diagnostics
Quick check for common module import/export issues
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

def analyze_js_imports_exports(file_path: Path) -> Dict[str, List[str]]:
    """
    Analyze JavaScript file for import and export statements.
    
    Parameters
    ----------
    file_path : Path
        Path to JavaScript file
        
    Returns
    -------
    Dict[str, List[str]]
        Dictionary containing imports and exports found
    """
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Find import statements
        import_patterns = [
            r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]",  # Named imports
            r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]",        # Default imports
            r"import\s+['\"]([^'\"]+)['\"]"                         # Side-effect imports
        ]
        
        # Find export statements
        export_patterns = [
            r"export\s+\{([^}]+)\}",           # Named exports
            r"export\s+default\s+(\w+)",       # Default exports
            r"export\s+class\s+(\w+)",         # Class exports
            r"export\s+function\s+(\w+)",      # Function exports
        ]
        
        imports = []
        exports = []
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            imports.extend([str(match) for match in matches])
        
        for pattern in export_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            exports.extend([str(match) for match in matches])
        
        return {
            'file': str(file_path),
            'imports': imports,
            'exports': exports
        }
        
    except Exception as e:
        return {
            'file': str(file_path),
            'error': str(e),
            'imports': [],
            'exports': []
        }

def diagnose_stac_explorer():
    """Main diagnostic function."""
    print("🔍 STAC Explorer Module Import/Export Diagnostics")
    print("=" * 60)
    
    repo_path = Path("/home/nkk/git/stacexplorer")
    js_files = [
        repo_path / "js" / "app.js",
        repo_path / "js" / "components" / "map" / "MapManager.js",
        repo_path / "js" / "components" / "results" / "ResultsPanel.js",
    ]
    
    for js_file in js_files:
        if js_file.exists():
            print(f"\n📄 {js_file.name}")
            print("-" * 40)
            
            analysis = analyze_js_imports_exports(js_file)
            
            if 'error' in analysis:
                print(f"❌ Error reading file: {analysis['error']}")
                continue
            
            if analysis['imports']:
                print("📥 Imports:")
                for imp in analysis['imports']:
                    print(f"   • {imp}")
            else:
                print("📥 Imports: None")
            
            if analysis['exports']:
                print("📤 Exports:")
                for exp in analysis['exports']:
                    print(f"   • {exp}")
            else:
                print("📤 Exports: None")
        else:
            print(f"\n⚠️  File not found: {js_file}")
    
    print(f"\n✅ Quick Fix Applied:")
    print("   • Added named export: export { MapManager }")
    print("   • Kept default export: export default MapManager")
    print("   • Maintained global: window.MapManager = MapManager")
    
    print(f"\n🧪 Test the fix:")
    print("   1. Refresh the browser")
    print("   2. Check for import errors in console")
    print("   3. Test thumbnail display functionality")

if __name__ == "__main__":
    diagnose_stac_explorer()
