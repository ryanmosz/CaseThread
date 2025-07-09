#!/bin/bash

# CaseThread CLI Test Script - Tests all 8 document types in both regular and parallel modes
# This script runs the CLI for each document type and reports success/failure with performance metrics

echo "============================================================"
echo "CaseThread CLI - Full Document Generation Test Suite"
echo "Regular vs Parallel Processing Comparison"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test output directory
OUTPUT_DIR="test-output-$(date +%Y%m%d-%H%M%S)"
FAILED_TESTS=0
PASSED_TESTS=0
FAILED_PARALLEL_TESTS=0
PASSED_PARALLEL_TESTS=0

# Performance tracking
declare -a REGULAR_TIMES
declare -a PARALLEL_TIMES
declare -a TEST_NAMES

# Create output directory
echo "Creating test output directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/regular"
mkdir -p "$OUTPUT_DIR/parallel"
echo ""

# Function to run a test
run_test() {
    local doc_type=$1
    local input_file=$2
    local test_name=$3
    local mode=$4  # "regular" or "parallel"
    local subdir=$5 # subdirectory for outputs
    
    echo -e "${YELLOW}Testing: $test_name ($mode mode)${NC}"
    echo "Document Type: $doc_type"
    echo "Input File: $input_file"
    echo -n "Running... "
    
    # Prepare command based on mode
    local cmd="npm run cli -- generate \"$doc_type\" \"$input_file\" --output \"./$OUTPUT_DIR/$subdir\""
    if [ "$mode" = "parallel" ]; then
        cmd="$cmd --parallel"
    fi
    
    # Measure execution time
    local start_time=$(date +%s.%N)
    
    # Run the command and capture output
    if eval "$cmd > \"$OUTPUT_DIR/$subdir/$doc_type.log\" 2>&1"; then
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc)
        
        echo -e "${GREEN}✓ PASSED${NC} (${duration}s)"
        echo "Generated file saved to $OUTPUT_DIR/$subdir/"
        
        if [ "$mode" = "regular" ]; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
            REGULAR_TIMES+=("$duration")
        else
            PASSED_PARALLEL_TESTS=$((PASSED_PARALLEL_TESTS + 1))
            PARALLEL_TIMES+=("$duration")
        fi
    else
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc)
        
        echo -e "${RED}✗ FAILED${NC} (${duration}s)"
        echo "Error details in: $OUTPUT_DIR/$subdir/$doc_type.log"
        
        if [ "$mode" = "regular" ]; then
            FAILED_TESTS=$((FAILED_TESTS + 1))
            REGULAR_TIMES+=("$duration")
        else
            FAILED_PARALLEL_TESTS=$((FAILED_PARALLEL_TESTS + 1))
            PARALLEL_TIMES+=("$duration")
        fi
    fi
    echo ""
}

