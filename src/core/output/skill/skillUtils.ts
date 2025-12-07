import path from 'node:path';

const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_DESCRIPTION_MAX_LENGTH = 1024;
const SKILL_NAME_PREFIX = 'repomix-reference';

/**
 * Converts a string to kebab-case.
 * Handles PascalCase, camelCase, snake_case, and spaces.
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Handle PascalCase/camelCase
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/gi, '') // Remove invalid characters
    .toLowerCase()
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
};

/**
 * Validates and normalizes a skill name.
 * Converts to kebab-case and truncates to 64 characters.
 */
export const validateSkillName = (name: string): string => {
  const kebabName = toKebabCase(name);

  if (kebabName.length === 0) {
    throw new Error('Skill name cannot be empty after normalization');
  }

  return kebabName.substring(0, SKILL_NAME_MAX_LENGTH);
};

/**
 * Generates a human-readable project name from root directories.
 * Uses the first directory's basename, converted to Title Case.
 */
export const generateProjectName = (rootDirs: string[]): string => {
  const primaryDir = rootDirs[0] || '.';
  const dirName = path.basename(path.resolve(primaryDir));

  // Convert kebab-case or snake_case to Title Case
  return dirName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

/**
 * Generates a skill description following Claude Agent Skills best practices.
 * Description includes what the skill does and when to use it.
 */
export const generateSkillDescription = (_skillName: string, projectName: string): string => {
  const description = `Reference codebase for ${projectName}. Use this skill when you need to understand the structure, implementation patterns, or code details of the ${projectName} project.`;

  return description.substring(0, SKILL_DESCRIPTION_MAX_LENGTH);
};

/**
 * Extracts repository name from a URL or shorthand format.
 * Examples:
 * - https://github.com/yamadashy/repomix → repomix
 * - yamadashy/repomix → repomix
 * - git@github.com:yamadashy/repomix.git → repomix
 */
export const extractRepoName = (url: string): string => {
  // Remove .git suffix if present
  const cleanUrl = url.replace(/\.git$/, '');

  // Try to match the last path segment
  const match = cleanUrl.match(/\/([^/]+)$/);
  if (match) {
    return match[1];
  }

  // For shorthand format like "user/repo"
  const shorthandMatch = cleanUrl.match(/^[^/]+\/([^/]+)$/);
  if (shorthandMatch) {
    return shorthandMatch[1];
  }

  return 'unknown';
};

/**
 * Generates a default skill name based on the context.
 * - For remote repositories: repomix-reference-<repo-name>
 * - For local directories: repomix-reference-<folder-name>
 */
export const generateDefaultSkillName = (rootDirs: string[], remoteUrl?: string): string => {
  let baseName: string;

  if (remoteUrl) {
    // Extract repo name from remote URL
    baseName = extractRepoName(remoteUrl);
  } else {
    // Use local directory name
    const primaryDir = rootDirs[0] || '.';
    baseName = path.basename(path.resolve(primaryDir));
  }

  const skillName = `${SKILL_NAME_PREFIX}-${toKebabCase(baseName)}`;
  return validateSkillName(skillName);
};
