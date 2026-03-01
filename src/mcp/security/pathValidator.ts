import path from 'node:path';

/**
 * Path validation error
 */
export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

/**
 * Validate that a resolved path stays within the allowed root directory.
 * Prevents path traversal attacks using ../ or absolute paths.
 *
 * @param userPath - The user-provided path (may be relative or absolute)
 * @param rootDir - The root directory that paths must stay within
 * @returns The resolved absolute path
 * @throws PathSecurityError if path escapes the root directory
 */
export function validatePathWithinRoot(userPath: string, rootDir: string): string {
  // Resolve both paths to absolute, normalized forms
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, userPath);

  // Check that the resolved path is within the root directory
  const relative = path.relative(resolvedRoot, resolvedPath);

  // Path escapes if:
  // 1. It starts with '..' (goes above root)
  // 2. It's an absolute path that doesn't share the root prefix
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new PathSecurityError(`Path traversal detected: "${userPath}" escapes the project root "${rootDir}"`);
  }

  return resolvedPath;
}

/**
 * Validate and normalize a project root directory.
 * Ensures the path is absolute and normalized.
 *
 * @param projectRoot - The user-provided project root (or undefined for cwd)
 * @returns Resolved absolute path to project root
 */
export function validateProjectRoot(projectRoot?: string): string {
  // Default to current working directory if not provided
  const root = projectRoot || process.cwd();

  // Resolve to absolute path and normalize
  return path.resolve(root);
}

/**
 * Sanitize a submodule name for use in file paths.
 * Only allows alphanumeric characters, hyphens, underscores, and dots.
 *
 * @param name - The submodule name to sanitize
 * @returns Sanitized name safe for use in file paths
 * @throws PathSecurityError if name contains only invalid characters
 */
export function sanitizeSubmoduleName(name: string): string {
  // Remove any path separators and invalid characters
  const sanitized = name
    .replace(/[/\\]/g, '-') // Replace path separators with hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '') // Keep only safe characters
    .replace(/\.{2,}/g, '.') // Collapse multiple dots
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots

  if (!sanitized) {
    throw new PathSecurityError(`Invalid submodule name: "${name}" contains no valid characters`);
  }

  // Limit length to prevent filesystem issues
  if (sanitized.length > 255) {
    throw new PathSecurityError(`Submodule name too long: "${name}" exceeds 255 characters`);
  }

  return sanitized;
}

/**
 * Validate a submodule path from configuration.
 * Ensures the path is relative and doesn't escape the project root.
 *
 * @param submodulePath - The submodule path from config
 * @param rootDir - The project root directory
 * @returns The validated and resolved absolute path
 * @throws PathSecurityError if path is invalid or escapes root
 */
export function validateSubmodulePath(submodulePath: string, rootDir: string): string {
  // Reject absolute paths
  if (path.isAbsolute(submodulePath)) {
    throw new PathSecurityError(`Submodule path must be relative, got absolute path: "${submodulePath}"`);
  }

  // Validate path stays within root
  return validatePathWithinRoot(submodulePath, rootDir);
}
