#!/usr/bin/env python3
"""
STAC Explorer Map Diagnostics
Comprehensive diagnostic tool for map initialization issues
"""

from pathlib import Path
import re
from typing import Dict, List, Optional

class MapDiagnostics:
    """Diagnostic tool for map-related issues in STAC Explorer."""
    
    def __init__(self, repo_path: str = "/home/nkk/git/stacexplorer"):
        self.repo_path = Path(repo_path)
        self.issues = []
        self.suggestions = []
    
    def check_maplibre_references(self) -> Dict[str, bool]:
        """Check for MapLibre GL references in HTML and JS files."""
        results = {
            'maplibre_script_tag': False,
            'maplibre_css_link': False,
            'maplibre_js_reference': False
        }
        
        # Check index.html for MapLibre includes
        index_html = self.repo_path / "index.html"
        if index_html.exists():
            content = index_html.read_text(encoding='utf-8')
            
            if 'maplibre-gl' in content.lower():
                if '<script' in content and 'maplibre-gl' in content:
                    results['maplibre_script_tag'] = True
                if '<link' in content and 'maplibre-gl' in content:
                    results['maplibre_css_link'] = True
        
        # Check JS files for MapLibre usage
        js_files = list(self.repo_path.rglob("*.js"))
        for js_file in js_files:
            try:
                content = js_file.read_text(encoding='utf-8')
                if 'maplibregl' in content or 'maplibre' in content.lower():
                    results['maplibre_js_reference'] = True
                    break
            except:
                continue
        
        return results
    
    def check_map_container(self) -> Dict[str, List[str]]:
        """Check for map container elements in HTML files."""
        containers = []
        html_files = list(self.repo_path.rglob("*.html"))
        
        for html_file in html_files:
            try:
                content = html_file.read_text(encoding='utf-8')
                
                # Look for common map container patterns
                patterns = [
                    r'id=["\']([^"\']*map[^"\']*)["\']',
                    r'class=["\']([^"\']*map[^"\']*)["\']',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    for match in matches:
                        containers.append(f"{html_file.name}: {match}")
            except:
                continue
        
        return {'containers': containers}
    
    def check_css_issues(self) -> Dict[str, List[str]]:
        """Check for common CSS issues that prevent map display."""
        issues = []
        css_files = list(self.repo_path.rglob("*.css"))
        
        for css_file in css_files:
            try:
                content = css_file.read_text(encoding='utf-8')
                
                # Check for map-related styles
                if 'map' in content.lower():
                    # Look for height/width issues
                    if 'height: 0' in content or 'height:0' in content:
                        issues.append(f"{css_file.name}: Found height: 0 which prevents map display")
                    
                    if 'display: none' in content or 'display:none' in content:
                        issues.append(f"{css_file.name}: Found display: none which hides map")
                        
            except:
                continue
        
        return {'css_issues': issues}
    
    def check_initialization_order(self) -> Dict[str, List[str]]:
        """Check for potential initialization order issues."""
        issues = []
        js_files = [
            self.repo_path / "js" / "app.js",
            self.repo_path / "js" / "components" / "map" / "MapManager.js",
        ]
        
        for js_file in js_files:
            if js_file.exists():
                try:
                    content = js_file.read_text(encoding='utf-8')
                    
                    # Check for DOM ready checks
                    if 'DOMContentLoaded' not in content and 'window.onload' not in content:
                        if 'MapManager' in content or 'map' in content.lower():
                            issues.append(f"{js_file.name}: No DOM ready check found - map might initialize before DOM is ready")
                    
                    # Check for container existence checks
                    if 'getElementById' in content or 'querySelector' in content:
                        if 'null' not in content and 'undefined' not in content:
                            issues.append(f"{js_file.name}: No null checks for DOM elements")
                            
                except:
                    continue
        
        return {'initialization_issues': issues}
    
    def generate_fixes(self) -> List[str]:
        """Generate specific fix suggestions based on found issues."""
        fixes = []
        
        # MapLibre GL fixes
        fixes.append("🗺️ Ensure MapLibre GL is properly loaded:")
        fixes.append("   Add to index.html <head>:")
        fixes.append('   <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>')
        fixes.append('   <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />')
        
        # Map container fixes
        fixes.append("\n📦 Ensure map container has proper styling:")
        fixes.append("   #map { width: 100%; height: 400px; }")
        fixes.append("   Make sure container is not display: none or height: 0")
        
        # Initialization fixes
        fixes.append("\n⚡ Fix initialization order:")
        fixes.append("   Initialize MapManager after DOM is ready:")
        fixes.append("   document.addEventListener('DOMContentLoaded', async () => {")
        fixes.append("     const mapContainer = document.getElementById('map');")
        fixes.append("     if (mapContainer) {")
        fixes.append("       await mapManager.initialize('map');")
        fixes.append("     }")
        fixes.append("   });")
        
        # Drawing functionality
        fixes.append("\n🎯 For drawing functionality:")
        fixes.append("   The new MapManager includes:")
        fixes.append("   • startDrawingBbox(callback)")
        fixes.append("   • startDrawingPolygon(callback)")
        fixes.append("   • stopDrawing()")
        fixes.append("   • clearDrawing()")
        
        return fixes
    
    def run_diagnostics(self) -> None:
        """Run all diagnostic checks and generate report."""
        print("🔍 STAC Explorer Map Diagnostics")
        print("=" * 60)
        
        # Check MapLibre references
        print("\n📦 MapLibre GL Check:")
        maplibre_check = self.check_maplibre_references()
        for check, passed in maplibre_check.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check.replace('_', ' ').title()}: {passed}")
        
        # Check map containers
        print("\n📍 Map Container Check:")
        container_check = self.check_map_container()
        if container_check['containers']:
            for container in container_check['containers']:
                print(f"   ✅ Found: {container}")
        else:
            print("   ❌ No map containers found")
        
        # Check CSS issues
        print("\n🎨 CSS Issues Check:")
        css_check = self.check_css_issues()
        if css_check['css_issues']:
            for issue in css_check['css_issues']:
                print(f"   ⚠️  {issue}")
        else:
            print("   ✅ No obvious CSS issues found")
        
        # Check initialization
        print("\n⚡ Initialization Check:")
        init_check = self.check_initialization_order()
        if init_check['initialization_issues']:
            for issue in init_check['initialization_issues']:
                print(f"   ⚠️  {issue}")
        else:
            print("   ✅ No obvious initialization issues found")
        
        # Generate fixes
        print("\n🔧 Suggested Fixes:")
        print("=" * 40)
        fixes = self.generate_fixes()
        for fix in fixes:
            print(fix)
        
        # Test instructions
        print("\n🧪 Testing Instructions:")
        print("=" * 40)
        print("1. Open mapmanager-test.html in browser to test MapManager")
        print("2. Check browser console for detailed error messages")
        print("3. Verify map container exists and has proper dimensions")
        print("4. Test drawing functionality with the new methods")
        
        print(f"\n✅ Diagnostics complete! Check the suggestions above.")

def main():
    """Run diagnostics."""
    diagnostics = MapDiagnostics()
    diagnostics.run_diagnostics()

if __name__ == "__main__":
    main()
