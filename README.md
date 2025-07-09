# CaseThread - Multi-Agent Legal Document Generation for IP Attorneys

CaseThread is an open-source, multi-agent AI system designed specifically for intellectual property attorneys. It provides context-aware document generation using advanced AI agents and vector search, offering a powerful yet affordable alternative to expensive legal tech solutions.

## 🚀 New: Multi-Agent Architecture

CaseThread now features a sophisticated multi-agent system that learns from your firm's documents:
- **Context Builder Agent**: Retrieves relevant precedents using ChromaDB vector search
- **Drafting Agent**: Generates documents with context awareness
- **Learning System**: Index your existing documents to improve generation quality

## 🎯 Target Audience

Licensed IP attorneys in small to mid-sized firms who need efficient, intelligent document generation tools without the $100K+/year price tag of enterprise solutions.

## 📋 Features

- **8 Comprehensive IP Document Templates**:
  - Provisional Patent Application
  - IP-Specific Non-Disclosure Agreement
  - Patent License Agreement
  - Trademark Application (TEAS Plus)
  - Patent Assignment Agreement
  - Office Action Response
  - Cease and Desist Letter
  - Technology Transfer Agreement

- **Multi-Agent AI System**: Context-aware generation using specialized agents
- **Vector Search**: ChromaDB integration for semantic document retrieval  
- **Learning Capability**: Index and learn from your firm's existing documents
- **AI-Enhanced Generation**: Strategic integration with OpenAI API for intelligent content generation
- **Smart Validation**: Field-level validation and conditional logic
- **Firm Customization**: Templates can be customized to match firm preferences
- **CLI-First Design**: Command-line interface for efficient workflow (GUI coming in Phase 2)

## 🚀 Getting Started

> **Quick Start**: Want to get running in 5 minutes? Check out [QUICKSTART.md](QUICKSTART.md)

> **Validate Everything Works**: Run `./docs/testing/test-scripts/test-all-documents-demo.sh` to test all functionality!

### Prerequisites
- Docker and Docker Compose
- OpenAI API key (with access to o3 model)
- Git
- ChromaDB (included in Docker setup)

### Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/[username]/CaseThread.git
cd CaseThread
```

2. **Create environment file**
```bash
# Create .env file in project root
cat > .env << EOF
OPENAI_API_KEY=your-openai-api-key-here
NODE_ENV=development
LOG_LEVEL=info
LOG_FORMAT=pretty

# Parallel Processing Configuration (Optional)
CT_MAX_PARALLEL=4
CT_WORKER_MODEL=gpt-3.5-turbo-0125
CT_PARALLEL_DEFAULT=false
EOF
```

3. **Build and start Docker containers** (includes ChromaDB)
```bash
# Build the Docker images
docker-compose build

# Start the containers (CaseThread + ChromaDB)
docker-compose up -d

# Verify containers are running
docker ps
# Should show: casethread-dev and casethread-chromadb
```

4. **Index existing documents** (optional but recommended)
```bash
# Learn from mock law firm documents
docker exec casethread-dev npm run cli -- learn

# Or clear and re-index
docker exec casethread-dev npm run cli -- learn --clear
```

5. **Run initial tests** (optional but recommended)
```bash
docker exec casethread-dev npm test
```

6. **Run comprehensive demo test** ⭐ RECOMMENDED
```bash
# This runs all 8 document types with visual progress
./docs/testing/test-scripts/test-all-documents-demo.sh
```
This is our main testing script that validates all functionality!

### Using the CLI

The CaseThread CLI provides two main commands: `learn` (index documents) and `generate` (create documents).

#### Learn Command - Index Your Documents
```bash
# Index mock law firm documents for context retrieval
docker exec casethread-dev npm run cli -- learn

# Clear existing index and re-index
docker exec casethread-dev npm run cli -- learn --clear
```

#### Generate Command - Create Documents
```bash
docker exec casethread-dev npm run cli -- generate <document-type> <input-file> [options]
```

#### Available Document Types
- `provisional-patent-application`
- `nda-ip-specific`
- `patent-license-agreement`
- `trademark-application`
- `patent-assignment-agreement`
- `office-action-response`
- `cease-and-desist-letter`
- `technology-transfer-agreement`

#### Options
- `--output <directory>` - Specify output directory (default: current directory)
- `--debug` - Enable debug logging for troubleshooting
- `--parallel` - **NEW:** Enable parallel processing for 4-6× faster generation

### Example Usage

1. **Generate a Patent Assignment Agreement**
```bash
docker exec casethread-dev npm run cli -- generate patent-assignment-agreement \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
  --output ./output
