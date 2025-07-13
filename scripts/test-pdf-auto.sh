#!/bin/bash

# Test PDF Auto-Generation Script
# Usage: ./scripts/test-pdf-auto.sh [document-type]
# Example: ./scripts/test-pdf-auto.sh nda-ip-specific

DOCUMENT_TYPE=${1:-"nda-ip-specific"}

echo "Starting CaseThread with auto PDF generation..."
echo "Document Type: $DOCUMENT_TYPE"

# Set environment variable for auto-generation
export CASETHREAD_AUTO_GENERATE=true
export CASETHREAD_DOCUMENT_TYPE="$DOCUMENT_TYPE"

# Start the Electron app
npm run electron:dev 