import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';

/**
 * Schema for submodule configuration
 */
const SubmoduleConfigSchema = z.object({
  path: z.string().describe('Path to the submodule relative to project root'),
  description: z.string().optional().describe('Human-readable description'),
  dependencies: z.array(z.string()).default([]).describe('List of dependency submodule names'),
  includePatterns: z.array(z.string()).optional().describe('Glob patterns to include'),
  ignorePatterns: z.array(z.string()).optional().describe('Glob patterns to ignore'),
  isGitSubmodule: z.boolean().default(false).describe('Whether this is a git submodule'),
});

/**
 * Schema for cache configuration
 */
const CacheConfigSchema = z.object({
  directory: z.string().default('.repomix-cache').describe('Cache directory path'),
  enabled: z.boolean().default(true).describe('Whether caching is enabled'),
});

/**
 * Schema for repomix options
 */
const RepomixConfigSchema = z.object({
  compress: z.boolean().default(true).describe('Enable Tree-sitter compression'),
  style: z.enum(['xml', 'markdown', 'json', 'plain']).default('xml').describe('Output format'),
  removeComments: z.boolean().default(false).describe('Remove comments from code'),
  showLineNumbers: z.boolean().default(true).describe('Show line numbers in output'),
});

/**
 * Schema for monorepo configuration
 */
export const MonorepoConfigSchema = z.object({
  submodules: z.record(z.string(), SubmoduleConfigSchema).describe('Map of submodule name to configuration'),
  cache: CacheConfigSchema.default({
    directory: '.repomix-cache',
    enabled: true,
  }).describe('Cache configuration'),
  repomix: RepomixConfigSchema.default({
    compress: true,
    style: 'xml',
    removeComments: false,
    showLineNumbers: true,
  }).describe('Repomix options'),
});

/**
 * Type for submodule configuration
 */
export type SubmoduleConfig = z.infer<typeof SubmoduleConfigSchema>;

/**
 * Type for monorepo configuration
 */
export type MonorepoConfig = z.infer<typeof MonorepoConfigSchema>;

/**
 * Configuration file name
 */
export const MONOREPO_CONFIG_FILE = '.repomix-monorepo.json';

/**
 * Load monorepo configuration from file
 * @param rootDir Project root directory
 * @returns Configuration or null if not found
 */
export async function loadMonorepoConfig(rootDir: string = process.cwd()): Promise<MonorepoConfig | null> {
  const configPath = path.join(rootDir, MONOREPO_CONFIG_FILE);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return MonorepoConfigSchema.parse(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.trace(`Monorepo config not found at ${configPath}`);
      return null;
    }
    logger.trace(`Failed to load monorepo config: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Save monorepo configuration to file
 * @param config Configuration to save
 * @param rootDir Project root directory
 */
export async function saveMonorepoConfig(config: MonorepoConfig, rootDir: string = process.cwd()): Promise<void> {
  const configPath = path.join(rootDir, MONOREPO_CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  logger.trace(`Monorepo config saved to ${configPath}`);
}

/**
 * Get submodule by name from config
 */
export function getSubmodule(config: MonorepoConfig, name: string): SubmoduleConfig | null {
  return config.submodules[name] ?? null;
}

/**
 * Get all submodule names from config
 */
export function getSubmoduleNames(config: MonorepoConfig): string[] {
  return Object.keys(config.submodules);
}