```

2. **Generate a Trademark Application**
```bash
docker exec casethread-dev npm run cli -- generate trademark-application \
  docs/testing/scenario-inputs/rtp-02-trademark-application.yaml \
  --output ./output
```

3. **Generate with debug information**
```bash
docker exec casethread-dev npm run cli -- --debug generate cease-and-desist-letter \
  docs/testing/scenario-inputs/cil-05-cease-desist-false-claims.yaml
```

4. **Generate with parallel processing (4-6× faster)**
```bash
docker exec casethread-dev npm run cli -- generate patent-assignment-agreement \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
  --parallel --output ./output
```

5. **Combine parallel processing with debug**
```bash
docker exec casethread-dev npm run cli -- --debug generate nda-ip-specific \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
  --parallel --output ./output
```

### Sample Input Files

The project includes test scenarios in `docs/testing/scenario-inputs/`. Each YAML file contains the required fields for a specific document type:

```yaml
# Example: Patent Assignment Agreement
document_type: patent-assignment-agreement
assignors:
  - name: "David Park"
    address: "123 Innovation Way, Tech City, CA 94000"
assignee:
  name: "TechFlow Solutions, Inc."
  address: "456 Corporate Blvd, Business Park, CA 94001"
patents:
  - type: "Provisional Application"
    number: "63/234,567"
    title: "Predictive Cache Optimization System"
    filing_date: "2023-04-20"
consideration: "Equity interest in company"
# ... more fields
```

### Output

Generated documents are saved as Markdown files with:
- Timestamp in filename: `document-type-YYYY-MM-DD-HHMMSS.md`
- Professional formatting
- Metadata header with generation details
- Complete legal document content

Example output location:
```
./output/patent-assignment-agreement-2025-07-08-145506.md
```

## 📁 Project Structure

```
CaseThread/
├── src/                    # TypeScript source code
│   ├── index.ts           # CLI entry point
│   ├── commands/          # CLI commands (generate, learn)
│   ├── agents/            # Multi-agent system
│   ├── services/          # Core services (OpenAI, ChromaDB, etc.)
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── templates/             # Document templates
│   ├── core/             # JSON template definitions
│   ├── explanations/     # Template explanations for AI
│   └── examples/         # Example outputs
├── docs/                  # Documentation
│   └── testing/          
│       └── scenario-inputs/  # Test YAML files
├── __tests__/            # Jest test files
├── docker-compose.yml    # Docker configuration
├── Dockerfile           # Container definition
└── package.json         # Node.js dependencies
```

## 🧪 Testing & Validation

### Comprehensive Functionality Test ⭐
```bash
# Run the main demo test - validates ALL functionality
./docs/testing/test-scripts/test-all-documents-demo.sh
```
This script:
- Tests all 8 document types sequentially
- Shows real-time generation progress
- Displays input/output previews
- Completes in ~4-5 minutes
- Provides comprehensive success/failure summary

### Unit Tests
```bash
# Run all unit tests (266 tests)
docker exec casethread-dev npm test

# Run tests in watch mode
docker exec casethread-dev npm run test:watch

# Run with coverage
docker exec casethread-dev npm run test:coverage
```

### Accessing the Container
```bash
# Enter container shell
docker exec -it casethread-dev /bin/bash

# View logs
docker logs casethread-dev

# Stop container
docker-compose down
```

### Adding New Templates

1. Create template JSON in `templates/core/`
2. Add explanation in `templates/explanations/`
3. Create example in `templates/examples/`
4. Add to available document types in CLI

### Performance Benchmarks

CaseThread includes built-in benchmark tools to measure performance improvements:

#### Speed Benchmark
```bash
# Compare legacy vs parallel processing speed
docker exec casethread-dev npx tsx scripts/benchmark.ts \
  patent-assignment-agreement \
  docs/testing/scenario-inputs/tfs-01-patent-assignment-founders.yaml \
  --trials 3
