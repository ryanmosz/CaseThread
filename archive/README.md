# Archive Directory

This directory contains historical versions of important project files that are updated frequently. Instead of deleting or overwriting these files, we archive them to maintain a development history.

## Structure

```
archive/
├── devops/       # Old versions of DevOps files (prompts, workflows, etc.)
├── handoff/      # Historical AGENT-HANDOFF.md files
├── prompts/      # Previous versions of plan prompts and task prompts
└── README.md     # This file
```

## Archival Workflow

### For AGENT-HANDOFF.md
When starting a new parent task or when the handoff file needs major restructuring:
1. Copy current AGENT-HANDOFF.md to `archive/handoff/AGENT-HANDOFF-[date]-[description].md`
2. Update the current file with a summary of what was archived
3. Continue with new content

Example: `archive/handoff/AGENT-HANDOFF-2025-01-14-task6-complete.md`

### For Prompts
When updating prompt.md or plan-parent.md:
1. Copy current version to `archive/devops/[filename]-[date].md` or `archive/prompts/`
2. Make changes to the active file
3. Document the reason for changes

### Naming Convention
- Use format: `[original-filename]-[YYYY-MM-DD]-[brief-description].md`
- For task transitions: include task number in description
- Keep descriptions short but meaningful

## Benefits
- Maintains development history
- Allows recovery of previous approaches
- Documents evolution of project practices
- Helps new team members understand project progression 