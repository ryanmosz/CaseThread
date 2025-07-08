# ChromaDB Setup Guide

CaseThread uses ChromaDB as its vector database for storing and retrieving legal document context. ChromaDB requires a server to be running for the JavaScript client to connect to.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Start ChromaDB server
docker-compose up chromadb

# In another terminal, index documents
npm run cli learn

# Generate documents with context
npm run cli generate patent-assignment-agreement docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml
```

### Option 2: Manual Docker Run

```bash
# Start ChromaDB server
docker run -p 8000:8000 -v chroma_data:/chroma/chroma chromadb/chroma:latest

# In another terminal, index documents
npm run cli learn
```

## Verification

Once ChromaDB is running, you can verify it's working by:

1. **Check server status**: Visit http://localhost:8000 in your browser
2. **Test indexing**: Run `npm run cli learn` to index mock legal documents
3. **Generate document**: Use the generate command with context retrieval

## Troubleshooting

### Connection Refused Error
If you see `ECONNREFUSED` or similar connection errors:
- Make sure ChromaDB server is running on port 8000
- Check if Docker is running
- Verify no other service is using port 8000

### Invalid URL Error
If you see `Invalid URL` errors:
- This usually means ChromaDB server is not running
- Start the server using one of the methods above

### Port Already in Use
If port 8000 is already in use:
- Stop the conflicting service
- Or modify `docker-compose.yml` to use a different port
- Update the ChromaDB client configuration in `src/services/retriever.ts`

## Data Persistence

ChromaDB data is persisted in:
- **Docker Compose**: `chroma_data` volume
- **Manual Docker**: Host directory mounted to `/chroma/chroma`

## Configuration

The ChromaDB client is configured in `src/services/retriever.ts`:
- Default server: `http://localhost:8000`
- Collection name: `casethread_contexts`
- Similarity threshold: `0.75`

## Next Steps

After ChromaDB is running and documents are indexed:
1. Generate legal documents with enhanced context
2. The system will automatically retrieve relevant precedents
3. Generated documents will include contextual information from similar cases 