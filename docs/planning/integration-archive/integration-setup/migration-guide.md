# Migration Guide: CaseThread Multi-Agent System

## Overview

CaseThread is evolving from a simple CLI tool to a sophisticated multi-agent system with vector search capabilities. This guide helps you migrate from v1.x (simple CLI) to v2.0 (multi-agent system).

## What's New in v2.0

### 🚀 Major Features
1. **Multi-Agent Architecture**: Specialized agents for different tasks
   - Context Builder Agent: Finds relevant legal precedents
   - Drafting Agent: Generates documents with context
   - (Coming soon: QA, Risk/Compliance, and Reviewer agents)

2. **Vector Search**: ChromaDB integration for semantic search
3. **Learning System**: Index your legal documents for context retrieval
4. **Enhanced Document Generation**: Context-aware drafting

### 🔄 Breaking Changes
- Requires ChromaDB server (new Docker container)
- New `learn` command must be run before generating documents
- Additional dependencies (chromadb npm package)
- More complex Docker setup

## Migration Steps

### 1. Stop Current Services
```bash
docker-compose down
docker system prune -f  # Clean up old containers
```

### 2. Update Your Environment
```bash
# Pull latest changes
git pull origin main

# Run the integration script
./scripts/integrate-multi-agent.sh

# Or manually:
git checkout -b feature/integrate-multi-agent
git fetch origin pull/1/head:pr-1
git merge pr-1
```

### 3. Update Docker Setup
```bash
# Rebuild with new services
docker-compose build --no-cache
docker-compose up -d

# Verify both containers are running
docker ps
# Should show:
# - casethread-dev
# - casethread-chromadb
```

### 4. Install New Dependencies
```bash
docker exec casethread-dev npm install
```

### 5. Initialize Vector Database
```bash
# Index existing mock legal documents
docker exec casethread-dev npm run cli -- learn

# This creates embeddings for all documents in mock-data/
```

### 6. Test the New System
```bash
# Run all tests
docker exec casethread-dev npm test

# Test document generation with context
docker exec casethread-dev npm run cli -- generate patent-assignment-agreement \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
```

## Usage Changes

### Old Way (v1.x)
```bash
# Simple generation
npm run cli -- generate patent-assignment-agreement input.yaml
```

### New Way (v2.0)
```bash
# First, learn from existing documents
npm run cli -- learn

# Then generate with context
npm run cli -- generate patent-assignment-agreement input.yaml
```

## New Commands

### `learn` Command
Indexes legal documents into the vector database for context retrieval.

```bash
# Basic usage
npm run cli -- learn

# Clear and reindex
npm run cli -- learn --clear

# With debug output
npm run cli -- learn --debug
```

## Troubleshooting

### ChromaDB Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```
**Solution**: Ensure ChromaDB is running:
```bash
docker-compose up -d chromadb
docker logs casethread-chromadb
```

### Test Failures
If integration tests fail:
```bash
# Check ChromaDB health
curl http://localhost:8000/api/v1/heartbeat

# Restart services
docker-compose restart

# Re-run tests
docker exec casethread-dev npm test
```

### Performance Issues
The new system requires more resources:
- **Memory**: ~1GB (vs ~256MB for v1.x)
- **Disk**: ~500MB for ChromaDB data
- **CPU**: Higher during embedding generation

## Rollback Plan

If you need to rollback to v1.x:
```bash
# Switch back to main branch
git checkout main

# Rebuild original containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Reinstall original dependencies
docker exec casethread-dev npm install
```

## Configuration

### Environment Variables
New variables in `.env`:
```bash
# Existing
OPENAI_API_KEY=your-key-here

# New (optional)
CHROMADB_URL=http://localhost:8000
CHROMADB_COLLECTION=casethread_contexts
```

### Docker Resources
Update Docker Desktop settings if needed:
- Memory: 4GB minimum
- CPU: 2 cores minimum

## Benefits of Migration

1. **Better Document Quality**: Context-aware generation using similar cases
2. **Faster Iterations**: Learn from previous documents
3. **Scalability**: Agent architecture allows adding new capabilities
4. **Future-Proof**: Foundation for advanced features (QA, compliance checks)

## Support

For issues or questions:
1. Check existing tests: `docker exec casethread-dev npm test`
2. Review logs: `docker logs casethread-dev`
3. Check ChromaDB: `docker logs casethread-chromadb`
4. File an issue with error details and steps to reproduce

## Next Steps

After successful migration:
1. Index your own legal documents using `learn`
2. Test generation with your templates
3. Monitor performance and quality improvements
4. Provide feedback for future agent development 