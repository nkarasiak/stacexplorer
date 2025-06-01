#!/bin/bash
cd /home/nkk/git/stacexplorer
echo "🔍 Checking app.js and main initialization..."
echo "=" * 50

echo -e "\n📄 Looking for MapManager usage in app.js:"
grep -n -A 3 -B 3 "MapManager\|mapManager" js/app.js || echo "No MapManager references found"

echo -e "\n📄 Looking for map container in HTML:"
grep -n -A 2 -B 2 'id.*map\|class.*map' index.html || echo "No map container found"

echo -e "\n📄 Looking for DOMContentLoaded or initialization:"
grep -n -A 3 -B 3 "DOMContentLoaded\|window.onload\|addEventListener" js/app.js || echo "No DOM ready handlers found"
