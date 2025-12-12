# Agent Skills Generation

Repomix can generate [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) format output, creating a structured Skills directory that can be used as a reusable codebase reference for AI assistants.

This feature is particularly powerful when you want to reference implementations from remote repositories. By generating Skills from open source projects, you can easily ask Claude to reference specific patterns or implementations while working on your own code.

Instead of generating a single packed file, Skills generation creates a structured directory with multiple reference files optimized for AI comprehension and grep-friendly searching.

> [!NOTE]
> This is an experimental feature. The output format and options may change in future releases based on user feedback.

## Basic Usage

Generate Skills from your local directory:

```bash
# Generate Skills from current directory
repomix --skill-generate

# Generate with custom Skills name
repomix --skill-generate my-project-reference

# Generate from specific directory
repomix path/to/directory --skill-generate

# Generate from remote repository
repomix --remote https://github.com/user/repo --skill-generate
```

## Skills Location Selection

When you run the command, Repomix prompts you to choose where to save the Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Available across all projects on your machine
2. **Project Skills** (`.claude/skills/`) - Shared with your team via git

If the Skills directory already exists, you'll be prompted to confirm overwriting it.

> [!TIP]
> When generating Project Skills, consider adding them to `.gitignore` to avoid committing large files:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Generated Structure

The Skills are generated with the following structure:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Main Skills metadata & documentation
└── references/
    ├── summary.md              # Purpose, format, and statistics
    ├── project-structure.md    # Directory tree with line counts
    ├── files.md                # All file contents (grep-friendly)
    └── tech-stack.md           # Languages, frameworks, dependencies
```

### File Descriptions

#### SKILL.md

The main Skills file containing:
- Skills name, description, and project info
- File count, line count, and token count
- Overview of how to use the Skills
- File locations and format explanation
- Common use cases and tips

#### references/summary.md

Contains:
- **Purpose**: Explains this is a reference codebase for AI consumption
- **File Structure**: Documents what's in each reference file
- **Usage Guidelines**: How to use the Skills effectively
- **Statistics**: Breakdown by file type, language, and largest files

#### references/project-structure.md

Directory tree with line counts per file for easy file discovery:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

All file contents with syntax highlighting headers, optimized for grep-friendly searching:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Auto-detected tech stack from dependency files:
- **Languages**: TypeScript, JavaScript, Python, etc.
- **Frameworks**: React, Next.js, Express, Django, etc.
- **Runtime Versions**: Node.js, Python, Go, etc.
- **Package Manager**: npm, pnpm, poetry, etc.
- **Dependencies**: All direct and dev dependencies
- **Config Files**: All detected configuration files

Detected from files like: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, etc.

## Auto-Generated Skills Names

If no name is provided, Repomix auto-generates one using this pattern:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalized to kebab-case)
```

Skills names are:
- Converted to kebab-case (lowercase, hyphen-separated)
- Limited to 64 characters maximum
- Protected against path traversal

## Integration with Repomix Options

Skills generation respects all standard Repomix options:

```bash
# Generate Skills with file filtering
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Generate Skills with compression
repomix --skill-generate --compress

# Generate Skills from remote repository
repomix --remote yamadashy/repomix --skill-generate

# Generate Skills with specific output format options
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Documentation-Only Skills

Using `--include`, you can generate Skills containing only the documentation from a GitHub repository. This is useful when you want Claude to reference specific library or framework documentation while working on your code:

```bash
# Claude Code Action documentation
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Vite documentation
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# React documentation
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Limitations

The `--skill-generate` option cannot be used with:
- `--stdout` - Skills output requires writing to filesystem
- `--copy` - Skills output is a directory, not copyable to clipboard

## Using Generated Skills

Once generated, you can use the Skills with Claude:

1. **Claude Code**: The Skills are automatically available if saved to `~/.claude/skills/` or `.claude/skills/`
2. **Claude Web**: Upload the Skills directory to Claude for codebase analysis
3. **Team Sharing**: Commit `.claude/skills/` to your repository for team-wide access

## Example Workflow

### Creating a Personal Reference Library

```bash
# Clone and analyze an interesting open source project
repomix --remote facebook/react --skill-generate react-reference

# The Skills are saved to ~/.claude/skills/react-reference/
# Now you can reference React's codebase in any Claude conversation
```

### Team Project Documentation

```bash
# In your project directory
cd my-project

# Generate Skills for your team
repomix --skill-generate

# Choose "Project Skills" when prompted
# The Skills are saved to .claude/skills/repomix-reference-my-project/

# Commit and share with your team
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Related Resources

- [Claude Code Plugins](/guide/claude-code-plugins) - Learn about Repomix plugins for Claude Code
- [MCP Server](/guide/mcp-server) - Alternative integration method
- [Code Compression](/guide/code-compress) - Reduce token count with compression
- [Configuration](/guide/configuration) - Customize Repomix behavior
