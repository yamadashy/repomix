import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { repomixConfigFileSchema } from '../../src/config/configSchema.js';
import { isWindows } from '../testing/testUtils.js';

describe.runIf(!isWindows)('Configuration Line Limit Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-config-line-limit-test-'));

    // Store original environment
    originalEnv = { ...process.env };

    // Clear environment variable for clean testing
    delete process.env.REPOMIX_LINE_LIMIT;
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should load line limit from JSON config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(50);
  });

  test('should load line limit from JSON5 config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json5');
    const configContent = `{
      output: {
        lineLimit: 75,
        style: 'markdown',
      },
    }`;

    await fs.writeFile(configPath, configContent);

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(75);
  });

  test('should load line limit from JavaScript config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.js');
    const configContent = `
      export default {
        output: {
          lineLimit: 100,
          style: 'plain',
        },
      };
    `;

    await fs.writeFile(configPath, configContent);

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(100);
  });

  test('should load line limit from TypeScript config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.ts');
    const configContent = `
      import type { RepomixConfigFile } from 'repomix';
      
      const config: RepomixConfigFile = {
        output: {
          lineLimit: 25,
          style: 'json',
        },
      };
      
      export default config;
    `;

    await fs.writeFile(configPath, configContent);

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(25);
  });

  test('should validate line limit in config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');

    // Test negative line limit
    const invalidConfig1 = {
      output: {
        lineLimit: -10,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(invalidConfig1, null, 2));

    await expect(loadFileConfig(tempDir, null)).rejects.toThrow();

    // Test zero line limit
    const invalidConfig2 = {
      output: {
        lineLimit: 0,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(invalidConfig2, null, 2));

    await expect(loadFileConfig(tempDir, null)).rejects.toThrow();

    // Test non-integer line limit (should be caught by schema validation)
    const invalidConfig3 = {
      output: {
        lineLimit: 10.5,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(invalidConfig3, null, 2));

    await expect(loadFileConfig(tempDir, null)).rejects.toThrow();
  });

  test('should handle missing line limit in config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        style: 'xml',
        fileSummary: false,
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBeUndefined();
  });

  test('should handle partial config with line limit', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 30,
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(30);
  });

  test('should merge line limit from config with defaults', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 40,
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const fileConfig = await loadFileConfig(tempDir, null);
    const mergedConfig = mergeConfigs(tempDir, fileConfig, {});

    expect(mergedConfig.output.lineLimit).toBe(40);
    expect(mergedConfig.output.style).toBe('xml'); // Should use default
    expect(mergedConfig.output.fileSummary).toBe(true); // Should use default
  });

  test('should prioritize CLI line limit over config file', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {
      output: {
        lineLimit: 25,
      },
    };

    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);

    expect(mergedConfig.output.lineLimit).toBe(25); // CLI should override config
  });

  test('should use environment variable when no CLI line limit', async () => {
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

    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {}; // No CLI line limit

    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);

    expect(mergedConfig.output.lineLimit).toBe(75); // Environment should override config
  });

  test('should prioritize CLI over environment variable', async () => {
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

    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {
      output: {
        lineLimit: 25,
      },
    };

    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);

    expect(mergedConfig.output.lineLimit).toBe(25); // CLI should override environment
  });

  test('should handle invalid environment variable', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set invalid environment variable
    process.env.REPOMIX_LINE_LIMIT = 'invalid';

    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {};

    // Mock logger to capture warning
    const loggerSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);

    expect(mergedConfig.output.lineLimit).toBe(50); // Should use config file value
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid REPOMIX_LINE_LIMIT environment variable'));

    loggerSpy.mockRestore();
  });

  test('should handle line limit with complex config structure', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      input: {
        maxFileSize: 1024 * 1024, // 1MB
      },
      output: {
        lineLimit: 60,
        style: 'markdown',
        fileSummary: false,
        directoryStructure: true,
        files: true,
        removeComments: true,
        removeEmptyLines: true,
        compress: false,
        showLineNumbers: true,
        truncateBase64: true,
        copyToClipboard: false,
        git: {
          sortByChanges: false,
          includeDiffs: true,
          includeLogs: true,
          includeLogsCount: 25,
        },
      },
      include: ['src/**/*.ts', 'tests/**/*.ts'],
      ignore: {
        useGitignore: false,
        useDefaultPatterns: true,
        customPatterns: ['*.log', 'dist/**'],
      },
      security: {
        enableSecurityCheck: false,
      },
      tokenCount: {
        encoding: 'cl100k_base',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(60);
    expect(loadedConfig.output?.style).toBe('markdown');
    expect(loadedConfig.output?.fileSummary).toBe(false);
    expect(loadedConfig.output?.removeComments).toBe(true);
    expect(loadedConfig.include).toEqual(['src/**/*.ts', 'tests/**/*.ts']);
    expect(loadedConfig.ignore?.customPatterns).toEqual(['*.log', 'dist/**']);
  });

  test('should handle custom config file path', async () => {
    const customConfigPath = path.join(tempDir, 'custom.config.json');
    const configContent = {
      output: {
        lineLimit: 80,
        style: 'plain',
      },
    };

    await fs.writeFile(customConfigPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, 'custom.config.json');
    expect(loadedConfig.output?.lineLimit).toBe(80);
  });

  test('should handle missing custom config file', async () => {
    await expect(loadFileConfig(tempDir, 'nonexistent.config.json')).rejects.toThrow(
      'Config file not found at nonexistent.config.json',
    );
  });

  test('should validate config schema with line limit', async () => {
    const validConfig = {
      output: {
        lineLimit: 42,
        style: 'xml',
      },
    };

    const parsedConfig = repomixConfigFileSchema.parse(validConfig);
    expect(parsedConfig.output?.lineLimit).toBe(42);
  });

  test('should handle config file priority order', async () => {
    // Create multiple config files in priority order
    const jsConfig = path.join(tempDir, 'repomix.config.js');
    const jsonConfig = path.join(tempDir, 'repomix.config.json');

    await fs.writeFile(
      jsConfig,
      `
      export default {
        output: {
          lineLimit: 30,
          style: 'xml',
        },
      };
    `,
    );

    await fs.writeFile(
      jsonConfig,
      JSON.stringify(
        {
          output: {
            lineLimit: 60,
            style: 'markdown',
          },
        },
        null,
        2,
      ),
    );

    // Should load JS config (higher priority)
    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(30);
    expect(loadedConfig.output?.style).toBe('xml');
  });

  test('should handle line limit in nested output config', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        filePath: 'custom-output.xml',
        style: 'json',
        parsableStyle: true,
        headerText: 'Custom Header',
        instructionFilePath: 'instructions.md',
        fileSummary: false,
        directoryStructure: false,
        files: true,
        removeComments: true,
        removeEmptyLines: true,
        compress: false,
        topFilesLength: 10,
        showLineNumbers: true,
        truncateBase64: true,
        lineLimit: 45,
        copyToClipboard: false,
        includeEmptyDirectories: true,
        includeFullDirectoryStructure: true,
        tokenCountTree: 50,
        git: {
          sortByChanges: false,
          sortByChangesMaxCommits: 200,
          includeDiffs: true,
          includeLogs: true,
          includeLogsCount: 75,
        },
      },
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    const loadedConfig = await loadFileConfig(tempDir, null);
    expect(loadedConfig.output?.lineLimit).toBe(45);
    expect(loadedConfig.output?.filePath).toBe('custom-output.xml');
    expect(loadedConfig.output?.style).toBe('json');
    expect(loadedConfig.output?.topFilesLength).toBe(10);
    expect(loadedConfig.output?.tokenCountTree).toBe(50);
  });
});
