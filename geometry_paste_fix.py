#!/usr/bin/env python3
"""
Fix for geometry paste functionality in stacexplorer
Adds proper map display and zoom functionality when WKT/GeoJSON is pasted
"""

import re

def fix_geometry_paste():
    """
    Fix the geometry paste functionality in AISmartSearchEnhanced.js
    """
    file_path = "/home/nkk/git/stacexplorer/js/components/search/AISmartSearchEnhanced.js"
    
    # Read the current file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the handlePastedGeometry method and replace it with the fixed version
    old_method_pattern = r'(\s*\/\*\*[\s\S]*?\*\/\s*)?handlePastedGeometry\(geometryResult, originalText\)\s*\{[\s\S]*?\n\s*\}'
    
    new_method = '''    /**
     * Handle successfully pasted geometry
     * @param {Object} geometryResult - Parsed geometry result
     * @param {string} originalText - Original pasted text
     */
    handlePastedGeometry(geometryResult, originalText) {
        // Store the geometry
        this.selectedLocation = geometryResult.bbox;
        this.selectedLocationResult = {
            formattedName: 'Custom Geometry',
            shortName: 'Custom Geometry', 
            bbox: geometryResult.bbox,
            category: 'pasted',
            geojson: geometryResult.geojson,
            originalText: originalText,
            type: geometryResult.type
        };
        
        // Update the location field
        const locationField = document.getElementById('ai-field-location');
        if (locationField) {
            locationField.textContent = 'Custom Geometry';
            locationField.classList.remove('empty');
        }
        
        // 🔧 FIX: Display geometry on map and zoom to it
        if (this.mapManager && geometryResult.geojson && geometryResult.bbox) {
            try {
                console.log('🗺️ Displaying pasted geometry on map:', geometryResult.type);
                
                // Display the geometry with beautiful styling
                if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                    this.mapManager.addBeautifulGeometryLayer(
                        geometryResult.geojson, 
                        `pasted-geometry-${Date.now()}`
                    );
                } else if (typeof this.mapManager.addGeoJsonLayer === 'function') {
                    this.mapManager.addGeoJsonLayer(
                        geometryResult.geojson, 
                        `pasted-geometry-${Date.now()}`
                    );
                }
                
                // Zoom to the geometry bounds
                if (typeof this.mapManager.fitToBounds === 'function') {
                    this.mapManager.fitToBounds(geometryResult.bbox);
                } else if (typeof this.mapManager.fitMapToBbox === 'function') {
                    this.mapManager.fitMapToBbox(geometryResult.bbox);
                }
                
                console.log('✅ Geometry successfully displayed and zoomed on map');
                
            } catch (mapError) {
                console.error('❌ Error displaying geometry on map:', mapError);
                // Continue anyway - the geometry is still stored for search
            }
        } else {
            console.warn('⚠️ MapManager not available or geometry data incomplete');
        }
        
        // Show success notification
        this.notificationService.showNotification(
            `✅ ${geometryResult.type} geometry pasted and displayed on map!`, 
            'success'
        );
        
        console.log(`📋 Parsed ${geometryResult.type} geometry:`, geometryResult);
    }'''
    
    # Replace the method
    if re.search(old_method_pattern, content):
        content = re.sub(old_method_pattern, new_method, content)
        print("✅ Found and updated handlePastedGeometry method")
    else:
        print("❌ Could not find handlePastedGeometry method pattern")
        return False
    
    # Also need to update the executeSearch method to ensure geometry is properly applied
    # Look for the section where bbox is handled in executeSearch
    execute_search_pattern = r'(// Apply bbox if provided\s*if \(params\.bbox\) \{[\s\S]*?\})'
    
    new_bbox_handling = '''// Apply bbox if provided
            if (params.bbox) {
                const bboxInput = document.getElementById('bbox-input');
                if (bboxInput) {
                    bboxInput.value = params.bbox.join(',');
                    console.log(`✅ Set bbox to: ${params.bbox.join(',')}`);
                }
                
                // If we have map manager and bbox, update the map
                if (this.mapManager && params.bbox && params.bbox.length === 4) {
                    try {
                        // 🔧 FIX: If we have stored geometry from paste, display it properly
                        if (this.selectedLocationResult && 
                            this.selectedLocationResult.geojson && 
                            this.selectedLocationResult.category === 'pasted') {
                            
                            console.log('🗺️ Re-displaying pasted geometry during search execution');
                            
                            // Display the actual geometry, not just bbox
                            if (typeof this.mapManager.addBeautifulGeometryLayer === 'function') {
                                this.mapManager.addBeautifulGeometryLayer(
                                    this.selectedLocationResult.geojson, 
                                    `search-geometry-${Date.now()}`
                                );
                            }
                            
                            // Zoom to the geometry
                            if (typeof this.mapManager.fitToBounds === 'function') {
                                this.mapManager.fitToBounds(params.bbox);
                            }
                        } else {
                            // Regular bbox handling
                            this.mapManager.setBboxFromCoordinates(params.bbox);
                        }
                        
                        console.log('✅ Updated map with geometry/bbox');
                    } catch (mapError) {
                        console.warn('⚠️ Could not update map with bbox:', mapError);
                    }
                }
            }'''
    
    if re.search(execute_search_pattern, content):
        content = re.sub(execute_search_pattern, new_bbox_handling, content)
        print("✅ Updated bbox handling in executeSearch method")
    else:
        print("⚠️ Could not find bbox handling pattern in executeSearch - this is optional")
    
    # Write the updated content back to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Successfully updated {file_path}")
    return True

if __name__ == "__main__":
    print("🔧 Fixing geometry paste functionality in stacexplorer...")
    if fix_geometry_paste():
        print("🎉 Geometry paste fix applied successfully!")
        print("\n📋 The fix adds:")
        print("  • Proper geometry display on map when WKT/GeoJSON is pasted")
        print("  • Automatic zoom to pasted geometry bounds") 
        print("  • Improved geometry handling during search execution")
        print("  • Better error handling and logging")
    else:
        print("❌ Failed to apply the fix")
