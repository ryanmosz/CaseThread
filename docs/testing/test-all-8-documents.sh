#!/bin/bash

# Test all 8 document types
echo "Testing all 8 document types..."

# Create test-results directory
mkdir -p docs/testing/test-results

# Array of document types
declare -a documents=(
    "cease-and-desist-letter-example.md"
    "nda-ip-specific-example.md"
    "office-action-response-example.md"
    "patent-assignment-agreement-example.md"
    "patent-license-agreement-example.md"
    "provisional-patent-application-example.md"
    "technology-transfer-agreement-example.md"
    "trademark-application-example.md"
)

# Export each document
for doc in "${documents[@]}"
do
    # Extract base name without extension
    base_name="${doc%-example.md}"
    
    echo "Exporting $doc to $base_name.pdf..."
    
    # Run the export command
    docker exec casethread-dev npm run cli -- export "templates/examples/$doc" "$base_name.pdf"
    
    # Copy to test-results
    docker cp "casethread-dev:/app/$base_name.pdf" "docs/testing/test-results/$base_name.pdf"
    
    echo "✅ Completed $base_name"
    echo ""
done

echo "🎉 All 8 documents exported successfully!"

# List the results
echo ""
echo "Generated PDFs:"
ls -la docs/testing/test-results/*.pdf 