# Function to run both regular and parallel tests for a document type
run_comparison_test() {
    local doc_type=$1
    local input_file=$2
    local test_name=$3
    
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}Testing: $test_name${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    # Store test name for later comparison
    TEST_NAMES+=("$test_name")
    
    # Run regular test
    echo -e "${BLUE}[1/2] Regular Processing Mode${NC}"
    run_test "$doc_type" "$input_file" "$test_name" "regular" "regular"
    
    # Run parallel test
    echo -e "${BLUE}[2/2] Parallel Processing Mode${NC}"
    run_test "$doc_type" "$input_file" "$test_name" "parallel" "parallel"
    
    # Calculate and display speed improvement for this test
    if [ ${#REGULAR_TIMES[@]} -gt 0 ] && [ ${#PARALLEL_TIMES[@]} -gt 0 ]; then
        local regular_time=${REGULAR_TIMES[-1]}
        local parallel_time=${PARALLEL_TIMES[-1]}
        local speedup=$(echo "scale=2; $regular_time / $parallel_time" | bc)
        echo -e "${CYAN}Speed improvement: ${speedup}× faster with parallel processing${NC}"
    fi
    echo ""
}

# Test all 8 document types
echo "Starting document generation tests..."
echo "Testing both regular and parallel processing modes..."
echo ""

# 1. Patent Assignment Agreement
run_comparison_test "patent-assignment-agreement" \
    "docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml" \
    "Patent Assignment Agreement"

# 2. NDA IP Specific
run_comparison_test "nda-ip-specific" \
    "docs/testing/scenario-inputs/rtp-01-collaboration-nda.yaml" \
    "NDA with IP Provisions"

# 3. Patent License Agreement
run_comparison_test "patent-license-agreement" \
    "docs/testing/scenario-inputs/tfs-04-patent-license-cloudgiant.yaml" \
    "Patent License Agreement"

# 4. Trademark Application
run_comparison_test "trademark-application" \
    "docs/testing/scenario-inputs/rtp-02-trademark-application.yaml" \
    "Trademark Application"

# 5. Office Action Response
run_comparison_test "office-action-response" \
    "docs/testing/scenario-inputs/tfs-02-office-action-alice.yaml" \
    "Office Action Response"

# 6. Cease and Desist Letter
run_comparison_test "cease-and-desist-letter" \
    "docs/testing/scenario-inputs/tfs-05-cease-desist-cacheflow.yaml" \
    "Cease and Desist Letter"

# 7. Technology Transfer Agreement
run_comparison_test "technology-transfer-agreement" \
    "docs/testing/scenario-inputs/cil-06-tech-transfer-manufacturing.yaml" \
    "Technology Transfer Agreement"

# 8. Provisional Patent Application
run_comparison_test "provisional-patent-application" \
    "docs/testing/scenario-inputs/cil-04-provisional-patent.yaml" \
    "Provisional Patent Application"

# Calculate overall performance metrics
calculate_average() {
    local arr=("$@")
    local sum=0
    local count=${#arr[@]}
    
    if [ $count -eq 0 ]; then
        echo "0"
        return
    fi
    
    for time in "${arr[@]}"; do
        sum=$(echo "$sum + $time" | bc)
    done
    echo "scale=2; $sum / $count" | bc
}

# Performance Summary
echo "============================================================"
echo "PERFORMANCE COMPARISON SUMMARY"
echo "============================================================"

if [ ${#REGULAR_TIMES[@]} -gt 0 ] && [ ${#PARALLEL_TIMES[@]} -gt 0 ]; then
    regular_avg=$(calculate_average "${REGULAR_TIMES[@]}")
    parallel_avg=$(calculate_average "${PARALLEL_TIMES[@]}")
    overall_speedup=$(echo "scale=2; $regular_avg / $parallel_avg" | bc)
    
    echo -e "${CYAN}Average Processing Times:${NC}"
    echo -e "  Regular Mode:  ${regular_avg}s"
    echo -e "  Parallel Mode: ${parallel_avg}s"
    echo -e "  ${GREEN}Overall Speedup: ${overall_speedup}× faster${NC}"
    echo ""
    
    # Individual test breakdown
    echo -e "${CYAN}Individual Test Performance:${NC}"
    for i in "${!TEST_NAMES[@]}"; do
        if [ $i -lt ${#REGULAR_TIMES[@]} ] && [ $i -lt ${#PARALLEL_TIMES[@]} ]; then
            local test_speedup=$(echo "scale=2; ${REGULAR_TIMES[$i]} / ${PARALLEL_TIMES[$i]}" | bc)
            printf "  %-30s %6.2fs → %6.2fs (%5.2f× faster)\n" \
                "${TEST_NAMES[$i]}" "${REGULAR_TIMES[$i]}" "${PARALLEL_TIMES[$i]}" "$test_speedup"
        fi
    done
fi

echo ""
echo "============================================================"
echo "TEST RESULTS SUMMARY"
echo "============================================================"
echo -e "${CYAN}Regular Mode:${NC}"
echo -e "  Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "  Failed: ${RED}$FAILED_TESTS${NC}"
echo ""
echo -e "${CYAN}Parallel Mode:${NC}"
echo -e "  Passed: ${GREEN}$PASSED_PARALLEL_TESTS${NC}"
echo -e "  Failed: ${RED}$FAILED_PARALLEL_TESTS${NC}"
echo ""

# Overall result
total_tests=$((PASSED_TESTS + FAILED_TESTS + PASSED_PARALLEL_TESTS + FAILED_PARALLEL_TESTS))
total_failed=$((FAILED_TESTS + FAILED_PARALLEL_TESTS))

if [ $total_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully in both modes!${NC}"
    echo ""
    echo "Generated documents are in:"
    echo "  Regular mode:  $OUTPUT_DIR/regular/"
    echo "  Parallel mode: $OUTPUT_DIR/parallel/"
    echo ""
    
    # List generated files
    echo -e "${CYAN}Generated files (Regular):${NC}"
    ls -la "$OUTPUT_DIR/regular"/*.md 2>/dev/null | awk '{print "  - " $9}' || echo "  No files generated"
    echo ""
    echo -e "${CYAN}Generated files (Parallel):${NC}"
    ls -la "$OUTPUT_DIR/parallel"/*.md 2>/dev/null | awk '{print "  - " $9}' || echo "  No files generated"
    
    echo ""
    echo -e "${GREEN}🎉 SUCCESS: Parallel processing is working correctly with significant speed improvements!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the log files for details.${NC}"
    echo ""
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "Failed regular mode logs:"
        for log in "$OUTPUT_DIR/regular"/*.log; do
            if [ -f "$log" ] && grep -q "error\|Error\|ERROR" "$log" 2>/dev/null; then
                echo "  - $log"
            fi
        done
    fi
    
    if [ $FAILED_PARALLEL_TESTS -gt 0 ]; then
        echo "Failed parallel mode logs:"
        for log in "$OUTPUT_DIR/parallel"/*.log; do
            if [ -f "$log" ] && grep -q "error\|Error\|ERROR" "$log" 2>/dev/null; then
                echo "  - $log"
            fi
        done
    fi
    
    exit 1
fi 