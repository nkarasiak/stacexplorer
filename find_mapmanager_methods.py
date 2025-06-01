#!/usr/bin/env python3
"""
Find MapManager method usage in STAC Explorer files
"""

import re
from pathlib import Path
from typing import List, Set

def find_mapmanager_methods(file_path: Path) -> Set[str]:
    """Find all mapManager method calls in a JavaScript file."""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Pattern to find mapManager method calls
        pattern = r'(?:this\.)?mapManager\.(\w+)'
        matches = re.findall(pattern, content)
        
        return set(matches)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return set()

def analyze_mapmanager_usage():
    """Analyze MapManager usage across the project."""
    print("🔍 Analyzing MapManager method usage...")
    print("=" * 50)
    
    repo_path = Path("/home/nkk/git/stacexplorer")
    js_files = list(repo_path.rglob("*.js"))
    
    all_methods = set()
    
    for js_file in js_files:
        if js_file.name in ['MapManager.js']:
            continue  # Skip the MapManager itself
            
        methods = find_mapmanager_methods(js_file)
        if methods:
            print(f"\n📄 {js_file.relative_to(repo_path)}")
            for method in sorted(methods):
                print(f"   • {method}()")
            all_methods.update(methods)
    
    print(f"\n📊 All MapManager methods expected:")
    for method in sorted(all_methods):
        print(f"   • {method}()")
    
    return all_methods

if __name__ == "__main__":
    methods = analyze_mapmanager_usage()
    
    # List of methods currently implemented
    current_methods = {
        'initialize', 'addThumbnailToMap', 'addBoundingBoxToMap', 
        'removeThumbnailFromMap', 'clearAllThumbnails', 'getBoundingBoxCoordinates',
        'fitToBounds', 'getMap', 'isMapReady', 'destroy'
    }
    
    missing_methods = methods - current_methods
    
    if missing_methods:
        print(f"\n❌ Missing methods in MapManager:")
        for method in sorted(missing_methods):
            print(f"   • {method}()")
    else:
        print(f"\n✅ All methods are implemented!")
