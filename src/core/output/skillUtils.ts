import path from 'node:path';

const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_DESCRIPTION_MAX_LENGTH = 1024;

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
