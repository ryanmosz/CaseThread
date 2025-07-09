# Parent Task Development Plan Request

**IMPORTANT**: This prompt follows the PRD generation process defined in `.cursor/rules/create-feature-prd.mdc`. The output will create a new file named `prd-parent-task-[TASK-ID].md` in the `/docs/tasks/` directory.

## Context

**UPDATE**: We are now working from the **Developer R Tasks List** as defined in the collaborative development plan.

I need a detailed development plan for a specific parent task from the Developer R implementation plan. The full project context is available in:
- **docs/planning/developer-r-tasks.md** - Developer R's specific task assignments (PRIMARY REFERENCE)
- **docs/planning/MFD-roadmap.md** - Overall developer task breakdown and timeline
- **docs/planning/MFD-gui-architecture-decisions.md** - Locked GUI architecture (3-pane design)
- **docs/architecture/tech-stack.md** - IMMUTABLE tech stack (never change these technologies)
- **AGENT-HANDOFF.md** - Current project state

**Developer R Focus Areas**:
- PDF generation and export functionality
- Legal document formatting (spacing, margins, fonts)
- Signature block implementation and positioning
- Backend API development for GUI integration
- Document persistence and management

**CRITICAL**: 
1. The tech stack defined in docs/architecture/tech-stack.md is immutable. All implementation must use exactly these technologies and versions. Do not suggest alternatives or upgrades.
2. We are working on the R branch. All development happens on R branch or feature branches off R.
3. Coordinate with Developer G (working on GUI) for integration points.

**CaseThread Specific Context**:
- All development happens inside Docker container
- Multi-agent architecture with ChromaDB integration
- Key inputs: Template JSON, Explanation markdown, YAML scenario files
- Output: Generated legal documents via OpenAI API
- GUI: 3-pane Electron app with document management, viewer/editor, and features

## Using Internal Documentation

**IMPORTANT**: Before implementing any task, consult the **Internal Documentation Guide** at `.cursor/rules/custom/internal-docs-guide.mdc`. This guide provides:
- Complete list of all indexed documentation (TypeScript, Jest, Commander.js, LangGraph, etc.)
- How to effectively query internal docs instead of using web search
- Code examples and best practices for each technology
- Version-specific information matching our dependencies

**Note**: For CaseThread, the relevant docs are TypeScript, Jest, Commander.js. LangGraph and n8n references can be ignored for this project.

**Always prefer internal documentation over web searches** - it's faster, more accurate, and version-matched to our project.

## Process

Generate a comprehensive development plan for the parent task shown at the bottom of this prompt. The plan should include:

### 1. **Task Overview**
   • Summary of what this parent task accomplishes
   • How it fits into the overall CaseThread CLI POC architecture
   • Dependencies on other parent tasks
   • What will be possible after this task is complete

### 2. **Technical Design**
   • Detailed architecture for this component
   • Key interfaces and data structures
   • Integration points with other components
   • Technology-specific considerations (using ONLY the approved tech stack)
   • Docker container considerations (if applicable)

### 3. **Implementation Sequence**
   • Ordered list of subtasks with rationale for sequence
   • Critical path identification
   • Parallel work opportunities
   • Risk points that might cause rework

### 4. **Detailed Subtask Breakdown**
   For each subtask provide:
   • **Description**: What exactly needs to be built
   • **Implementation Steps**: Concrete steps a junior developer can follow
   • **Code Examples**: Sample code or pseudocode where helpful
   • **File Changes**: Which files to create/modify
   • **Testing Approach**: How to verify it works
   • **Definition of Done**: Clear completion criteria
   • **Common Pitfalls**: What to watch out for

### 5. **Testing Strategy**
   • Unit test requirements for this component
   • Integration test scenarios
   • Manual testing procedures
   • Mock data or services needed
   • OpenAI API mock testing (when applicable)

### 6. **Integration Plan**
   • How to integrate with existing code
   • API contracts with other components
   • Configuration requirements
   • Migration steps if refactoring

### 7. **Documentation Requirements** 
   • Code documentation standards
   • README updates needed
   • API documentation
   • Usage examples

### 8. **Functional Requirements**
   - Numbered list of specific functionalities
   - Clear, implementation-focused requirements
   - Technical specifications

### 9. **Success Metrics**
   • How to measure successful completion
   • Performance benchmarks if applicable
   • Quality metrics

