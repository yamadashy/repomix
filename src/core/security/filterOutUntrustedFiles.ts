import type { RawFile } from '../file/fileTypes.js';
import type { SuspiciousFileResult } from './securityCheck.js';

export const filterOutUntrustedFiles = (
  rawFiles: RawFile[],
  suspiciousFilesResults: SuspiciousFileResult[],
): RawFile[] => {
  const suspiciousPaths = new Set(suspiciousFilesResults.map((result) => result.filePath));
  return rawFiles.filter((rawFile) => !suspiciousPaths.has(rawFile.path));
};
