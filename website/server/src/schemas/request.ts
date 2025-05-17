import { isValidRemoteValue } from 'repomix';
import { z } from 'zod';

// Regular expression to validate ignore patterns
// Allowed characters: alphanumeric, *, ?, /, -, _, ., !, (, ), space, comma
const ignorePatternRegex = /^[a-zA-Z0-9*?\/\-_.,!()\s]*$/;

export const packOptionsSchema = z
  .object({
    removeComments: z.boolean().optional(),
    removeEmptyLines: z.boolean().optional(),
    showLineNumbers: z.boolean().optional(),
    fileSummary: z.boolean().optional(),
    directoryStructure: z.boolean().optional(),
    includePatterns: z
      .string()
      .max(1000, 'Include patterns too long')
      .optional()
      .transform((val) => val?.trim()),
    files: z.boolean().optional(),
    ignorePatterns: z
      .string()
      .regex(ignorePatternRegex, 'Invalid characters in ignore patterns')
      .max(1000, 'Ignore patterns too long')
      .optional()
      .transform((val) => val?.trim()),
    outputParsable: z.boolean().optional(),
    compress: z.boolean().optional(),
  })
  .strict();

const isValidZipFile = (file: File) => {
  return file.type === 'application/zip' || file.name.endsWith('.zip');
};

const fileSchema = z
  .custom<File>()
  .refine((file) => file instanceof File, {
    message: 'Invalid file format',
  })
  .refine((file) => isValidZipFile(file), {
    message: 'Only ZIP files are allowed',
  })
  .refine((file) => file.size <= 10 * 1024 * 1024, {
    // 10MB limit
    message: 'File size must be less than 10MB',
  });

export const packRequestSchema = z
  .object({
    url: z
      .string()
      .min(1, 'Repository URL is required')
      .max(200, 'Repository URL is too long')
      .transform((val) => val.trim())
      .refine((val) => isValidRemoteValue(val), { message: 'Invalid repository URL' })
      .optional(),
    file: fileSchema.optional(),
    format: z.enum(['xml', 'markdown', 'plain']),
    options: packOptionsSchema,
  })
  .strict()
  .refine((data) => data.url || data.file, {
    message: 'Either URL or file must be provided',
  })
  .refine((data) => !(data.url && data.file), {
    message: 'Cannot provide both URL and file',
  });

export type PackRequest = z.infer<typeof packRequestSchema>;
