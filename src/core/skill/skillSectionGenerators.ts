import {
  type FilesByRoot,
  generateTreeStringWithLineCounts,
  generateTreeStringWithRootsAndLineCounts,
} from '../file/fileTreeGenerate.js';
import type { RenderContext } from '../output/outputGeneratorTypes.js';
import { renderMarkdownFile } from '../output/outputStyles/markdownStyle.js';
import { renderEach } from '../output/outputStyleUtils.js';
import { joinDisplayPath } from '../packager/rootDisplayPath.js';

/**
 * Generates the summary section for skill output.
 * Contains purpose, file format, usage guidelines, notes, and project statistics.
 */
export const generateSummarySection = (context: RenderContext, statisticsSection?: string): string => {
  // Values are inserted verbatim; the result is trimmed.
  const summary = `${context.generationHeader}

# Summary

## Purpose

This is a reference codebase organized into multiple files for AI consumption.
It is designed to be easily searchable using grep and other text-based tools.

## File Structure

This skill contains the following reference files:

| File | Contents |
|------|----------|
| \`project-structure.md\` | Directory tree with line counts per file |
| \`files.md\` | All file contents (search with \`## File: <path>\`) |
| \`tech-stacks.md\` | Languages, frameworks, and dependencies per package (search with \`## Tech Stack: <path>\`) |
| \`summary.md\` | This file - purpose and format explanation |

## Usage Guidelines

${context.summaryUsageGuidelines}

## Notes

${context.summaryNotes}

${statisticsSection ? `${statisticsSection}\n` : ''}`;

  return summary.trim();
};

/**
 * Generates the directory structure section for skill output.
 * Includes line counts for each file to aid in grep searches.
 * With multiple roots, the tree is split into labeled `[rootLabel]/` sections like the
 * directory structure of the regular output.
 */
export const generateStructureSection = (context: RenderContext, filePathsByRoot?: FilesByRoot[]): string => {
  if (!context.directoryStructureEnabled) {
    return '';
  }

  // Generate tree string with line counts for skill output
  const filePaths = context.processedFiles.map((f) => f.path);
  let treeStringWithLineCounts: string;
  if (filePathsByRoot && filePathsByRoot.length > 1) {
    // Keep only processed files (e.g. drop ones excluded by the security check), matching
    // the single-root tree. Multi-root processed paths are root-prefixed display paths,
    // while filePathsByRoot holds paths relative to each root.
    const processedPathSet = new Set(filePaths);
    const processedFilesByRoot = filePathsByRoot.map(({ rootLabel, files }) => ({
      rootLabel,
      files: files.filter((file) => processedPathSet.has(joinDisplayPath(rootLabel, file))),
    }));
    treeStringWithLineCounts = generateTreeStringWithRootsAndLineCounts(processedFilesByRoot, context.fileLineCounts);
  } else {
    treeStringWithLineCounts = generateTreeStringWithLineCounts(filePaths, context.fileLineCounts);
  }

  return `# Directory Structure\n\n\`\`\`\n${treeStringWithLineCounts}\n\`\`\`\n`.trim();
};

/**
 * Generates the files section for skill output.
 * Contains all file contents with syntax highlighting.
 */
export const generateFilesSection = (context: RenderContext): string => {
  if (!context.filesEnabled) {
    return '';
  }

  const files = renderEach(context.processedFiles, (file) =>
    renderMarkdownFile(file, context.markdownCodeBlockDelimiter),
  );
  return `# Files\n\n${files}`.trim();
};
