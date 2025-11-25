# Git Commit History Analysis

Repomix can include git commit history to help AI understand how a codebase evolved.

## Quick Start

```bash
# Full analysis with diffs (recommended for detailed work)
repomix --include-commit-history --commit-patch-detail full

# Lighter analysis without diffs
repomix --include-commit-history --commit-patch-detail metadata

# Specific commit range
repomix --include-commit-history --commit-range "v1.0..HEAD"
```

## Patch Detail Levels

| Level | Output Size | Contains | Best For |
|-------|-------------|----------|----------|
| `full` | Large (~3x) | Complete diffs | Detailed code review |
| `stat` | Medium | Change statistics | Overview of changes |
| `files` | Small | Filenames only | Quick scan |
| `metadata` | Smallest | No patches | Commit messages only |

**Recommendation**: Use `full` when you need to analyze actual code changes. The larger output is worth it.

## Options Reference

```bash
--include-commit-history     # Enable commit history analysis
--commit-range <range>       # Range to analyze (default: HEAD~50..HEAD)
--commit-patch-detail <lvl>  # full, stat, files, metadata (default: stat)
--no-commit-graph            # Skip ASCII/Mermaid graph generation
--no-git-tags                # Exclude tag information
--no-commit-patches          # Metadata only (same as metadata detail level)
```

## Understanding the Output

The output includes:
- **Commit metadata**: hash, author name/email, committer name/email, date, message, body
- **Visual graph**: ASCII art and Mermaid diagrams showing branch/merge topology (uses git's `--all` flag to show how branches connect and merge, providing full context of the repository structure within the specified range)
- **Git tags**: Tag names mapped to commit hashes
- **File changes**: List of files modified in each commit
- **Patches**: Diff output at the configured detail level

The raw metadata (especially author/committer email addresses) allows AI systems to identify patterns in development practices.

## Tips for Better Results

1. **Choose the right detail level**: Use `full` for code review, `metadata` for quick overview
2. **Set appropriate commit range**: Analyze specific feature branches with `--commit-range "main..feature-branch"`
3. **Combine with file filtering**: `--include "src/**/*.ts"` to focus on relevant files

## Example Workflow

```bash
# 1. Generate analysis of recent work
repomix --include-commit-history --commit-range "v1.0..HEAD" \
  --commit-patch-detail full -o analysis.xml

# 2. Extract specific commit details
grep -A 100 'hash="abc123"' analysis.xml

# 3. Find commits by author
grep 'email="developer@example.com"' analysis.xml
```
