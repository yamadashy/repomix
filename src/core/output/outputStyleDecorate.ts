import type { RepomixConfigMerged } from '../../config/configSchema.js';

interface ContentInfo {
  selection: {
    isEntireCodebase: boolean;
    include?: boolean;
    ignore?: boolean;
    gitignore?: boolean;
    defaultIgnore?: boolean;
  };
  processing: {
    commentsRemoved: boolean;
    emptyLinesRemoved: boolean;
    securityCheckEnabled: boolean;
    showLineNumbers: boolean;
    parsableStyle: boolean;
    compressed: boolean;
  };
  sorting: {
    gitChanges: boolean;
  };
}

export const analyzeContent = (config: RepomixConfigMerged): ContentInfo => {
  return {
    selection: {
      isEntireCodebase: !config.include.length && !config.ignore.customPatterns.length,
      include: config.include.length > 0,
      ignore: config.ignore.customPatterns.length > 0,
      gitignore: config.ignore.useGitignore,
      defaultIgnore: config.ignore.useDefaultPatterns,
    },
    processing: {
      commentsRemoved: config.output.removeComments,
      emptyLinesRemoved: config.output.removeEmptyLines,
      securityCheckEnabled: config.security.enableSecurityCheck,
      showLineNumbers: config.output.showLineNumbers,
      parsableStyle: config.output.parsableStyle,
      compressed: config.output.compress,
    },
    sorting: {
      gitChanges: config.output.git?.sortByChanges ?? false,
    },
  };
};

export const generateHeader = (config: RepomixConfigMerged, generationDate: string): string => {
  const info = analyzeContent(config);

  // Generate selection description
  let description: string;
  if (info.selection.isEntireCodebase) {
    description = 'This file is a merged representation of the entire codebase';
  } else {
    const parts = [];
    if (info.selection.include) {
      parts.push('specifically included files');
    }
    if (info.selection.ignore) {
      parts.push('files not matching ignore patterns');
    }
    description = `This file is a merged representation of a subset of the codebase, containing ${parts.join(' and ')}`;
  }

  // Add processing information
  const processingNotes = [];
  if (info.processing.commentsRemoved) {
    processingNotes.push('comments have been removed');
  }
  if (info.processing.emptyLinesRemoved) {
    processingNotes.push('empty lines have been removed');
  }
  if (info.processing.showLineNumbers) {
    processingNotes.push('line numbers have been added');
  }
  if (info.processing.parsableStyle) {
    processingNotes.push(`content has been formatted for parsing in ${config.output.style} style`);
  }
  if (info.processing.compressed) {
    processingNotes.push('content has been compressed (code blocks are separated by ⋮---- delimiter)');
  }
  if (!info.processing.securityCheckEnabled) {
    processingNotes.push('security check has been disabled');
  }

  const processingInfo =
    processingNotes.length > 0 ? `The content has been processed where ${processingNotes.join(', ')}.` : '';

  return `${description}, combined into a single document by Repomix.\n${processingInfo}`.trim();
};

export const generateSummaryPurpose = (): string => {
  return `
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
`.trim();
};

export const generateSummaryFileFormat = (): string => {
  return `
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
`.trim();
};

export const generateSummaryUsageGuidelines = (config: RepomixConfigMerged, repositoryInstruction: string): string => {
  return `
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
${config.output.headerText ? '- Pay special attention to the Repository Description. These contain important context and guidelines specific to this project.' : ''}
${repositoryInstruction ? '- Pay special attention to the Repository Instruction. These contain important context and guidelines specific to this project.' : ''}
`.trim();
};

export const generateSummaryNotes = (config: RepomixConfigMerged): string => {
  const info = analyzeContent(config);
  const notes = [
    "- Some files may have been excluded based on .gitignore rules and Repomix's configuration",
    '- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files',
  ];

  // File selection notes
  if (info.selection.include) {
    notes.push(`- Only files matching these patterns are included: ${config.include.join(', ')}`);
  }
  if (info.selection.ignore) {
    notes.push(`- Files matching these patterns are excluded: ${config.ignore.customPatterns.join(', ')}`);
  }
  if (info.selection.gitignore) {
    notes.push('- Files matching patterns in .gitignore are excluded');
  }
  if (info.selection.defaultIgnore) {
    notes.push('- Files matching default ignore patterns are excluded');
  }

  // Processing notes
  if (info.processing.commentsRemoved) {
    notes.push('- Code comments have been removed from supported file types');
  }
  if (info.processing.emptyLinesRemoved) {
    notes.push('- Empty lines have been removed from all files');
  }
  if (info.processing.showLineNumbers) {
    notes.push('- Line numbers have been added to the beginning of each line');
  }
  if (info.processing.parsableStyle) {
    notes.push(`- Content has been formatted for parsing in ${config.output.style} style`);
  }
  if (info.processing.compressed) {
    notes.push('- Content has been compressed - code blocks are separated by ⋮---- delimiter');
  }
  if (!info.processing.securityCheckEnabled) {
    notes.push('- Security check has been disabled - content may contain sensitive information');
  }

  // Sorting notes
  if (info.sorting.gitChanges) {
    notes.push('- Files are sorted by Git change count (files with more changes are at the bottom)');
  }

  return notes.join('\n');
};
