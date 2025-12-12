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
 * Also rejects path traversal attempts.
 */
export const validateSkillName = (name: string): string => {
  // Reject path separators and null bytes to prevent path traversal
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    throw new Error('Skill name cannot contain path separators or null bytes');
  }

  // Reject dot-only names (., .., ...)
  if (/^\.+$/.test(name)) {
    throw new Error('Skill name cannot consist only of dots');
  }

  const kebabName = toKebabCase(name);

  if (kebabName.length === 0) {
    throw new Error('Skill name cannot be empty after normalization');
  }

  return kebabName.substring(0, SKILL_NAME_MAX_LENGTH);
};

/**
 * Converts a string to Title Case.
 * Handles kebab-case, snake_case, and other separators.
 */
const toTitleCase = (str: string): string => {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

/**
 * Generates a human-readable project name from root directories.
 * Uses the first directory's basename, converted to Title Case.
 */
export const generateProjectName = (rootDirs: string[]): string => {
  const primaryDir = rootDirs[0] || '.';
  const dirName = path.basename(path.resolve(primaryDir));
  return toTitleCase(dirName);
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
 * Generates a human-readable project name from a remote URL.
 * Uses the repository name extracted from the URL, converted to Title Case.
 */
export const generateProjectNameFromUrl = (remoteUrl: string): string => {
  const repoName = extractRepoName(remoteUrl);
  return toTitleCase(repoName);
};

/**
 * Extracts repository name from a URL or shorthand format.
 * Examples:
 * - https://github.com/yamadashy/repomix → repomix
 * - https://github.com/yamadashy/repomix/ → repomix
 * - yamadashy/repomix → repomix
 * - git@github.com:yamadashy/repomix.git → repomix
 */
export const extractRepoName = (url: string): string => {
  // Clean URL: trim, remove query/fragment, trailing slashes, and .git suffix
  const cleanUrl = url
    .trim()
    .replace(/[?#].*$/, '') // Remove query string and fragment
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/\.git$/, ''); // Remove .git suffix

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
 * Generates a default skill name from a remote URL.
 * Returns: repomix-reference-<repo-name>
 */
export const generateDefaultSkillNameFromUrl = (remoteUrl: string): string => {
  const baseName = extractRepoName(remoteUrl);
  const skillName = `${SKILL_NAME_PREFIX}-${toKebabCase(baseName)}`;
  return validateSkillName(skillName);
};

/**
 * Generates a default skill name from local directories.
 * Returns: repomix-reference-<folder-name>
 */
export const generateDefaultSkillName = (rootDirs: string[]): string => {
  const primaryDir = rootDirs[0] || '.';
  const baseName = path.basename(path.resolve(primaryDir));
  const skillName = `${SKILL_NAME_PREFIX}-${toKebabCase(baseName)}`;
  return validateSkillName(skillName);
};
