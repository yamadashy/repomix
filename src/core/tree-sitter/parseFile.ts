import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { SupportedLang } from './lang2Query.js';
import { LanguageParser } from './languageParser.js';

let languageParserSingleton: LanguageParser | null = null;

const getLanguageParserSingleton = async () => {
  if (!languageParserSingleton) {
    languageParserSingleton = new LanguageParser();
    await languageParserSingleton.init();
  }
  return languageParserSingleton;
};

function normalizeChunk(chunk: string): string {
  return chunk.trim();
}

// TODO: Do something with config: RepomixConfigMerged, it is not used (yet)
export const parseFile = async (fileContent: string, filePath: string, config: RepomixConfigMerged) => {
  const languageParser = await getLanguageParserSingleton();

  // Split the file content into individual lines
  const lines = fileContent.split('\n');
  if (lines.length < 1) {
    return '';
  }

  const lang: SupportedLang | undefined = languageParser.guessTheLang(filePath);
  if (lang === undefined) {
    // Language not supported
    return undefined;
  }

  const query = await languageParser.getQueryForLang(lang);
  const parser = await languageParser.getParserForLang(lang);
  const processedChunks = new Set<string>();
  const chunks = [];

  try {
    // Parse the file content into an Abstract Syntax Tree (AST), a tree-like representation of the code
    const tree = parser.parse(fileContent);

    // Apply configuration options for parsing
    const shouldRemoveComments = config.output?.removeComments ?? false;
    const shouldRemoveEmptyLines = config.output?.removeEmptyLines ?? false;

    // Log the parsing configuration
    logger.debug('Parsing configuration:', {
      removeComments: shouldRemoveComments,
      removeEmptyLines: shouldRemoveEmptyLines
    });

    // Apply the query to the AST and get the captures
    // Captures are specific parts of the AST that match our query patterns, each capture represents a node in the AST that we're interested in.
    const captures = query.captures(tree.rootNode);

    // Sort captures by their start position
    captures.sort((a, b) => a.node.startPosition.row - b.node.startPosition.row);

    for (const capture of captures) {
      const { node, name } = capture;

      // Get the start and end lines of the current AST node
      const startRow = node.startPosition.row; // start from 0
      const endRow = node.endPosition.row;

      // Check if the node is a function or a variable declaration
      if (!name.includes('name') || !lines[startRow]) {
        // It's not what we're looking for, or it's empty
        continue;
      }

      const selectedLines = lines.slice(startRow, endRow + 1);
      if (selectedLines.length < 1) {
        continue;
      }
      const chunk = selectedLines.join('\n');
      const normalizedChunk = normalizeChunk(chunk);

      if (!processedChunks.has(normalizedChunk)) {
        processedChunks.add(normalizedChunk);
        chunks.push(chunk);
      }
    }
  } catch (error: unknown) {
    logger.log(`Error parsing file: ${error}\n`);
  }
  return chunks.join('\n');
};
