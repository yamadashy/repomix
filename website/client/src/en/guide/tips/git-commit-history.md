# Git Commit History Analysis

Repomix can include git commit history to help AI understand how a codebase evolved. The git log integration uses orthogonal parameters that mirror git's own structure, giving you fine-grained control over output format and enhancements.

## Quick Start

```bash
# Simple commit log (default name-only format)
repomix --include-logs

# With line-by-line diffs (git log --patch)
repomix --include-logs --patch

# With commit graph visualization (git log --graph --all)
repomix --include-logs --graph

# Full analysis: patches + graph + file operations summary
repomix --include-logs --patch --graph --summary

# Specific commit range (both .. and ... syntaxes supported)
repomix --include-logs --commit-range "v1.0..HEAD"
repomix --include-logs --commit-range "main...feature-branch"
```

## Orthogonal Parameter Design

The git log flags are organized into two categories that can be combined:

### Diff Format Flags (Mutually Exclusive)

Only one can be used at a time - these match git log parameters exactly:

| Flag | Git Parameter | Output Size | Contains | Best For |
|------|---------------|-------------|----------|----------|
| `--patch` | `--patch` | Large (~3x) | Line-by-line diffs | Detailed code review |
| `--stat` | `--stat` | Medium | Per-file change counts | Overview of changes |
| `--numstat` | `--numstat` | Small | Numeric +/- per file | Statistical analysis |
| `--shortstat` | `--shortstat` | Small | One-line summary | Quick metrics |
| `--dirstat` | `--dirstat` | Small | Directory distribution | Architecture changes |
| `--name-only` | `--name-only` | Smallest | Filenames only | File tracking (default) |
| `--name-status` | `--name-status` | Small | Files with A/M/D/R status | Change type tracking |
| `--raw` | `--raw` | Small | SHA hashes and modes | Low-level git analysis |

### Output Verbosity & Graph Options (Combinable)

These can be used together and with any diff format:

| Flag | Git Parameter | Purpose |
|------|---------------|---------|
| `--graph` | `--graph --all` | Include ASCII and Mermaid commit graph visualization |
| `--summary` | `--summary` | Show file operations (creates, renames, mode changes) |

## Commit Range Syntax

Supports both git range syntaxes:

```bash
# Two-dot range: commits in <to> not in <from>
repomix --include-logs --commit-range "HEAD~20..HEAD"
repomix --include-logs --commit-range "v1.0..v2.0"
repomix --include-logs --commit-range "main..feature-branch"

# Three-dot range: symmetric difference (commits unique to each branch)
repomix --include-logs --commit-range "main...feature-branch"
repomix --include-logs --commit-range "HEAD~20...HEAD"
```

Default: `HEAD~50..HEAD`

## Configuration File Options

For fine-grained control beyond CLI flags:

```json
{
  "output": {
    "git": {
      "includeLogs": true,
      "commitRange": "HEAD~50..HEAD",
      "commitPatchDetail": "stat",
      "includeCommitGraph": true,
      "includeGitTags": true,
      "includeCommitPatches": true,
      "includeSummary": false
    }
  }
}
```

- `includeCommitGraph`: Include/exclude ASCII and Mermaid graph visualization (default: false)
- `includeGitTags`: Include/exclude tag information (default: true)
- `includeCommitPatches`: Include/exclude all patch content (default: true)
- `includeSummary`: Include/exclude file operations summary (default: false)

## Understanding the Output

The output includes:

- **Commit metadata**: hash, author name/email, committer name/email, date, message, body
- **Visual graph** (with `--graph`): ASCII art and Mermaid diagrams showing branch/merge topology (uses git's `--all` flag to show how branches connect and merge, providing full context of the repository structure within the specified range)
- **Git tags**: Tag names mapped to commit hashes
- **File changes**: List of files modified in each commit
- **Patches**: Diff output at the configured detail level

The raw metadata (especially author/committer email addresses) allows AI systems to identify patterns in development practices.

## Example Workflows

### Code Review Workflow
```bash
# Review feature branch changes with full diffs and graph
repomix --include-logs --patch --graph --commit-range "main..feature-branch"
```

### Statistical Analysis
```bash
# Analyze change distribution across directories
repomix --include-logs --dirstat --commit-range "v1.0..v2.0"

# Get numeric addition/deletion counts
repomix --include-logs --numstat --commit-range "HEAD~100..HEAD"
```

### Change Type Tracking
```bash
# Track which files were added, modified, or deleted
repomix --include-logs --name-status --summary --commit-range "main...develop"
```

### Quick Scans
```bash
# Just see which files changed (minimal output)
repomix --include-logs --name-only --commit-range "HEAD~10..HEAD"

# One-line summary of total changes
repomix --include-logs --shortstat --commit-range "v2.0..HEAD"
```

### Architecture Evolution
```bash
# Understand how project structure evolved
repomix --include-logs --graph --dirstat --commit-range "v1.0..v3.0"
```

## Tips for Better Results

1. **Choose the right diff format**: Use `--patch` for code review, `--name-only` for quick overview, `--numstat` for statistics
2. **Use commit ranges strategically**: Analyze specific features with `main..feature-branch` or use three-dot syntax `main...feature-branch` for symmetric difference
3. **Combine flags thoughtfully**: `--patch --graph --summary` gives comprehensive analysis but large output
4. **Filter files first**: Combine with `--include "src/**/*.ts"` to focus on relevant files
5. **Leverage both range syntaxes**: Two-dot (`..`) for "what's new in this branch", three-dot (`...`) for "what's different between branches"

## Advanced Examples

```bash
# Full forensic analysis of a feature
repomix --include-logs --patch --graph --summary \
  --commit-range "main..feature-auth" \
  --include "src/**/*.ts" \
  -o feature-auth-analysis.xml

# Compare two development branches
repomix --include-logs --stat --graph \
  --commit-range "develop...staging"

# Track file renames and mode changes
repomix --include-logs --name-status --summary \
  --commit-range "v2.0..HEAD"

# Low-level git object analysis
repomix --include-logs --raw --commit-range "HEAD~5..HEAD"
```
