import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { LanguageParser } from './LanguageParser.js';

export const getFn_parseFile = async () => {
  const magicBlob = new LanguageParser();
  await magicBlob.init();
  // TODO: Do something with config: RepomixConfigMerged, it is not used (yet)
  const parseFile = async (fileContent: string, filePath: string, config: RepomixConfigMerged) => {
    // Split the file content into individual lines
    const lines = fileContent.split('\n');
    if (lines.length < 1) {
      return '';
    }
    const lang = magicBlob.guessTheLang(filePath);
    if (lang === undefined) {
      // Language not supported
      return undefined;
    }
    const query = await magicBlob.getQueryForLang(lang);
    const parser = await magicBlob.getParserForLang(lang);
    const chunks = [];
    try {
      // Parse the file content into an Abstract Syntax Tree (AST), a tree-like representation of the code
      const tree = parser.parse(fileContent);

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
        // Once we've retrieved the nodes we care about through the language query
        // we filter for lines with definition names only.
        if (!name.includes('name') || !lines[startRow]) {
          // It's not what we're looking for, or it's empty
          continue;
        }
        const selectedLines = lines.slice(startRow, endRow + 1);
        if (selectedLines.length < 1) {
          continue;
        }
        const chunk = selectedLines.join('\n');
        chunks.push(chunk);
      }
    } catch (error) {
      console.log(`Error parsing file: ${error}\n`);
    }
    return chunks.join('\n');
  };
  return parseFile;
};
