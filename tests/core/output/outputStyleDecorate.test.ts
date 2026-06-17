import { describe, expect, it } from 'vitest';
import {
  analyzeContent,
  generateHeader,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from '../../../src/core/output/outputStyleDecorate.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('analyzeContent', () => {
  it('should detect entire codebase when using default settings', () => {
    const config = createMockConfig();
    const result = analyzeContent(config);
    expect(result.selection.isEntireCodebase).toBe(true);
  });

  it('should detect subset when using include patterns', () => {
    const config = createMockConfig({
      include: ['src/**/*.ts'],
    });
    const result = analyzeContent(config);
    expect(result.selection.isEntireCodebase).toBe(false);
    expect(result.selection.include).toBe(true);
  });

  it('should detect processing states', () => {
    const config = createMockConfig({
      output: {
        removeComments: true,
        removeEmptyLines: true,
      },
    });
    const result = analyzeContent(config);
    expect(result.processing.commentsRemoved).toBe(true);
    expect(result.processing.emptyLinesRemoved).toBe(true);
  });

  it('should mark content as compressed when an output pattern requests compression', () => {
    const config = createMockConfig({
      output: {
        compress: false,
        patterns: [{ pattern: 'docs/**/*', compress: true }],
      },
    });
    const result = analyzeContent(config);
    expect(result.processing.compressed).toBe(true);
  });

  it('should not mark content as compressed when patterns only set directoryStructureOnly', () => {
    const config = createMockConfig({
      output: {
        compress: false,
        patterns: [{ pattern: 'website/**/*', directoryStructureOnly: true }],
      },
    });
    const result = analyzeContent(config);
    expect(result.processing.compressed).toBe(false);
  });

  it('should not mark content as compressed for a pattern that sets both compress and directoryStructureOnly', () => {
    // directoryStructureOnly takes precedence over compress in resolveFileLevel,
    // so such a pattern omits the file's content rather than compressing it.
    const config = createMockConfig({
      output: {
        compress: false,
        patterns: [{ pattern: 'website/**/*', compress: true, directoryStructureOnly: true }],
      },
    });
    const result = analyzeContent(config);
    expect(result.processing.compressed).toBe(false);
  });
});

describe('generateHeader', () => {
  const mockDate = '2025-01-29T11:23:01.763Z';

  it('should generate header for entire codebase', () => {
    const config = createMockConfig();
    const header = generateHeader(config, mockDate);
    expect(header).toContain('entire codebase');
    expect(header).not.toContain('subset');
  });

  it('should generate header for subset with processing', () => {
    const config = createMockConfig({
      include: ['src/**/*.ts'],
      output: {
        removeComments: true,
      },
    });
    const header = generateHeader(config, mockDate);
    expect(header).toContain('subset of the codebase');
    expect(header).toContain('comments have been removed');
  });

  it('should include security check disabled warning', () => {
    const config = createMockConfig({
      security: {
        enableSecurityCheck: false,
      },
    });
    const header = generateHeader(config, mockDate);
    expect(header).toContain('security check has been disabled');
  });

  it('should include multiple processing states', () => {
    const config = createMockConfig({
      output: {
        removeComments: true,
        removeEmptyLines: true,
        showLineNumbers: true,
      },
    });
    const header = generateHeader(config, mockDate);
    expect(header).toContain('comments have been removed');
    expect(header).toContain('empty lines have been removed');
    expect(header).toContain('line numbers have been added');
  });
});

describe('generateSummaryPurpose', () => {
  it('should generate consistent purpose text', () => {
    const purpose = generateSummaryPurpose(createMockConfig());
    expect(purpose).toContain('packed representation');
    expect(purpose).toContain('AI systems');
    expect(purpose).toContain('code review');
  });

  it('should indicate entire repository when using default settings', () => {
    const config = createMockConfig();
    const purpose = generateSummaryPurpose(config);
    expect(purpose).toContain("entire repository's contents");
    expect(purpose).not.toContain('subset');
  });

  it('should indicate subset when using include patterns', () => {
    const config = createMockConfig({
      include: ['src/**/*.ts'],
    });
    const purpose = generateSummaryPurpose(config);
    expect(purpose).toContain("subset of the repository's contents that is considered the most important context");
    expect(purpose).not.toContain('entire repository');
  });
});

describe('generateSummaryUsageGuidelines', () => {
  it('should include header text note when headerText is provided', () => {
    const config = createMockConfig({
      output: {
        headerText: 'Custom header',
      },
    });
    const guidelines = generateSummaryUsageGuidelines(config, '');
    expect(guidelines).toContain('Repository Description');
  });

  it('should include instruction note when instruction is provided', () => {
    const config = createMockConfig();
    const guidelines = generateSummaryUsageGuidelines(config, 'Custom instruction');
    expect(guidelines).toContain('Repository Instruction');
  });
});

describe('generateSummaryNotes', () => {
  it('should include selection information', () => {
    const config = createMockConfig({
      include: ['src/**/*.ts'],
      ignore: {
        customPatterns: ['*.test.ts'],
      },
    });
    const notes = generateSummaryNotes(config);
    expect(notes).toContain('Only files matching these patterns are included: src/**/*.ts');
    expect(notes).toContain('Files matching these patterns are excluded: *.test.ts');
  });

  it('should include processing notes', () => {
    const config = createMockConfig({
      output: {
        removeComments: true,
        showLineNumbers: true,
        style: 'xml',
        parsableStyle: true,
      },
      security: {
        enableSecurityCheck: false,
      },
    });
    const notes = generateSummaryNotes(config);
    expect(notes).toContain('Code comments have been removed');
    expect(notes).toContain('Line numbers have been added');
    expect(notes).toContain('Content has been formatted for parsing in xml style');
    expect(notes).toContain('Security check has been disabled');
  });

  it('should handle case with minimal processing', () => {
    const config = createMockConfig();
    const notes = generateSummaryNotes(config);
    expect(notes).toContain('Files matching patterns in .gitignore are excluded');
    expect(notes).toContain('Files matching default ignore patterns are excluded');
    expect(notes).not.toContain('Code comments have been removed');
  });
});
