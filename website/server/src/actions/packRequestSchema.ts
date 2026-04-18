import { isValidRemoteValue } from 'repomix';
import { z } from 'zod';
import { FILE_SIZE_LIMITS } from '../domains/pack/utils/fileUtils.js';

export const packRequestSchema = z
  .object({
    url: z
      .string()
      .min(1, 'Repository URL is required')
      .max(200, 'Repository URL is too long')
      .transform((val) => val.trim())
      .refine((val) => isValidRemoteValue(val), { message: 'Invalid repository URL' })
      .optional(),
    file: z
      .custom<File>()
      .refine((file) => file instanceof File, {
        message: 'Invalid file format',
      })
      .refine((file) => file.type === 'application/zip' || file.name.endsWith('.zip'), {
        message: 'Only ZIP files are allowed',
      })
      .refine((file) => file.size <= FILE_SIZE_LIMITS.MAX_ZIP_SIZE, {
        // 10MB limit
        message: 'File size must be less than 10MB',
      })
      .optional(),
    format: z.enum(['xml', 'markdown', 'plain']),
    options: z
      .object({
        removeComments: z.boolean().optional(),
        removeEmptyLines: z.boolean().optional(),
        showLineNumbers: z.boolean().optional(),
        fileSummary: z.boolean().optional(),
        directoryStructure: z.boolean().optional(),
        includePatterns: z
          .string()
          .max(100_000, 'Include patterns too long')
          .optional()
          .transform((val) => val?.trim()),
        ignorePatterns: z
          .string()
          // Regular expression to validate ignore patterns
          // Allowed characters: alphanumeric, *, ?, /, -, _, ., !, (, ), space, comma
          .regex(/^[a-zA-Z0-9*?/\-_.,!()\s]*$/, 'Invalid characters in ignore patterns')
          .max(1000, 'Ignore patterns too long')
          .optional()
          .transform((val) => val?.trim()),
        outputParsable: z.boolean().optional(),
        compress: z.boolean().optional(),
      })
      .strict(),
  })
  .strict()
  .refine((data) => data.url || data.file, {
    message: 'Either URL or file must be provided',
  })
  .refine((data) => !(data.url && data.file), {
    message: 'Cannot provide both URL and file',
  });

export type PackRequest = z.infer<typeof packRequestSchema>;
