import Handlebars from 'handlebars';

export interface SkillRenderContext {
  skillName: string;
  skillDescription: string;
  projectName: string;
  totalFiles: number;
  totalTokens: number;
}

/**
 * Returns the Handlebars template for SKILL.md.
 * Following Claude Agent Skills best practices for progressive disclosure.
 */
export const getSkillTemplate = (): string => {
  return /* md */ `---
name: {{{skillName}}}
description: {{{skillDescription}}}
---

# {{{projectName}}} Codebase Reference

{{{totalFiles}}} files | {{{totalTokens}}} tokens

## Overview

Use this skill when you need to:
- Understand project structure and file organization
- Find where specific functionality is implemented
- Read source code for any file
- Search for code patterns or keywords

## Files

| File | Contents |
|------|----------|
| \`references/structure.md\` | Directory tree with line counts per file |
| \`references/files.md\` | All file contents (header: \`## File: <path>\`) |
| \`references/summary.md\` | Purpose and format explanation |

## How to Use

### 1. Find file locations

Check \`structure.md\` for the directory tree:

\`\`\`
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
\`\`\`

### 2. Read file contents

Grep in \`files.md\` for the file path:

\`\`\`
## File: src/utils/helpers.ts
\`\`\`

### 3. Search for code

Grep in \`files.md\` for keywords:

\`\`\`
function calculateTotal
\`\`\`

## Common Use Cases

**Understand a feature:**
1. Search \`structure.md\` for related file names
2. Read the main implementation file in \`files.md\`
3. Search for imports/references to trace dependencies

**Debug an error:**
1. Grep the error message or class name in \`files.md\`
2. Check line counts in \`structure.md\` to find large files

**Find all usages:**
1. Grep function or variable name in \`files.md\`

## Tips

- Use line counts in \`structure.md\` to estimate file complexity
- Search \`## File:\` pattern to jump between files
- Check \`summary.md\` for excluded files and format details
`;
};

/**
 * Generates the SKILL.md content from the given context.
 */
export const generateSkillMd = (context: SkillRenderContext): string => {
  const template = getSkillTemplate();
  const compiledTemplate = Handlebars.compile(template);
  return `${compiledTemplate(context).trim()}\n`;
};
