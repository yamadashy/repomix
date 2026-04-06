import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { type CliOptions, runCli } from 'repomix';
import type { PackOptions, PackResult } from '../../types.js';
import { AppError } from '../../utils/errorHandler.js';
import { logMemoryUsage } from '../../utils/logger.js';
import { generateCacheKey } from './utils/cache.js';
import { checkGitHubRepoSize } from './utils/gitHubRepoSize.js';
import { cache } from './utils/sharedInstance.js';

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

  // Check repository size before processing
  await checkGitHubRepoSize(repoUrl);

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
            charCount: charCount as number,
            tokenCount: packResult.fileTokenCounts[path] || 0,
          }))
          .sort((a, b) => b.tokenCount - a.tokenCount)
          .slice(0, cliOptions.topFilesLen),
        allFiles: Object.entries(packResult.fileTokenCounts)
          .map(([path]) => ({
            path,
            tokenCount: packResult.fileTokenCounts[path] || 0,
            selected: true, // Default to selected for initial packing
          }))
          .sort((a, b) => b.tokenCount - a.tokenCount),
      },
    };

    // Save the result to cache
    await cache.set(cacheKey, packResultData);

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
