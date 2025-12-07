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

This skill provides reference to the {{{projectName}}} codebase ({{{totalFiles}}} files, {{{totalTokens}}} tokens).

## Reference Files

| File | Description |
|------|-------------|
| \`references/structure.md\` | Directory tree with line counts per file |
| \`references/files.md\` | All file contents with \`## File: <path>\` headers |
| \`references/summary.md\` | Purpose, format description, and excluded files info |

## Quick Reference

### Finding Files by Path
Grep in \`files.md\` using the header format:
\`\`\`
## File: src/components/Button.tsx
\`\`\`

### Understanding Project Structure
Check \`structure.md\` for the directory tree. Each file shows its line count:
\`\`\`
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
\`\`\`

### Reading File Contents
Files in \`files.md\` are formatted as:
\`\`\`
## File: <file-path>
\\\`\`\`<language>
<content>
\\\`\`\`
\`\`\`
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
