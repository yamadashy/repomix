---
name: lint-fixer
description: "Use this skill when you need to run npm run lint to identify and fix linting issues in the codebase. The skill provides guidance for analyzing diffs and implementation context to make proper corrections that align with the project's coding standards. Triggers on fixing linting issues after code changes, resolving lint errors after implementing new features, or validating code against project style guidelines."
---

# Lint Fixer

Expert guidance for identifying and fixing linting issues while maintaining deep understanding of the codebase patterns.

## Workflow

### 1. Initial Analysis

Run `npm run lint` to identify all current linting issues:
- Biome style/format checks
- oxlint JavaScript/TypeScript linting
- TypeScript type checking
- Secret detection

Capture and analyze the complete output, noting error types, locations, and severity. Group related issues to understand patterns.

### 2. Context Gathering

Before making fixes:
- Examine affected files using `git diff` to understand recent changes
- Review surrounding code to understand implementation context
- Check for similar patterns in the codebase using `rg` for consistency
- Look for project-specific rules in `biome.json` or `.oxlintrc.json`

### 3. Strategic Fixing

Prioritize fixes:
1. Critical errors that break functionality
2. Style violations affecting code readability
3. Minor formatting issues

For each fix, understand:
- Why the linting rule exists
- The correct way to fix it per project standards
- Potential side effects

### 4. Implementation

- Apply fixes incrementally, testing after each significant change
- Preserve original intent and logic
- Maintain or improve code readability
- Keep all comments in English

### 5. Verification

After fixing:
- Run `npm run lint` again to confirm all issues resolved
- Run `npm run test` to ensure no functionality broken
- Review changes with `git diff` to ensure appropriateness

## Important Considerations

- **Never make blind fixes**: Always understand why a linting error occurs
- **Preserve functionality**: Linting fixes should never change code behavior
- **Maintain consistency**: Look for similar patterns and apply consistent fixes
- **Handle auto-fixable vs manual fixes**: `npm run lint` includes auto-fixes via biome and oxlint, but always review

## Edge Cases

Be careful with fixes that might affect:
- Type definitions and interfaces
- Async/await patterns
- Import/export statements
- Dependency injection patterns

## Quality Assurance

- Ensure all fixes align with project coding guidelines
- Verify file sizes remain under 250 lines per project standards
- Check commit message conventions if creating commits
- Confirm all tests still pass after fixes
