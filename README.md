# CaseThread - Legal Document Generation for IP Attorneys

CaseThread is an open-source legal AI agent designed specifically for intellectual property attorneys. It provides template-based document generation with AI assistance, offering a low-cost alternative to expensive legal tech solutions.

## 🎯 Target Audience

Licensed IP attorneys in small to mid-sized firms who need efficient document generation tools without the $100K+/year price tag of enterprise solutions.

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

- **AI-Enhanced Generation**: Strategic integration with OpenAI API for intelligent content generation
- **Smart Validation**: Field-level validation and conditional logic
- **Firm Customization**: Templates can be customized to match firm preferences
- **CLI-First Design**: Command-line interface for efficient workflow (GUI coming in Phase 2)

## 🚀 Getting Started

> **Quick Start**: Want to get running in 5 minutes? Check out [QUICKSTART.md](QUICKSTART.md)

### Prerequisites
- Docker and Docker Compose
- OpenAI API key (with access to o3 model)
- Git

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
EOF
```

3. **Build and start Docker container**
```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# Verify container is running
docker ps
```

4. **Run initial tests** (optional but recommended)
```bash
docker exec casethread-dev npm test
```

### Using the CLI

The CaseThread CLI generates legal documents from YAML input files using AI-powered templates.

#### Basic Command Structure
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
│   ├── commands/          # CLI commands
│   ├── services/          # Core services (OpenAI, template, etc.)
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

## 🧪 Development

### Running Tests
```bash
# Run all tests
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

## 🛠️ Technology Stack

- **Language**: TypeScript 5.7
- **Runtime**: Node.js 20 (LTS)
- **CLI Framework**: Commander.js v13
- **AI Model**: OpenAI o3
- **Container**: Docker
- **Testing**: Jest
- **Logging**: Winston

## 📈 Development Roadmap

### Phase 1: CLI MVP (Current)
- [x] CLI framework setup
- [x] Core services (logging, YAML parsing, template loading)
- [x] Template system with 8 document types
- [x] OpenAI integration with o3 model
- [x] Document generation with validation
- [x] Docker containerization
- [ ] Database schema (upcoming)
- [ ] Batch processing (upcoming)

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