#!/bin/bash

# Integration script for Multi-Agent System PR
# This script helps integrate the multi-agent changes while maintaining compatibility

set -e

echo "🚀 CaseThread Multi-Agent Integration Script"
echo "==========================================="
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/integrate-multi-agent" ]; then
    echo "⚠️  Creating integration branch..."
    git checkout -b feature/integrate-multi-agent
fi

# Step 1: Fetch and prepare the PR
echo "📥 Fetching PR #1..."
git fetch origin pull/1/head:pr-1

# Step 2: Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Step 3: Merge the PR
echo "🔀 Merging multi-agent system changes..."
git merge pr-1 --no-commit --no-ff

# Step 4: Fix known conflicts
echo "🔧 Fixing known compatibility issues..."

# Fix docker-compose.yml to maintain backward compatibility
echo "  - Restoring container name compatibility..."
git checkout HEAD -- docker-compose.yml
git add docker-compose.yml

# We'll apply our hybrid docker-compose after the merge

echo "✅ Initial merge prepared (not committed)"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git status"
echo "2. The docker-compose.yml has been reverted to maintain compatibility"
echo "3. Run the following commands to complete setup:"
echo ""
echo "   # Rebuild containers with new setup"
echo "   docker-compose down"
echo "   docker-compose build --no-cache"
echo "   docker-compose up -d"
echo ""
echo "   # Install new dependencies"
echo "   docker exec casethread-dev npm install"
echo ""
echo "   # Run tests to check integration"
echo "   docker exec casethread-dev npm test"
echo ""
echo "4. If tests pass, commit the integration:"
echo "   git add -A"
echo "   git commit -m 'feat: integrate multi-agent system architecture'"
echo ""
echo "5. Test the new learn command:"
echo "   docker exec casethread-dev npm run cli -- learn"
echo ""
echo "6. Test document generation with context:"
echo "   docker exec casethread-dev npm run cli -- generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml" 