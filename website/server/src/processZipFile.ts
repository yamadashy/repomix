import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { type CliOptions, runDefaultAction } from 'repomix';
import { packRequestSchema } from './schemas/request.js';
import type { PackOptions, PackResult } from './types.js';
import { generateCacheKey } from './utils/cache.js';
import { AppError } from './utils/errorHandler.js';
import { cleanupTempDirectory, copyOutputToCurrentDirectory, createTempDirectory } from './utils/fileUtils.js';
import { cache, rateLimiter } from './utils/sharedInstance.js';
import { sanitizePattern, validateRequest } from './utils/validation.js';

// Enhanced ZIP extraction limits
const ZIP_SECURITY_LIMITS = {
  MAX_FILES: 10000, // Maximum number of files in the archive
  MAX_UNCOMPRESSED_SIZE: 100_000_000, // Maximum total uncompressed size (100MB)
  MAX_COMPRESSION_RATIO: 100, // Maximum compression ratio to prevent ZIP bombs
  MAX_PATH_LENGTH: 200, // Maximum file path length
  MAX_NESTING_LEVEL: 50, // Maximum directory nesting level
};

/**
 * Process an uploaded ZIP file
 */
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
    'file',
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
    // Extract the ZIP file to the temporary directory with enhanced security checks
    await extractZipWithSecurity(file, tempDirPath);

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
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
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

/**
 * Enhanced ZIP extraction with security checks
 */
async function extractZipWithSecurity(file: File, destPath: string): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);

    // Get all entries for validation
    const entries = zip.getEntries();

    // 1. Check number of files
    if (entries.length > ZIP_SECURITY_LIMITS.MAX_FILES) {
      throw new AppError(
        `ZIP contains too many files (${entries.length}). Maximum allowed: ${ZIP_SECURITY_LIMITS.MAX_FILES}`,
        413,
      );
    }

    // 2. Calculate total uncompressed size
    const totalUncompressedSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);

    if (totalUncompressedSize > ZIP_SECURITY_LIMITS.MAX_UNCOMPRESSED_SIZE) {
      throw new AppError(
        `Uncompressed size (${(totalUncompressedSize / 1_000_000).toFixed(2)}MB) exceeds maximum limit of ${
          ZIP_SECURITY_LIMITS.MAX_UNCOMPRESSED_SIZE / 1_000_000
        }MB`,
        413,
      );
    }

    // 3. Check compression ratio (ZIP bomb detection)
    if (file.size > 0) {
      const compressionRatio = totalUncompressedSize / file.size;
      if (compressionRatio > ZIP_SECURITY_LIMITS.MAX_COMPRESSION_RATIO) {
        throw new AppError(
          `Suspicious compression ratio (${compressionRatio.toFixed(2)}:1). Maximum allowed: ${ZIP_SECURITY_LIMITS.MAX_COMPRESSION_RATIO}:1`,
          400,
        );
      }
    }

    // 4. Validate all entries for path traversal, file extensions, and nesting level
    const processedPaths = new Set<string>();

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) continue;

      const entryPath = entry.entryName;

      // 4.1 Check for unsafe paths (directory traversal prevention)
      const normalizedPath = path.normalize(path.join(destPath, entryPath));
      if (!normalizedPath.startsWith(destPath)) {
        throw new AppError(
          `Security violation: Potential directory traversal attack detected in path: ${entryPath}`,
          400,
        );
      }

      // 4.2 Check path length
      if (entryPath.length > ZIP_SECURITY_LIMITS.MAX_PATH_LENGTH) {
        throw new AppError(
          `File path exceeds maximum length: ${entryPath.length} > ${ZIP_SECURITY_LIMITS.MAX_PATH_LENGTH}`,
          400,
        );
      }

      // 4.3 Check nesting level
      const nestingLevel = entryPath.split('/').length - 1;
      if (nestingLevel > ZIP_SECURITY_LIMITS.MAX_NESTING_LEVEL) {
        throw new AppError(
          `Directory nesting level exceeds maximum: ${nestingLevel} > ${ZIP_SECURITY_LIMITS.MAX_NESTING_LEVEL}`,
          400,
        );
      }

      // 4.4 Check for duplicate paths (could indicate ZipSlip vulnerability attempts)
      if (processedPaths.has(normalizedPath)) {
        throw new AppError(`Duplicate file path detected: ${entryPath}. This could indicate a malicious archive.`, 400);
      }
      processedPaths.add(normalizedPath);
    }

    // If all checks pass, extract the ZIP
    await fs.mkdir(destPath, { recursive: true });
    zip.extractAllTo(destPath, true);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
