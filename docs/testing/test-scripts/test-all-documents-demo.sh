#!/bin/bash

# CaseThread CLI Demo Test Script - Shows real-time output for all 8 document types
# Demo-friendly version with live output display

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test output directory
OUTPUT_DIR="docs/testing/test-results/demo-$(date +%Y%m%d-%H%M%S)"
FAILED_TESTS=0
PASSED_TESTS=0
TOTAL_TIME=0

# Clear screen for demo
clear

# Fancy header
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}          ${BOLD}CaseThread CLI - Legal Document Generation Demo${NC}          ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                    ${YELLOW}Multi-Agent System with ChromaDB${NC}                ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check ChromaDB health with visual feedback
echo -e "${BLUE}🔍 Checking system health...${NC}"
echo -n "  ChromaDB Vector Database: "
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Online${NC}"
else
    echo -e "${YELLOW}⚠ Offline (will use fallback generation)${NC}"
fi

echo -n "  Docker Container: "
if docker ps | grep -q casethread-dev; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not Running${NC}"
    exit 1
fi
echo ""

# Create output directory
echo -e "${BLUE}📁 Creating output directory:${NC} $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
sleep 1
echo ""

# Function to run a test with live output
run_test_demo() {
    local doc_type=$1
    local input_file=$2
    local test_name=$3
    local test_num=$4
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Test $test_num/8: $test_name${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "📄 Document Type: ${YELLOW}$doc_type${NC}"
    echo -e "📂 Input File: ${YELLOW}$input_file${NC}"
    echo ""
    
    # Show a preview of the YAML input
    echo -e "${BLUE}Input Preview:${NC}"
    head -n 5 "$input_file" | sed 's/^/  /'
    echo "  ..."
    echo ""
    
    echo -e "${MAGENTA}🚀 Generating document...${NC}"
    echo ""
    
    # Track timing
    local start_time=$(date +%s)
    
    # Run command with real-time output using tee
    if docker exec -t casethread-dev npm run cli -- generate "$doc_type" "$input_file" --output "$OUTPUT_DIR" 2>&1 | tee "$OUTPUT_DIR/$doc_type.log"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        TOTAL_TIME=$((TOTAL_TIME + duration))
        
        echo ""
        echo -e "${GREEN}✅ SUCCESS!${NC} Generated in ${BOLD}${duration}s${NC}"
        
        # Show a preview of the generated document
        echo ""
        echo -e "${BLUE}Output Preview:${NC}"
        generated_file=$(ls -t "$OUTPUT_DIR"/*.md 2>/dev/null | grep -v ".log" | head -n 1)
        if [ -f "$generated_file" ]; then
            head -n 10 "$generated_file" | sed 's/^/  /'
            echo "  ..."
            echo -e "  ${CYAN}Full document saved to: $(basename "$generated_file")${NC}"
        fi
        
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo ""
        echo -e "${RED}❌ FAILED!${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
    sleep 2  # Brief pause for readability
}

# Test all 8 document types
echo -e "${BOLD}${YELLOW}🎯 Starting Full Test Suite (8 Document Types)${NC}"
echo ""
sleep 2

# Run all tests with live output
run_test_demo "patent-assignment-agreement" \
    "docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml" \
    "Patent Assignment Agreement" 1

run_test_demo "nda-ip-specific" \
    "docs/testing/scenario-inputs/rtp-01-collaboration-nda.yaml" \
    "NDA with IP Provisions" 2

run_test_demo "patent-license-agreement" \
    "docs/testing/scenario-inputs/tfs-04-patent-license-cloudgiant.yaml" \
    "Patent License Agreement" 3

run_test_demo "trademark-application" \
    "docs/testing/scenario-inputs/rtp-02-trademark-application.yaml" \
    "Trademark Application" 4

run_test_demo "office-action-response" \
    "docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml" \
    "Office Action Response" 5

run_test_demo "cease-and-desist-letter" \
    "docs/testing/scenario-inputs/tfs-05-cease-desist-cacheflow.yaml" \
    "Cease and Desist Letter" 6

run_test_demo "technology-transfer-agreement" \
    "docs/testing/scenario-inputs/cil-06-tech-transfer-manufacturing.yaml" \
    "Technology Transfer Agreement" 7

run_test_demo "provisional-patent-application" \
    "docs/testing/scenario-inputs/cil-04-provisional-patent.yaml" \
    "Provisional Patent Application" 8

# Final Summary with visual appeal
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}                        ${BOLD}TEST RESULTS SUMMARY${NC}                       ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✅ Passed:${NC} ${BOLD}$PASSED_TESTS${NC}"
echo -e "  ${RED}❌ Failed:${NC} ${BOLD}$FAILED_TESTS${NC}"
echo -e "  ⏱️  Total Time: ${BOLD}${TOTAL_TIME}s${NC}"
if [ $PASSED_TESTS -gt 0 ]; then
    echo -e "  📊 Average Time: ${BOLD}$((TOTAL_TIME / (PASSED_TESTS + FAILED_TESTS)))s${NC} per document"
fi
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo ""
    echo -e "${BLUE}📁 Generated documents location:${NC}"
    echo -e "   ${YELLOW}$OUTPUT_DIR/${NC}"
    echo ""
    echo -e "${BLUE}📄 Files generated:${NC}"
    ls -la "$OUTPUT_DIR"/*.md 2>/dev/null | grep -v ".log" | awk '{print "   " $9}' | sed "s|$OUTPUT_DIR/|   |g"
else
    echo -e "${RED}${BOLD}⚠️  Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}Check logs for details:${NC}"
    for log in "$OUTPUT_DIR"/*.log; do
        if grep -q "error\|Error\|ERROR" "$log" 2>/dev/null; then
            echo "   - $(basename $log)"
        fi
    done
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Demo Complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" 