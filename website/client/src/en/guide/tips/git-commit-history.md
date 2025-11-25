# Git Commit History Analysis

Repomix can include git commit history to help AI understand how a codebase evolved.

## Quick Start

```bash
# Default: stat level (per-file change counts via git log --stat)
repomix --include-commit-history

# Full analysis with line-by-line diffs (git log --patch)
repomix --include-commit-history patch

# Lighter analysis without diffs
repomix --include-commit-history metadata

# Specific commit range (git log range syntax)
repomix --include-commit-history --commit-range "v1.0..HEAD"
```

## Patch Detail Levels

Control diff content by passing a level to `--include-commit-history` (maps to git log parameters):

| Level | Git Param | Output Size | Contains | Best For |
|-------|-----------|-------------|----------|----------|
| `patch` | `--patch` | Large (~3x) | Line-by-line diffs | Detailed code review |
| `stat` | `--stat` | Medium | Per-file change counts | Overview of changes (default) |
| `name-only` | `--name-only` | Small | Filenames only | Quick scan |
| `metadata` | (none) | Smallest | No patches | Commit messages only |

**Recommendation**: Use `patch` when you need to analyze actual code changes. The larger output is worth it.

## Options Reference

```bash
--include-commit-history [level]  # Enable with optional level: patch, stat, name-only, metadata (default: stat)
--commit-range <range>            # Range to analyze (default: HEAD~50..HEAD)
```

**Advanced config file options** for fine-grained control:
- `includeCommitGraph`: Include/exclude ASCII and Mermaid graph visualization (default: true)
- `includeGitTags`: Include/exclude tag information (default: true)
- `includeCommitPatches`: Include/exclude all patch content (default: true)

## Understanding the Output

The output includes:
- **Commit metadata**: hash, author name/email, committer name/email, date, message, body
- **Visual graph**: ASCII art and Mermaid diagrams showing branch/merge topology (uses git's `--all` flag to show how branches connect and merge, providing full context of the repository structure within the specified range)
- **Git tags**: Tag names mapped to commit hashes
- **File changes**: List of files modified in each commit
- **Patches**: Diff output at the configured detail level

The raw metadata (especially author/committer email addresses) allows AI systems to identify patterns in development practices.

## Tips for Better Results

1. **Choose the right detail level**: Use `patch` for code review, `metadata` for quick overview
2. **Set appropriate commit range**: Analyze specific feature branches with `--commit-range "main..feature-branch"`
3. **Combine with file filtering**: `--include "src/**/*.ts"` to focus on relevant files

## Example Workflow

```bash
# 1. Generate analysis of recent work
repomix --include-commit-history patch --commit-range "v1.0..HEAD" -o analysis.xml

# 2. Extract specific commit details
grep -A 100 'hash="abc123"' analysis.xml

# 3. Find commits by author
grep 'email="developer@example.com"' analysis.xml
```
