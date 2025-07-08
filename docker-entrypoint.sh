#!/bin/bash
set -e

# Welcome message
echo "🚀 CaseThread Development Container Starting..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Create necessary directories if they don't exist
mkdir -p dist logs

# Ensure proper permissions for the nodejs user
# Note: The container runs as nodejs user (uid 1001)
echo "✅ Container ready for development!"

# Execute the command passed to docker run
exec "$@" 