#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Preparing Repository for GitHub"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found"
    echo ""
    echo "Creating public GitHub repository..."
    
    # Create repository (you'll need to authenticate first)
    REPO_NAME="k8s-blueprint-designer"
    
    echo "Repository name: $REPO_NAME"
    echo ""
    echo "To create the repository, run:"
    echo "  gh repo create $REPO_NAME --public --source=. --remote=origin --push"
    echo ""
    echo "Or manually:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Create a new repository named: $REPO_NAME"
    echo "  3. Don't initialize with README (we already have one)"
    echo "  4. Then run:"
    echo "     git remote add origin https://github.com/YOUR_USERNAME/$REPO_NAME.git"
    echo "     git branch -M main"
    echo "     git push -u origin main"
    echo ""
else
    echo "⚠️  GitHub CLI not found"
    echo ""
    echo "To push to GitHub manually:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Create a new repository named: k8s-blueprint-designer"
    echo "  3. Don't initialize with README"
    echo "  4. Run these commands:"
    echo ""
    echo "     git remote add origin https://github.com/YOUR_USERNAME/k8s-blueprint-designer.git"
    echo "     git branch -M main"
    echo "     git push -u origin main"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo "✅ Repository is ready for GitHub!"
echo "═══════════════════════════════════════════════════════════"
