import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mergeConfigs } from '../../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../../src/config/configSchema.js';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import { resolveFileLevel } from '../../../src/core/file/fileLevelResolve.js';
import { readRawFile } from '../../../src/core/file/fileRead.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import fileProcessWorker from '../../../src/core/file/workers/fileProcessWorker.js';
import { produceOutput } from '../../../src/core/packager/produceOutput.js';
import { pack } from '../../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../../src/core/security/filterOutUntrustedFiles.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import { validateFileSafety } from '../../../src/core/security/validateFileSafety.js';
import securityCheckWorker, {
  type SecurityCheckTask,
  type SuspiciousFileResult as WorkerSuspiciousFileResult,
} from '../../../src/core/security/workers/securityCheckWorker.js';
import type { TaskRunner } from '../../../src/shared/processConcurrency.js';

// Behavior-level regression tests for the security-scan pipeline.
//
// These run real packager orchestration against a real tmpdir fixture so that
// a perf optimization which silently bypasses the security scan — e.g. by
// re-routing rawFiles through a "prefired batches" code path while leaving
// `onBatch` unwired — surfaces as a failed assertion instead of a green CI.
//
// The fake AWS credential below is the same fixture used by the secretlint
// project's own demos; secretlint's preset-recommend ruleset is what repomix
// loads in `createSecretLintConfig`, so any working scan path must flag it.

// secretlint-disable
const FAKE_AWS_SECRET = 'AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY';
// secretlint-enable

// An inline TaskRunner backed by the worker module's default export so the
// orchestration logic inside runSecurityCheck (batching, prefired-promise
// handling, result aggregation) is exercised end-to-end without the cost or
// flakiness of spawning real worker_threads.
const inlineSecurityTaskRunner = (): TaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]> => ({
  run: (task) => securityCheckWorker(task),
  cleanup: async () => {},
});

const buildMergedConfig = (
  rootDir: string,
  outputFilePath: string,
  overrides: Partial<RepomixConfigFile> = {},
): RepomixConfigMerged =>
  mergeConfigs(rootDir, overrides, {
    output: {
      filePath: outputFilePath,
      style: 'xml' as RepomixOutputStyle,
      git: { sortByChanges: false, includeDiffs: false, includeLogs: false },
    },
  });

const runPack = async (rootDir: string, config: RepomixConfigMerged) =>
  pack([rootDir], config, () => {}, {
    searchFiles,
    sortPaths: (filePaths) => filePaths,
    collectFiles: (filePaths, root, cfg, progressCallback) =>
      collectFiles(filePaths, root, cfg, progressCallback, { readRawFile }),
    processFiles: async (rawFiles, cfg) => {
      const processedFiles: ProcessedFile[] = [];
      for (const rawFile of rawFiles) {
        const level = resolveFileLevel(rawFile.path, cfg.output);
        processedFiles.push(await fileProcessWorker({ rawFile, config: cfg, level }));
      }
      return processedFiles;
    },
    // Real validateFileSafety + real runSecurityCheck, with only the worker
    // pool replaced by an in-process runner. Crucially, the branching inside
    // runSecurityCheck (how rawFiles + gitDiff/gitLog items are batched and
    // dispatched) is still the production code path under test.
    validateFileSafety: (rawFiles, progressCallback, cfg, gitDiff, gitLog) =>
      validateFileSafety(rawFiles, progressCallback, cfg, gitDiff, gitLog, {
        runSecurityCheck: (files, progress, diff, log) =>
          runSecurityCheck(files, progress, diff, log, {
            initTaskRunner: (() =>
              inlineSecurityTaskRunner()) as typeof import('../../../src/shared/processConcurrency.js').initTaskRunner,
            getProcessConcurrency: () => 1,
          }),
        filterOutUntrustedFiles,
      }),
    produceOutput,
    createMetricsTaskRunner: () => ({
      taskRunner: { run: async () => 0, cleanup: async () => {} },
      warmupPromise: Promise.resolve(),
    }),
    calculateMetrics: async (processedFiles) => ({
      totalFiles: processedFiles.length,
      totalCharacters: processedFiles.reduce((acc, f) => acc + f.content.length, 0),
      totalTokens: 0,
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
      fileCharCounts: Object.fromEntries(processedFiles.map((f) => [f.path, f.content.length])),
      fileTokenCounts: Object.fromEntries(processedFiles.map((f) => [f.path, 0])),
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
    }),
  });

describe('security scan spec', () => {
  let tmpDir: string;
  let outputPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-security-spec-'));
    outputPath = path.join(tmpDir, 'output.xml');
    // Fixture: one clean file + one file carrying a known secretlint trigger.
    await fs.writeFile(path.join(tmpDir, 'clean.ts'), 'export const greet = (n: string) => "hi " + n;\n');
    await fs.writeFile(path.join(tmpDir, 'leaky.env'), `${FAKE_AWS_SECRET}\n`);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('detects a known fake credential and excludes the file from the packed output', async () => {
    const config = buildMergedConfig(tmpDir, outputPath);
    const result = await runPack(tmpDir, config);

    // The orchestration MUST surface the credential file as suspicious.
    // If a perf optimization silently bypasses dispatch (the b8ef569 trap),
    // this length is 0 and the test fails — exactly the regression net we want.
    expect(result.suspiciousFilesResults.map((r) => r.filePath)).toContain('leaky.env');
    expect(result.safeFilePaths).toContain('clean.ts');
    expect(result.safeFilePaths).not.toContain('leaky.env');

    // Defense in depth: the credential string must not appear in the pack output.
    // A scan that returns the suspicious result but fails to wire it through the
    // filter (e.g. by losing the path between runSecurityCheck and produceOutput)
    // would still leak the secret into the file we hand to the LLM.
    const outputContent = await fs.readFile(outputPath, 'utf-8');
    expect(outputContent).not.toContain('wJalrXUtnFEMI');
    expect(outputContent).toContain('clean.ts');
  });

  it('respects `enableSecurityCheck: false`: the credential is not reported and stays in the output', async () => {
    // Negative-direction contract: future optimizations must not start
    // running the scan unconditionally as a side effect of pre-warming or
    // worker-pool sharing.
    const config = buildMergedConfig(tmpDir, outputPath, {
      security: { enableSecurityCheck: false },
    });
    const result = await runPack(tmpDir, config);

    expect(result.suspiciousFilesResults).toEqual([]);
    expect(result.safeFilePaths).toContain('leaky.env');

    const outputContent = await fs.readFile(outputPath, 'utf-8');
    expect(outputContent).toContain('wJalrXUtnFEMI');
  });
});
