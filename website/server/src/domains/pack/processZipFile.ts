import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { unzip } from 'fflate';
import { type CliOptions, runDefaultAction, setLogLevel } from 'repomix';
import type { PackOptions, PackResult } from '../../types.js';
import { AppError } from '../../utils/errorHandler.js';
import { logMemoryUsage } from '../../utils/logger.js';
import { cleanupTempDirectory, copyOutputToCurrentDirectory, createTempDirectory } from './utils/fileUtils.js';

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
export async function processZipFile(file: File, format: string, options: PackOptions): Promise<PackResult> {
  if (!file) {
    throw new AppError('File is required for file processing', 400);
  }

  const outputFilePath = `repomix-output-${randomUUID()}.txt`;

  // Create CLI options
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
    quiet: true, // Enable quiet mode to suppress output
  } as CliOptions;

  setLogLevel(-1);

  const tempDirPath = await createTempDirectory();

  try {
    // Log memory usage before processing
    logMemoryUsage('ZIP file processing started', {
      fileName: file.name,
      fileSize: file.size,
      format: format,
    });

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

    // Log memory usage after processing
    logMemoryUsage('ZIP file processing completed', {
      fileName: file.name,
      totalFiles: packResult.totalFiles,
      totalCharacters: packResult.totalCharacters,
      totalTokens: packResult.totalTokens,
    });

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
 * Enhanced ZIP extraction with security checks using fflate
 */
async function extractZipWithSecurity(file: File, destPath: string): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Unzip using fflate with promise wrapper
    const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(buffer, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const filePaths = Object.keys(files);

    // 1. Check number of files
    if (filePaths.length > ZIP_SECURITY_LIMITS.MAX_FILES) {
      throw new AppError(
        `ZIP contains too many files (${filePaths.length}). Maximum allowed: ${ZIP_SECURITY_LIMITS.MAX_FILES}`,
        413,
      );
    }

    // 2. Calculate total uncompressed size
    const totalUncompressedSize = Object.values(files).reduce((sum, data) => sum + data.length, 0);

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

    for (const entryPath of filePaths) {
      // Skip directories (fflate doesn't include directory entries, only files)
      if (entryPath.endsWith('/')) continue;

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

    // If all checks pass, extract the files
    await fs.mkdir(destPath, { recursive: true });

    for (const [filePath, data] of Object.entries(files)) {
      if (filePath.endsWith('/')) continue; // Skip directories

      const fullPath = path.join(destPath, filePath);
      const dirPath = path.dirname(fullPath);

      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, data);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
