# Critical Files Development Guide

## Overview

This guide explains the purpose and management of three critical files that drive our AI-assisted development workflow. These files have evolved through extensive use and represent battle-tested practices for maintaining project continuity and quality.

## The Three Critical Files

### 1. AGENT-HANDOFF.md
**Location**: `/AGENT-HANDOFF.md` (root directory)  
**Purpose**: Project state documentation for AI agent transitions

#### What It Is
- Living document that tracks the current state of the project
- Essential context for AI agents starting or resuming work
- Historical record of completed work and pending tasks
- Bridge between development sessions

#### Key Contents
- Current task status and completion state
- Recent changes and implementation details
- Architecture decisions and rationale
- Testing summary and results
- Critical path forward
- Any blockers or issues

#### Usage Pattern
1. **Start of Session**: AI reads this file to understand project state
2. **During Work**: Reference for current context
3. **End of Session**: AI updates with all progress and changes
4. **Task Transitions**: Archive before major restructuring

#### Why It Matters
- Ensures continuity when switching between AI agents
- Prevents loss of context between sessions
- Documents decision rationale for future reference
- Tracks evolution of the project

### 2. docs/devops/prompt.md
**Location**: `/docs/devops/prompt.md`  
**Purpose**: AI assistant instructions for development work

#### What It Is
- Master prompt that configures AI behavior
- Defines development standards and practices
- Sets technical constraints and requirements
- Establishes workflow patterns

#### Key Sections
- **CURRENT TASK CONTEXT**: Task-specific information (easily updatable)
- **CORE PRINCIPLES**: Immutable tech stack, git workflow, standards
- **TASK WORKFLOW**: Step-by-step development process
- **TESTING REQUIREMENTS**: TDD practices and requirements
- **TECHNICAL GUIDELINES**: Project structure, commands, tools

#### Usage Pattern
1. **New Chat**: Send entire prompt to establish context
2. **Task Switch**: Update CURRENT TASK CONTEXT section
3. **Process Evolution**: Archive old version, refine practices
4. **Reference**: AI follows these guidelines throughout session

#### Why It Matters
- Ensures consistent development practices
- Embeds learned lessons and proven patterns
- Reduces errors through clear guidelines
- Speeds up development with established workflows

### 3. docs/devops/plan-parent.md
**Location**: `/docs/devops/plan-parent.md`  
**Purpose**: Template for generating Product Requirements Documents (PRDs)

#### What It Is
- Structured prompt for creating detailed development plans
- Ensures comprehensive task planning
- Standardizes PRD format across all tasks
- Guides creation of implementation documentation

#### Key Sections
- **CURRENT TASK CONTEXT**: Specific task to plan (updatable)
- **DEVELOPMENT PLAN STRUCTURE**: 10 required sections for PRDs
- **TESTING PROCEDURE**: Mandatory testing requirements
- **FILE MANAGEMENT**: Output structure and naming
- **TARGET AUDIENCE**: Junior developer focus

#### Usage Pattern
1. **New Parent Task**: Update CURRENT TASK CONTEXT
2. **Generate PRD**: AI uses template to create comprehensive plan
3. **Output Files**: Creates PRD, checklist, and detailed task files
4. **Archive**: Save version when switching major tasks

#### Why It Matters
- Ensures thorough planning before implementation
- Creates consistent documentation structure
- Prevents missing requirements or considerations
- Enables junior developers to implement effectively

## Archival Workflow

### When to Archive

1. **AGENT-HANDOFF.md**
   - Starting a new parent task
   - Major milestone completion
   - Before significant restructuring
   - When file becomes too large (>200 lines)

2. **prompt.md**
   - When updating for new task type
   - After refining practices
   - Before major process changes
   - When adding/removing sections

3. **plan-parent.md**
   - Switching to different task domain
   - After significant template improvements
   - When changing target audience
   - Before structural reorganization

### How to Archive

1. **Create Timestamped Copy**:
   ```bash
   # Format: [original-name]-YYYY-MM-DD-[description].md
   cp AGENT-HANDOFF.md archive/handoff/AGENT-HANDOFF-2025-01-14-task6-complete.md
   cp docs/devops/prompt.md archive/devops/prompt-2025-01-14-pdf-generation.md
   cp docs/devops/plan-parent.md archive/devops/plan-parent-2025-01-14-pre-gui.md
   ```

2. **Update Current File**:
   - Add summary of what was archived at top
   - Include reference to archive location
   - Clear old content if appropriate
   - Continue with new content

3. **Example Archive Summary**:
   ```markdown
   ## Previous Content Archived
   - Archived to: archive/handoff/AGENT-HANDOFF-2025-01-14-task6-complete.md
   - Summary: Completed Task 6.0 signature blocks, all tests passing
   - Key decisions: Implemented flexible layout system with markers
   ```

### Archive Structure
```
archive/
├── devops/       # Prompts and development guides
├── handoff/      # AGENT-HANDOFF.md versions
├── prompts/      # Other prompt variations
└── README.md     # Archive documentation
```

## Best Practices

### 1. Regular Updates
- Update AGENT-HANDOFF.md after every work session
- Keep CURRENT TASK CONTEXT sections current
- Archive before information becomes stale

### 2. Clear Summaries
- When archiving, always include a summary
- Document why the archive was created
- Note any important decisions or changes

### 3. Meaningful Names
- Use descriptive archive filenames
- Include date and context
- Make it easy to find specific versions

### 4. Never Delete
- These files represent accumulated knowledge
- Always archive instead of deleting
- Historical versions help understand evolution

### 5. Cross-References
- Reference archive locations in current files
- Link between related archives
- Maintain traceability

## Benefits of This System

1. **Knowledge Preservation**
   - No loss of hard-won insights
   - Evolution of practices is documented
   - Can recover previous approaches

2. **Efficiency**
   - Proven practices are maintained
   - No need to rediscover what works
   - Faster onboarding for new contexts

3. **Quality**
   - Consistent standards across sessions
   - Battle-tested processes
   - Reduced errors from clear guidelines

4. **Flexibility**
   - Easy to adapt for new tasks
   - Can experiment while preserving what works
   - Roll back if new approaches fail

## Quick Reference

| File | Purpose | Update Frequency | Archive Trigger |
|------|---------|------------------|-----------------|
| AGENT-HANDOFF.md | Project state | Every session | New parent task |
| prompt.md | AI instructions | Task changes | Process updates |
| plan-parent.md | PRD template | Major task type | Template improvements |

## For New AI Agents

When starting work:
1. Read AGENT-HANDOFF.md first
2. Receive prompt.md as instructions
3. Use plan-parent.md for creating PRDs
4. Archive before major changes
5. Update all files before ending session

Remember: These files are the institutional memory of the project. Treat them with care and maintain them diligently. 