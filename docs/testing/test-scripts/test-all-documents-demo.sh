#!/bin/bash

# CaseThread CLI Demo Test Script - Shows real-time output for all 8 document types
# Demo-friendly version with live output display and detailed timing metrics

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

# Timing tracking for document generation
SCRIPT_START_TIME=$(date +%s)
DOC_GEN_TIMES=()  # Array to track individual document generation times (in milliseconds)
LAST_DOC_GEN_TIME=0

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

# Function to calculate average of array (returns milliseconds)
calculate_average() {
    local sum=0
    local count=0
    for time in "${DOC_GEN_TIMES[@]}"; do
        sum=$((sum + time))
        count=$((count + 1))
    done
    if [ $count -gt 0 ]; then
        echo $((sum / count))
    else
        echo 0
    fi
}

# Function to format milliseconds to human readable
format_milliseconds() {
    local ms=$1
    local seconds=$((ms / 1000))
    local fraction=$((ms % 1000))
    
    if [ $seconds -eq 0 ]; then
        # Less than 1 second, show as fraction
        printf "0.%03ds" $fraction
    else
        # 1 second or more, show as decimal
        if [ $fraction -ge 100 ]; then
            printf "%d.%ds" $seconds $((fraction / 100))
        else
            printf "%ds" $seconds
        fi
    fi
}

# Function to format elapsed time (seconds to human readable)
format_elapsed_time() {
    local total_seconds=$1
    local hours=$((total_seconds / 3600))
    local minutes=$(((total_seconds % 3600) / 60))
    local seconds=$((total_seconds % 60))
    
    local result=""
    
    if [ $hours -gt 0 ]; then
        result="${hours}h"
        if [ $minutes -gt 0 ] || [ $seconds -gt 0 ]; then
            result="$result "
        fi
    fi
    
    if [ $minutes -gt 0 ]; then
        result="${result}${minutes}m"
        if [ $seconds -gt 0 ]; then
            result="$result "
        fi
    fi
    
    if [ $seconds -gt 0 ] || [ -z "$result" ]; then
        result="${result}${seconds}s"
    fi
    
    echo "$result"
}

# Function to parse timing from logs
parse_timing() {
    local log_file=$1
    
    if [ -f "$log_file" ]; then
        # Extract total generation time from standard output
        local total_time=$(grep -oE "Generation time: [0-9]+ seconds" "$log_file" 2>/dev/null | grep -oE "[0-9]+" | tail -1)
        
        # Extract agent execution info
        local agents_executed=$(grep -oE "Agents executed: [^\\n]+" "$log_file" 2>/dev/null | tail -1)
        
        # Display timing info if available
        if [ -n "$total_time" ] || [ -n "$agents_executed" ]; then
            echo ""
            echo -e "${BLUE}⏱️  Generation Details:${NC}"
            
            if [ -n "$total_time" ]; then
                echo -e "  • ${YELLOW}Total Generation Time:${NC} ${total_time}s"
                # Store generation time in milliseconds for averaging (multiply by 1000)
                DOC_GEN_TIMES+=($((total_time * 1000)))
            fi
            
            if [ -n "$agents_executed" ]; then
                echo -e "  • $agents_executed"
            fi
        fi
    fi
}

# Function to run a test with live output and timing
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
    
    # Run command and save logs
    local log_file="$OUTPUT_DIR/$doc_type.log"
    if docker exec casethread-dev npm run cli -- generate "$doc_type" "$input_file" --output "$OUTPUT_DIR" 2>&1 | tee "$log_file"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        TOTAL_TIME=$((TOTAL_TIME + duration))
        LAST_DOC_GEN_TIME=$duration
        
        echo ""
        echo -e "${GREEN}✅ SUCCESS!${NC}"
        
        # Parse and display timing information
        parse_timing "$log_file"
        
        # Show timing metrics
        local script_elapsed=$((end_time - SCRIPT_START_TIME))
        local avg_gen_time=$(calculate_average)
        
        echo ""
        echo -e "${MAGENTA}📊 Timing Metrics:${NC}"
        echo -e "  • ${YELLOW}Last Document Generation:${NC} $(format_elapsed_time $LAST_DOC_GEN_TIME)"
        if [ ${#DOC_GEN_TIMES[@]} -gt 0 ] && [ $avg_gen_time -gt 0 ]; then
            echo -e "  • ${YELLOW}Average Generation Time:${NC} $(format_milliseconds $avg_gen_time) (${#DOC_GEN_TIMES[@]} samples)"
        fi
        echo -e "  • ${YELLOW}Total Script Runtime:${NC} $(format_elapsed_time $script_elapsed)"
        
        # Show a preview of the generated document
        echo ""
        echo -e "${BLUE}Output Preview:${NC}"
        
        # Wait a moment for file to be written and find the most recent .md file
        sleep 1
        local generated_file=""
        local attempt
        for attempt in 1 2 3; do
            generated_file=$(find "$OUTPUT_DIR" -name "*.md" -type f 2>/dev/null | grep -v ".log" | sort -r | head -n 1)
            if [ -n "$generated_file" ] && [ -f "$generated_file" ]; then
                break
            fi
            sleep 1
        done
        
        if [ -n "$generated_file" ] && [ -f "$generated_file" ]; then
            head -n 10 "$generated_file" 2>/dev/null | sed 's/^/  /'
            echo "  ..."
            
            # Check for signature markers
            local sig_count
            sig_count=$(grep -c "SIGNATURE_BLOCK\|INITIALS_BLOCK\|NOTARY_BLOCK" "$generated_file" 2>/dev/null || echo "0")
            if [ "$sig_count" -gt 0 ]; then
                echo -e "  ${GREEN}✓ Contains $sig_count signature/initial markers${NC}"
            fi
            
            echo -e "  ${CYAN}Full document saved to: $(basename "$generated_file")${NC}"
        else
            echo -e "  ${YELLOW}Document preview not available immediately${NC}"
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
echo -e "  ⏱️  Total Time: ${BOLD}$(format_elapsed_time $TOTAL_TIME)${NC}"
if [ $PASSED_TESTS -gt 0 ]; then
    echo -e "  📊 Average Time: ${BOLD}$(format_elapsed_time $((TOTAL_TIME / (PASSED_TESTS + FAILED_TESTS))))${NC} per document"
fi

# Show final timing metrics
if [ ${#DOC_GEN_TIMES[@]} -gt 0 ]; then
    local final_avg=$(calculate_average)
    echo -e "  🤖 Average Generation: ${BOLD}$(format_milliseconds $final_avg)${NC}"
fi
local total_runtime=$(($(date +%s) - SCRIPT_START_TIME))
echo -e "  ⏱️  Total Script Runtime: ${BOLD}$(format_elapsed_time $total_runtime)${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo ""
    echo -e "${BLUE}📁 Generated documents location:${NC}"
    echo -e "   ${YELLOW}$OUTPUT_DIR/${NC}"
    echo ""
    echo -e "${BLUE}📄 Files generated:${NC}"
    # Use find to avoid glob expansion issues
    find "$OUTPUT_DIR" -name "*.md" -type f 2>/dev/null | grep -v ".log" | while read -r file; do
        echo "   $(basename "$file")"
    done
else
    echo -e "${RED}${BOLD}⚠️  Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}Check logs for details:${NC}"
    local log
    for log in "$OUTPUT_DIR"/*.log; do
        if [ -f "$log" ] && grep -q "error\|Error\|ERROR" "$log" 2>/dev/null; then
            echo "   - $(basename "$log")"
        fi
    done
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Demo Complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" 