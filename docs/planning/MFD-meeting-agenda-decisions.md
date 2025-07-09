# MFD: Meeting Agenda - Key Decisions for MVP

## Meeting Purpose
Make critical implementation decisions for CaseThread MVP demo by Friday

## Meeting Participants
- Developer R (CLI framework, testing, Docker)
- Developer G (Multi-agent architecture, ChromaDB)

---

## Decision Points

### 1. User Input Method for Document Generation
**Reference**: `/docs/planning/MFD-user-input-design-options.md`

**Decision Needed**: Which input method for Electron app?
- [ ] Option 1: YAML Upload (2-3 hours)
- [ ] Option 2: Basic Forms (4-6 hours) **[Recommended]**
- [ ] Option 3: Dynamic Form (6-8 hours)
- [ ] Other option from document

**Key Factors**: Time constraint, demo effectiveness, reusability

---

### 2. GUI Architecture for Dual Features
**Reference**: `/docs/planning/MFD-summarization-design-options.md`

**Decision Needed**: How to integrate both features in GUI?
- [ ] Option 1: Unified Workspace (5-7 hours)
- [ ] Option 3: Split Pane Design (6-8 hours) **[Recommended]**
- [ ] Option 2: Tabbed Interface (7-9 hours)
- [ ] Other option from document

**Key Factors**: Component sharing, user clarity, development time

---

### 3. PDF Generation Approach
**Reference**: `/docs/planning/MFD-pdf-generation-options.md`

**Decision Needed**: Which PDF library/method?
- [ ] Option 5: Hybrid Quick Solution (3-4 hours)
- [ ] Option 2: PDFKit Template-Based (8-10 hours) **[Recommended]**
- [ ] Option 1: HTML-to-PDF (4-6 hours)
- [ ] Other option from document

**Key Factors**: Legal formatting compliance, time to implement

---

### 4. Priority Order for Implementation

**Decision Needed**: What order to build features?

**Option A - Foundation First**:
1. Electron shell with basic layout
2. Shared components (viewer, file upload)
3. Document generation feature
4. PDF export
5. Summarization feature

**Option B - Feature Complete First**:
1. PDF generation for CLI
2. Summarization backend
3. Electron app with both features
4. Polish and integration

---

### 5. Division of Labor

**Decision Needed**: Who builds what?

**Proposed Split**:
- **Developer R**:
  - [ ] Electron app setup
  - [ ] Form/input implementation
  - [ ] PDF generation
  - [ ] GUI integration

- **Developer G**:
  - [ ] Summarization backend
  - [ ] Multi-agent adaptation for GUI
  - [ ] ChromaDB optimization
  - [ ] API endpoints for GUI

**Overlap Areas** (need coordination):
- Shared components
- API contracts
- Error handling

---

### 6. Testing Strategy

**Reference**: All existing tests in `__tests__/`

**Decision Needed**: Testing approach for new features?
- [ ] Fix all existing CLI tests first
- [ ] Write GUI tests as we go
- [ ] Manual testing only for MVP
- [ ] Hybrid: Fix critical tests + manual GUI testing

---

### 7. Demo Flow and Content

**Reference**: `/docs/planning/MFD-moving-forward.md` (Success Criteria)

**Decision Needed**: What exactly to show?
1. Order of features to demonstrate
2. Which document types to generate
3. What document to summarize
4. How to show PDF export
5. Performance expectations to set

---

### 8. Fallback Plans

**Decision Needed**: What if we run short on time?

**Minimum Viable Demo**:
- [ ] CLI only with PDF export
- [ ] Electron with just generation (no summary)
- [ ] Basic GUI with YAML upload
- [ ] Text-only output with promise of PDF

---

## Technical Decisions

### 9. Electron Framework Setup
- [ ] Electron + React
- [ ] Electron + Vue
- [ ] Electron + Vanilla JS
- [ ] Electron Forge vs manual setup

### 10. State Management
- [ ] Redux
- [ ] Context API
- [ ] Zustand
- [ ] Local state only

### 11. API Structure
- [ ] REST endpoints
- [ ] GraphQL
- [ ] Direct IPC calls
- [ ] Hybrid approach

---

## Timeline Checkpoint

**Current Status**: Tuesday morning
**Demo**: Friday
**Available Dev Time**: ~3.5 days

**Must Decide Today**:
1. User input method (affects everything)
2. GUI architecture (affects development split)
3. PDF approach (affects timeline)
4. Division of labor (start parallel work)

---

## Action Items Post-Meeting

- [ ] Update `/docs/planning/MFD-moving-forward.md` with decisions
- [ ] Create implementation checklist
- [ ] Set up development branches
- [ ] Schedule daily sync meetings
- [ ] Identify integration points

---

## Risk Assessment

**High Risk**:
- Complex GUI options (chat interface, wizard)
- Full legal PDF compliance
- Attempting all features

**Low Risk**:
- Basic forms + split pane
- Simple PDF with core formatting
- Focus on working demo over perfection

---

## Next Steps

1. Make decisions on all items above
2. Each developer creates their task list
3. Set up shared components first
4. Daily morning sync (15 min)
5. Thursday afternoon: integration
6. Friday morning: demo prep 