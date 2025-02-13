import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import os from 'node:os';
import { AppError } from './errorHandler.js';
import { FILE_SIZE_LIMITS, formatFileSize } from '../constants.js';

export async function extractZip(file: File, destPath: string): Promise<void> {
  try {
    // Validate file size before processing
    if (file.size > FILE_SIZE_LIMITS.MAX_ZIP_SIZE) {
      throw new AppError(`File size exceeds maximum limit of ${formatFileSize(FILE_SIZE_LIMITS.MAX_ZIP_SIZE)}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);

    // Get zip entries for validation
    const entries = zip.getEntries();

    // Validate number of files
    if (entries.length > FILE_SIZE_LIMITS.MAX_FILES) {
      throw new AppError(`ZIP contains too many files (${entries.length}). Maximum allowed: ${FILE_SIZE_LIMITS.MAX_FILES}`);
    }

    // Validate total uncompressed size
    const totalUncompressedSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);
    if (totalUncompressedSize > FILE_SIZE_LIMITS.MAX_UNCOMPRESSED_SIZE) {
      throw new AppError(`Uncompressed size exceeds maximum limit of ${formatFileSize(FILE_SIZE_LIMITS.MAX_UNCOMPRESSED_SIZE)}`);
    }

    // Check for unsafe paths (directory traversal prevention)
    for (const entry of entries) {
      const entryPath = path.join(destPath, entry.entryName);
      if (!entryPath.startsWith(destPath)) {
        throw new AppError('ZIP contains unsafe file paths');
      }
    }

    await fs.mkdir(destPath, { recursive: true });
    zip.extractAllTo(destPath, true);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const createTempDirectory = async (): Promise<string> => {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-'));
    return tempDir;
  } catch (error) {
    throw new AppError(`Failed to create temporary directory: ${(error as Error).message}`);
  }
};

export const cleanupTempDirectory = async (directory: string): Promise<void> => {
  try {
    if (!directory.includes('repomix-')) {
      throw new AppError('Invalid temporary directory path');
    }
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(`Failed to cleanup temporary directory: ${directory}`, error);
  }
};

export const copyOutputToCurrentDirectory = async (
  sourceDir: string,
  targetDir: string,
  outputFileName: string,
): Promise<void> => {
  // Sanitize file paths
  const sanitizedFileName = path.basename(outputFileName);
  const sourcePath = path.join(sourceDir, sanitizedFileName);
  const targetPath = path.join(targetDir, sanitizedFileName);

  try {
    // Verify source exists
    await fs.access(sourcePath);

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw new AppError(
      `Failed to copy output file: ${(error as Error).message}. Source: ${sourcePath}, Target: ${targetPath}`
    );
  }
};