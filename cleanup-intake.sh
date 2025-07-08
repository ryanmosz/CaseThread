#!/bin/bash

# Script to clean up IntakeAgent and field-mapper components

echo "Removing IntakeAgent and field-mapper components..."

# Remove files
echo "Removing files..."
rm -f src/agents/IntakeAgent.ts
rm -f src/services/field-mapper.ts
rm -f src/guards/IntakeGuard.ts
rm -f __tests__/guards/IntakeGuard.test.ts

echo "Files removed successfully!"

echo "Cleanup complete! The following components have been removed:"
echo "- IntakeAgent"
echo "- field-mapper service"
echo "- IntakeGuard"
echo ""
echo "The Orchestrator has been updated to handle YAML parsing directly."
echo "Please run tests to ensure everything is working correctly." 