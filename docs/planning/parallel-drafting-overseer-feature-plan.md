# Feature Plan: Parallel Drafting with Overseer Agent

> **Objective:** Reduce document-generation latency and cost by drafting template sections concurrently with a lightweight model (e.g. `gpt-3.5-turbo`) and performing a single o3 “senior-editor” pass to merge, polish, and validate the final draft.

---

## Success Metrics

| Metric | Baseline (current single-o3 flow) | Target |
|--------|-----------------------------------|--------|
| Wall-clock generation time | **T₁** seconds | **≤ 0.7 × T₁** |
| OpenAI cost per doc | **C₁** dollars | **≤ 0.5 × C₁** |
| Quality score (QA agent) | ≥ 0.85 | **≥ 0.85** (no regression) |

---

## High-Level Architecture

```mermaid
graph TD
    A[YAML Input] --> B[Context Builder Agent]
    B --> C{{splitIntoTasks}}
    C -->|task 1| D1[Drafting Agent 1\nworker model]
    C -->|task 2| D2[Drafting Agent 2]
    C -->|task N| DN[Drafting Agent N]
    D1 --> E[Overseer Agent (o3)]
    D2 --> E
    DN --> E
    E --> F[QA / Risk / Reviewer]
    F --> G[[Human Attorney]]
```

---

## Implementation Phases

### Phase 0 – Alignment (½ day)
1. **P0-1** Verify OpenAI rate-limits & pricing for selected worker model.
2. **P0-2** Decide `CT_MAX_PARALLEL` (default **4**) and worker model (default **gpt-3.5-turbo-0125**).

### Phase 1 – Core Implementation (2-3 days)
1. **P1-1** Add new types to `src/types/agents.ts`:
   - `DraftingTask`
   - `PartialDraftOutput`
   - `OverseerInput` / `OverseerOutput`
2. **P1-2** Refactor `DraftingAgent` to accept optional `sectionIds` and return `PartialDraftOutput`.
3. **P1-3** Create utility `splitIntoTasks(template)` in `src/utils/task-splitter.ts`.
4. **P1-4** Create utility `mergeMarkdown(parts, template)` in `src/utils/markdown-merge.ts`.
5. **P1-5** Implement **OverseerAgent** (`src/agents/OverseerAgent.ts`):
   - Pre-checkpoints: section coverage / duplicates
   - Execute: merge → o3 edit-in-place → final markdown
   - Post-checkpoints: placeholders, order, style similarity
6. **P1-6** Implement **ParallelOrchestrator** (`src/agents/ParallelOrchestrator.ts`):
   - Re-use validation from current Orchestrator
   - Fan-out DraftingAgent workers with `Promise.all` (or `p-limit`)
   - Fan-in via OverseerAgent
   - Aggregate logs & checkpoints, return `JobResult`

### Phase 2 – Integration & Flags (1 day)
1. **P2-1** Add CLI flag `--parallel` to `generate` command; use ParallelOrchestrator when set.
2. **P2-2** Add env vars: `CT_MAX_PARALLEL`, `CT_WORKER_MODEL`, `CT_PARALLEL_DEFAULT`.
3. **P2-3** Extend `createOpenAIService()` to allow per-agent model override.

### Phase 3 – Testing (1-2 days)
1. **P3-1** Unit: `splitIntoTasks` produces balanced, non-overlapping sets.
2. **P3-2** Unit: `DraftingAgent` honours `sectionIds` filter.
3. **P3-3** Unit: `OverseerAgent` correctly merges & flags issues.
4. **P3-4** Integration: ParallelOrchestrator output ≡ legacy Orchestrator output for a fixture template.
5. **P3-5** Performance test: measure time & cost delta vs baseline.

### Phase 4 – Observability & Guard-Rails (½ day)
1. **P4-1** Add per-agent timing/token stats to `metadata`.
2. **P4-2** Warn when overseer rewrites > 20 % of characters.
3. **P4-3** Extend cost-estimation logic for multi-call scenario.

### Phase 5 – Documentation & Roll-out (½ day)
1. **P5-1** Update `Multiagent.md` diagrams & table.
2. **P5-2** Add new CLI usage examples to `README.md`.
3. **P5-3** Write release notes in `CHANGELOG.md`.

---

## Detailed Task List

> **Legend:** `status` = _pending_ | _in_progress_ | _completed_

| ID | Task | Owner | Dep. | status |
|----|------|-------|------|--------|
| P0-1 | Verify OpenAI limits & pricing |  |  | pending |
| P0-2 | Decide max parallel & worker model |  |  | pending |
| P1-1 | Add new types to `agents.ts` |  |  | pending |
| P1-2 | Refactor `DraftingAgent` for section filtering |  | P1-1 | pending |
| P1-3 | Implement `task-splitter.ts` |  | P1-1 | pending |
| P1-4 | Implement `markdown-merge.ts` |  | P1-1 | pending |
| P1-5 | Create `OverseerAgent.ts` |  | P1-2,P1-3,P1-4 | pending |
| P1-6 | Create `ParallelOrchestrator.ts` |  | P1-2,P1-3,P1-4 | pending |
| P2-1 | Add `--parallel` flag to CLI |  | P1-6 | pending |
| P2-2 | Add env var support |  | P1-6 | pending |
| P2-3 | Extend OpenAIService for model override |  | P1-6 | pending |
| P3-1 | Unit test `task-splitter` |  | P1-3 | pending |
| P3-2 | Unit test `DraftingAgent` section filter |  | P1-2 | pending |
| P3-3 | Unit test `OverseerAgent` |  | P1-5 | pending |
| P3-4 | Integration test ParallelOrch vs legacy |  | P1-6 | pending |
| P3-5 | Performance benchmark script |  | P3-4 | pending |
| P4-1 | Add timing/token metrics |  | P1-6 | pending |
| P4-2 | Overseer rewrite-ratio warning |  | P1-5 | pending |
| P4-3 | Update cost-estimation logic |  | P1-6 | pending |
| P5-1 | Update `Multiagent.md` |  | P1-5,P1-6 | pending |
| P5-2 | Update `README.md` CLI docs |  | P2-1 | pending |
| P5-3 | Add entry to `CHANGELOG.md` |  | P0-2–P4-3 | pending |

---

### Relevant Files (to be created/modified)
- `src/types/agents.ts` – new interfaces
- `src/utils/task-splitter.ts` – section partitioning logic
- `src/utils/markdown-merge.ts` – deterministic merge helper
- `src/agents/OverseerAgent.ts` – new agent
- `src/agents/ParallelOrchestrator.ts` – orchestrator with fan-out/fan-in
- `src/agents/DraftingAgent.ts` – accepts `sectionIds`
- `src/commands/generate.ts` – `--parallel` flag
- `src/services/openai.ts` – model override support, cost calc update
- Tests: `__tests__/agents/`, `__tests__/utils/`, `__tests__/integration/`

---

> **Next step:** begin with **P0-1** & **P0-2** to validate external constraints before coding. 