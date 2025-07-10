# Parent Task Development Plan Request

## 🎯 CURRENT TASK CONTEXT
<!-- UPDATE THIS SECTION FOR EACH NEW PARENT TASK -->
**Current Focus**: PDF Generation and Export Functionality  
**Developer**: Developer R  
**Branch**: R (or feature branches off R)  

### Task Resources
- **Task List**: `docs/tasks/complete/developer-r-tasks.md` - Developer R's specific assignments
- **Roadmap**: `docs/planning/MFD-roadmap.md` - Overall developer task breakdown
- **Project State**: `AGENT-HANDOFF.md` - Current implementation status

### Developer Focus Areas
- PDF generation and export functionality
- Legal document formatting (spacing, margins, fonts)
- Signature block implementation and positioning
- Document persistence and management

### Task-Specific Context
- All development inside Docker container
- CLI tool with completed multi-agent architecture
- Key inputs: Template JSON, Explanation markdown, YAML scenarios
- Output: Generated legal documents via OpenAI API
- Current goal: Adding PDF export capability with legal formatting

<!-- END OF TASK-SPECIFIC SECTION -->

## 🔧 CORE PROCESS

### Overview
This prompt follows the PRD generation process defined in `.cursor/rules/create-feature-prd.mdc`. The output creates:
- PRD: `prd-parent-task-[TASK-ID].md`
- Checklist: `tasks-parent-[TASK-ID]-checklist.md`  
- Details: `tasks-parent-[TASK-ID].[SUBTASK-ID]-detailed.md` (one per subtask)

### Critical Principles
- **Tech Stack**: IMMUTABLE as defined in `docs/architecture/tech-stack.md`
- **Branch Strategy**: All work on developer branch or feature branches
- **Documentation First**: Consult internal docs before web search
- **Testing Required**: TDD approach with tests for each subtask

## 📚 INTERNAL DOCUMENTATION

Before implementing any task, consult `.cursor/rules/custom/internal-docs-guide.mdc` for:
- Complete list of indexed documentation (TypeScript, Jest, Commander.js, etc.)
- Code examples and best practices for each technology
- Version-specific information matching our dependencies

**Always prefer internal documentation over web searches** - it's faster and version-matched.

## 📋 DEVELOPMENT PLAN STRUCTURE

Generate a comprehensive plan including:

### 1. Task Overview
- Summary of what this parent task accomplishes
- How it fits into overall architecture
- Dependencies on other parent tasks
- What becomes possible after completion

### 2. Technical Design
- Detailed architecture for this component
- Key interfaces and data structures
- Integration points with other components
- Technology-specific considerations (approved stack only)
- Container/environment considerations

### 3. Implementation Sequence
- Ordered list of subtasks with rationale
- Critical path identification
- Parallel work opportunities
- Risk points that might cause rework

### 4. Detailed Subtask Breakdown
For each subtask:
- **Description**: What exactly needs to be built
- **Implementation Steps**: Concrete steps for junior developers
- **Code Examples**: Sample code or pseudocode
- **File Changes**: Which files to create/modify
- **Testing Approach**: How to verify it works
- **Definition of Done**: Clear completion criteria
- **Common Pitfalls**: What to watch out for

### 5. Testing Strategy
- Unit test requirements
- Integration test scenarios
- Manual testing procedures
- Mock data or services needed
- API mock testing considerations

### 6. Integration Plan
- How to integrate with existing code
- API contracts with other components
- Configuration requirements
- Migration steps if refactoring

### 7. Documentation Requirements
- Code documentation standards
- README updates needed
- API documentation
- Usage examples

### 8. Functional Requirements
- Numbered list of specific functionalities
- Clear, implementation-focused requirements
- Technical specifications

### 9. Success Metrics
- How to measure successful completion
- Performance benchmarks if applicable
- Quality metrics

### 10. Next Steps
- What becomes possible after this task
- Which parent tasks should follow
- Future enhancement opportunities

## 🧪 TESTING PROCEDURE (MANDATORY)

### For Each Subtask:

1. **Create Test Files First**
   - Write tests BEFORE or ALONGSIDE implementation
   - Tests go in `__tests__/` mirroring `/src/` structure
   - Include positive and negative test cases
   - Test edge cases and error conditions

2. **Verify Tests Pass**
   - Run `npm test` after each subtask
   - ALL tests must pass before proceeding
   - Fix failing tests immediately
   - Never skip or comment out failing tests

3. **Test Coverage Requirements**
   - Each new function needs at least one test
   - Critical logic needs multiple scenarios
   - Error handling paths must be tested
   - Integration points need specific tests

4. **Manual Testing When Appropriate**
   - Create temporary test scripts for complex features
   - Document manual testing steps
   - Clean up temporary files after verification
   - Note manual tests that should become automated

5. **Test File Naming**
   - Match source files: `feature.ts` → `feature.test.ts`
   - Use descriptive test names
   - Group related tests in describe blocks

### Container Testing
- Run tests inside Docker: `docker exec casethread-dev npm test`
- Mock external API responses
- Test file loading and parsing thoroughly
- Verify output formatting

### Example Test Structure:
```typescript
// For src/parsers/data-extractor.ts
// Create __tests__/parsers/data-extractor.test.ts

describe('DataExtractor', () => {
  describe('extractUserStories', () => {
    it('should extract well-formed user stories', () => {
      // Test implementation
    });
    
    it('should handle missing components gracefully', () => {
      // Test error cases
    });
  });
});
```

## 📁 FILE MANAGEMENT

### Output Structure
- **PRD**: `/docs/tasks/prd-parent-task-[TASK-ID].md`
- **Checklist**: `/docs/tasks/tasks-parent-[TASK-ID]-checklist.md`
- **Details**: Multiple files per subtask for manageability

### Detail File Strategy
1. **One file per subtask** (not per parent task)
   - Format: `tasks-parent-[TASK-ID].[SUBTASK-ID]-detailed.md`
   - Example: `tasks-parent-3.1-detailed.md`
   - Typically 100-300 lines per file

2. **Checklist References**:
   ```markdown
   - [ ] 3.0 Implement core services
     - [ ] 3.1 Create TypeScript types (Details: tasks-parent-3.1-detailed.md)
     - [ ] 3.2 Implement validator (Details: tasks-parent-3.2-detailed.md)
   ```

3. **Benefits**:
   - Avoids file generation failures
   - Easier navigation and updates
   - Enables parallel work
   - Simplifies version control

### Archival Process
Before creating new task files:
1. Check for existing files with same ID
2. Move to `docs/tasks/complete/` if they exist
3. Archive plan-parent.md when task context changes significantly

## 🎯 TARGET AUDIENCE

Primary reader: **Junior developer** implementing their first CLI project

Requirements must be:
- Explicit and unambiguous
- Free of unnecessary jargon
- Include concrete examples
- Provide clear success criteria

## 📝 FORMATTING STANDARDS

- Clear markdown formatting
- Code blocks with language tags
- Tables for structured data
- Actual file paths and function names
- Reference specific PRD lines where applicable

---
**Note**: Always run `npm test` first when picking up work to understand current state.

## Parent Task to Plan:
[Insert specific parent task details here]