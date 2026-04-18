import { isValidRemoteValue } from 'repomix';
import { z } from 'zod';
import { FILE_SIZE_LIMITS } from '../domains/pack/utils/fileUtils.js';
import { MESSAGES } from './packRequestMessages.js';

export const packRequestSchema = z
  .object({
    url: z
      .string()
      .min(1, MESSAGES.URL_REQUIRED)
      .max(200, MESSAGES.URL_TOO_LONG)
      .transform((val) => val.trim())
      .refine((val) => isValidRemoteValue(val), { message: MESSAGES.INVALID_URL })
      .optional(),
    file: z
      .custom<File>()
      .refine((file) => file instanceof File, {
        message: MESSAGES.INVALID_FILE,
      })
      .refine((file) => file.type === 'application/zip' || file.name.endsWith('.zip'), {
        message: MESSAGES.NOT_ZIP,
      })
      .refine((file) => file.size <= FILE_SIZE_LIMITS.MAX_ZIP_SIZE, {
        // 10MB limit
        message: MESSAGES.FILE_TOO_LARGE,
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
          .max(100_000, MESSAGES.INCLUDE_TOO_LONG)
          .optional()
          .transform((val) => val?.trim()),
        ignorePatterns: z
          .string()
          // Regular expression to validate ignore patterns
          // Allowed characters: alphanumeric, *, ?, /, -, _, ., !, (, ), space, comma
          .regex(/^[a-zA-Z0-9*?/\-_.,!()\s]*$/, MESSAGES.INVALID_IGNORE_CHARS)
          .max(1000, MESSAGES.IGNORE_TOO_LONG)
          .optional()
          .transform((val) => val?.trim()),
        outputParsable: z.boolean().optional(),
        compress: z.boolean().optional(),
      })
      .strict(),
  })
  .strict()
  .refine((data) => data.url || data.file, {
    message: MESSAGES.MISSING_INPUT,
  })
  .refine((data) => !(data.url && data.file), {
    message: MESSAGES.BOTH_PROVIDED,
  });

export type PackRequest = z.infer<typeof packRequestSchema>;
