# CaseThread Documentation Organization Guide

## Purpose

This guide helps agents and developers understand where to place different types of documentation to maintain consistency across the CaseThread codebase.

## Project Structure

```
CaseThread/
├── .cursor/              # Cursor-specific configurations
│   └── rules/           # AI behavior rules
├── __tests__/           # Test files mirroring src structure
├── archive/             # Historical versions of important files
│   ├── devops/         # Archived DevOps files (prompts, workflows)
│   ├── handoff/        # Historical AGENT-HANDOFF.md versions
│   ├── prompts/        # Previous plan prompts and task prompts
│   └── README.md       # Archive documentation
├── docs/                # Project documentation
│   ├── architecture/    # System design and technical decisions
│   ├── devops/         # Development operations procedures
│   ├── planning/       # Project planning and strategy
│   ├── testing/          # Test plans, results, and scripts
│   ├── tasks/            # Development task tracking
│   └── devops/           # Deployment and operations guides
├── templates/            # Legal document templates
├── mock-data/           # Test data and scenarios
└── AGENT-HANDOFF.md     # Current project state for agent transitions
```

## Documentation Placement Rules

### 1. `/docs/planning/`
**Purpose:** High-level project strategy and roadmaps

Place here:
- Project overviews and vision documents
- Roadmaps and timelines
- Team coordination guides
- Feature planning documents
- Market analysis and competitive research

Examples:
- `project-overview.md`
- `project-roadmap.md`
- `cli-poc-plan.md`

### 2. `/docs/architecture/`
**Purpose:** Technical decisions and system design

Place here:
- Architecture decision records (ADRs)
- System design documents
- Technology stack documentation
- API specifications
- Code organization guides (like this one!)
- Integration patterns

Examples:
- `tech-stack.md`
- `decisions.md`
- `technical-implementation.md`
- `documentation-organization-guide.md`

### 3. `/docs/testing/`
**Purpose:** Everything related to testing

Structure:
```
testing/
├── test-scripts/       # Executable test scripts
├── test-results/       # Test execution outputs
├── scenario-inputs/    # YAML test input files
└── *.md               # Test plans and documentation
```

Place here:
- Test plans and strategies
- Test execution results (with dates)
- Test scripts (in `test-scripts/`)
- Test scenarios and coverage reports
- Performance benchmarks

Examples:
- `MULTIAGENT_TEST_PLAN.md`
- `test-results/MULTIAGENT_TEST_RESULTS_20250708.md`
- `test-scripts/test-all-documents.sh`

### 4. `/docs/tasks/`
**Purpose:** Development task tracking and PRDs

Structure:
```
tasks/
├── complete/          # Completed tasks (moved here after done)
└── *.md              # Active task documents
```

Place here:
- Product Requirements Documents (PRDs)
- Task checklists
- Detailed implementation guides
- Sprint planning documents

Examples:
- `prd-parent-task-5.0.md`
- `tasks-parent-5.0-checklist.md`

### 5. `/docs/devops/`
**Purpose:** Deployment and operational guides

Place here:
- Git workflow documentation
- CI/CD pipeline configurations
- Deployment guides
- Docker documentation
- Production operation guides
- Development practice guides

Examples:
- `git-workflow.md`
- `docker-setup.md`
- `critical-files-guide.md` - Guide to AGENT-HANDOFF, prompt.md, and plan-parent.md

### 6. `/templates/`
**Purpose:** Legal document templates and examples

Structure:
```
templates/
├── core/              # JSON template definitions
├── examples/          # Example generated documents
└── explanations/      # Markdown explanations for each template
```

Place here:
- Template JSON files
- Example outputs
- Template documentation
- Explanation markdown files

### 7. `/mock-data/`
**Purpose:** Test data and scenarios

Place here:
- Sample attorney profiles
- Client information
- Test YAML scenarios
- Mock API responses
- Sample legal documents for learning

### 8. Root Level Documents
**Purpose:** Critical project-wide information

- `README.md` - Project overview and setup
- `AGENT-HANDOFF.md` - Current state for agent transitions
- `QUICKSTART.md` - Getting started guide
- `LICENSE` - Legal license information
- `CHANGELOG.md` - Version history

## Best Practices

### 1. Naming Conventions
- Use kebab-case for file names: `multi-agent-integration-plan.md`
- Add dates to test results: `TEST_RESULTS_20250708.md`
- Use descriptive names that indicate content

### 2. File Organization
- Keep related files together
- Use subdirectories for better organization
- Move completed items to `complete/` folders
- Don't create new top-level directories without discussion

### 3. Cross-References
- Use relative paths for internal links
- Link to related documents
- Update references when moving files

### 4. Version Control
- Commit documentation updates with code changes
- Use meaningful commit messages
- Keep documentation in sync with implementation

### 5. Test Results
- Always put test outputs in `test-results/` with dates
- Don't clutter main directories with test artifacts
- Clean up temporary test files after use

## Common Mistakes to Avoid

1. **Don't put test results in the main testing folder**
   - ❌ `/docs/testing/test-output.md`
   - ✅ `/docs/testing/test-results/test-output-20250708.md`

2. **Don't create duplicate documentation**
   - Check if similar docs exist before creating new ones
   - Update existing docs rather than creating variants

3. **Don't mix concerns**
   - Keep planning separate from architecture
   - Keep test plans separate from test results

4. **Don't forget to update AGENT-HANDOFF.md**
   - Always update when completing major work
   - Include current branch and commit info

## Quick Reference

| Content Type | Location |
|-------------|----------|
| Project vision, roadmaps | `/docs/planning/` |
| Technical decisions, design | `/docs/architecture/` |
| Test plans, scripts, results | `/docs/testing/` |
| PRDs, task lists | `/docs/tasks/` |
| Deployment, operations | `/docs/devops/` |
| Legal templates | `/templates/` |
| Sample data | `/mock-data/` |
| Agent handoff info | `/AGENT-HANDOFF.md` |

## For AI Agents

When working on CaseThread:

1. **Read this guide first** to understand organization
2. **Check existing folders** before creating new ones
3. **Follow the patterns** established in each directory
4. **Update AGENT-HANDOFF.md** before ending session
5. **Clean up after yourself** - move test outputs to proper locations

Remember: Consistency helps future agents work more effectively! 