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

This skill provides reference to the {{{projectName}}} codebase.

## Statistics

- Total Files: {{{totalFiles}}}
- Total Tokens: {{{totalTokens}}}

## How to Use

The complete codebase is available in \`references/codebase.md\`.

### Reading the Codebase

To understand the project structure, start by reading the "Directory Structure" section in the codebase file.

For specific code details:
1. Look at the "Files" section to find the file you need
2. Each file includes its path and content
3. Use grep patterns to search for specific functions or classes

Use this when you need to:
- Understand the project structure
- Find implementation details
- Reference code patterns
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
