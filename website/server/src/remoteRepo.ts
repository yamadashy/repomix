import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { type CliOptions, runRemoteAction } from 'repomix';
import { packRequestSchema } from './schemas/request.js';
import type { PackOptions, PackResult } from './types.js';
import { RequestCache, generateCacheKey } from './utils/cache.js';
import { AppError } from './utils/errorHandler.js';
import { RateLimiter } from './utils/rateLimit.js';
import { sanitizeIgnorePattern, validateRequest } from './utils/validation.js';

// Create instances of cache and rate limiter
const cache = new RequestCache<PackResult>(180); // 3 minutes cache
const rateLimiter = new RateLimiter(60_000, 3); // 3 requests per minute

export async function processRemoteRepo(
  repoUrl: string,
  format: string,
  options: PackOptions,
  clientIp: string,
): Promise<PackResult> {
  // Validate the request
  const validatedData = validateRequest(packRequestSchema, {
    url: repoUrl,
    format,
    options,
  });

  // Rate limit check
  if (!rateLimiter.isAllowed(clientIp)) {
    const remainingTime = Math.ceil(rateLimiter.getRemainingTime(clientIp) / 1000);
    throw new AppError(`Rate limit exceeded. Please try again in ${remainingTime} seconds.`, 429);
  }

  // Generate cache key
  const cacheKey = generateCacheKey(validatedData.url, validatedData.format, validatedData.options);

  // Check if the result is already cached
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Sanitize ignore patterns
  const sanitizedIgnorePatterns = sanitizeIgnorePattern(validatedData.options.ignorePatterns);

  const outputFilePath = `repomix-output-${randomUUID()}.txt`;

  // Create CLI options with correct mapping
  const cliOptions = {
    output: outputFilePath,
    style: validatedData.format,
    removeComments: validatedData.options.removeComments,
    removeEmptyLines: validatedData.options.removeEmptyLines,
    outputShowLineNumbers: validatedData.options.showLineNumbers,
    fileSummary: validatedData.options.fileSummary,
    directoryStructure: validatedData.options.directoryStructure,
    securityCheck: false,
    topFilesLen: 10,
    ignore: sanitizedIgnorePatterns,
  } as CliOptions;

  try {
    // Execute remote action
    const result = await runRemoteAction(repoUrl, cliOptions);
    const { packResult } = result;

    // Read the generated file
    const content = await fs.readFile(outputFilePath, 'utf-8');

    // Create pack result
    const packResultData: PackResult = {
      content,
      format,
      metadata: {
        repository: repoUrl,
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: packResult.totalFiles,
          totalCharacters: packResult.totalCharacters,
          totalTokens: packResult.totalTokens,
        },
        topFiles: Object.entries(packResult.fileCharCounts)
          .map(([path, charCount]) => ({
            path,
            charCount,
            tokenCount: packResult.fileTokenCounts[path] || 0,
          }))
          .sort((a, b) => b.charCount - a.charCount)
          .slice(0, cliOptions.topFilesLen),
      },
    };

    // Save the result to cache
    cache.set(cacheKey, packResultData);

    return packResultData;
  } catch (error) {
    console.error('Error in remote action:', error);
    if (error instanceof Error) {
      throw new AppError(`Remote action failed: ${error.message}`, 500);
    }
    throw new AppError('Remote action failed with unknown error', 500);
  } finally {
    // Clean up the output file
    try {
      await fs.unlink(outputFilePath);
    } catch (err) {
      // Ignore file deletion errors
      console.warn('Failed to cleanup output file:', err);
    }
  }
}
