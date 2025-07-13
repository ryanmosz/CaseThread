# Architecture Decision Records

## Format

```markdown
## YYYY-MM-DD: [Decision Title]
**Context:** What problem are we solving?
**Decision:** What did we decide?
**Consequences:** What are the trade-offs?
**Agreed by:** [Dev names]
```

---

## 2024-01-10: CLI-First Development
**Context:** Need to validate core features quickly without UI complexity
**Decision:** Build CLI implementation first, add Electron GUI after core is stable
**Consequences:** Faster testing/iteration, delayed visual experience, cleaner separation of concerns
**Agreed by:** Dev Team

## 2024-01-12: Licensed Attorneys Only
**Context:** Need to clarify target users and legal responsibility
**Decision:** Target only licensed attorneys who retain full professional responsibility
**Consequences:** Clear liability boundaries, smaller but qualified user base
**Agreed by:** Dev Team

## 2024-01-15: Visual Diff as Stretch Goal
**Context:** MVP scope needs to be achievable in 8 weeks
**Decision:** Basic review UI for MVP, visual diff interface as post-MVP feature
**Consequences:** Faster MVP delivery, simpler initial implementation
**Agreed by:** Dev Team

## 2024-01-18: OpenAI API Only
**Context:** Need to choose which LLM providers to support
**Decision:** Support only OpenAI API keys (no Anthropic, etc.)
**Consequences:** Simpler implementation, single provider dependency
**Agreed by:** Dev Team

## 2024-01-20: TypeScript + Electron Stack
**Context:** Need cross-platform desktop app with good DX
**Decision:** TypeScript for type safety, Electron for desktop, React for UI
**Consequences:** Larger bundle size but faster development
**Agreed by:** Dev Team

## 2024-01-22: Local-First Architecture  
**Context:** IP attorneys need data privacy and security
**Decision:** SQLite local storage, no cloud by default
**Consequences:** No real-time collaboration initially
**Agreed by:** Dev Team

## 2024-01-25: User Provides LLM Keys
**Context:** Reduce costs and increase trust
**Decision:** Users bring their own OpenAI API keys
**Consequences:** More setup complexity but full cost transparency
**Agreed by:** Dev Team

## 2024-01-28: TDD Development Approach
**Context:** Need high reliability for legal documents
**Decision:** Write tests first, maintain >80% coverage
**Consequences:** Slower initial development but fewer bugs
**Agreed by:** Dev Team

## 2024-11-15: Concurrent GUI Development
**Context:** CLI development revealed that users need visual feedback sooner
**Decision:** Develop GUI concurrently with CLI features rather than as Phase 2
**Consequences:** More complex integration work but better user experience from start
**Agreed by:** Dev R, Dev G

## 2024-11-20: Langgraph for Quality Pipeline
**Context:** Need multi-agent refinement to ensure legal document quality
**Decision:** Adopt Langgraph for orchestrating 3-agent quality pipeline
**Consequences:** Additional dependency but significantly improved document quality
**Agreed by:** Dev G

## 2024-11-25: Buffer-Based PDF Preview
**Context:** Users need to preview PDFs before saving to ensure formatting
**Decision:** Generate PDFs to buffer first, display in viewer, then save on user confirmation
**Consequences:** More memory usage but better user control and error prevention
**Agreed by:** Dev R

## 2024-11-28: Electron IPC Architecture
**Context:** Need secure communication between main and renderer processes
**Decision:** Use structured IPC handlers for all PDF operations and file access
**Consequences:** More boilerplate but better security and separation of concerns
**Agreed by:** Dev R, Dev G

## 2024-12-01: Background Generation UI
**Context:** Long-running operations need progress feedback
**Decision:** Implement BackgroundGenerationStatus component for all async operations
**Consequences:** Consistent UX but additional state management complexity
**Agreed by:** Dev G

## 2024-12-05: AI Assistant Integration
**Context:** Users need help refining documents before generation
**Decision:** Add AI Assistant panel with chat interface for document editing
**Consequences:** Enhanced user experience but increased API usage
**Agreed by:** Dev G 