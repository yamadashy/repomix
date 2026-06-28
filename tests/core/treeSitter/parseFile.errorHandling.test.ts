import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLanguageParser, parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockConfig } from '../../testing/testUtils.js';

// A single mock LanguageParser instance reused via the module singleton in
// parseFile.ts. Each test reconfigures its methods to simulate failures at
// different stages of the compression pipeline.
const mockParser = {
  init: vi.fn(),
  guessTheLang: vi.fn(),
  getQueryForLang: vi.fn(),
  getParserForLang: vi.fn(),
  getStrategyForLang: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../../../src/core/treeSitter/languageParser.js', () => ({
  // A class so `new LanguageParser()` works; it delegates to the shared
  // mockParser whose method behaviors each test reconfigures.
  LanguageParser: class {
    init = mockParser.init;
    guessTheLang = mockParser.guessTheLang;
    getQueryForLang = mockParser.getQueryForLang;
    getParserForLang = mockParser.getParserForLang;
    getStrategyForLang = mockParser.getStrategyForLang;
    dispose = mockParser.dispose;
  },
}));

vi.mock('../../../src/shared/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
  },
}));

const makeTree = () => ({ rootNode: {} });
const makeWorkingQuery = () => ({ captures: vi.fn().mockReturnValue([]) });
const makeWorkingParser = () => ({ parse: vi.fn().mockReturnValue(makeTree()) });
const makeWorkingStrategy = () => ({ parseCapture: vi.fn().mockReturnValue(null) });

const config = createMockConfig({});

describe('parseFile error handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module singleton so each test starts from a clean init() state.
    mockParser.dispose.mockResolvedValue(undefined);
    await cleanupLanguageParser();
    vi.clearAllMocks();
    // Working defaults; individual tests override one stage to make it fail.
    mockParser.init.mockResolvedValue(undefined);
    mockParser.guessTheLang.mockReturnValue('javascript');
    mockParser.getQueryForLang.mockResolvedValue(makeWorkingQuery());
    mockParser.getParserForLang.mockResolvedValue(makeWorkingParser());
    mockParser.getStrategyForLang.mockResolvedValue(makeWorkingStrategy());
  });

  it('returns undefined (not an empty string) and warns when language preparation throws', async () => {
    // Mirrors a tree-sitter WASM abort surfacing as a prepare-time error.
    mockParser.getQueryForLang.mockRejectedValue(
      new Error('Failed to prepare language cpp: table index is out of bounds'),
    );

    const result = await parseFile('int main() { return 0; }', 'main.cpp', config);

    expect(result).toBeUndefined();
    expect(result).not.toBe('');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when the parser throws during parse', async () => {
    mockParser.getParserForLang.mockResolvedValue({
      parse: vi.fn(() => {
        throw new Error('Aborted(). Build with -sASSERTIONS for more info.');
      }),
    });

    const result = await parseFile('int main() { return 0; }', 'main.cpp', config);

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when query.captures throws', async () => {
    mockParser.getQueryForLang.mockResolvedValue({
      captures: vi.fn(() => {
        throw new Error('captures failed');
      }),
    });

    const result = await parseFile('const x = 1;', 'main.js', config);

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when the parse strategy throws', async () => {
    const capture = { node: { startPosition: { row: 0 }, endPosition: { row: 0 } } };
    mockParser.getQueryForLang.mockResolvedValue({ captures: vi.fn().mockReturnValue([capture]) });
    mockParser.getStrategyForLang.mockResolvedValue({
      parseCapture: vi.fn(() => {
        throw new Error('strategy failed');
      }),
    });

    const result = await parseFile('const x = 1;', 'main.js', config);

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns an empty string (not undefined) when a parseable file yields no captures', async () => {
    // Contract boundary: '' means "compressed to nothing, keep it" while
    // undefined means "could not compress, fall back". The default mock yields
    // zero captures, exercising the success-with-empty-result path; the caller
    // preserves '' via `parsedContent ?? processedContent`.
    const result = await parseFile('const x = 1;', 'main.js', config);

    expect(result).toBe('');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined without warning when the parser yields no tree', async () => {
    // parser.parse() can return null; this is an expected non-result, logged at
    // debug level (not warn), and falls back to uncompressed content.
    mockParser.getParserForLang.mockResolvedValue({ parse: vi.fn().mockReturnValue(null) });

    const result = await parseFile('const x = 1;', 'main.js', config);

    expect(result).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined without warning for unsupported languages', async () => {
    mockParser.guessTheLang.mockReturnValue(undefined);

    const result = await parseFile('some content', 'file.unknown', config);

    expect(result).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns the compressed string on the success path', async () => {
    const capture = { node: { startPosition: { row: 0 }, endPosition: { row: 0 } } };
    mockParser.getQueryForLang.mockResolvedValue({ captures: vi.fn().mockReturnValue([capture]) });
    mockParser.getStrategyForLang.mockResolvedValue({
      parseCapture: vi.fn().mockReturnValue('function foo()'),
    });

    const result = await parseFile('function foo() {}', 'foo.js', config);

    expect(result).toBe('function foo()');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries initialization on the next call after a failed init', async () => {
    // A failed init must not cache an uninitialized parser. The first call
    // degrades to undefined; the next call re-attempts init and succeeds.
    mockParser.init.mockRejectedValueOnce(new Error('init failed')).mockResolvedValue(undefined);
    const capture = { node: { startPosition: { row: 0 }, endPosition: { row: 0 } } };
    mockParser.getQueryForLang.mockResolvedValue({ captures: vi.fn().mockReturnValue([capture]) });
    mockParser.getStrategyForLang.mockResolvedValue({
      parseCapture: vi.fn().mockReturnValue('function foo()'),
    });

    const firstResult = await parseFile('function foo() {}', 'foo.js', config);
    expect(firstResult).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);

    const secondResult = await parseFile('function foo() {}', 'foo.js', config);
    expect(secondResult).toBe('function foo()');
    expect(mockParser.init).toHaveBeenCalledTimes(2);
  });

  it('reuses the initialized singleton across repeated post-init aborts (does not re-init per file)', async () => {
    // The #1668 trigger is a post-init WASM abort surfacing during language
    // preparation. init() has already succeeded, so the singleton is cached and
    // reused: subsequent files degrade to uncompressed without re-running
    // Parser.init(). This documents the bounded per-worker degradation; full
    // runtime recovery would require recycling the worker.
    mockParser.getQueryForLang.mockRejectedValue(
      new Error('Failed to prepare language cpp: table index is out of bounds'),
    );

    const first = await parseFile('int main() { return 0; }', 'a.cpp', config);
    const second = await parseFile('int main() { return 0; }', 'b.cpp', config);

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(mockParser.init).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
