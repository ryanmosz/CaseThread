# CaseThread Planning Documentation

## 🎯 Project: Open Source Legal AI for IP Attorneys

**Mission:** Build a transparent, affordable alternative to Harvey AI that helps IP attorneys generate documents faster while maintaining complete control.

## 📁 Planning Documents

1. **[Project Overview](./project-overview.md)**
   - Vision, market analysis, and competitive positioning
   - Core features and target market
   - Open source advantages over Harvey
   - CLI-first development approach

2. **[Project Roadmap](./project-roadmap.md)** 
   - Current status and completed items
   - 6-week CLI MVP, then GUI development
   - Beta launch and growth phases
   - Living document updated weekly

3. **[Technical Implementation](./technical-implementation.md)**
   - CLI architecture with Commander.js
   - TypeScript core business logic
   - Electron/React GUI (Phase 2)
   - Testing strategy (TDD)

4. **[Team Coordination Guide](./coordination-guide.md)**
   - 2-developer workflow options
   - Daily/weekly sync structure
   - Git workflow and code review process
   - First week setup checklist

5. **[GitHub Projects Setup](./github-project-setup.md)** 
   - 5-minute setup guide
   - Recommended board structure
   - Issue templates and labels
   - Weekly workflow process

6. **[Architecture Decisions](./decisions.md)**
   - Decision log template
   - Key technical decisions
   - CLI-first approach rationale
   - Track trade-offs

7. **[Concerns & Risks](./concerns.md)**
   - Legal liability mitigation
   - Data privacy approach
   - Quality control measures

8. **[Next Steps - Ryan](./next-steps-ryan.md)** 
   - Template list for IP attorneys
   - Database integration research
   - Mock law firm data creation

## 🚀 Quick Facts

**What We're Building:**
- CLI tool for template-based document generation
- Learns from your firm's style and precedents
- GUI interface coming in Phase 2
- Local-first, transparent, customizable

**Tech Stack:**
- TypeScript + Commander.js (CLI)
- Electron + React (GUI - Phase 2)
- Jest for TDD
- OpenAI API (user provides key)
- Local SQLite storage

**Development Approach:**
```
Weeks 1-6: CLI MVP
├── Core business logic
├── Template system
├── Document generation
└── Command-line interface

Weeks 7-10: GUI Development
├── Electron application
├── React interface
├── CLI core integration
└── Visual features
```

**Target Users:**
- Licensed IP attorneys
- Small/mid IP firms (2-50 attorneys)
- Solo IP practitioners
- Currently priced out of Harvey ($100K+/year)

**Timeline:**
- Weeks 1-6: CLI MVP Development
- Weeks 7-10: GUI Development
- Weeks 11-12: Beta Launch
- Months 4-6: Growth Phase

## 📊 Key Metrics

- **Cost:** Free core + $99/month premium (vs Harvey's $100K+/year)
- **Speed:** <30 second document generation
- **Quality:** 90% acceptance rate on first generation
- **Privacy:** 100% local data (only prompts sent to OpenAI)

## 🤝 For the Dev Team

1. Start with the [Coordination Guide](./coordination-guide.md)
2. Set up [GitHub Projects](./github-project-setup.md) for task tracking
3. Review the [Roadmap](./project-roadmap.md) together
4. Log decisions in [decisions.md](./decisions.md)
5. Check [Technical Implementation](./technical-implementation.md) for architecture

## 🔄 Next Steps

1. Review project overview for vision alignment
2. Check roadmap for current sprint tasks
3. See technical guide for CLI implementation
4. Update roadmap weekly with progress

---

*"Making advanced legal AI accessible to every IP attorney, not just BigLaw."* 