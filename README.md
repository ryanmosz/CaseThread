# CaseThread

AI-powered legal document generation system with GUI and CLI interfaces.

## Current State

- ✅ Working CLI with 8 legal document templates
- ✅ Electron GUI with PDF generation, display, and export
- ✅ Multi-agent AI system (GPT-4) for intelligent document creation
- ✅ Demo-ready with full PDF workflow

## Quick Start

### Prerequisites
- Docker
- OpenAI API key

### Setup

```bash
# Clone repository
git clone <repository-url>
cd G2W4-CaseThread

# Setup environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Start services
docker compose up -d

# GUI
npm run electron:dev

# CLI
docker exec -it casethread-dev npm run generate -- nda-ip-specific
```

## Key Features

- **8 IP Document Templates**: Patent applications, NDAs, trademark filings, assignments
- **AI-Powered Generation**: Multi-agent system with context awareness
- **PDF Generation**: Professional legal documents with signature blocks
- **GUI Interface**: Modern Electron app with real-time PDF preview
- **Parallel Processing**: Optional multi-threaded generation
- **Quality Pipeline**: Built-in review and refinement

## Available Templates

- Provisional Patent Application
- NDA (IP-Specific)
- Patent Assignment Agreement
- Patent License Agreement
- Trademark Application
- Office Action Response
- Technology Transfer Agreement
- Cease and Desist Letter

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Electron
- **Backend**: Node.js, Express, TypeScript
- **AI**: OpenAI GPT-4, LangGraph
- **PDF**: PDFKit, react-pdf
- **Infrastructure**: Docker, PostgreSQL, Supabase 