import fs from 'node:fs/promises';

import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../src/cli/cliRun.js';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { pack } from '../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import { logger } from '../../src/shared/logger.js';
import type { WorkerOptions } from '../../src/shared/processConcurrency.js';
import { isWindows } from '../testing/testUtils.js';

const mockCollectFileInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileCollectWorker(task as FileCollectTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe.runIf(!isWindows)('Line Limit Verbose Mode Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-line-limit-verbose-test-'));
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear environment variable for clean testing
    delete process.env.REPOMIX_LINE_LIMIT;
    
    // Mock console methods to capture output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock logger to capture verbose output
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    
    // Mock clipboard functions
    vi.mock('../../src/core/packager/copyToClipboardIfEnabled.js');
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore mocks
    vi.restoreAllMocks();
    
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should log line limit configuration in verbose mode', async () => {
    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with verbose mode and line limit
    await runCli([tempDir], tempDir, { line: 10, verbose: true });

    // Verify that verbose logging includes line limit information
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('lineLimit')
    );
  });

  test('should log line limit processing details in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a file that will be truncated
    await fs.writeFile(
      path.join(srcDir, 'large.js'),
      `// Large JavaScript file
function function1() {
  console.log('This is function 1');
  return 'result1';
}

function function2() {
  console.log('This is function 2');
  return 'result2';
}

function function3() {
  console.log('This is function 3');
  return 'result3';
}

function function4() {
  console.log('This is function 4');
  return 'result4';
}

function function5() {
  console.log('This is function 5');
  return 'result5';
}

const variable1 = 'This is a variable';
const variable2 = 'This is another variable';

export { function1, function2, function3, function4, function5, variable1, variable2 };`
    );

    // Run with verbose mode and line limit
    const result = await runCli([tempDir], tempDir, { line: 8, verbose: true });

    // Verify that verbose logging includes line limit processing
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('line limit')
    );

    // Verify that truncation information is logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('truncat')
    );
  });

  test('should log configuration merging details in verbose mode', async () => {
    // Create config file
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '75';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with verbose mode and CLI option
    await runCli([tempDir], tempDir, { line: 25, verbose: true });

    // Verify that configuration merging is logged
    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Default config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Loaded file config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('CLI config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Merged config:')
    );
  });

  test('should log environment variable handling in verbose mode', async () => {
    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '60';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with verbose mode
    await runCli([tempDir], tempDir, { verbose: true });

    // Verify that environment variable is logged
    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Using line limit from environment variable: 60')
    );
  });

  test('should log invalid environment variable warning in verbose mode', async () => {
    // Set invalid environment variable
    process.env.REPOMIX_LINE_LIMIT = 'invalid';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with verbose mode
    await runCli([tempDir], tempDir, { verbose: true });

    // Verify that warning is logged
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid REPOMIX_LINE_LIMIT environment variable: invalid')
    );
  });

  test('should log file processing details with line limit in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create multiple files
    await fs.writeFile(
      path.join(srcDir, 'file1.js'),
      `// File 1
function test1() {
  console.log('Test 1');
  return 'result1';
}

function test2() {
  console.log('Test 2');
  return 'result2';
}`
    );

    await fs.writeFile(
      path.join(srcDir, 'file2.js'),
      `// File 2
const variable1 = 'Hello';
const variable2 = 'World';
const variable3 = 'Test';

console.log(variable1, variable2, variable3);`
    );

    await fs.writeFile(
      path.join(srcDir, 'file3.js'),
      `// File 3
export const small = () => 'Small file';`
    );

    // Run with verbose mode and line limit
    const result = await runCli([tempDir], tempDir, { line: 5, verbose: true });

    // Verify that file processing is logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Processing')
    );

    // Verify that line limit application is logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('line limit')
    );
  });

  test('should log truncation metrics in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a file that will be truncated
    await fs.writeFile(
      path.join(srcDir, 'truncated.js'),
      `// File to be truncated
class LargeClass {
  constructor() {
    this.property1 = 'value1';
    this.property2 = 'value2';
    this.property3 = 'value3';
    this.property4 = 'value4';
    this.property5 = 'value5';
  }

  method1() {
    console.log('Method 1');
    return this.property1;
  }

  method2() {
    console.log('Method 2');
    return this.property2;
  }

  method3() {
    console.log('Method 3');
    return this.property3;
  }

  method4() {
    console.log('Method 4');
    return this.property4;
  }

  method5() {
    console.log('Method 5');
    return this.property5;
  }

  static staticMethod1() {
    return 'Static method 1';
  }

  static staticMethod2() {
    return 'Static method 2';
  }

  static staticMethod3() {
    return 'Static method 3';
  }
}

export default LargeClass;`
    );

    // Run with verbose mode and small line limit
    const result = await runCli([tempDir], tempDir, { line: 10, verbose: true });

    // Verify that truncation metrics are logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('truncat')
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('truncat')
    );
  });

  test('should log output generation with line limit in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create test files
    await fs.writeFile(
      path.join(srcDir, 'output1.js'),
      `// Output test 1
function test() {
  console.log('This is a test');
  return 'result';
}

export default test;`
    );

    await fs.writeFile(
      path.join(srcDir, 'output2.js'),
      `// Output test 2
const value = 'Hello World';
console.log(value);`
    );

    // Run with verbose mode and line limit
    const result = await runCli([tempDir], tempDir, { 
      line: 8, 
      verbose: true,
      style: 'xml',
      fileSummary: true,
      directoryStructure: true,
    });

    // Verify that output generation is logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Generating output')
    );

    // Verify that file summary includes truncation info
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('truncat')
    );
  });

  test('should log progress updates with line limit in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create multiple files
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(
        path.join(srcDir, `file${i}.js`),
        `// File ${i}
function function${i}() {
  console.log('This is function ${i}');
  return 'result${i}';
}

function function${i}_2() {
  console.log('This is function ${i}_2');
  return 'result${i}_2';
}

function function${i}_3() {
  console.log('This is function ${i}_3');
  return 'result${i}_3';
}

export { function${i}, function${i}_2, function${i}_3 };`
      );
    }

    // Mock progress callback to capture progress updates
    const progressUpdates: any[] = [];
    const mockProgressCallback = vi.fn().mockImplementation((update) => {
      progressUpdates.push(update);
    });

    // Run with verbose mode and line limit
    const result = await runCli([tempDir], tempDir, { 
      line: 6, 
      verbose: true 
    });

    // Verify that progress updates include line limit information
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Progress')
    );
  });

  test('should log detailed error information in verbose mode when line limit fails', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a malformed file
    await fs.writeFile(
      path.join(srcDir, 'malformed.js'),
      `// Malformed file
function broken() {
  console.log('This is broken'
  // Missing closing parenthesis and brace
  return 'broken';`
    );

    // Run with verbose mode and line limit
    const result = await runCli([tempDir], tempDir, { line: 5, verbose: true });

    // Verify that error details are logged
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply line limit')
    );
  });

  test('should log configuration priority order in verbose mode', async () => {
    // Create config file
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 30,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '40';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with verbose mode and CLI option
    await runCli([tempDir], tempDir, { line: 20, verbose: true });

    // Verify that configuration priority is logged
    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Default config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Loaded file config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('CLI config:')
    );

    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('Merged config:')
    );

    // Verify that the final configuration reflects CLI priority
    expect(logger.trace).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({
          lineLimit: 20, // CLI should win
        }),
      })
    );
  });

  test('should log line limit validation details in verbose mode', async () => {
    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with valid line limit
    await runCli([tempDir], tempDir, { line: 10, verbose: true });

    // Verify that validation success is logged
    expect(logger.trace).toHaveBeenCalledWith(
      expect.stringContaining('lineLimit: 10')
    );

    // Test with invalid line limit (should be caught by Commander.js)
    await expect(
      runCli([tempDir], tempDir, { line: -5, verbose: true })
    ).rejects.toThrow();
  });

  test('should log token count adjustments due to line limiting in verbose mode', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a file that will be significantly truncated
    await fs.writeFile(
      path.join(srcDir, 'large.js'),
      `// Large file for token counting
function largeFunction1() {
  console.log('This is a large function 1');
  console.log('It has many lines');
  console.log('That will be truncated');
  console.log('When line limit is applied');
  console.log('Reducing token count significantly');
  return 'result1';
}

function largeFunction2() {
  console.log('This is a large function 2');
  console.log('It also has many lines');
  console.log('That will be truncated');
  console.log('When line limit is applied');
  console.log('Reducing token count significantly');
  return 'result2';
}

function largeFunction3() {
  console.log('This is a large function 3');
  console.log('It also has many lines');
  console.log('That will be truncated');
  console.log('When line limit is applied');
  console.log('Reducing token count significantly');
  return 'result3';
}

const largeVariable1 = 'This is a large variable with lots of text that will be truncated';
const largeVariable2 = 'This is another large variable with lots of text that will be truncated';
const largeVariable3 = 'This is yet another large variable with lots of text that will be truncated';

export { largeFunction1, largeFunction2, largeFunction3, largeVariable1, largeVariable2, largeVariable3 };`
    );

    // Run with verbose mode and small line limit
    const result = await runCli([tempDir], tempDir, { 
      line: 5, 
      verbose: true,
      tokenCountTree: true,
    });

    // Verify that token count adjustments are logged
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('token')
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('truncat')
    );
  });
});