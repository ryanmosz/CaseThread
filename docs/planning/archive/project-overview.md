# CaseThread - Open Source Legal AI for IP Attorneys

## 🎯 Project Overview

**What:** Open source alternative to Harvey AI focused on licensed IP attorneys - providing template-based document generation with firm customization at a fraction of the cost.

**Core Innovation:** Transparent, customizable document generation that learns from your firm's style and precedents, solving the "starting from scratch" problem that costs IP attorneys hours daily.

## 💡 Core Features

### MVP (Weeks 1-8)
1. **CLI-First Development**
   - Command-line interface for all core features
   - Fast iteration and testing
   - Clean separation of business logic
   - GUI added later for broader adoption

2. **Template-Based Generation**
   - IP-specific document templates (patents, trademarks, licensing)
   - Smart field extraction and population
   - Context-aware clause suggestions

3. **Firm Customization**
   - Import firm's existing documents/templates
   - Learn firm-specific language and style
   - Maintain consistency across all generated documents

4. **Basic Review & Export**
   - Generated document preview
   - Export to DOCX/PDF/TXT
   - Simple editing capabilities

### Stretch Goals (Post-MVP)
- Electron GUI with visual interface
- Visual diff verification interface (side-by-side comparison)
- Document review and analysis
- Contract summarization
- Multi-document context awareness
- Collaborative features

## 🎯 Target Market

**Primary:** Licensed IP attorneys in small to mid-sized firms (2-50 attorneys)
- Currently priced out of Harvey ($100K+/year)
- Need document automation but can't afford enterprise solutions
- Want transparency in how documents are generated
- Retain full legal responsibility for all generated documents

**Secondary:** Solo IP practitioners (licensed attorneys)
- Drowning in repetitive document drafting
- Need to maintain consistency without paralegal support
- Seeking competitive advantage through efficiency

**Important:** This tool is designed for licensed attorneys who understand their professional responsibility for all work product. It is an AI-assisted drafting tool, not a replacement for legal judgment.

## 🔓 Open Source Advantages

### 1. Cost Accessibility
- **Harvey:** $100K+/year enterprise contracts
- **CaseThread:** Free core + affordable premium support
- Immediate access to 90% of the market Harvey ignores

### 2. Transparency & Trust
- **Harvey:** Black box, proprietary models
- **CaseThread:** 
  - Inspect the code and prompts
  - Understand exactly how documents are generated
  - Audit trail for every decision
  - Use your own OpenAI API key

### 3. Customization Freedom
- Modify templates without vendor approval
- Add firm-specific features
- Integrate with existing tools
- No vendor lock-in

## 🛠️ Technical Architecture

### Stack
- **Core:** TypeScript/Node.js with CLI interface
- **CLI:** Commander.js for command structure
- **Frontend (Phase 2):** Electron + React
- **Testing:** Jest + TDD approach
- **LLM:** OpenAI API (user provides key)
- **Storage:** Local SQLite + document embeddings

### Development Approach
```
Phase 1: CLI Development (Weeks 1-6)
├── Core business logic
├── Template system
├── OpenAI integration
└── Command-line interface

Phase 2: GUI Development (Weeks 7-10)
├── Electron shell
├── React UI
├── Integration with CLI core
└── Visual features
```

### Key Components

```typescript
// CLI usage examples
$ casethread generate patent-application output.docx \
    --input '{"inventor": "Jane Doe", "title": "AI System"}'

$ casethread learn ./firm-documents \
    --output ./firm-context.db

$ casethread templates --list
$ casethread config --set openai.key=sk-...
```

### Data Flow
1. Attorney runs CLI command with template and inputs
2. System retrieves relevant firm context
3. OpenAI API generates document sections
4. Attorney reviews generated document
5. Approved document saved to firm knowledge base

## 📊 Success Metrics

### Technical
- <30 second generation time per document
- 90% acceptance rate on first generation
- Zero data leaves local environment (except OpenAI API calls)
- 5-minute setup time

### Business
- 100 firms using within 6 months
- 70% time reduction on document drafting
- 1000+ GitHub stars
- 10+ community contributors

## 🚀 Competitive Analysis

| Feature | Harvey | CaseThread |
|---------|---------|------------|
| **Pricing** | $100K+/year | Free + $99/month premium |
| **Target Market** | BigLaw only | SMB + Solo attorneys |
| **Transparency** | Black box | Open source |
| **Customization** | Limited | Unlimited |
| **Data Privacy** | Cloud only | Local-first |
| **Setup Time** | Weeks | Minutes |
| **Interface** | GUI only | CLI + GUI |

## 🔑 Key Principles

1. **Attorney Responsibility:** Tool assists drafting; attorneys retain full professional responsibility
2. **Privacy First:** All data stays local (except OpenAI API calls)
3. **Transparency:** Every generation step is auditable
4. **Incremental:** Start with CLI/templates, expand gradually
5. **Community-Driven:** IP attorneys shape the product
6. **Accessible:** Free core that actually works

## 💰 Revenue Model

1. **Free Core:** Full document generation capability
2. **Premium Support:** $99/month for priority support
3. **Enterprise Features:** SSO, audit logs, team collaboration
4. **Custom Development:** Firm-specific features
5. **Training:** Workshops on customization

## ⚠️ What We're NOT Building

- ❌ Legal advice system
- ❌ Replace-the-attorney solution
- ❌ Tool for non-attorneys
- ❌ Autonomous document filing system
- ❌ Cloud-only platform

We're building a transparent, affordable drafting assistant for licensed attorneys who understand their professional obligations. 