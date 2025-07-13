# GitHub Projects Setup Guide

## 🚀 5-Minute Setup

### 1. Create Project Board
1. Go to your GitHub repository
2. Click "Projects" tab → "New project"
3. Choose "Board" view
4. Name it "CaseThread Development"

### 2. Set Up Columns

Create these 5 columns:
- **📋 Backlog** - All future tasks
- **🎯 Sprint** - Current week's tasks  
- **🏃 In Progress** - Actively working (limit: 1-2 per dev)
- **👀 Review** - PRs ready for review
- **✅ Done** - Completed this sprint

### 3. Create Labels

Go to Issues → Labels and create:

**Priority:**
- `P0-critical` (red) - Drop everything
- `P1-high` (orange) - This sprint
- `P2-medium` (yellow) - Next sprint
- `P3-low` (green) - Someday

**Type:**
- `feature` - New functionality
- `bug` - Something broken
- `tech-debt` - Refactoring
- `docs` - Documentation

**Component:**
- `ui` - Frontend/Electron
- `core` - Business logic
- `api` - OpenAI integration
- `data` - Storage/DB

### 4. Issue Templates

Create `.github/ISSUE_TEMPLATE/feature.md`:
```markdown
---
name: Feature
about: New feature or enhancement
labels: feature
---

## Summary
Brief description of the feature

## Acceptance Criteria
- [ ] Specific requirement 1
- [ ] Specific requirement 2

## Technical Notes
Any implementation considerations

## Estimated Time
- [ ] 1-2 hours
- [ ] 3-4 hours  
- [ ] 1 day
- [ ] 2-3 days
```

### 5. Automation Rules

In Project settings → Workflows:
1. When issue created → Add to Backlog
2. When PR linked → Move to Review
3. When PR merged → Move to Done

## 📅 Weekly Workflow

### Monday: Sprint Planning (30 min)
1. Move completed items to "Archive"
2. Review Backlog together
3. Move week's tasks to Sprint column
4. Assign owners

### Daily: Task Management
1. Move tasks to "In Progress" when starting
2. Create PR when ready → auto-moves to Review
3. Review each other's PRs
4. Merge → auto-moves to Done

### Friday: Retrospective (15 min)
1. What went well?
2. What was challenging?
3. Update priorities for next week

## 🎯 Best Practices

### Writing Good Issues
```markdown
Title: Add template validation for patent applications

Currently, users can submit incomplete patent templates.

We need to:
- Validate required fields
- Show clear error messages
- Prevent submission until valid

Acceptance:
- [ ] All required fields checked
- [ ] User-friendly error messages
- [ ] Tests for validation logic
```

### Task Sizing
- **Small (1-4 hours):** Single file/component
- **Medium (1-2 days):** Feature with tests
- **Large (3-5 days):** Multiple components
- **Too big:** Break it down!

### PR Hygiene
- Link to issue: "Closes #123"
- Descriptive title
- Summary of changes
- Screenshots for UI changes
- Request specific reviewer

## 💡 Pro Tips

1. **Limit WIP:** Max 2 tasks in progress per person
2. **Daily updates:** Comment on your active issues
3. **Block early:** Flag blockers immediately
4. **Small PRs:** Easier to review, faster to merge
5. **Close the loop:** Update issue when PR merges

## 🚨 Common Pitfalls

❌ **Avoid:**
- Vague issue titles ("Fix bug")
- No acceptance criteria
- Giant PRs (>500 lines)
- Stale "In Progress" items
- Not linking PRs to issues

✅ **Instead:**
- Specific titles ("Fix template validation error on submit")
- Clear completion definition
- Incremental changes
- Daily status updates
- Always link PR → Issue

## 🔗 Quick Links

After setup, bookmark these:
- `[repo]/projects/1` - Your board
- `[repo]/issues/new/choose` - Create issue
- `[repo]/pulls` - Review queue

---

**Remember:** The board is a tool, not a burden. Keep it simple and it'll help you ship faster! 🚀 