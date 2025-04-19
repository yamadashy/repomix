import * as fs from 'node:fs/promises';
import path from 'node:path';
import iconv from 'iconv-lite';
import { isBinary } from 'istextorbinary';
import jschardet from 'jschardet';
import pc from 'picocolors';
import { logger } from '../../../shared/logger.js';

export interface FileCollectTask {
  filePath: string;
  rootDir: string;
  maxFileSize: number;
}

export default async ({ filePath, rootDir, maxFileSize }: FileCollectTask) => {
  const fullPath = path.resolve(rootDir, filePath);
  const content = await readRawFile(fullPath, maxFileSize);

  if (content) {
    return {
      path: filePath,
      content,
    };
  }

  return null;
};

const readRawFile = async (filePath: string, maxFileSize: number): Promise<string | null> => {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.log('');
      logger.log('⚠️ Large File Warning:');
      logger.log('──────────────────────');
      logger.log(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      logger.log(pc.dim('Add this file to .repomixignore if you want to exclude it permanently'));
      logger.log('');
      return null;
    }

    if (isBinary(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return null;
    }

    logger.trace(`Reading file: ${filePath}`);

    const buffer = await fs.readFile(filePath);

    if (isBinary(null, buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return null;
    }

    const encoding = jschardet.detect(buffer).encoding || 'utf-8';
    const content = iconv.decode(buffer, encoding);

    return content;
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return null;
  }
};
