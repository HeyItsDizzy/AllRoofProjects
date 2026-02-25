#!/bin/bash

# Test script to verify automation is working
echo "Testing automation..."

# Check if git is available
which git

# Check current directory
pwd

# List current directory
ls -la

# Test GitHub repository access
echo "Testing GitHub access..."
git ls-remote https://github.com/HeyItsDizzy/AllRoofProjects.git

echo "Test complete!"