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

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('.');
      expect(result[0].languages).toContain('Node.js');
      expect(result[0].frameworks).toContain('React');
      expect(result[0].frameworks).toContain('Express');
      expect(result[0].frameworks).toContain('TypeScript');
      expect(result[0].dependencies.length).toBeGreaterThan(0);
      expect(result[0].devDependencies.length).toBeGreaterThan(0);
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

      expect(result).toHaveLength(1);
      expect(result[0].languages).toContain('Python');
      expect(result[0].frameworks).toContain('Django');
      expect(result[0].frameworks).toContain('Flask');
      expect(result[0].frameworks).toContain('FastAPI');
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

      expect(result).toHaveLength(1);
      expect(result[0].languages).toContain('Go');
      expect(result[0].frameworks).toContain('Gin');
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

      expect(result).toHaveLength(1);
      expect(result[0].languages).toContain('Rust');
      expect(result[0].frameworks).toContain('Actix');
      expect(result[0].frameworks).toContain('Tokio');
    });

    test('should return empty array when no dependency files found', () => {
      const files: ProcessedFile[] = [
        { path: 'src/index.ts', content: 'console.log("hello")' },
        { path: 'README.md', content: '# My Project' },
      ];

      const result = detectTechStack(files);
      expect(result).toHaveLength(0);
    });

    test('should detect dependency files in subdirectories', () => {
      const files: ProcessedFile[] = [
        {
          path: 'packages/sub/package.json',
          content: JSON.stringify({ dependencies: { lodash: '4.0.0' } }),
        },
      ];

      const result = detectTechStack(files);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('packages/sub');
      expect(result[0].languages).toContain('Node.js');
      expect(result[0].dependencies).toHaveLength(1);
      expect(result[0].dependencies[0].name).toBe('lodash');
    });

    test('should group dependencies by package directory', () => {
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({ dependencies: { lodash: '4.0.0', react: '^18.2.0' } }),
        },
        {
          path: 'packages/api/package.json',
          content: JSON.stringify({ dependencies: { express: '^4.18.0' } }),
        },
      ];

      const result = detectTechStack(files);

      expect(result).toHaveLength(2);

      const root = result.find((r) => r.path === '.');
      expect(root).toBeDefined();
      expect(root?.dependencies).toHaveLength(2);
      expect(root?.dependencies.find((d) => d.name === 'lodash')).toBeDefined();
      expect(root?.dependencies.find((d) => d.name === 'react')).toBeDefined();

      const api = result.find((r) => r.path === 'packages/api');
      expect(api).toBeDefined();
      expect(api?.dependencies).toHaveLength(1);
      expect(api?.dependencies[0].name).toBe('express');
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
      expect(result[0].packageManager).toBe('pnpm');
    });

    test('should assign config files to correct package directory', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'tsconfig.json', content: '{}' },
        { path: 'packages/sub/package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'packages/sub/tsconfig.json', content: '{}' },
      ];

      const result = detectTechStack(files);

      const root = result.find((r) => r.path === '.');
      expect(root?.configFiles).toContain('package.json');
      expect(root?.configFiles).toContain('tsconfig.json');

      const sub = result.find((r) => r.path === 'packages/sub');
      expect(sub?.configFiles).toContain('package.json');
      expect(sub?.configFiles).toContain('tsconfig.json');
    });

    test('should sort root entry first, then subdirectories alphabetically', () => {
      // Pin the documented sort: '.' (root) always comes before any subdirectory,
      // and remaining packages sort alphabetically. Reordering would make root
      // packages hard to find in monorepo output.
      const files: ProcessedFile[] = [
        { path: 'packages/zeta/package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'packages/alpha/package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'packages/middle/package.json', content: JSON.stringify({ dependencies: {} }) },
      ];

      const result = detectTechStack(files);

      expect(result.map((r) => r.path)).toEqual(['.', 'packages/alpha', 'packages/middle', 'packages/zeta']);
    });

    test('should preserve sort order when no root package exists', () => {
      const files: ProcessedFile[] = [
        { path: 'packages/zeta/package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'packages/alpha/package.json', content: JSON.stringify({ dependencies: {} }) },
      ];

      const result = detectTechStack(files);

      expect(result.map((r) => r.path)).toEqual(['packages/alpha', 'packages/zeta']);
    });

    test('should deduplicate config files within a package directory', () => {
      // Fix `f7894dcb`: configFiles must be deduplicated. Crafted by passing
      // the same fileName twice in processedFiles — exercises the Set-based dedup.
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'tsconfig.json', content: '{}' },
        { path: 'tsconfig.json', content: '{ "duplicate": true }' },
      ];

      const result = detectTechStack(files);

      const tsConfigCount = result[0].configFiles.filter((f) => f === 'tsconfig.json').length;
      expect(tsConfigCount).toBe(1);
    });

    test('assigns packageManager per package directory independently', () => {
      // In a monorepo, root and subpackage are keyed to separate buckets by getDirPath,
      // so each preserves its own packageManager regardless of input order.
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({ packageManager: 'pnpm@8.0.0', dependencies: {} }),
        },
        {
          path: 'packages/sub/package.json',
          content: JSON.stringify({ packageManager: 'yarn@4.0.0', dependencies: {} }),
        },
      ];

      const result = detectTechStack(files);

      const root = result.find((r) => r.path === '.');
      const sub = result.find((r) => r.path === 'packages/sub');
      expect(root?.packageManager).toBe('pnpm');
      expect(sub?.packageManager).toBe('yarn');
    });

    test('keeps the first detected packageManager when later entries map to the same directory', () => {
      // Fix `005eb791` part 1: pins the `parsed.packageManager && !result.packageManager` guard.
      // Two package.json entries at the same path land in the same directory bucket, so the
      // second one's packageManager must NOT overwrite the first.
      const files: ProcessedFile[] = [
        {
          path: 'package.json',
          content: JSON.stringify({ packageManager: 'pnpm@8.0.0', dependencies: {} }),
        },
        {
          path: 'package.json',
          content: JSON.stringify({ packageManager: 'yarn@4.0.0', dependencies: {} }),
        },
      ];

      const result = detectTechStack(files);

      const root = result.find((r) => r.path === '.');
      expect(root?.packageManager).toBe('pnpm');
    });
  });

  describe('generateTechStackMd', () => {
    test('should generate markdown with all sections', () => {
      const techStacks = [
        {
          path: '.',
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
        },
      ];

      const result = generateTechStackMd(techStacks);

      expect(result).toContain('# Tech Stacks');
      expect(result).toContain('## Tech Stack: .');
      expect(result).toContain('### Languages');
      expect(result).toContain('- Node.js');
      expect(result).toContain('### Frameworks');
      expect(result).toContain('- React');
      expect(result).toContain('- TypeScript');
      expect(result).toContain('### Runtime Versions');
      expect(result).toContain('- Node.js: 22.0.0');
      expect(result).toContain('### Package Manager');
      expect(result).toContain('- npm');
      expect(result).toContain('### Dependencies');
      expect(result).toContain('- react (^18.2.0)');
      expect(result).toContain('### Dev Dependencies');
      expect(result).toContain('- typescript (^5.0.0)');
      expect(result).toContain('### Configuration Files');
      expect(result).toContain('- package.json');
      expect(result).toContain('- tsconfig.json');
    });

    test('should render multiple packages as separate sections', () => {
      const techStacks = [
        {
          path: '.',
          languages: ['Node.js'],
          frameworks: [],
          dependencies: [{ name: 'lodash', version: '4.0.0' }],
          devDependencies: [],
          runtimeVersions: [],
          configFiles: [],
        },
        {
          path: 'packages/api',
          languages: ['Node.js'],
          frameworks: ['Express'],
          dependencies: [{ name: 'express', version: '^4.18.0' }],
          devDependencies: [],
          runtimeVersions: [],
          configFiles: [],
        },
      ];

      const result = generateTechStackMd(techStacks);

      expect(result).toContain('## Tech Stack: .');
      expect(result).toContain('## Tech Stack: packages/api');
    });

    test('should handle empty sections', () => {
      const techStacks = [
        {
          path: '.',
          languages: ['Node.js'],
          frameworks: [],
          dependencies: [],
          devDependencies: [],
          runtimeVersions: [],
          configFiles: [],
        },
      ];

      const result = generateTechStackMd(techStacks);

      expect(result).toContain('# Tech Stacks');
      expect(result).toContain('### Languages');
      expect(result).not.toContain('### Frameworks');
      expect(result).not.toContain('### Dependencies');
      expect(result).not.toContain('### Configuration Files');
    });
  });

  describe('detectTechStack with version files', () => {
    test('should detect Node.js version from .node-version', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: '.node-version', content: '22.0.0\n' },
      ];

      const result = detectTechStack(files);

      expect(result).toHaveLength(1);
      expect(result[0].runtimeVersions).toHaveLength(1);
      expect(result[0].runtimeVersions[0]).toEqual({ runtime: 'Node.js', version: '22.0.0' });
    });

    test('should detect Node.js version from .nvmrc', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: '.nvmrc', content: 'v20.10.0' },
      ];

      const result = detectTechStack(files);

      expect(result).toHaveLength(1);
      expect(result[0].runtimeVersions).toHaveLength(1);
      expect(result[0].runtimeVersions[0]).toEqual({ runtime: 'Node.js', version: 'v20.10.0' });
    });

    test('should detect multiple runtimes from .tool-versions', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
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

      expect(result).toHaveLength(1);
      expect(result[0].runtimeVersions).toHaveLength(4);
      expect(result[0].runtimeVersions).toContainEqual({ runtime: 'Node.js', version: '22.0.0' });
      expect(result[0].runtimeVersions).toContainEqual({ runtime: 'Python', version: '3.12.0' });
      expect(result[0].runtimeVersions).toContainEqual({ runtime: 'Ruby', version: '3.3.0' });
      expect(result[0].runtimeVersions).toContainEqual({ runtime: 'Go', version: '1.22.0' });
    });

    test('should deduplicate runtime versions with v prefix normalization', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: '.node-version', content: '20.10.0' },
        { path: '.nvmrc', content: 'v20.10.0' },
      ];

      const result = detectTechStack(files);

      expect(result).toHaveLength(1);
      expect(result[0].runtimeVersions).toHaveLength(1);
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

      expect(result).toHaveLength(1);
      expect(result[0].configFiles).toContain('package.json');
      expect(result[0].configFiles).toContain('tsconfig.json');
      expect(result[0].configFiles).toContain('vitest.config.ts');
      expect(result[0].configFiles).toContain('.eslintrc.json');
      expect(result[0].configFiles).toContain('biome.json');
    });

    test('should detect docker and CI configuration files', () => {
      const files: ProcessedFile[] = [
        { path: 'package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'Dockerfile', content: 'FROM node:22' },
        { path: 'docker-compose.yml', content: 'version: 3' },
        { path: '.gitignore', content: 'node_modules' },
      ];

      const result = detectTechStack(files);

      expect(result).toHaveLength(1);
      expect(result[0].configFiles).toContain('Dockerfile');
      expect(result[0].configFiles).toContain('docker-compose.yml');
      expect(result[0].configFiles).toContain('.gitignore');
    });
  });
});
