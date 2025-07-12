# CaseThread Multi-Model Agent Pipeline - Project Brief

## Project Overview
CaseThread is a sophisticated CLI-based legal document generation system that uses multi-agent AI architecture to create IP legal documents. This project aims to implement a quality-focused 3-agent pipeline with strategic model selection to achieve partner-level document quality through iterative refinement.

## Core Requirements

### Primary Goal
Transform the existing speed-focused single-agent system into a quality-first 3-agent pipeline that delivers partner-level legal documents through contextual intelligence, rigorous quality gates, and iterative refinement.

### Key Features
1. **Multi-Model Agent Architecture**
   - Agent 1: Contextual Document Writer (GPT-4 + o3 + GPT-4)
   - Agent 2: Quality Gate Analyzer (GPT-4 + o3 + GPT-4)
   - Agent 3: Final Reviewer (GPT-4 + o3 + GPT-4)

2. **Cost-Optimized Intelligence**
   - Strategic model selection: GPT-4 for processing, o3 for complex legal reasoning
   - 40-50% cost reduction compared to all-o3 approach
   - 3-4 o3 calls per document for high-value tasks

3. **Quality-First Approach**
   - 25-35 second generation time vs 6 seconds current
   - 90%+ quality standards with iterative refinement
   - Partner-level consistency across all documents

4. **Context Integration**
   - Fix critical gap: ContextBundle now actively used in generation
   - ChromaDB legal precedents enhance document quality
   - Attorney pattern learning and client preference adaptation

## Success Criteria
- [ ] 40% reduction in attorney revision time
- [ ] 90% of documents meet quality standards on final review
- [ ] Partner-level quality consistency across all generations
- [ ] Cost-efficient operation with strategic model selection
- [ ] Backwards compatibility with existing speed mode
- [ ] Context utilization improves document quality measurably

## Technical Constraints
- Must preserve existing CLI functionality and multi-agent architecture
- Maintain Docker deployment capability and ChromaDB integration
- Keep existing template system and 266 tests intact
- Ensure backwards compatibility with optional quality mode

## Target Users
- IP attorneys requiring partner-level document quality
- Legal professionals who value accuracy over speed
- Law firms seeking competitive advantage through premium quality
- Attorneys working on high-stakes legal matters 