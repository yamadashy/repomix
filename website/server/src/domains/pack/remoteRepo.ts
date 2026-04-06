import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { type CliOptions, parseRemoteValue, runDefaultAction } from 'repomix';
import type { PackOptions, PackProgressCallback, PackResult } from '../../types.js';
import { AppError } from '../../utils/errorHandler.js';
import { logMemoryUsage } from '../../utils/logger.js';
import { generateCacheKey } from './utils/cache.js';
import { cleanupTempDirectory, copyOutputToCurrentDirectory, createTempDirectory } from './utils/fileUtils.js';
import { cache } from './utils/sharedInstance.js';

const execFileAsync = promisify(execFile);

async function cloneRepository(repoUrl: string, destPath: string, branch?: string): Promise<void> {
  const args = ['clone', '--depth', '1', '--single-branch'];
  if (branch) {
    args.push('--branch', branch);
  }
  args.push(repoUrl, destPath);

  try {
    await execFileAsync('git', args, { timeout: 60_000 });
  } catch {
    throw new AppError('Failed to clone repository.\nThe repository may not be public or the URL may be invalid.', 500);
  }
}

export async function processRemoteRepo(
  repoUrl: string,
  format: string,
  options: PackOptions,
  onProgress?: PackProgressCallback,
): Promise<PackResult> {
  if (!repoUrl) {
    throw new AppError('Repository URL is required for remote processing', 400);
  }

  // Generate cache key
  const cacheKey = generateCacheKey(repoUrl, format, options, 'url');

  // Check if the result is already cached
  await onProgress?.('cache-check');
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Clone the repository
  await onProgress?.('cloning');
  const parsed = parseRemoteValue(repoUrl);
  const tempDirPath = await createTempDirectory();
  const outputFilePath = `repomix-output-${randomUUID()}.txt`;

  // Create CLI options for runDefaultAction (no 'remote' needed since we clone ourselves)
  const cliOptions = {
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
    tokenCountTree: true,
    quiet: true,
    skipLocalConfig: true, // Prevent loading config files from untrusted cloned repositories
  } as CliOptions;

  try {
    // Log memory usage before processing
    logMemoryUsage('Remote repository processing started', {
      repository: repoUrl,
      format: format,
    });

    // Clone the repository to temp directory
    await cloneRepository(parsed.repoUrl, tempDirPath, parsed.remoteBranch);

    // Process the cloned repository
    await onProgress?.('processing');
    const packProgressCallback = (message: string) => {
      onProgress?.('processing', message);
    };
    const result = await runDefaultAction([tempDirPath], tempDirPath, cliOptions, packProgressCallback);
    await copyOutputToCurrentDirectory(tempDirPath, process.cwd(), result.config.output.filePath);
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
        allFiles: Object.entries(packResult.fileCharCounts)
          .map(([path, charCount]) => ({
            path,
            charCount: charCount as number,
            selected: true,
          }))
          .sort((a, b) => b.charCount - a.charCount),
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
    if (error instanceof AppError) {
      throw error;
    }
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
    await cleanupTempDirectory(tempDirPath);
    try {
      await fs.unlink(outputFilePath);
    } catch {
      // Ignore file deletion errors
    }
  }
}
