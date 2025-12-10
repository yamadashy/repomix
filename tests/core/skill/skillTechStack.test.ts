import { describe, expect, test } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { detectTechStack, generateTechStackMd } from '../../../src/core/skill/skillTechStack.js';

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
        runtimeVersions: [{ runtime: 'Node.js', version: '22.0.0' }],
        configFiles: ['package.json', 'tsconfig.json'],
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('# Tech Stack');
      expect(result).toContain('## Languages');
      expect(result).toContain('- Node.js');
      expect(result).toContain('## Frameworks');
      expect(result).toContain('- React');
      expect(result).toContain('- TypeScript');
      expect(result).toContain('## Runtime Versions');
      expect(result).toContain('- Node.js: 22.0.0');
      expect(result).toContain('## Package Manager');
      expect(result).toContain('- npm');
      expect(result).toContain('## Dependencies');
      expect(result).toContain('- react (^18.2.0)');
      expect(result).toContain('## Dev Dependencies');
      expect(result).toContain('- typescript (^5.0.0)');
      expect(result).toContain('## Configuration Files');
      expect(result).toContain('- package.json');
      expect(result).toContain('- tsconfig.json');
    });

    test('should show all dependencies without truncation', () => {
      const techStack = {
        languages: ['Node.js'],
        frameworks: [],
        dependencies: Array.from({ length: 25 }, (_, i) => ({ name: `dep-${i}`, version: '1.0.0' })),
        devDependencies: [],
        runtimeVersions: [],
        configFiles: [],
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('- dep-0 (1.0.0)');
      expect(result).toContain('- dep-24 (1.0.0)');
      expect(result).not.toContain('... and');
    });

    test('should handle empty sections', () => {
      const techStack = {
        languages: ['Node.js'],
        frameworks: [],
        dependencies: [],
        devDependencies: [],
        runtimeVersions: [],
        configFiles: [],
      };

      const result = generateTechStackMd(techStack);

      expect(result).toContain('# Tech Stack');
      expect(result).toContain('## Languages');
      expect(result).not.toContain('## Frameworks');
      expect(result).not.toContain('## Dependencies');
      expect(result).not.toContain('## Configuration Files');
    });
  });

  describe('detectTechStack with version files', () => {
    test('should detect Node.js version from .node-version', () => {
      const files: ProcessedFile[] = [{ path: '.node-version', content: '22.0.0\n' }];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.runtimeVersions).toHaveLength(1);
      expect(result?.runtimeVersions[0]).toEqual({ runtime: 'Node.js', version: '22.0.0' });
    });

    test('should detect Node.js version from .nvmrc', () => {
      const files: ProcessedFile[] = [{ path: '.nvmrc', content: 'v20.10.0' }];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.runtimeVersions).toHaveLength(1);
      expect(result?.runtimeVersions[0]).toEqual({ runtime: 'Node.js', version: 'v20.10.0' });
    });

    test('should detect multiple runtimes from .tool-versions', () => {
      const files: ProcessedFile[] = [
        {
          path: '.tool-versions',
          content: `nodejs 22.0.0
python 3.12.0
ruby 3.3.0
# this is a comment
golang 1.22.0`,
        },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.runtimeVersions).toHaveLength(4);
      expect(result?.runtimeVersions).toContainEqual({ runtime: 'Node.js', version: '22.0.0' });
      expect(result?.runtimeVersions).toContainEqual({ runtime: 'Python', version: '3.12.0' });
      expect(result?.runtimeVersions).toContainEqual({ runtime: 'Ruby', version: '3.3.0' });
      expect(result?.runtimeVersions).toContainEqual({ runtime: 'Go', version: '1.22.0' });
    });

    test('should detect Python version from .python-version', () => {
      const files: ProcessedFile[] = [{ path: '.python-version', content: '3.11.5' }];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.runtimeVersions).toHaveLength(1);
      expect(result?.runtimeVersions[0]).toEqual({ runtime: 'Python', version: '3.11.5' });
    });

    test('should combine dependency files and version files', () => {
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({ dependencies: { express: '^4.18.0' } }),
        },
        { path: '.node-version', content: '22.0.0' },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.languages).toContain('Node.js');
      expect(result?.dependencies).toHaveLength(1);
      expect(result?.runtimeVersions).toHaveLength(1);
      expect(result?.runtimeVersions[0]).toEqual({ runtime: 'Node.js', version: '22.0.0' });
    });
  });

  describe('detectTechStack with configuration files', () => {
    test('should detect configuration files at root level', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'tsconfig.json', content: '{}' },
        { path: 'vitest.config.ts', content: 'export default {}' },
        { path: '.eslintrc.json', content: '{}' },
        { path: 'biome.json', content: '{}' },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.configFiles).toContain('package.json');
      expect(result?.configFiles).toContain('tsconfig.json');
      expect(result?.configFiles).toContain('vitest.config.ts');
      expect(result?.configFiles).toContain('.eslintrc.json');
      expect(result?.configFiles).toContain('biome.json');
    });

    test('should not detect configuration files in subdirectories', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'packages/sub/tsconfig.json', content: '{}' },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.configFiles).toContain('package.json');
      expect(result?.configFiles).not.toContain('tsconfig.json');
    });

    test('should detect docker and CI configuration files', () => {
      const files: ProcessedFile[] = [
        { path: 'Dockerfile', content: 'FROM node:22' },
        { path: 'docker-compose.yml', content: 'version: 3' },
        { path: '.gitignore', content: 'node_modules' },
      ];

      const result = detectTechStack(files);

      expect(result).not.toBeNull();
      expect(result?.configFiles).toContain('Dockerfile');
      expect(result?.configFiles).toContain('docker-compose.yml');
      expect(result?.configFiles).toContain('.gitignore');
    });
  });
});
