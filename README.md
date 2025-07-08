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

*Note: This project is currently in development. Installation instructions will be added as the CLI is implemented.*

### Prerequisites
- Node.js 18+
- TypeScript
- OpenAI API key
- Licensed attorney status (required for use)

### Planned Installation
```bash
# Clone the repository
git clone https://github.com/[username]/CaseThread.git

# Install dependencies
npm install

# Configure OpenAI API key
export OPENAI_API_KEY="your-api-key"

# Run the CLI
npm run cli
```

## 📁 Project Structure

```
/templates/
  /core/              # JSON template files
  /explanations/      # Detailed explanations for each template
  /examples/          # Example rendered outputs
  template-*.md       # Template documentation
```

## 🛠️ Technology Stack

- **Language**: TypeScript
- **CLI Framework**: Commander.js (planned)
- **Testing**: Jest
- **Database**: SQLite (planned)
- **AI**: OpenAI API
- **GUI** (Phase 2): Electron + React

## 📈 Development Roadmap

### Phase 1: CLI MVP (Weeks 1-6)
- [x] CLI framework setup
- [x] Core services (logging, YAML parsing, template loading)
- [ ] Template rendering engine
- [ ] OpenAI integration
- [ ] Database schema
- [ ] Basic document generation

### Phase 2: GUI Development (Weeks 7-10)
- [ ] Electron app setup
- [ ] React UI implementation
- [ ] Visual review interface
- [ ] Export functionality

### Phase 3: Beta Launch (Weeks 11-12)
- [ ] User testing with IP attorneys
- [ ] Documentation completion
- [ ] Performance optimization

## 💰 Business Model

- **Open Source Core**: Free forever
- **Premium Support**: $99/month for priority support and advanced features

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