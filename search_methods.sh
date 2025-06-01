#!/bin/bash
cd /home/nkk/git/stacexplorer
echo "🔍 Searching for mapManager method calls..."
echo "=" * 60

echo -e "\n📄 startDrawingBbox usage:"
grep -n "startDrawingBbox" js/components/search/*.js

echo -e "\n📄 All mapManager method calls:"
grep -n "mapManager\." js/components/search/*.js | head -20

echo -e "\n📄 Drawing-related methods:"
grep -n -i "draw\|bbox" js/components/search/*.js | grep -i mapManager
