import { z } from 'zod';

// Validate GitHub repository pattern (support both URL and short format)
const githubRepoPattern = /^(?:https:\/\/github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/;

// Regular expression to validate ignore patterns
// Allowed characters: alphanumeric, *, ?, /, -, _, ., space, comma
const ignorePatternRegex = /^[a-zA-Z0-9*?\/\-_., ]*$/;

export const packOptionsSchema = z
  .object({
    removeComments: z.boolean().optional(),
    removeEmptyLines: z.boolean().optional(),
    showLineNumbers: z.boolean().optional(),
    fileSummary: z.boolean().optional(),
    directoryStructure: z.boolean().optional(),
    ignorePatterns: z
      .string()
      .regex(ignorePatternRegex, 'Invalid characters in ignore patterns')
      .max(1000, 'Ignore patterns too long')
      .optional()
      .transform((val) => val?.trim()),
  })
  .strict();

export const packRequestSchema = z
  .object({
    url: z
      .string()
      .min(1, 'Repository URL is required')
      .max(200, 'Repository URL is too long')
      .regex(githubRepoPattern, 'Invalid GitHub repository format')
      .transform((val) => {
        const trimmed = val.trim();
        const match = trimmed.match(githubRepoPattern);
        if (!match) return trimmed;
        // match[1] contains owner/repo
        return match[1];
      }),
    format: z.enum(['xml', 'markdown', 'plain']),
    options: packOptionsSchema,
  })
  .strict();

export type PackRequest = z.infer<typeof packRequestSchema>;
