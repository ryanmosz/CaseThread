# Collaborative Git Workflow for CaseThread

This document defines Git workflows for two developers (R and G) working on the same codebase with isolated development branches. Each developer maintains their own integration branch to avoid conflicts.

## Branch Structure

```
main (protected - only updated by mutual agreement)
├── R (Developer R's integration branch)
│   ├── feature/r-pdf-generation
│   ├── feature/r-signature-blocks
│   └── (other R feature branches)
└── G (Developer G's integration branch)
    ├── feature/g-electron-setup
    ├── feature/g-3-pane-layout
    └── (other G feature branches)
```

## Core Principle
**R and G branches are isolated development environments that only sync with main when both developers explicitly coordinate.**

---

## Workflow 1: INITIAL-SETUP

**Usage**: One-time setup for each developer  
**Frequency**: Once at project start

### Command Sequence:
```bash
# Create personal integration branch from main
git checkout main
git pull origin main
git checkout -b R  # or G for Developer G
git push -u origin R  # or G

# Verify setup
git branch -a
```

---

## Workflow 2: FEATURE-START

**Usage**: Starting a new feature  
**Frequency**: Beginning of each feature

### Command Sequence:
```bash
# Ensure on personal integration branch
git checkout R  # or G

# Create feature branch
git checkout -b feature/r-description  # or feature/g-description

# Push to remote
git push -u origin feature/r-description
```

### Naming Convention:
- Developer R: `feature/r-[description]`
- Developer G: `feature/g-[description]`

---

## Workflow 3: FEATURE-COMMIT

**Usage**: Regular commits during feature development  
**Frequency**: Multiple times per feature

### Command Sequence:
```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "type: description of changes"

# Push to remote
git push origin feature/r-description
```

### Commit Format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code changes
- `test:` - Test changes

---

## Workflow 4: FEATURE-COMPLETE

**Usage**: Completing a feature and merging to personal branch  
**Frequency**: End of each feature

### Command Sequence:
```bash
# On feature branch, ensure all changes committed
git add -A
git commit -m "feat: complete [feature description]"
git push origin feature/r-description

# Switch to personal integration branch
git checkout R  # or G

# Merge feature branch
git merge feature/r-description

# Push personal branch
git push origin R  # or G

# Delete feature branch (optional)
git branch -d feature/r-description
git push origin --delete feature/r-description

# Test thoroughly on personal integration branch
npm test  # or appropriate test command
```

---

## Workflow 5: CROSS-DEV-CHECK

**Usage**: Checking other developer's progress (optional)  
**Frequency**: As needed

### Command Sequence:
```bash
# View other developer's branches
git fetch origin
git branch -r | grep origin/G  # if you're Developer R
git branch -r | grep origin/R  # if you're Developer G

# View their recent commits (without merging)
git log origin/G --oneline -10  # or origin/R
```

**Note**: This is for awareness only. Do NOT merge between R and G branches.

---

## Workflow 6: MAIN-MERGE-PREP

**Usage**: Preparing for coordinated merge to main  
**Frequency**: When feature is ready for production

### Prerequisites:
1. Feature fully tested on personal branch
2. All tests passing
3. Documentation updated
4. Both developers agree to merge

### Communication Steps:
1. Developer initiating: "Ready to merge [feature] to main"
2. Other developer: "Confirmed, ready for main merge"
3. Decide merge order (usually alphabetical: G then R)

---

## Workflow 7: MAIN-MERGE-EXECUTE

**Usage**: Executing coordinated merge to main  
**Frequency**: Only with explicit agreement

### Command Sequence (Both developers should be available):

#### First Developer (e.g., G):
```bash
# Ensure on main and up to date
git checkout main
git pull origin main

# Merge personal branch
git merge G
git push origin main
```

#### Second Developer (e.g., R):
```bash
# Pull updated main
git checkout main
git pull origin main

# Merge personal branch (resolve conflicts if any)
git merge R

# If conflicts exist:
# 1. Resolve conflicts in editor
# 2. git add -A
# 3. git commit -m "merge: resolve conflicts between R and main"

git push origin main
```

#### Both Developers - Update Personal Branches:
```bash
# Update personal branch with main
git checkout R  # or G
git merge main
git push origin R  # or G
```

---

## Workflow 8: EMERGENCY-HOTFIX

**Usage**: Critical fixes that must go to main immediately  
**Frequency**: Rare

### Command Sequence:
```bash
# Create from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Make fix
# ... make changes ...
git add -A
git commit -m "fix: critical issue description"

# Coordinate immediate merge (both developers must agree)
git checkout main
git merge hotfix/critical-issue
git push origin main

# Both developers update their branches
git checkout R  # or G
git merge main
git push origin R  # or G
```

---

## Workflow 9: CONFLICT-RESOLUTION

**Usage**: Resolving conflicts during main merge  
**Frequency**: As needed

### Process:
1. Identify conflicting files
2. Both developers discuss resolution approach
3. Implement resolution
4. Test thoroughly
5. Document resolution in commit message

### Commands:
```bash
# After merge conflict
git status  # see conflicted files

# Edit files to resolve conflicts
# Look for <<<<<<< ======= >>>>>>> markers

# After resolving
git add -A
git commit -m "merge: resolve conflicts - [description of resolution]"
git push origin main
```

---

## Workflow 10: ROLLBACK

**Usage**: Reverting problematic main merge  
**Frequency**: Emergency only

### Command Sequence:
```bash
# Both developers must agree to rollback

# Find commit to revert to
git log --oneline -10

# Revert main
git checkout main
git revert HEAD  # or specific commit
git push origin main

# Update personal branches
git checkout R  # or G
git merge main
git push origin R  # or G
```

---

## Best Practices

1. **Communication is Key**
   - Use comments in PRs or Slack
   - Announce major changes
   - Coordinate before main merges

2. **Testing**
   - Test on feature branch
   - Test again on personal branch
   - Test after main merge

3. **Branch Hygiene**
   - Delete merged feature branches
   - Keep personal branches clean
   - Don't accumulate too many unmerged features

4. **Documentation**
   - Update docs with code changes
   - Document complex merges
   - Keep README current

## Common Scenarios

### Scenario 1: Normal Feature Development
1. Developer R: `FEATURE-START` → develop → `FEATURE-COMMIT` (multiple) → `FEATURE-COMPLETE`
2. Developer G: Same process independently
3. No interaction needed until ready for main

### Scenario 2: Coordinated Release
1. Both developers complete features on personal branches
2. Communication: "Ready for main merge"
3. `MAIN-MERGE-PREP` → `MAIN-MERGE-EXECUTE`
4. Both update personal branches from main

### Scenario 3: Developer G needs R's completed feature
1. Wait for coordinated main merge
2. After merge, pull from main to get the feature
3. Do NOT merge directly between R and G branches

---

## Important Notes

1. **Never push directly to main** without coordination
2. **R and G branches are long-lived** - don't delete them
3. **Feature branches are short-lived** - delete after merging
4. **Always communicate** before main merges
5. **Both developers must agree** for any main branch changes

---

*This workflow ensures stable development with minimal conflicts while maintaining code quality and team coordination.* 