import { isValidRemoteValue } from 'repomix';
import * as v from 'valibot';
import { FILE_SIZE_LIMITS } from '../domains/pack/utils/fileUtils.js';
import { MESSAGES } from './packRequestMessages.js';

export const packRequestSchema = v.pipe(
  v.strictObject({
    url: v.optional(
      v.pipe(
        v.string(),
        v.minLength(1, MESSAGES.URL_REQUIRED),
        v.maxLength(200, MESSAGES.URL_TOO_LONG),
        v.trim(),
        v.check((val) => isValidRemoteValue(val), MESSAGES.INVALID_URL),
      ),
    ),
    file: v.optional(
      v.pipe(
        v.custom<File>((f) => f instanceof File, MESSAGES.INVALID_FILE),
        v.check((f) => f.type === 'application/zip' || f.name.endsWith('.zip'), MESSAGES.NOT_ZIP),
        // 10MB limit
        v.check((f) => f.size <= FILE_SIZE_LIMITS.MAX_ZIP_SIZE, MESSAGES.FILE_TOO_LARGE),
      ),
    ),
    format: v.picklist(['xml', 'markdown', 'plain']),
    options: v.strictObject({
      removeComments: v.optional(v.boolean()),
      removeEmptyLines: v.optional(v.boolean()),
      showLineNumbers: v.optional(v.boolean()),
      fileSummary: v.optional(v.boolean()),
      directoryStructure: v.optional(v.boolean()),
      includePatterns: v.optional(v.pipe(v.string(), v.maxLength(100_000, MESSAGES.INCLUDE_TOO_LONG), v.trim())),
      ignorePatterns: v.optional(
        v.pipe(
          v.string(),
          // Regular expression to validate ignore patterns
          // Allowed characters: alphanumeric, *, ?, /, -, _, ., !, (, ), space, comma
          v.regex(/^[a-zA-Z0-9*?/\-_.,!()\s]*$/, MESSAGES.INVALID_IGNORE_CHARS),
          v.maxLength(1000, MESSAGES.IGNORE_TOO_LONG),
          v.trim(),
        ),
      ),
      outputParsable: v.optional(v.boolean()),
      compress: v.optional(v.boolean()),
    }),
  }),
  v.check((data) => Boolean(data.url || data.file), MESSAGES.MISSING_INPUT),
  v.check((data) => !(data.url && data.file), MESSAGES.BOTH_PROVIDED),
);

export type PackRequest = v.InferOutput<typeof packRequestSchema>;
