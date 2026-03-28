import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { type CliOptions, runCli } from 'repomix';
import type { PackOptions, PackResult } from '../../types.js';
import { AppError } from '../../utils/errorHandler.js';
import { logMemoryUsage } from '../../utils/logger.js';
import { generateCacheKey } from './utils/cache.js';
import { cache } from './utils/sharedInstance.js';

// In-flight request coalescing: when multiple identical requests arrive concurrently,
// only the first one triggers actual processing. Subsequent requests with the same cache key
// await the same Promise, avoiding duplicate git clones and pack() runs.
// Entries are removed as soon as the Promise settles (fulfilled or rejected).
const inFlightRequests = new Map<string, Promise<PackResult>>();

export async function processRemoteRepo(repoUrl: string, format: string, options: PackOptions): Promise<PackResult> {
  if (!repoUrl) {
    throw new AppError('Repository URL is required for remote processing', 400);
  }

  // Generate cache key
  const cacheKey = generateCacheKey(repoUrl, format, options, 'url');

  // Check if the result is already cached
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Coalesce with an in-flight request for the same cache key
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = processRemoteRepoInternal(repoUrl, format, options, cacheKey);
  inFlightRequests.set(cacheKey, promise);

  // Remove from in-flight map once settled (success or failure)
  promise.finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  return promise;
}

async function processRemoteRepoInternal(
  repoUrl: string,
  format: string,
  options: PackOptions,
  cacheKey: string,
): Promise<PackResult> {
  const outputFilePath = `repomix-output-${randomUUID()}.txt`;

  // Create CLI options with correct mapping
  const cliOptions = {
    remote: repoUrl,
    output: outputFilePath,
    style: format,
    parsableStyle: options.outputParsable,
    removeComments: options.removeComments,
    removeEmptyLines: options.removeEmptyLines,
    outputShowLineNumbers: options.showLineNumbers,
    fileSummary: options.fileSummary,
    directoryStructure: options.directoryStructure,
    compress: options.compress,
    securityCheck: false,
    topFilesLen: 10,
    include: options.includePatterns,
    ignore: options.ignorePatterns,
    tokenCountTree: true, // Required to generate token counts for all files in the repository
    quiet: true, // Enable quiet mode to suppress output
    _inProcess: true, // Run pack() in the server process instead of spawning a child process.
    // Reuses cached worker pools (security + metrics) across requests, saving ~500ms
    // of child process spawn + module re-loading + worker warmup per subsequent request.
    // All module-level caches are bounded (200MB file content, 5000 entries for
    // metrics/security/processing), so memory growth is controlled.
  } as CliOptions;

  try {
    // Log memory usage before processing
    logMemoryUsage('Remote repository processing started', {
      repository: repoUrl,
      format: format,
    });

    // Execute remote action
    const result = await runCli(['.'], process.cwd(), cliOptions);
    if (!result) {
      throw new AppError('Remote action failed to return a result', 500);
    }
    const { packResult } = result;

    // Read the generated file
    const content = await fs.readFile(outputFilePath, 'utf-8');

    // Build allFiles sorted by tokenCount once — O(n log n) instead of sorting twice.
    // topFiles is derived from the same sorted order, adding charCount for the top entries only.
    const allFiles = Object.entries(packResult.fileTokenCounts)
      .map(([filePath]) => ({
        path: filePath,
        tokenCount: packResult.fileTokenCounts[filePath] || 0,
        selected: true,
      }))
      .sort((a, b) => b.tokenCount - a.tokenCount);

    const topFilesLen = cliOptions.topFilesLen ?? 10;
    const topFiles = allFiles.slice(0, topFilesLen).map((f) => ({
      path: f.path,
      charCount: (packResult.fileCharCounts[f.path] as number) || 0,
      tokenCount: f.tokenCount,
    }));

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
        topFiles,
        allFiles,
      },
    };

    // Save the result to cache (fire-and-forget — don't block the response)
    cache.set(cacheKey, packResultData).catch(() => {});

    // Log memory usage after processing
    logMemoryUsage('Remote repository processing completed', {
      repository: repoUrl,
      totalFiles: packResult.totalFiles,
      totalCharacters: packResult.totalCharacters,
      totalTokens: packResult.totalTokens,
    });

    return packResultData;
  } catch (error) {
    console.error('Error in remote repository processing:', error);
    if (error instanceof Error) {
      throw new AppError(
        `Remote repository processing failed.\nThe repository may not be public or there may be an issue with Repomix.\n\n${error.message}`,
        500,
      );
    }
    throw new AppError(
      'Remote repository processing failed.\nThe repository may not be public or there may be an issue with Repomix.',
      500,
    );
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
