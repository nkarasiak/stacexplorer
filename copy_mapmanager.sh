#!/bin/bash
# Script to copy MapManager.js from main branch to current branch
cd /home/nkk/git/stacexplorer

echo "Current branch:"
git branch --show-current

echo "Checking out MapManager.js from main branch..."
git checkout main -- js/components/map/MapManager.js

echo "File copied successfully"
echo "Status after copy:"
git status
