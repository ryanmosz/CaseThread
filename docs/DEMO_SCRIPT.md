# CaseThread CLI Demo Script

## 🎯 Demo Overview

**Duration:** 15-20 minutes  
**Audience:** Technical stakeholders, potential users, team members  
**Goal:** Showcase CaseThread's current capabilities and future potential

## 📋 Pre-Demo Checklist

- [ ] Docker containers running (`docker-compose up -d`)
- [ ] ChromaDB is accessible (`curl http://localhost:8000/api/v1/heartbeat`)
- [ ] Feature branch checked out (`git checkout feature/integrate-multi-agent`)
- [ ] Terminal window sized appropriately for screen sharing
- [ ] Test scripts executable (`chmod +x docs/testing/test-scripts/*.sh`)

## 🎬 Demo Flow

### 1. Introduction (2 minutes)

**Script:**
```
"Welcome to CaseThread - an open-source legal document generation tool designed 
specifically for IP attorneys. CaseThread provides an affordable alternative to 
expensive solutions like Harvey AI, which can cost over $100K per year.

Today I'll demonstrate:
- Our CLI tool generating 8 different types of legal documents
- The new multi-agent system with ChromaDB integration
- How the system learns from your firm's existing documents
- Our vision for the future of accessible legal AI"
```

**Show:** Project README briefly

### 2. System Architecture (2 minutes)

**Script:**
```
"CaseThread uses a modern architecture:
- TypeScript-based CLI with Commander.js
- Docker containerization for easy deployment
- Multi-agent system with specialized agents
- ChromaDB vector database for semantic search
- OpenAI API for document generation (users provide their own key)"
```

**Commands:**
```bash
# Show running containers
docker ps

# Show project structure
ls -la
cat docs/architecture/tech-stack.md | head -20
```

### 3. Mock Data Showcase (2 minutes)

**Script:**
```
"We've created realistic mock data representing a law firm with multiple attorneys
and clients. This helps demonstrate real-world scenarios."
```

**Commands:**
```bash
# Show mock data structure
ls -la mock-data/
ls -la mock-data/attorneys/
cat mock-data/firm-profile.json | jq '.'

# Show a sample client
cat mock-data/attorneys/sarah-chen/clients/techflow-solutions/client-info.json | jq '.'
```

### 4. Learning from Existing Documents (3 minutes)

**Script:**
```
"One of CaseThread's key features is learning from your firm's existing documents.
The 'learn' command indexes documents into ChromaDB for context-aware generation."
```

**Commands:**
```bash
# Show the learn command help
docker exec casethread-dev npm run cli -- learn --help

# Run the learn command (if not already indexed)
docker exec casethread-dev npm run cli -- learn --clear

# Show what was indexed
echo "✅ Indexed 23 documents from mock law firm data"
echo "📚 Documents now available for context retrieval during generation"
```

### 5. Document Generation Demo (8-10 minutes)

**Script:**
```
"Now let's see CaseThread in action. We'll generate all 8 supported document types
using our demo-friendly test script that shows real-time output."
```

**Commands:**
```bash
# First, show available document types
docker exec casethread-dev npm run cli -- generate --help

# Run the comprehensive demo test
./docs/testing/test-scripts/test-all-documents-demo.sh
```

**During generation, highlight:**
- Multi-agent pipeline (ContextBuilder → DraftingAgent)
- Real-time progress updates
- Context retrieval from ChromaDB
- Document preview after generation
- Average generation time (~33 seconds)

### 6. Individual Document Example (2 minutes)

**Script:**
```
"Let's look at one document in detail to show the quality of output."
```

**Commands:**
```bash
# Generate a single document with visible output
docker exec -it casethread-dev npm run cli -- generate \
    patent-assignment-agreement \
    docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
    --output ./demo-output

# Show the generated document
ls -la demo-output/
head -50 demo-output/patent-assignment-agreement-*.md
```

### 7. System Resilience (1 minute)

**Script:**
```
"CaseThread is designed to be resilient. Even if ChromaDB is down, the system
continues to work with basic generation."
```

**Commands (optional if time permits):**
```bash
# Stop ChromaDB
docker stop casethread-chromadb

# Show it still works
docker exec -it casethread-dev npm run cli -- generate \
    trademark-application \
    docs/testing/scenario-inputs/rtp-02-trademark-application.yaml

# Restart ChromaDB
docker start casethread-chromadb
```

### 8. Future Vision (2 minutes)

**Script:**
```
"What's next for CaseThread:

IMMEDIATE (This Week):
- Merge multi-agent system to main branch
- Increase test coverage to 80%+
- Performance optimization (target <20s generation)

PHASE 2 (Next Month):
- Electron + React GUI interface
- Batch document processing
- Additional quality agents (QA, Compliance, Risk)

PHASE 3 (Q2 2025):
- SaaS deployment option
- Team collaboration features
- Custom training on firm's documents
- API access for integrations

Our goal: Make advanced legal AI accessible to every IP attorney, not just BigLaw."
```

### 9. Q&A and Wrap-up (2 minutes)

**Key Points to Emphasize:**
- 100% open source (MIT license)
- Local-first approach (data privacy)
- Affordable ($99/month vs $100K+/year)
- Active development with clear roadmap
- Community-driven improvements

**Closing:**
```
"CaseThread represents a new approach to legal AI - transparent, affordable, and
attorney-controlled. We're building the future of legal document generation, one
commit at a time.

Questions?"
```

## 💡 Demo Tips

1. **If something fails:** 
   - Emphasize this is alpha software
   - Show the detailed error logging
   - Demonstrate the fallback mechanisms

2. **Keep energy high:**
   - Use the visual progress indicators
   - Highlight successful completions
   - Show excitement about the technology

3. **Technical audience adjustments:**
   - Show more code structure
   - Discuss the agent architecture
   - Highlight TypeScript/Jest testing

4. **Business audience adjustments:**
   - Focus on cost savings
   - Emphasize ease of use
   - Show ROI potential

## 🚀 Post-Demo Actions

1. Share GitHub repository link
2. Provide documentation links
3. Offer to schedule follow-up for technical deep-dive
4. Collect feedback and questions
5. Share roadmap document

## 📝 Demo Checklist Summary

```bash
# Quick setup commands
cd /path/to/CaseThread
git checkout feature/integrate-multi-agent
docker-compose up -d
chmod +x docs/testing/test-scripts/*.sh

# Verify everything is ready
docker ps
curl http://localhost:8000/api/v1/heartbeat
docker exec casethread-dev npm test -- --version

# Run the demo
./docs/testing/test-scripts/test-all-documents-demo.sh
```

---

Remember: The goal is to show working software that solves real problems for IP attorneys! 