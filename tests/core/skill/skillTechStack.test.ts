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

  describe('detectTechStack manifest parsers', () => {
    const detectSingle = (path: string, content: string) => {
      const result = detectTechStack([{ path, content }]);
      expect(result).toHaveLength(1);
      return result[0];
    };

    test('should detect frameworks from package.json dependencies', () => {
      const result = detectSingle(
        'package.json',
        JSON.stringify({
          dependencies: {
            'react-dom': '^18.0.0',
            vue: '^3.0.0',
            next: '^14.0.0',
            nuxt: '^3.0.0',
            '@angular/core': '^17.0.0',
            fastify: '^4.0.0',
            hono: '^4.0.0',
            svelte: '^4.0.0',
          },
        }),
      );

      expect(result.frameworks).toEqual(['React', 'Vue', 'Next.js', 'Nuxt', 'Angular', 'Fastify', 'Hono', 'Svelte']);
      expect(result.dependencies).toContainEqual({ name: 'vue', version: '^3.0.0' });
    });

    test.each([
      ['yarn@4.0.0', 'yarn'],
      ['npm@10.0.0', 'npm'],
      ['bun@1.1.0', 'bun'],
      ['deno@2.0.0', undefined],
    ])('should map packageManager %s to %s', (packageManager, expected) => {
      const result = detectSingle('package.json', JSON.stringify({ packageManager }));
      expect(result.packageManager).toBe(expected);
    });

    test('should still report the language for an unparsable package.json', () => {
      const result = detectSingle('package.json', '{ not json');

      expect(result.languages).toEqual(['Node.js']);
      expect(result.dependencies).toEqual([]);
      expect(result.frameworks).toEqual([]);
    });

    test('should detect ML frameworks from requirements.txt case-insensitively', () => {
      const result = detectSingle('requirements.txt', 'torch==2.1.0\nPyTorch\nTensorFlow>=2.0');

      expect(result.frameworks).toEqual(['PyTorch', 'TensorFlow']);
      expect(result.dependencies).toContainEqual({ name: 'torch', version: '2.1.0' });
    });

    test('should parse quoted entries in the supported [project.dependencies] table of pyproject.toml', () => {
      const result = detectSingle(
        'pyproject.toml',
        `[project]
name = "myproject"

[project.dependencies]
"Django>=4.2"
"flask~=3.0"
"fastapi"

[tool.black]
line-length = "88"`,
      );

      expect(result.languages).toEqual(['Python']);
      expect(result.dependencies.map((dep) => dep.name)).toEqual(['Django', 'flask', 'fastapi']);
      expect(result.frameworks).toEqual(['Django', 'Flask', 'FastAPI']);
    });

    test('should report no dependencies for a pyproject.toml without a [project.dependencies] section', () => {
      const result = detectSingle('pyproject.toml', '[tool.ruff]\nline-length = 100\n');

      expect(result.languages).toEqual(['Python']);
      expect(result.dependencies).toEqual([]);
    });

    test('should parse only the [packages] section of a Pipfile', () => {
      const result = detectSingle(
        'Pipfile',
        `[[source]]
url = "https://pypi.org/simple"

[packages]
requests = "*"
flask = "==2.0"

[dev-packages]
pytest = "*"`,
      );

      expect(result.languages).toEqual(['Python']);
      expect(result.dependencies).toEqual([{ name: 'requests' }, { name: 'flask' }]);
    });

    test('should detect Echo and Fiber from go.mod', () => {
      const result = detectSingle(
        'go.mod',
        `module example.com/app

require (
    github.com/labstack/echo/v4 v4.11.0
    github.com/gofiber/fiber/v2 v2.52.0
)`,
      );

      expect(result.frameworks).toEqual(['Echo', 'Fiber']);
      expect(result.dependencies).toContainEqual({ name: 'github.com/labstack/echo/v4', version: 'v4.11.0' });
    });

    test('should detect Axum and Rocket from Cargo.toml and ignore other sections', () => {
      const result = detectSingle(
        'Cargo.toml',
        `[dependencies]
axum = "0.7"
rocket = "0.5"

[dev-dependencies]
criterion = "0.5"`,
      );

      expect(result.dependencies).toEqual([{ name: 'axum' }, { name: 'rocket' }]);
      expect(result.frameworks).toEqual(['Axum', 'Rocket']);
    });

    test('should parse composer.json require entries and skip the php constraint', () => {
      const result = detectSingle(
        'composer.json',
        JSON.stringify({
          require: {
            php: '>=8.1',
            'laravel/framework': '^10.0',
            'symfony/console': '^6.0',
          },
        }),
      );

      expect(result.languages).toEqual(['PHP']);
      expect(result.dependencies).toEqual([
        { name: 'laravel/framework', version: '^10.0' },
        { name: 'symfony/console', version: '^6.0' },
      ]);
      expect(result.frameworks).toEqual(['Laravel', 'Symfony']);
    });

    test('should report no dependencies for composer.json without require or with invalid JSON', () => {
      expect(detectSingle('composer.json', JSON.stringify({ name: 'acme/app' })).dependencies).toEqual([]);

      const invalid = detectSingle('composer.json', '{ invalid');
      expect(invalid.languages).toEqual(['PHP']);
      expect(invalid.dependencies).toEqual([]);
    });

    test('should parse gems from a Gemfile with either quote style', () => {
      const result = detectSingle(
        'Gemfile',
        `source "https://rubygems.org"
gem "rails", "~> 7.1"
gem 'sinatra'
gem 'puma'`,
      );

      expect(result.languages).toEqual(['Ruby']);
      expect(result.dependencies).toEqual([{ name: 'rails' }, { name: 'sinatra' }, { name: 'puma' }]);
      expect(result.frameworks).toEqual(['Rails', 'Sinatra']);
    });

    test('should parse artifactIds from pom.xml dependencies', () => {
      const result = detectSingle(
        'pom.xml',
        `<project>
  <artifactId>my-app</artifactId>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
    </dependency>
  </dependencies>
</project>`,
      );

      expect(result.languages).toEqual(['Java']);
      expect(result.dependencies).toEqual([{ name: 'spring-boot-starter-web' }, { name: 'junit' }]);
      expect(result.frameworks).toEqual(['Spring']);
    });

    test('should parse Groovy build.gradle implementation and compile dependencies', () => {
      const result = detectSingle(
        'build.gradle',
        `dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.1.0'
    implementation "io.ktor:ktor-server-core:2.3.0"
    compile 'commons-lang'
}`,
      );

      expect(result.languages).toEqual(['Java/Kotlin']);
      // group:artifact:version coordinates are reported by artifact name; bare names are kept as-is
      expect(result.dependencies).toEqual([
        { name: 'spring-boot-starter-web' },
        { name: 'ktor-server-core' },
        { name: 'commons-lang' },
      ]);
      expect(result.frameworks).toEqual(['Spring', 'Ktor']);
    });

    test('should report Kotlin for build.gradle.kts', () => {
      const result = detectSingle('build.gradle.kts', 'plugins {\n    kotlin("jvm") version "1.9.0"\n}');

      expect(result.languages).toEqual(['Kotlin']);
      expect(result.configFiles).toEqual(['build.gradle.kts']);
    });

    test('should ignore files outside any package directory', () => {
      const result = detectTechStack([
        { path: 'app/package.json', content: JSON.stringify({ dependencies: {} }) },
        { path: 'docs/tsconfig.json', content: '{}' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].configFiles).toEqual(['package.json']);
    });

    test('should combine languages and deduplicate dependencies across manifests in one directory', () => {
      const result = detectTechStack([
        { path: 'requirements.txt', content: 'flask==3.0.0' },
        { path: 'Pipfile', content: '[packages]\nflask = "*"\nrequests = "*"' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].languages).toEqual(['Python']);
      expect(result[0].dependencies).toEqual([{ name: 'flask', version: '3.0.0' }, { name: 'requests' }]);
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
