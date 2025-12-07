import { describe, expect, test } from 'vitest';
import type { ProcessedFile } from '../../../../src/core/file/fileTypes.js';
import { detectTechStack, generateTechStackMd } from '../../../../src/core/output/skill/skillTechStack.js';

describe('skillTechStack', () => {
  describe('detectTechStack', () => {
    test('should detect Node.js from package.json', () => {
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              react: '^18.2.0',
              express: '^4.18.0',
            },
            devDependencies: {
              typescript: '^5.0.0',
            },
          }),
        },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.languages).toContain('Node.js');
      expect(result?.frameworks).toContain('React');
      expect(result?.frameworks).toContain('Express');
      expect(result?.frameworks).toContain('TypeScript');
      expect(result?.dependencies.length).toBeGreaterThan(0);
      expect(result?.devDependencies.length).toBeGreaterThan(0);
    });

    test('should detect Python from requirements.txt', () => {
      const files: ProcessedFile[] = [
        {
          path: 'requirements.txt',
          content: `django==4.2.0
flask>=2.0.0
fastapi
# comment
-r base.txt`,
        },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.languages).toContain('Python');
      expect(result?.frameworks).toContain('Django');
      expect(result?.frameworks).toContain('Flask');
      expect(result?.frameworks).toContain('FastAPI');
    });

    test('should detect Go from go.mod', () => {
      const files: ProcessedFile[] = [
        {
          path: 'go.mod',
          content: `module example.com/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.0
    github.com/stretchr/testify v1.8.0
)`,
        },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.languages).toContain('Go');
      expect(result?.frameworks).toContain('Gin');
    });

    test('should detect Rust from Cargo.toml', () => {
      const files: ProcessedFile[] = [
        {
          path: 'Cargo.toml',
          content: `[package]
name = "myproject"
version = "0.1.0"

[dependencies]
actix-web = "4.0"
tokio = { version = "1.0", features = ["full"] }`,
        },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.languages).toContain('Rust');
      expect(result?.frameworks).toContain('Actix');
      expect(result?.frameworks).toContain('Tokio');
    });

    test('should return null when no dependency files found', () => {
      const files: ProcessedFile[] = [
        { path: 'src/index.ts', content: 'console.log("hello")' },
        { path: 'README.md', content: '# My Project' },
      ];

      const result = detectTechStack(files);
      expect(result).toBeNull();
    });

    test('should ignore dependency files in subdirectories', () => {
      const files: ProcessedFile[] = [
        {
          path: 'packages/sub/package.json',
          content: JSON.stringify({ dependencies: { lodash: '4.0.0' } }),
        },
      ];

      const result = detectTechStack(files);
      expect(result).toBeNull();
    });

    test('should detect package manager from packageManager field', () => {
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({
            packageManager: 'pnpm@8.0.0',
            dependencies: {},
          }),
        },
      ];

      const result = detectTechStack(files);
      expect(result?.packageManager).toBe('pnpm');
    });
  });

  describe('generateTechStackMd', () => {
    test('should generate markdown with all sections', () => {
      const techStack = {
        languages: ['Node.js'],
        frameworks: ['React', 'TypeScript'],
        dependencies: [
          { name: 'react', version: '^18.2.0' },
          { name: 'react-dom', version: '^18.2.0' },
        ],
        devDependencies: [{ name: 'typescript', version: '^5.0.0' }],
        packageManager: 'npm',
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('# Tech Stack');
      expect(result).toContain('## Languages');
      expect(result).toContain('- Node.js');
      expect(result).toContain('## Frameworks');
      expect(result).toContain('- React');
      expect(result).toContain('- TypeScript');
      expect(result).toContain('## Package Manager');
      expect(result).toContain('- npm');
      expect(result).toContain('## Dependencies');
      expect(result).toContain('- react (^18.2.0)');
      expect(result).toContain('## Dev Dependencies');
      expect(result).toContain('- typescript (^5.0.0)');
    });

    test('should limit dependencies to 20', () => {
      const techStack = {
        languages: ['Node.js'],
        frameworks: [],
        dependencies: Array.from({ length: 25 }, (_, i) => ({ name: `dep-${i}`, version: '1.0.0' })),
        devDependencies: [],
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('... and 5 more');
      expect(result).not.toContain('dep-24');
    });

    test('should handle empty sections', () => {
      const techStack = {
        languages: ['Node.js'],
        frameworks: [],
        dependencies: [],
        devDependencies: [],
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('# Tech Stack');
      expect(result).toContain('## Languages');
      expect(result).not.toContain('## Frameworks');
      expect(result).not.toContain('## Dependencies');
    });
  });
});
