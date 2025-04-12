import { beforeAll, describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { LanguageParser } from '../../../src/core/treeSitter/languageParser.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';

describe('Solidity File Parsing', () => {
  let parser: LanguageParser;
  const defaultConfig: RepomixConfigMerged = {
    cwd: process.cwd(),
    input: {
      maxFileSize: 50 * 1024 * 1024,
    },
    output: {
      filePath: 'output.txt',
      style: 'xml',
      stdout: false,
      parsableStyle: false,
      fileSummary: true,
      directoryStructure: true,
      removeComments: false,
      removeEmptyLines: false,
      compress: false,
      topFilesLength: 5,
      showLineNumbers: false,
      copyToClipboard: false,
      files: true,
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 100,
        includeDiffs: false,
      },
    },
    include: [],
    forceInclude: [],
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: [],
    },
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
  };

  beforeAll(async () => {
    parser = new LanguageParser();
    await parser.init();
  });

  test('should parse Solidity contract definitions correctly', async () => {
    const content = `
contract BaseContract {
    uint256 internal value;
}

interface IMyInterface {
    function getValue() external view returns (uint256);
}

abstract contract AbstractContract {
    function abstractFunction() virtual external;
}

contract MyContract is BaseContract, IMyInterface {
    function getValue() external view override returns (uint256) {
        return value;
    }
}`;

    const config = {
      ...defaultConfig,
      output: {
        ...defaultConfig.output,
        removeComments: true,
      },
    };

    const result = await parseFile(content, 'test.sol', config);

    // 各種コントラクト定義が保持されていることを確認
    expect(result).toContain('contract BaseContract {');
    expect(result).toContain('interface IMyInterface {');
    expect(result).toContain('abstract contract AbstractContract {');
    expect(result).toContain('contract MyContract is BaseContract, IMyInterface {');

    // 関数定義が保持されていることを確認
    expect(result).toContain('function getValue() external view returns (uint256)');
    expect(result).toContain('function abstractFunction() virtual external');
  });
});
