import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { extractZip, createTempDirectory, cleanupTempDirectory, copyOutputToCurrentDirectory } from './utils/fileUtils.js';
import { type CliOptions, runDefaultAction } from 'repomix';
import { packRequestSchema } from './schemas/request.js';
import type { PackOptions, PackResult } from './types.js';
import { generateCacheKey } from './utils/cache.js';
import { AppError } from './utils/errorHandler.js';
import { sanitizePattern, validateRequest } from './utils/validation.js';
import { rateLimiter, cache } from './utils/sharedInstance.js';

export async function processZipFile(
  file: File,
  format: string,
  options: PackOptions,
  clientIp: string,
): Promise<PackResult> {
  // Validate the request (excluding URL validation)
  const validatedData = validateRequest(packRequestSchema, {
    file,
    format,
    options,
  });

  // Rate limit check
  if (!rateLimiter.isAllowed(clientIp)) {
    const remainingTime = Math.ceil(rateLimiter.getRemainingTime(clientIp) / 1000);
    throw new AppError(`Rate limit exceeded. Please try again in ${remainingTime} seconds.`, 429);
  }

  if (!file) {
    throw new AppError('File is required for file processing', 400);
  }
  
  const cacheKey = generateCacheKey(
    `${file.name}-${file.size}-${file.lastModified}`,
    validatedData.format,
    validatedData.options,
    'file'
  );

  // Check if the result is already cached
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Sanitize patterns
  const sanitizedIncludePatterns = sanitizePattern(validatedData.options.includePatterns);
  const sanitizedIgnorePatterns = sanitizePattern(validatedData.options.ignorePatterns);

  const outputFilePath = `repomix-output-${randomUUID()}.txt`;

  // Create CLI options
  const cliOptions = {
    output: outputFilePath,
    style: validatedData.format,
    parsableStyle: validatedData.options.outputParsable,
    removeComments: validatedData.options.removeComments,
    removeEmptyLines: validatedData.options.removeEmptyLines,
    outputShowLineNumbers: validatedData.options.showLineNumbers,
    fileSummary: validatedData.options.fileSummary,
    directoryStructure: validatedData.options.directoryStructure,
    securityCheck: false,
    topFilesLen: 10,
    include: sanitizedIncludePatterns,
    ignore: sanitizedIgnorePatterns,
  } as CliOptions;

  const tempDirPath = await createTempDirectory();

  try {

    // Extract the ZIP file to the temporary directory
    await extractZip(file, tempDirPath);

    // Execute default action on the extracted directory
    const result = await runDefaultAction([tempDirPath], tempDirPath, cliOptions);
    await copyOutputToCurrentDirectory(tempDirPath, process.cwd(), result.config.output.filePath);
    const { packResult } = result;

    // Read the generated file
    const content = await fs.readFile(outputFilePath, 'utf-8');

    // Create pack result
    const packResultData: PackResult = {
      content,
      format,
      metadata: {
        repository: file.name,
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
    console.error('Error processing uploaded file:', error);
    if (error instanceof Error) {
      throw new AppError(`File processing failed: ${error.message}`, 500);
    }
    throw new AppError('File processing failed with unknown error', 500);
  } finally {
    cleanupTempDirectory(tempDirPath);
    // Clean up the output file
    try {
      await fs.unlink(outputFilePath);
    } catch (err) {
      // Ignore file deletion errors
      console.warn('Failed to cleanup output file:', err);
    }
  }
}