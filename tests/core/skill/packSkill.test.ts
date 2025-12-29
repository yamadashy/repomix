import { describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import {
  generateSkillMdFromReferences,
  generateSkillReferences,
  type PackSkillParams,
  packSkill,
  type SkillReferencesResult,
} from '../../../src/core/skill/packSkill.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Mock processed files
const createMockProcessedFiles = (): ProcessedFile[] => [
  { path: 'src/index.ts', content: 'console.log("hello");' },
  { path: 'src/utils.ts', content: 'export const add = (a, b) => a + b;' },
  { path: 'package.json', content: '{"name": "test", "dependencies": {"react": "^18.0.0"}}' },
];

describe('packSkill', () => {
  describe('generateSkillReferences', () => {
    test('should generate all reference sections with valid data', async () => {
      const mockConfig = createMockConfig();
      const mockFiles = createMockProcessedFiles();

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: 'src/\n  index.ts\n  utils.ts',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
      };

      const result = await generateSkillReferences(
        'test-skill',
        ['/test/project'],
        mockConfig,
        mockFiles,
        ['src/index.ts', 'src/utils.ts', 'package.json'],
        undefined,
        undefined,
        undefined,
        undefined,
        mockDeps,
      );

      expect(result.skillName).toBe('test-skill');
      expect(result.projectName).toBeTruthy();
      expect(result.skillDescription).toContain('Reference codebase');
      expect(result.totalFiles).toBe(3);
      expect(result.references.summary).toBeTruthy();
      expect(result.references.structure).toBeTruthy();
      expect(result.references.files).toBeTruthy();
    });

    test('should normalize skill name', async () => {
      const mockConfig = createMockConfig();
      const mockFiles = createMockProcessedFiles();

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
      };

      const result = await generateSkillReferences(
        'MyTestSkill',
        ['/test/project'],
        mockConfig,
        mockFiles,
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        mockDeps,
      );

      expect(result.skillName).toBe('my-test-skill');
    });

    test('should use provided skillProjectName when available', async () => {
      const mockConfig = createMockConfig();
      const mockFiles = createMockProcessedFiles();

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
      };

      const result = await generateSkillReferences(
        'test-skill',
        ['/tmp/repomix-abc123'], // Temp directory that would generate bad name
        mockConfig,
        mockFiles,
        [],
        undefined,
        undefined,
        'Vite', // Provided skillProjectName
        undefined,
        mockDeps,
      );

      expect(result.projectName).toBe('Vite');
      expect(result.skillDescription).toContain('Vite');
    });

    test('should detect tech stack when available', async () => {
      const mockConfig = createMockConfig();
      const mockFiles: ProcessedFile[] = [{ path: 'package.json', content: '{"dependencies": {"react": "^18.0.0"}}' }];

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
      };

      const result = await generateSkillReferences(
        'test-skill',
        ['/test/project'],
        mockConfig,
        mockFiles,
        ['package.json'],
        undefined,
        undefined,
        undefined,
        undefined,
        mockDeps,
      );

      expect(result.hasTechStack).toBe(true);
      expect(result.references.techStack).toBeTruthy();
    });

    test('should handle empty processed files', async () => {
      const mockConfig = createMockConfig();
      const mockFiles: ProcessedFile[] = [];

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
      };

      const result = await generateSkillReferences(
        'test-skill',
        ['/test/project'],
        mockConfig,
        mockFiles,
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        mockDeps,
      );

      expect(result.totalFiles).toBe(0);
      expect(result.totalLines).toBe(0);
    });
  });

  describe('generateSkillMdFromReferences', () => {
    test('should generate SKILL.md with all metadata', () => {
      const referencesResult: SkillReferencesResult = {
        references: {
          summary: 'Summary content',
          structure: 'Structure content',
          files: 'Files content',
          techStack: 'Tech stack content',
        },
        skillName: 'test-skill',
        projectName: 'Test Project',
        skillDescription: 'Test description',
        totalFiles: 10,
        totalLines: 500,
        statisticsSection: 'Statistics',
        hasTechStack: true,
      };

      const result = generateSkillMdFromReferences(referencesResult, 1000);

      expect(result.skillMd).toContain('test-skill');
      expect(result.skillMd).toContain('Test Project');
      expect(result.skillMd).toContain('10 files');
      expect(result.skillMd).toContain('500 lines');
      expect(result.skillMd).toContain('1000 tokens');
      expect(result.references).toBe(referencesResult.references);
    });

    test('should handle hasTechStack false', () => {
      const referencesResult: SkillReferencesResult = {
        references: {
          summary: 'Summary content',
          structure: 'Structure content',
          files: 'Files content',
        },
        skillName: 'test-skill',
        projectName: 'Test Project',
        skillDescription: 'Test description',
        totalFiles: 5,
        totalLines: 100,
        statisticsSection: 'Statistics',
        hasTechStack: false,
      };

      const result = generateSkillMdFromReferences(referencesResult, 500);

      expect(result.skillMd).toContain('test-skill');
      expect(result.references.techStack).toBeUndefined();
    });

    test('should include source URL when provided', () => {
      const referencesResult: SkillReferencesResult = {
        references: {
          summary: 'Summary content',
          structure: 'Structure content',
          files: 'Files content',
        },
        skillName: 'test-skill',
        projectName: 'Test Project',
        skillDescription: 'Test description',
        totalFiles: 5,
        totalLines: 100,
        statisticsSection: 'Statistics',
        hasTechStack: false,
        sourceUrl: 'https://github.com/vitejs/vite',
      };

      const result = generateSkillMdFromReferences(referencesResult, 500);

      expect(result.skillMd).toContain('https://github.com/vitejs/vite');
      expect(result.skillMd).toContain('from [Test Project](https://github.com/vitejs/vite)');
    });

    test('should not include source URL when not provided', () => {
      const referencesResult: SkillReferencesResult = {
        references: {
          summary: 'Summary content',
          structure: 'Structure content',
          files: 'Files content',
        },
        skillName: 'test-skill',
        projectName: 'Test Project',
        skillDescription: 'Test description',
        totalFiles: 5,
        totalLines: 100,
        statisticsSection: 'Statistics',
        hasTechStack: false,
      };

      const result = generateSkillMdFromReferences(referencesResult, 500);

      expect(result.skillMd).toContain('This skill was generated by [Repomix]');
      expect(result.skillMd).not.toContain('from [');
    });
  });

  describe('packSkill', () => {
    test('should throw error when skillDir is missing', async () => {
      const mockConfig = createMockConfig({ skillGenerate: 'test-skill' });
      const mockFiles = createMockProcessedFiles();

      const params: PackSkillParams = {
        rootDirs: ['/test/project'],
        config: mockConfig,
        options: { skillName: 'test-skill' }, // skillDir is missing
        processedFiles: mockFiles,
        allFilePaths: ['src/index.ts'],
        gitDiffResult: undefined,
        gitLogResult: undefined,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        safeFilePaths: ['src/index.ts'],
        skippedFiles: [],
        progressCallback: vi.fn(),
      };

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
        calculateMetrics: vi.fn().mockResolvedValue({
          totalFiles: 1,
          totalCharacters: 100,
          totalTokens: 50,
        }),
        writeSkillOutput: vi.fn().mockResolvedValue('/test/skill'),
        generateDefaultSkillName: vi.fn().mockReturnValue('test-skill'),
      };

      await expect(packSkill(params, mockDeps)).rejects.toThrow('skillDir is required for skill generation');
    });

    test('should generate complete skill package', async () => {
      const mockConfig = createMockConfig({ skillGenerate: 'test-skill' });
      const mockFiles = createMockProcessedFiles();

      const params: PackSkillParams = {
        rootDirs: ['/test/project'],
        config: mockConfig,
        options: { skillName: 'test-skill', skillDir: '/test/.claude/skills/test-skill' },
        processedFiles: mockFiles,
        allFilePaths: ['src/index.ts', 'src/utils.ts', 'package.json'],
        gitDiffResult: undefined,
        gitLogResult: undefined,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        safeFilePaths: ['src/index.ts', 'src/utils.ts', 'package.json'],
        skippedFiles: [],
        progressCallback: vi.fn(),
      };

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: 'src/\n  index.ts\n  utils.ts',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
        calculateMetrics: vi.fn().mockResolvedValue({
          totalFiles: 3,
          totalCharacters: 500,
          totalTokens: 100,
        }),
        writeSkillOutput: vi.fn().mockResolvedValue('/test/.claude/skills/test-skill'),
        generateDefaultSkillName: vi.fn().mockReturnValue('test-skill'),
      };

      const result = await packSkill(params, mockDeps);

      expect(result.totalFiles).toBe(3);
      expect(result.totalTokens).toBe(100);
      expect(mockDeps.writeSkillOutput).toHaveBeenCalled();
      expect(params.progressCallback).toHaveBeenCalledWith('Writing skill output...');
    });

    test('should use config.skillGenerate as skill name when string', async () => {
      const mockConfig = createMockConfig({ skillGenerate: 'custom-skill-name' });
      const mockFiles = createMockProcessedFiles();

      const params: PackSkillParams = {
        rootDirs: ['/test/project'],
        config: mockConfig,
        options: { skillDir: '/test/.claude/skills/custom-skill-name' }, // No skillName
        processedFiles: mockFiles,
        allFilePaths: [],
        gitDiffResult: undefined,
        gitLogResult: undefined,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        safeFilePaths: [],
        skippedFiles: [],
        progressCallback: vi.fn(),
      };

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
        calculateMetrics: vi.fn().mockResolvedValue({
          totalFiles: 0,
          totalCharacters: 0,
          totalTokens: 0,
        }),
        writeSkillOutput: vi.fn().mockResolvedValue('/test/.claude/skills/custom-skill-name'),
        generateDefaultSkillName: vi.fn().mockReturnValue('default-name'),
      };

      await packSkill(params, mockDeps);

      // generateDefaultSkillName should NOT be called since config.skillGenerate is a string
      expect(mockDeps.generateDefaultSkillName).not.toHaveBeenCalled();
    });

    test('should generate default skill name when skillGenerate is boolean', async () => {
      const mockConfig = createMockConfig({ skillGenerate: true });
      const mockFiles = createMockProcessedFiles();

      const params: PackSkillParams = {
        rootDirs: ['/test/project'],
        config: mockConfig,
        options: { skillDir: '/test/.claude/skills/generated-name' }, // No skillName
        processedFiles: mockFiles,
        allFilePaths: [],
        gitDiffResult: undefined,
        gitLogResult: undefined,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
        safeFilePaths: [],
        skippedFiles: [],
        progressCallback: vi.fn(),
      };

      const mockDeps = {
        buildOutputGeneratorContext: vi.fn().mockResolvedValue({
          config: mockConfig,
          generationDate: new Date().toISOString(),
          treeString: '',
          processedFiles: mockFiles,
          instruction: '',
        }),
        sortOutputFiles: vi.fn().mockResolvedValue(mockFiles),
        calculateMetrics: vi.fn().mockResolvedValue({
          totalFiles: 0,
          totalCharacters: 0,
          totalTokens: 0,
        }),
        writeSkillOutput: vi.fn().mockResolvedValue('/test/.claude/skills/generated-name'),
        generateDefaultSkillName: vi.fn().mockReturnValue('repomix-reference-project'),
      };

      await packSkill(params, mockDeps);

      // generateDefaultSkillName SHOULD be called since config.skillGenerate is boolean
      expect(mockDeps.generateDefaultSkillName).toHaveBeenCalledWith(['/test/project']);
    });
  });
});
