import path from 'node:path';
import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import type { FileProcessorDeps } from '../../../src/core/file/fileProcessors.js';
import { applyFileProcessors } from '../../../src/core/file/fileProcessors.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { createMockConfig } from '../../testing/testUtils.js';

type MockFileProcessorDeps = {
  [Key in keyof FileProcessorDeps]: MockedFunction<FileProcessorDeps[Key]>;
};

const createDeps = (): MockFileProcessorDeps => ({
  mkdtemp: vi.fn(async () => path.join('/tmp', 'repomix-processors-abc')),
  writeFile: vi.fn(async () => {}),
  rm: vi.fn(async () => {}),
  runCommand: vi.fn(async () => ({ stdout: 'converted output\n' })),
});

describe('fileProcessors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces matching file content with processor stdout', async () => {
    const rawFiles: RawFile[] = [
      { path: 'notebook.ipynb', content: '{"cells":[]}' },
      { path: 'src/index.ts', content: 'export const value = 1;' },
    ];
    const config = createMockConfig({
      fileProcessors: {
        '**/*.ipynb': 'jupyter nbconvert --to python --stdout {file}',
      },
    });
    const deps = createDeps();

    const result = await applyFileProcessors(rawFiles, '/repo', config, vi.fn(), deps);

    expect(result).toEqual([
      { path: 'notebook.ipynb', content: 'converted output\n' },
      { path: 'src/index.ts', content: 'export const value = 1;' },
    ]);
    expect(deps.mkdtemp).toHaveBeenCalledWith(expect.stringContaining('repomix-file-processors-'));
    expect(deps.writeFile).toHaveBeenCalledWith(
      path.join('/tmp', 'repomix-processors-abc', 'notebook.ipynb'),
      '{"cells":[]}',
      'utf8',
    );
    expect(deps.runCommand).toHaveBeenCalledWith(
      `jupyter nbconvert --to python --stdout '${path.join('/tmp', 'repomix-processors-abc', 'notebook.ipynb')}'`,
      expect.objectContaining({
        cwd: '/repo',
        maxBuffer: expect.any(Number),
        timeout: expect.any(Number),
      }),
    );
    expect(deps.rm).toHaveBeenCalledWith(path.join('/tmp', 'repomix-processors-abc'), {
      force: true,
      recursive: true,
    });
  });

  it('uses the first matching processor in config order', async () => {
    const rawFiles: RawFile[] = [{ path: 'data/notebook.ipynb', content: '{"cells":[]}' }];
    const config = createMockConfig({
      fileProcessors: {
        '**/*.ipynb': 'first {file}',
        'data/*.ipynb': 'second {file}',
      },
    });
    const deps = createDeps();

    await applyFileProcessors(rawFiles, '/repo', config, vi.fn(), deps);

    expect(deps.runCommand.mock.calls[0][0]).toMatch(/^first /);
  });

  it('rejects processor commands without a file placeholder', async () => {
    const config = createMockConfig({
      fileProcessors: {
        '**/*.ipynb': 'jupyter nbconvert --to python --stdout',
      },
    });

    await expect(
      applyFileProcessors([{ path: 'notebook.ipynb', content: '{}' }], '/repo', config, vi.fn(), createDeps()),
    ).rejects.toThrow('must include {file}');
  });

  it('wraps processor command failures with file context and cleans up the temp directory', async () => {
    const config = createMockConfig({
      fileProcessors: {
        '**/*.ipynb': 'jupyter nbconvert --to python --stdout {file}',
      },
    });
    const deps = createDeps();
    deps.runCommand.mockRejectedValue(new Error('nbconvert failed'));

    await expect(
      applyFileProcessors([{ path: 'notebook.ipynb', content: '{}' }], '/repo', config, vi.fn(), deps),
    ).rejects.toThrow('Failed to process notebook.ipynb');
    expect(deps.rm).toHaveBeenCalledWith(path.join('/tmp', 'repomix-processors-abc'), {
      force: true,
      recursive: true,
    });
  });

  it('preserves processor command failures when temp cleanup also fails', async () => {
    const config = createMockConfig({
      fileProcessors: {
        '**/*.ipynb': 'jupyter nbconvert --to python --stdout {file}',
      },
    });
    const deps = createDeps();
    deps.runCommand.mockRejectedValue(new Error('nbconvert failed'));
    deps.rm.mockRejectedValue(new Error('cleanup failed'));

    await expect(
      applyFileProcessors([{ path: 'notebook.ipynb', content: '{}' }], '/repo', config, vi.fn(), deps),
    ).rejects.toThrow('nbconvert failed');
  });
});
