#!/bin/bash

# Helper script to generate test documents in the correct location
# Usage: ./generate-test-document.sh <document-type> <input-yaml>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <document-type> <input-yaml>"
    echo "Example: $0 patent-assignment-agreement test-input.yaml"
    exit 1
fi

DOCUMENT_TYPE=$1
INPUT_YAML=$2
TEST_NAME="manual-test-$(date +%Y%m%d-%H%M%S)"

# Set test environment variables
export TEST_MODE=true
export TEST_NAME=$TEST_NAME

echo "Generating test document..."
echo "Type: $DOCUMENT_TYPE"
echo "Input: $INPUT_YAML"
echo "Output will be saved to: docs/testing/test-results/$TEST_NAME/"

# Run from Docker container
docker exec -e TEST_MODE=true -e TEST_NAME=$TEST_NAME casethread-dev npm run cli -- generate "$DOCUMENT_TYPE" "$INPUT_YAML"

echo "Test document generated. Check docs/testing/test-results/$TEST_NAME/" 