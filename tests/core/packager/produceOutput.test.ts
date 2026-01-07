import { describe, expect, it, vi } from 'vitest';
import { produceOutput } from '../../../src/core/packager/produceOutput.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('produceOutput', () => {
  const createMockDeps = () => ({
    generateOutput: vi.fn().mockResolvedValue('generated output'),
    writeOutputToDisk: vi.fn().mockResolvedValue(undefined),
    copyToClipboardIfEnabled: vi.fn().mockResolvedValue(undefined),
  });

  describe('single output mode', () => {
    it('generates and writes single output file', async () => {
      const mockDeps = createMockDeps();
      const mockConfig = createMockConfig();
      const processedFiles = [{ path: 'file.ts', content: 'content' }];
      const allFilePaths = ['file.ts'];
      const progressCallback = vi.fn();

      const result = await produceOutput(
        ['/root'],
        mockConfig,
        processedFiles,
        allFilePaths,
        undefined,
        undefined,
        progressCallback,
        undefined,
        mockDeps,
      );

      expect(mockDeps.generateOutput).toHaveBeenCalledWith(
        ['/root'],
        mockConfig,
        processedFiles,
        allFilePaths,
        undefined,
        undefined,
        undefined,
      );
      expect(mockDeps.writeOutputToDisk).toHaveBeenCalledWith('generated output', mockConfig);
      expect(mockDeps.copyToClipboardIfEnabled).toHaveBeenCalledWith('generated output', progressCallback, mockConfig);
      expect(result).toEqual({
        outputForMetrics: 'generated output',
      });
      expect(result.outputFiles).toBeUndefined();
    });

    it('passes git diff and log results to generateOutput', async () => {
      const mockDeps = createMockDeps();
      const mockConfig = createMockConfig();
      const gitDiffResult = { workTreeDiffContent: 'diff', stagedDiffContent: '' };
      const gitLogResult = { logContent: 'logs', commits: [] };

      await produceOutput(
        ['/root'],
        mockConfig,
        [],
        [],
        gitDiffResult as Parameters<typeof produceOutput>[4],
        gitLogResult as Parameters<typeof produceOutput>[5],
        vi.fn(),
        undefined,
        mockDeps,
      );

      expect(mockDeps.generateOutput).toHaveBeenCalledWith(
        ['/root'],
        mockConfig,
        [],
        [],
        gitDiffResult,
        gitLogResult,
        undefined,
      );
    });

    it('calls progress callback with correct message', async () => {
      const mockDeps = createMockDeps();
      const mockConfig = createMockConfig();
      const progressCallback = vi.fn();

      await produceOutput(['/root'], mockConfig, [], [], undefined, undefined, progressCallback, undefined, mockDeps);

      expect(progressCallback).toHaveBeenCalledWith('Writing output file...');
    });
  });

  describe('split output mode', () => {
    it('generates and writes multiple output files', async () => {
      const mockDeps = createMockDeps();
      mockDeps.generateOutput.mockImplementation(async (_rootDirs, _config, files) => {
        return `output for ${files.length} files`;
      });

      const mockConfig = createMockConfig({
        output: {
          filePath: 'repomix-output.xml',
          splitOutput: 1000000, // 1MB
        },
      });

      const processedFiles = [
        { path: 'src/a.ts', content: 'content a' },
        { path: 'lib/b.ts', content: 'content b' },
      ];
      const allFilePaths = ['src/a.ts', 'lib/b.ts'];
      const progressCallback = vi.fn();

      const result = await produceOutput(
        ['/root'],
        mockConfig,
        processedFiles,
        allFilePaths,
        undefined,
        undefined,
        progressCallback,
        undefined,
        mockDeps,
      );

      expect(mockDeps.writeOutputToDisk).toHaveBeenCalled();
      expect(result.outputFiles).toBeDefined();
      expect(Array.isArray(result.outputForMetrics)).toBe(true);
    });

    it('calls progress callback for split output', async () => {
      const mockDeps = createMockDeps();
      const mockConfig = createMockConfig({
        output: {
          filePath: 'repomix-output.xml',
          splitOutput: 1000000,
        },
      });
      const progressCallback = vi.fn();

      await produceOutput(['/root'], mockConfig, [], [], undefined, undefined, progressCallback, undefined, mockDeps);

      expect(progressCallback).toHaveBeenCalledWith('Writing output files...');
    });

    it('does not call copyToClipboardIfEnabled in split mode', async () => {
      const mockDeps = createMockDeps();
      const mockConfig = createMockConfig({
        output: {
          filePath: 'repomix-output.xml',
          splitOutput: 1000000,
        },
      });

      await produceOutput(['/root'], mockConfig, [], [], undefined, undefined, vi.fn(), undefined, mockDeps);

      expect(mockDeps.copyToClipboardIfEnabled).not.toHaveBeenCalled();
    });
  });
});
