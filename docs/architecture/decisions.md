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

## 2024-01-XX: CLI-First Development
**Context:** Need to validate core features quickly without UI complexity
**Decision:** Build CLI implementation first, add Electron GUI after core is stable
**Consequences:** Faster testing/iteration, delayed visual experience, cleaner separation of concerns
**Agreed by:** [To be filled]

## 2024-01-XX: Licensed Attorneys Only
**Context:** Need to clarify target users and legal responsibility
**Decision:** Target only licensed attorneys who retain full professional responsibility
**Consequences:** Clear liability boundaries, smaller but qualified user base
**Agreed by:** [To be filled]

## 2024-01-XX: Visual Diff as Stretch Goal
**Context:** MVP scope needs to be achievable in 8 weeks
**Decision:** Basic review UI for MVP, visual diff interface as post-MVP feature
**Consequences:** Faster MVP delivery, simpler initial implementation
**Agreed by:** [To be filled]

## 2024-01-XX: OpenAI API Only
**Context:** Need to choose which LLM providers to support
**Decision:** Support only OpenAI API keys (no Anthropic, etc.)
**Consequences:** Simpler implementation, single provider dependency
**Agreed by:** [To be filled]

## 2024-XX-XX: TypeScript + Electron Stack
**Context:** Need cross-platform desktop app with good DX
**Decision:** TypeScript for type safety, Electron for desktop, React for UI
**Consequences:** Larger bundle size but faster development
**Agreed by:** [To be filled]

## 2024-XX-XX: Local-First Architecture  
**Context:** IP attorneys need data privacy and security
**Decision:** SQLite local storage, no cloud by default
**Consequences:** No real-time collaboration initially
**Agreed by:** [To be filled]

## 2024-XX-XX: User Provides LLM Keys
**Context:** Reduce costs and increase trust
**Decision:** Users bring their own OpenAI API keys
**Consequences:** More setup complexity but full cost transparency
**Agreed by:** [To be filled]

## 2024-XX-XX: TDD Development Approach
**Context:** Need high reliability for legal documents
**Decision:** Write tests first, maintain >80% coverage
**Consequences:** Slower initial development but fewer bugs
**Agreed by:** [To be filled] 