```

#### Legal Quality Benchmark
```bash
# Comprehensive legal document quality assessment using o3 as strict judge
docker exec casethread-dev npx tsx scripts/quality-benchmark.ts
```

This benchmark:
- Tests 4 critical document types (NDA, Patent Assignment, Cease & Desist, Office Action)
- Uses o3 as an extremely strict legal quality judge
- Evaluates 8 legal quality dimensions with weighted scoring
- Compares regular vs parallel processing approaches
- Identifies critical legal issues and provides recommendations
- Generates detailed JSON reports for analysis

**Quality Evaluation Criteria:**
- **Legal Accuracy** (25%): Terminology, citations, legal concepts
- **Legal Completeness** (20%): All required elements present
- **Legal Compliance** (20%): Regulatory adherence
- **Professional Formatting** (10%): Document structure
- **Clarity & Precision** (10%): Unambiguous language
- **Risk Assessment** (10%): Risk identification/mitigation
- **Enforceability** (3%): Court enforceability
- **Jurisdictional Accuracy** (2%): Jurisdiction-specific requirements

**Strict Scoring Standards:**
- Score < 7.0 = Not suitable for legal use
- Score < 5.0 = Serious legal deficiencies
- Deducts points for legal inaccuracies, missing elements, unclear language

#### Full Document Test Suite
```bash
# Test all 8 document types in both regular and parallel modes
docker exec casethread-dev ./test-all-documents.sh
```

**Typical Results:**
- **Speed**: 4-6× faster with parallel processing
- **Quality**: Minimal difference (0.5-1.0 points on 10-point scale)
- **Cost**: ~50% reduction in OpenAI API costs
- **Legal Standards**: Both approaches typically score 7.0+ (suitable for legal use)

## 🛠️ Technology Stack

- **Language**: TypeScript 5.7
- **Runtime**: Node.js 20 (LTS)
- **CLI Framework**: Commander.js v13
- **AI Model**: OpenAI o3
- **Vector Database**: ChromaDB
- **Multi-Agent System**: Custom TypeScript agents
- **Container**: Docker & Docker Compose
- **Testing**: Jest (266 tests)
- **Logging**: Winston

## 📈 Development Roadmap

### Phase 1: CLI MVP ✅ COMPLETE
- [x] CLI framework setup
- [x] Core services (logging, YAML parsing, template loading)
- [x] Template system with 8 document types
- [x] OpenAI integration with o3 model
- [x] Document generation with validation
- [x] Docker containerization
- [x] Multi-agent system with ChromaDB
- [x] Context-aware document generation
- [x] Learning from existing documents
- [ ] Database schema (Phase 2)
- [ ] Batch processing (Phase 2)

### Phase 2: GUI Development (Weeks 7-10)
- [ ] Electron app setup
- [ ] React UI implementation
- [ ] Visual review interface
- [ ] Export functionality

### Phase 3: Beta Launch (Weeks 11-12)
- [ ] User testing with IP attorneys
- [ ] Documentation completion
- [ ] Performance optimization

## ⚠️ Troubleshooting

### Common Issues

1. **"File not found" error**
   - Ensure you're using the correct path to YAML files
   - Try using absolute paths or paths relative to `/app/` inside Docker

2. **OpenAI API errors**
   - Verify your API key in `.env` file
   - Ensure you have access to the o3 model
   - Check API rate limits

3. **Permission errors**
   - The output directory must be writable
   - Use `--output` to specify a different directory

4. **Docker issues**
   - Ensure Docker is running: `docker info`
   - Rebuild if needed: `docker-compose build --no-cache`
   - Check logs: `docker logs casethread-dev`

5. **Parallel processing configuration**
   - Set `CT_MAX_PARALLEL` to control worker count (default: 4)
   - Use `CT_WORKER_MODEL` to specify worker model (default: gpt-3.5-turbo-0125)
   - Enable by default with `CT_PARALLEL_DEFAULT=true`

## ⚖️ Legal Notice

CaseThread is a tool designed to assist licensed attorneys in document generation. It does not provide legal advice and should not be used as a substitute for professional legal judgment. Users retain full responsibility for all legal work product.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines (coming soon) before submitting PRs.

## 📄 License

[License information to be added]

## 🔗 Links

- [Documentation](https://github.com/[username]/CaseThread/wiki) (coming soon)
- [Issues](https://github.com/[username]/CaseThread/issues)

---

Built with ❤️ for the legal community by developers who believe legal technology should be accessible to all. 