# Skill Generation

Repomix can generate [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills) format output, creating a structured skill directory that can be used as a reusable codebase reference for AI assistants.

## What is Skill Generation?

Skill generation transforms your codebase into a well-organized Claude Agent Skill. Instead of generating a single packed file, it creates a structured directory with multiple reference files optimized for AI comprehension and grep-friendly searching.

## Basic Usage

Generate a skill from your local directory:

```bash
# Generate a skill from current directory
repomix --skill-generate

# Generate with custom skill name
repomix --skill-generate my-project-reference

# Generate from specific directory
repomix --skill-generate path/to/directory

# Generate from remote repository
repomix --remote https://github.com/user/repo --skill-generate
```

## Skill Location Selection

When you run the command, Repomix prompts you to choose where to save the skill:

1. **Personal Skills** (`~/.claude/skills/`) - Available across all projects on your machine
2. **Project Skills** (`.claude/skills/`) - Shared with your team via git

If the skill directory already exists, you'll be prompted to confirm overwriting it.

## Generated Structure

The skill is generated with the following structure:

```
.claude/skills/<skill-name>/
├── SKILL.md                    # Main skill metadata & documentation
└── references/
    ├── summary.md              # Purpose, format, and statistics
    ├── project-structure.md    # Directory tree with line counts
    ├── files.md                # All file contents (grep-friendly)
    └── tech-stack.md           # Languages, frameworks, dependencies
```

### File Descriptions

#### SKILL.md

The main skill file containing:
- Skill name, description, and project info
- File count, line count, and token count
- Overview of how to use the skill
- File locations and format explanation
- Common use cases and tips

#### references/summary.md

Contains:
- **Purpose**: Explains this is a reference codebase for AI consumption
- **File Structure**: Documents what's in each reference file
- **Usage Guidelines**: How to use the skill effectively
- **Statistics**: Breakdown by file type, language, and largest files

#### references/project-structure.md

Directory tree with line counts per file for easy file discovery:

```
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

All file contents with syntax highlighting headers, optimized for grep-friendly searching:

```markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
```

#### references/tech-stack.md

Auto-detected tech stack from dependency files:
- **Languages**: TypeScript, JavaScript, Python, etc.
- **Frameworks**: React, Next.js, Express, Django, etc.
- **Runtime Versions**: Node.js, Python, Go, etc.
- **Package Manager**: npm, pnpm, poetry, etc.
- **Dependencies**: All direct and dev dependencies
- **Config Files**: All detected configuration files

Detected from files like: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, etc.

## Auto-Generated Skill Names

If no name is provided, Repomix auto-generates one using this pattern:

```bash
repomix src/                           # → repomix-reference-src
repomix --remote user/repo             # → repomix-reference-repo
repomix --skill-generate custom-name   # → custom-name (normalized to kebab-case)
```

Skill names are:
- Converted to kebab-case (lowercase, hyphen-separated)
- Limited to 64 characters maximum
- Protected against path traversal

## Integration with Repomix Options

Skill generation respects all standard Repomix options:

```bash
# Generate skill with file filtering
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Generate skill with compression
repomix --skill-generate --compress

# Generate skill from remote repository
repomix --remote yamadashy/repomix --skill-generate

# Generate skill with specific output format options
repomix --skill-generate --remove-comments --remove-empty-lines
```

## Limitations

The `--skill-generate` option cannot be used with:
- `--stdout` - Skill output requires writing to filesystem
- `--copy` - Skill output is a directory, not copyable to clipboard

## Using Generated Skills

Once generated, you can use the skill with Claude:

1. **Claude Code**: The skill is automatically available if saved to `~/.claude/skills/` or `.claude/skills/`
2. **Claude Web**: Upload the skill directory to Claude for codebase analysis
3. **Team Sharing**: Commit `.claude/skills/` to your repository for team-wide access

## Example Workflow

### Creating a Personal Reference Library

```bash
# Clone and analyze an interesting open source project
repomix --remote facebook/react --skill-generate react-reference

# The skill is saved to ~/.claude/skills/react-reference/
# Now you can reference React's codebase in any Claude conversation
```

### Team Project Documentation

```bash
# In your project directory
cd my-project

# Generate a skill for your team
repomix --skill-generate

# Choose "Project Skills" when prompted
# The skill is saved to .claude/skills/repomix-reference-my-project/

# Commit and share with your team
git add .claude/skills/
git commit -m "Add codebase reference skill"
```

## Related Resources

- [Claude Code Plugins](/guide/claude-code-plugins) - Learn about Repomix plugins for Claude Code
- [MCP Server](/guide/mcp-server) - Alternative integration method
- [Code Compression](/guide/code-compress) - Reduce token count with compression
- [Configuration](/guide/configuration) - Customize Repomix behavior
