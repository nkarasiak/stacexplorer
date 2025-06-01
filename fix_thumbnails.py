#!/usr/bin/env python3
"""
Fix thumbnail display by copying working implementation from main branch.

This script addresses the thumbnail display issue in the feature/ai branch
by implementing the simple CORS handling approach that works in main branch.
"""

import subprocess
import sys
from pathlib import Path
from typing import Optional

def run_git_command(cmd: list[str], repo_path: str) -> tuple[bool, str]:
    """
    Execute a git command safely and return success status and output.
    
    Parameters
    ----------
    cmd : list[str]
        Git command as list of arguments
    repo_path : str
        Path to the git repository
        
    Returns
    -------
    tuple[bool, str]
        Success status and command output
    """
    try:
        result = subprocess.run(
            cmd, 
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def copy_file_from_main_branch(repo_path: str, file_path: str) -> bool:
    """
    Copy a specific file from main branch to current branch.
    
    Parameters
    ----------
    repo_path : str
        Path to git repository
    file_path : str
        Relative path to file to copy
        
    Returns
    -------
    bool
        True if successful, False otherwise
    """
    cmd = ['git', 'checkout', 'main', '--', file_path]
    success, output = run_git_command(cmd, repo_path)
    
    if success:
        print(f"✅ Successfully copied {file_path} from main branch")
        return True
    else:
        print(f"❌ Failed to copy {file_path}: {output}")
        return False

def check_current_branch(repo_path: str) -> Optional[str]:
    """Get current git branch name."""
    cmd = ['git', 'branch', '--show-current']
    success, output = run_git_command(cmd, repo_path)
    return output.strip() if success else None

def fix_thumbnails():
    """Main function to fix thumbnail display issues."""
    repo_path = "/home/nkk/git/stacexplorer"
    
    print("🔧 STAC Explorer Thumbnail Fix")
    print("=" * 50)
    
    # Check current branch
    current_branch = check_current_branch(repo_path)
    if not current_branch:
        print("❌ Could not determine current branch")
        return False
    
    print(f"📍 Current branch: {current_branch}")
    
    if current_branch != "featute/ai":
        print("⚠️  Warning: Expected to be on featute/ai branch")
    
    # Copy MapManager.js from main branch
    files_to_copy = [
        "js/components/map/MapManager.js",
    ]
    
    success_count = 0
    for file_path in files_to_copy:
        if copy_file_from_main_branch(repo_path, file_path):
            success_count += 1
    
    print(f"\n📊 Results: {success_count}/{len(files_to_copy)} files copied successfully")
    
    if success_count == len(files_to_copy):
        print("\n🎉 Thumbnail fix applied successfully!")
        print("\n📝 Changes made:")
        print("   - Restored simple CORS handling in MapManager.js")
        print("   - Removed complex CORS pre-checking methods")
        print("   - Let MapLibre GL handle external images directly")
        print("   - MapLibre can display CORS images as GPU textures")
        
        print("\n🧪 To test:")
        print("   1. Search for items with thumbnails")
        print("   2. Check that thumbnails display on the map")
        print("   3. Verify items without thumbnails show bounding boxes")
        
        print("\n💾 Don't forget to commit the changes:")
        print("   git add js/components/map/MapManager.js")
        print("   git commit -m 'fix: restore working thumbnail display from main branch'")
        
        return True
    else:
        print("\n❌ Some files failed to copy. Please check manually.")
        return False

if __name__ == "__main__":
    try:
        success = fix_thumbnails()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        sys.exit(1)
