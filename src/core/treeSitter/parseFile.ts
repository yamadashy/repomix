/**
 * File parsing using tree-sitter for the compress feature.
 *
 * Why we use web-tree-sitter (WASM) instead of node-tree-sitter (native bindings):
 *
 * 1. Cross-platform compatibility: WASM works identically across all platforms
 *    without requiring native compilation.
 *
 * 2. Easy installation: No build tools (Python, C++ compiler, node-gyp) required.
 *    Users can install Repomix with just `npm install` on any environment.
 *
 * 3. Fewer dependencies: All language parsers are bundled in a single package
 *    (@repomix/tree-sitter-wasms) instead of 15+ separate native packages.
 *
 * 4. Reliability: Native modules can fail to build on certain Node.js versions
 *    (e.g., Node.js v23 has known issues with node-tree-sitter).
 *
 * The performance overhead of WASM is acceptable for the compress feature's use case.
 */

import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { SupportedLang } from './languageConfig.js';
import { LanguageParser } from './languageParser.js';
import type { ParseContext } from './parseStrategies/BaseParseStrategy.js';

interface CapturedChunk {
  content: string;
  startRow: number;
  endRow: number;
}

let languageParserSingleton: LanguageParser | null = null;

export const CHUNK_SEPARATOR = '⋮----';

// Compression is best-effort: this function never throws. On any failure it
// returns undefined so callers can fall back to the uncompressed content. This
// matters because tree-sitter runs on WASM, where a pathological file can
// trigger a runtime abort; without this, a single bad file would crash the
// whole pack. The success path is fully wrapped so a partially-built result is
// never returned on error.
export const parseFile = async (
  fileContent: string,
  filePath: string,
  config: RepomixConfigMerged,
): Promise<string | undefined> => {
  // Split the file content into individual lines
  const lines = fileContent.split('\n');

  try {
    const languageParser = await getLanguageParserSingleton();

    const lang: SupportedLang | undefined = languageParser.guessTheLang(filePath);
    if (lang === undefined) {
      // Language not supported: fall back to uncompressed content quietly.
      return undefined;
    }

    const query = await languageParser.getQueryForLang(lang);
    const parser = await languageParser.getParserForLang(lang);
    const processedChunks = new Set<string>();
    const capturedChunks: CapturedChunk[] = [];

    // Parse the file content into an Abstract Syntax Tree (AST)
    const tree = parser.parse(fileContent);
    if (!tree) {
      logger.debug(`Failed to parse file: ${filePath}`);
      return undefined;
    }

    // Get the appropriate parse strategy for the language
    const parseStrategy = await languageParser.getStrategyForLang(lang);

    // Create parse context
    const context: ParseContext = {
      fileContent,
      lines,
      tree,
      query,
      config,
    };

    // Apply the query to the AST and get the captures
    const captures = query.captures(tree.rootNode);

    // Sort captures by their start position
    captures.sort((a, b) => a.node.startPosition.row - b.node.startPosition.row);

    for (const capture of captures) {
      const capturedChunkContent = parseStrategy.parseCapture(capture, lines, processedChunks, context);
      if (capturedChunkContent !== null) {
        capturedChunks.push({
          content: capturedChunkContent.trim(),
          startRow: capture.node.startPosition.row,
          endRow: capture.node.endPosition.row,
        });
      }
    }

    const filteredChunks = filterDuplicatedChunks(capturedChunks);
    const mergedChunks = mergeAdjacentChunks(filteredChunks);

    return mergedChunks
      .map((chunk) => chunk.content)
      .join(`\n${CHUNK_SEPARATOR}\n`)
      .trim();
  } catch (error: unknown) {
    // Any failure here (language preparation, parsing, or a WASM runtime abort)
    // degrades to uncompressed content instead of aborting the whole pack.
    //
    // Note on hard WASM aborts (e.g. "table index is out of bounds"): such an
    // abort can leave this worker's shared tree-sitter runtime degraded. The
    // parser singleton is reused for the worker's lifetime, so later files routed
    // to the same worker may also fall back to uncompressed output. This is
    // bounded per worker and surfaced by the warning below. Recovering the
    // runtime would require recycling the worker, which is out of scope here; the
    // init-failure path is already retried by getLanguageParserSingleton.
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to compress ${filePath}, using uncompressed content: ${message}`);
    return undefined;
  }
};

const getLanguageParserSingleton = async () => {
  if (!languageParserSingleton) {
    // Assign only after init() succeeds. Otherwise a failed init would leave an
    // uninitialized parser cached for the rest of the worker's lifetime, so
    // every subsequent file would throw "not initialized" and silently lose
    // compression. Keeping the singleton null lets the next call retry init.
    const parser = new LanguageParser();
    await parser.init();
    languageParserSingleton = parser;
  }
  return languageParserSingleton;
};
/**
 * Clean up the language parser singleton by deleting all loaded parsers
 */
export const cleanupLanguageParser = async (): Promise<void> => {
  if (languageParserSingleton) {
    try {
      await languageParserSingleton.dispose();
      logger.debug('Language parser singleton deleted');
    } catch (err) {
      logger.debug('Language parser dispose threw', err);
    } finally {
      languageParserSingleton = null;
    }
  }
};

const filterDuplicatedChunks = (chunks: CapturedChunk[]): CapturedChunk[] => {
  // Group chunks by their start row
  const chunksByStartRow = new Map<number, CapturedChunk[]>();

  for (const chunk of chunks) {
    const startRow = chunk.startRow;
    if (!chunksByStartRow.has(startRow)) {
      chunksByStartRow.set(startRow, []);
    }
    chunksByStartRow.get(startRow)?.push(chunk);
  }

  // For each start row, keep the chunk with the most content
  const filteredChunks: CapturedChunk[] = [];
  for (const [_, rowChunks] of chunksByStartRow) {
    rowChunks.sort((a, b) => b.content.length - a.content.length);
    filteredChunks.push(rowChunks[0]);
  }

  // Sort filtered chunks by start row
  return filteredChunks.sort((a, b) => a.startRow - b.startRow);
};

const mergeAdjacentChunks = (chunks: CapturedChunk[]): CapturedChunk[] => {
  if (chunks.length <= 1) {
    return chunks;
  }

  const merged: CapturedChunk[] = [];
  // Use array accumulation instead of string += to avoid O(k²) copying.
  // Each += creates a new string copying all previous content; accumulating
  // content parts and joining once is O(k) total.
  let contentParts: string[] = [chunks[0].content];
  let startRow = chunks[0].startRow;
  let endRow = chunks[0].endRow;

  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];

    if (endRow + 1 === current.startRow) {
      // Adjacent: accumulate content part
      contentParts.push(current.content);
      endRow = current.endRow;
    } else {
      // Gap: finalize previous merged chunk and start a new one
      merged.push({ content: contentParts.join('\n'), startRow, endRow });
      contentParts = [current.content];
      startRow = current.startRow;
      endRow = current.endRow;
    }
  }

  // Finalize the last merged chunk
  merged.push({ content: contentParts.join('\n'), startRow, endRow });

  return merged;
};
