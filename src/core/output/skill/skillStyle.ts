import Handlebars from 'handlebars';

export interface SkillRenderContext {
  skillName: string;
  skillDescription: string;
  projectName: string;
  totalFiles: number;
  totalTokens: number;
  hasGitDiffs?: boolean;
  hasGitLogs?: boolean;
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

## Reference Files

### Summary (\`references/summary.md\`)
Overview of the packed content, including purpose, file format description, and important notes about excluded files.

### Directory Structure (\`references/structure.md\`)
Tree view of the project's directory structure with line counts for each file. Start here to understand the overall layout. Line counts help identify file sizes when using grep or read tools.

### Files (\`references/files.md\`)
Complete file contents. Each file is marked with \`## File: <file-path>\` header, allowing direct grep searches by file path.

{{#if hasGitDiffs}}
### Git Diffs (\`references/git-diffs.md\`)
Current uncommitted changes (working tree and staged).

{{/if}}
{{#if hasGitLogs}}
### Git Logs (\`references/git-logs.md\`)
Recent commit history with dates, messages, and changed files.

{{/if}}
## How to Use

1. **Understand the layout**: Read \`structure.md\` first to see the project organization
2. **Find specific code**: Search in \`files.md\` for functions, classes, or specific implementations
3. **Get context**: Check \`summary.md\` for information about what's included and excluded
{{#if hasGitDiffs}}
4. **Check recent changes**: Review \`git-diffs.md\` for uncommitted modifications
{{/if}}
{{#if hasGitLogs}}
{{#if hasGitDiffs}}
5. **Review history**: See \`git-logs.md\` for recent commit history
{{else}}
4. **Review history**: See \`git-logs.md\` for recent commit history
{{/if}}
{{/if}}
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