### 10. **Next Steps**
   • What becomes possible after this task
   • Which parent tasks should follow
   • Future enhancement opportunities

## Testing Procedure Requirements

**CRITICAL**: Every task implementation MUST follow this testing procedure:

### For Each Subtask:
1. **Create Test Files First**
   - Write comprehensive test files BEFORE or ALONGSIDE implementation
   - Test files go in `__tests__/` mirroring the `/src/` structure
   - Include both positive and negative test cases
   - Test edge cases and error conditions

2. **Verify Tests Pass**
   - Run `npm test` after implementing each subtask
   - ALL tests must pass before moving to the next task
   - Fix any failing tests immediately
   - Never skip or comment out failing tests

3. **Test Coverage Requirements**
   - Each new function/method needs at least one test
   - Critical logic needs multiple test scenarios
   - Error handling paths must be tested
   - Integration points need specific tests

4. **Manual Testing When Appropriate**
   - Create temporary test scripts for complex features
   - Document manual testing steps performed
   - Clean up temporary test files after verification
   - Note any manual tests that should become automated tests

5. **Test File Naming**
   - Match source file names: `feature.ts` → `feature.test.ts`
   - Use descriptive test names that explain what's being tested
   - Group related tests in describe blocks

### CaseThread Testing Considerations:
- Run all tests inside Docker container: `docker exec casethread-dev npm test`
- Mock OpenAI API responses for unit tests
- Test template loading and YAML parsing thoroughly

### Example Test Implementation:
```typescript
// For a parser in src/parsers/data-extractor.ts
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

**IMPORTANT**: If you're picking up work from a previous agent, always run `npm test` first to understand the current state. Never assume tests are passing.

## Formatting Requirements

- Use clear markdown formatting
- Include code blocks with language tags
- Use tables where helpful for structured data
- Keep language clear for junior developers
- Include actual file paths and function names
- Reference specific lines from the PRD where applicable

### Step 3: Task List Generation

Following the Parent Task Development Plan Request, I will generate detailed task lists using the format from `generate-tasks.mdc`:

1. **tasks-parent-[TASK-ID]-checklist.md** - Checkbox list with task codes
2. **tasks-parent-[TASK-ID].[SUBTASK-ID]-detailed.md** - One detail file per subtask

### Step 4: Detailed Task File Management (One File Per Subtask)

**IMPORTANT**: To avoid file generation issues and keep documentation manageable, create individual detail files for each subtask.

1. **File Structure**: Create one detail file per subtask (not parent task)
   - Format: `tasks-parent-[TASK-ID].[SUBTASK-ID]-detailed.md`
   - Example: `tasks-parent-3.1-detailed.md`, `tasks-parent-3.2-detailed.md`, etc.
   - Each file focuses on a single subtask's implementation details

2. **File Content**: Each subtask detail file should include:
   - Reference to parent task (e.g., "Part of Parent Task 3.0: Implement Core Services")
   - Complete implementation details for that specific subtask
   - All sub-subtasks with detailed steps
   - Code examples and testing procedures
   - Typically 100-300 lines per file (more manageable than 500+ line files)

3. **Checklist References**: Update the checklist to indicate detail file locations:
   - Example format:
     ```markdown
     - [ ] 3.0 Implement core services
       - [ ] 3.1 Create TypeScript type definitions (Details: tasks-parent-3.1-detailed.md)
       - [ ] 3.2 Implement validator utility (Details: tasks-parent-3.2-detailed.md)
       - [ ] 3.3 Create logger utility (Details: tasks-parent-3.3-detailed.md)
     ```

4. **Benefits of This Approach**:
   - Avoids file generation failures from overly large files
   - Makes documentation easier to navigate and update
   - Allows parallel work on different subtasks
   - Simplifies version control and reviewing changes

## Output

The final output will be saved as:
- **PRD**: `/docs/tasks/prd-parent-task-[TASK-ID].md`
- **Checklist**: `/docs/tasks/tasks-parent-[TASK-ID]-checklist.md`
- **Details**: Multiple files - `/docs/tasks/tasks-parent-[TASK-ID].[SUBTASK-ID]-detailed.md`

## Target Audience

The primary reader is a **junior developer** implementing their first CLI project. Requirements must be:
- Explicit and unambiguous
- Free of unnecessary jargon
- Include concrete examples
- Provide clear success criteria

Remember to move any previous *plan*, *checklist* and *detailed* file to `docs/tasks/complete/` first! 


## Parent Task to Plan: