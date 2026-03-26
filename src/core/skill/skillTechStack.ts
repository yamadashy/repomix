import type { ProcessedFile } from '../file/fileTypes.js';

interface DependencyInfo {
  name: string;
  version?: string;
  isDev?: boolean;
}

interface RuntimeVersion {
  runtime: string;
  version: string;
}

interface TechStackInfo {
  languages: string[];
  frameworks: string[];
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  packageManager?: string;
  runtimeVersions: RuntimeVersion[];
  configFiles: string[];
}

// Map-based framework detection: O(1) lookup per dependency name instead of sequential if-chains.
// Each map key is the exact dependency name (or lowercased for case-insensitive ecosystems).
const NODE_FRAMEWORK_MAP = new Map<string, string>([
  ['react', 'React'],
  ['react-dom', 'React'],
  ['vue', 'Vue'],
  ['next', 'Next.js'],
  ['nuxt', 'Nuxt'],
  ['@angular/core', 'Angular'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['hono', 'Hono'],
  ['svelte', 'Svelte'],
  ['typescript', 'TypeScript'],
]);

// Python package names are case-insensitive (PEP 503), so keys are lowercased.
const PYTHON_FRAMEWORK_MAP = new Map<string, string>([
  ['django', 'Django'],
  ['flask', 'Flask'],
  ['fastapi', 'FastAPI'],
  ['pytorch', 'PyTorch'],
  ['torch', 'PyTorch'],
  ['tensorflow', 'TensorFlow'],
]);

// Dependency file patterns and their parsers
const DEPENDENCY_FILES: Record<string, { language: string; parser: (content: string) => Partial<TechStackInfo> }> = {
  'package.json': { language: 'Node.js', parser: parsePackageJson },
  'requirements.txt': { language: 'Python', parser: parseRequirementsTxt },
  'pyproject.toml': { language: 'Python', parser: parsePyprojectToml },
  Pipfile: { language: 'Python', parser: parsePipfile },
  'go.mod': { language: 'Go', parser: parseGoMod },
  'Cargo.toml': { language: 'Rust', parser: parseCargoToml },
  'composer.json': { language: 'PHP', parser: parseComposerJson },
  Gemfile: { language: 'Ruby', parser: parseGemfile },
  'pom.xml': { language: 'Java', parser: parsePomXml },
  'build.gradle': { language: 'Java/Kotlin', parser: parseBuildGradle },
  'build.gradle.kts': { language: 'Kotlin', parser: parseBuildGradle },
};

// Pre-compiled regex patterns shared across parsers (avoid re-creation per function call)
const REQUIREMENTS_LINE_PATTERN = /^([a-zA-Z0-9_-]+)([=<>!~]+)?(.+)?$/;
const TOML_DEPS_SECTION_PATTERN = /\[project\.dependencies\]([\s\S]*?)(?=\[|$)/;
const TOML_QUOTED_DEPS_PATTERN = /"([^"]+)"/g;
const PIPFILE_PACKAGES_PATTERN = /\[packages\]([\s\S]*?)(?=\[|$)/;
const PIPFILE_DEP_PATTERN = /^([a-zA-Z0-9_-]+)\s*=/;
const GO_REQUIRE_BLOCK_PATTERN = /require\s*\(([\s\S]*?)\)/;
const GO_DEP_LINE_PATTERN = /^([^\s]+)\s+([^\s]+)/;
const CARGO_DEPS_SECTION_PATTERN = /\[dependencies\]([\s\S]*?)(?=\[|$)/;
const CARGO_DEP_PATTERN = /^([a-zA-Z0-9_-]+)\s*=/;
const GRADLE_DEP_PATTERN = /(?:implementation|compile)\s*['"(]([^'"()]+)['"]/g;

function parsePackageJson(content: string): Partial<TechStackInfo> {
  try {
    const pkg = JSON.parse(content);
    const dependencies: DependencyInfo[] = [];
    const devDependencies: DependencyInfo[] = [];
    const frameworks: string[] = [];

    // Parse dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        dependencies.push({ name, version: String(version) });
        const fw = NODE_FRAMEWORK_MAP.get(name);
        if (fw) frameworks.push(fw);
      }
    }

    // Parse devDependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        devDependencies.push({ name, version: String(version), isDev: true });
        const fw = NODE_FRAMEWORK_MAP.get(name);
        if (fw) frameworks.push(fw);
      }
    }

    // Detect package manager
    let packageManager: string | undefined;
    if (pkg.packageManager) {
      const pm = String(pkg.packageManager);
      if (pm.startsWith('pnpm')) packageManager = 'pnpm';
      else if (pm.startsWith('yarn')) packageManager = 'yarn';
      else if (pm.startsWith('npm')) packageManager = 'npm';
      else if (pm.startsWith('bun')) packageManager = 'bun';
    }

    return {
      dependencies,
      devDependencies,
      frameworks,
      packageManager,
    };
  } catch {
    return {};
  }
}

function parseRequirementsTxt(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

    // Parse package==version or package>=version format
    const match = trimmed.match(REQUIREMENTS_LINE_PATTERN);
    if (match) {
      const name = match[1];
      const version = match[3];
      dependencies.push({ name, version });

      const fw = PYTHON_FRAMEWORK_MAP.get(name.toLowerCase());
      if (fw) frameworks.push(fw);
    }
  }

  // Skip per-parser dedup — detectTechStack() deduplicates all frameworks at the end
  return { dependencies, frameworks };
}

function parsePyprojectToml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Simple TOML parsing for dependencies
  const depsMatch = content.match(TOML_DEPS_SECTION_PATTERN);
  if (depsMatch) {
    const depsSection = depsMatch[1];
    TOML_QUOTED_DEPS_PATTERN.lastIndex = 0;
    const depLines = depsSection.match(TOML_QUOTED_DEPS_PATTERN);
    if (depLines) {
      for (const dep of depLines) {
        const name = dep
          .replace(/"/g, '')
          .split(/[=<>!~]/)[0]
          .trim();
        if (name) {
          dependencies.push({ name });
          const fw = PYTHON_FRAMEWORK_MAP.get(name.toLowerCase());
          if (fw) frameworks.push(fw);
        }
      }
    }
  }

  return { dependencies, frameworks };
}

function parsePipfile(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];

  // Simple parsing for [packages] section
  const packagesMatch = content.match(PIPFILE_PACKAGES_PATTERN);
  if (packagesMatch) {
    const lines = packagesMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(PIPFILE_DEP_PATTERN);
      if (match) {
        dependencies.push({ name: match[1] });
      }
    }
  }

  return { dependencies };
}

function parseGoMod(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse require block
  const requireMatch = content.match(GO_REQUIRE_BLOCK_PATTERN);
  if (requireMatch) {
    const lines = requireMatch[1].split('\n');
    for (const line of lines) {
      const match = line.trim().match(GO_DEP_LINE_PATTERN);
      if (match) {
        const name = match[1];
        const version = match[2];
        dependencies.push({ name, version });

        if (name.includes('gin-gonic/gin')) frameworks.push('Gin');
        if (name.includes('labstack/echo')) frameworks.push('Echo');
        if (name.includes('gofiber/fiber')) frameworks.push('Fiber');
      }
    }
  }

  return { dependencies, frameworks };
}

function parseCargoToml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse [dependencies] section
  const depsMatch = content.match(CARGO_DEPS_SECTION_PATTERN);
  if (depsMatch) {
    const lines = depsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(CARGO_DEP_PATTERN);
      if (match) {
        const name = match[1];
        dependencies.push({ name });

        if (name === 'actix-web') frameworks.push('Actix');
        if (name === 'axum') frameworks.push('Axum');
        if (name === 'rocket') frameworks.push('Rocket');
        if (name === 'tokio') frameworks.push('Tokio');
      }
    }
  }

  return { dependencies, frameworks };
}

function parseComposerJson(content: string): Partial<TechStackInfo> {
  try {
    const composer = JSON.parse(content);
    const dependencies: DependencyInfo[] = [];
    const frameworks: string[] = [];

    if (composer.require) {
      for (const [name, version] of Object.entries(composer.require)) {
        if (name !== 'php') {
          dependencies.push({ name, version: String(version) });

          if (name.startsWith('laravel/')) frameworks.push('Laravel');
          if (name.startsWith('symfony/')) frameworks.push('Symfony');
        }
      }
    }

    return { dependencies, frameworks };
  } catch {
    return {};
  }
}

function parseGemfile(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  const gemMatches = content.matchAll(/gem\s+['"]([^'"]+)['"]/g);
  for (const match of gemMatches) {
    const name = match[1];
    dependencies.push({ name });

    if (name === 'rails') frameworks.push('Rails');
    if (name === 'sinatra') frameworks.push('Sinatra');
  }

  return { dependencies, frameworks };
}

function parsePomXml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Line-by-line parsing instead of [\s\S]*? regex which has O(n²) backtracking potential
  // on large pom.xml files. Tracks whether we're inside a <dependency> block and extracts
  // <artifactId> values without any backtracking risk.
  let inDependency = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.includes('<dependency>')) {
      inDependency = true;
    }
    if (inDependency && trimmed.includes('<artifactId>')) {
      const start = trimmed.indexOf('<artifactId>') + 12;
      const end = trimmed.indexOf('</artifactId>', start);
      if (end > start) {
        const name = trimmed.slice(start, end).trim();
        dependencies.push({ name });
        if (name.includes('spring')) frameworks.push('Spring');
      }
    }
    if (trimmed.includes('</dependency>')) {
      inDependency = false;
    }
  }

  return { dependencies, frameworks };
}

function parseBuildGradle(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse implementation/compile dependencies
  GRADLE_DEP_PATTERN.lastIndex = 0;
  const depMatches = content.matchAll(GRADLE_DEP_PATTERN);
  for (const match of depMatches) {
    const dep = match[1];
    const parts = dep.split(':');
    const name = parts.length >= 2 ? parts[1] : dep;
    dependencies.push({ name });

    if (dep.includes('spring')) frameworks.push('Spring');
    if (dep.includes('ktor')) frameworks.push('Ktor');
  }

  return { dependencies, frameworks };
}

// Version manager files and their parsers
const VERSION_FILES: Record<string, (content: string) => RuntimeVersion[]> = {
  '.node-version': parseNodeVersion,
  '.nvmrc': parseNodeVersion,
  '.ruby-version': parseRubyVersion,
  '.python-version': parsePythonVersion,
  '.go-version': parseGoVersion,
  '.java-version': parseJavaVersion,
  '.tool-versions': parseToolVersions,
};

function parseNodeVersion(content: string): RuntimeVersion[] {
  const version = content.trim();
  if (version) {
    return [{ runtime: 'Node.js', version }];
  }
  return [];
}

function parseRubyVersion(content: string): RuntimeVersion[] {
  const version = content.trim();
  if (version) {
    return [{ runtime: 'Ruby', version }];
  }
  return [];
}

function parsePythonVersion(content: string): RuntimeVersion[] {
  const version = content.trim();
  if (version) {
    return [{ runtime: 'Python', version }];
  }
  return [];
}

function parseGoVersion(content: string): RuntimeVersion[] {
  const version = content.trim();
  if (version) {
    return [{ runtime: 'Go', version }];
  }
  return [];
}

function parseJavaVersion(content: string): RuntimeVersion[] {
  const version = content.trim();
  if (version) {
    return [{ runtime: 'Java', version }];
  }
  return [];
}

// Configuration files to detect
const CONFIG_FILE_PATTERNS: ReadonlySet<string> = new Set([
  // Package managers and dependencies
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'Cargo.lock',
  'composer.json',
  'composer.lock',
  'Gemfile',
  'Gemfile.lock',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'settings.gradle',
  'settings.gradle.kts',

  // TypeScript/JavaScript config
  'tsconfig.json',
  'jsconfig.json',

  // Build tools
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  'webpack.config.js',
  'webpack.config.ts',
  'rollup.config.js',
  'rollup.config.ts',
  'esbuild.config.js',
  'turbo.json',

  // Linters and formatters
  'biome.json',
  'biome.jsonc',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.js',
  '.stylelintrc',
  '.stylelintrc.json',

  // Version managers
  '.node-version',
  '.nvmrc',
  '.ruby-version',
  '.python-version',
  '.go-version',
  '.java-version',
  '.tool-versions',

  // Docker
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',

  // CI/CD
  '.github',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.circleci',
  '.travis.yml',

  // Editor config
  '.editorconfig',

  // Git
  '.gitignore',
  '.gitattributes',
]);

function parseToolVersions(content: string): RuntimeVersion[] {
  const versions: RuntimeVersion[] = [];
  const runtimeNameMap: Record<string, string> = {
    nodejs: 'Node.js',
    node: 'Node.js',
    ruby: 'Ruby',
    python: 'Python',
    golang: 'Go',
    go: 'Go',
    java: 'Java',
    rust: 'Rust',
    elixir: 'Elixir',
    erlang: 'Erlang',
    php: 'PHP',
    perl: 'Perl',
    deno: 'Deno',
    bun: 'Bun',
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const tool = parts[0].toLowerCase();
      const version = parts[1];
      const runtime = runtimeNameMap[tool] || tool;
      versions.push({ runtime, version });
    }
  }

  return versions;
}

/**
 * Detects tech stack from processed files.
 * Checks all dependency files including those in subdirectories,
 * so that monorepo setups with --include work correctly.
 */
export const detectTechStack = (processedFiles: ProcessedFile[]): TechStackInfo | null => {
  const result: TechStackInfo = {
    languages: [],
    frameworks: [],
    dependencies: [],
    devDependencies: [],
    runtimeVersions: [],
    configFiles: [],
  };

  let foundAny = false;

  for (const file of processedFiles) {
    const fileName = file.path.split('/').pop() || file.path;

    // Check dependency files
    const config = DEPENDENCY_FILES[fileName];
    if (config) {
      foundAny = true;
      result.languages.push(config.language);

      const parsed = config.parser(file.content);
      if (parsed.dependencies) {
        result.dependencies.push(...parsed.dependencies);
      }
      if (parsed.devDependencies) {
        result.devDependencies.push(...parsed.devDependencies);
      }
      if (parsed.frameworks) {
        result.frameworks.push(...parsed.frameworks);
      }
      if (parsed.packageManager && !result.packageManager) {
        result.packageManager = parsed.packageManager;
      }
    }

    // Check version manager files
    const versionParser = VERSION_FILES[fileName];
    if (versionParser) {
      foundAny = true;
      const versions = versionParser(file.content);
      result.runtimeVersions.push(...versions);
    }

    // Check configuration files
    if (CONFIG_FILE_PATTERNS.has(fileName)) {
      foundAny = true;
      result.configFiles.push(file.path);
    }
  }

  if (!foundAny) {
    return null;
  }

  // Deduplicate
  result.languages = [...new Set(result.languages)];
  result.frameworks = [...new Set(result.frameworks)];
  result.configFiles = [...new Set(result.configFiles)];
  result.dependencies = deduplicateDependencies(result.dependencies);
  result.devDependencies = deduplicateDependencies(result.devDependencies);
  result.runtimeVersions = deduplicateRuntimeVersions(result.runtimeVersions);

  return result;
};

const deduplicateDependencies = (deps: DependencyInfo[]): DependencyInfo[] => {
  const seen = new Map<string, DependencyInfo>();
  for (const dep of deps) {
    const key = `${dep.name}:${dep.version ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, dep);
    }
  }
  return [...seen.values()];
};

const deduplicateRuntimeVersions = (versions: RuntimeVersion[]): RuntimeVersion[] => {
  const seen = new Set<string>();
  return versions.filter((v) => {
    const normalizedVersion = v.version.replace(/^v/, '');
    const key = `${v.runtime}:${normalizedVersion}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Generates tech-stack.md content from detected tech stack.
 */
export const generateTechStackMd = (techStack: TechStackInfo): string => {
  const lines: string[] = ['# Tech Stack', ''];

  // Languages
  if (techStack.languages.length > 0) {
    lines.push('## Languages');
    lines.push('');
    for (const lang of techStack.languages) {
      lines.push(`- ${lang}`);
    }
    lines.push('');
  }

  // Frameworks
  if (techStack.frameworks.length > 0) {
    lines.push('## Frameworks');
    lines.push('');
    for (const fw of techStack.frameworks) {
      lines.push(`- ${fw}`);
    }
    lines.push('');
  }

  // Runtime Versions
  if (techStack.runtimeVersions.length > 0) {
    lines.push('## Runtime Versions');
    lines.push('');
    for (const rv of techStack.runtimeVersions) {
      lines.push(`- ${rv.runtime}: ${rv.version}`);
    }
    lines.push('');
  }

  // Package Manager
  if (techStack.packageManager) {
    lines.push('## Package Manager');
    lines.push('');
    lines.push(`- ${techStack.packageManager}`);
    lines.push('');
  }

  // Dependencies
  if (techStack.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    for (const dep of techStack.dependencies) {
      const version = dep.version ? ` (${dep.version})` : '';
      lines.push(`- ${dep.name}${version}`);
    }
    lines.push('');
  }

  // Dev Dependencies
  if (techStack.devDependencies.length > 0) {
    lines.push('## Dev Dependencies');
    lines.push('');
    for (const dep of techStack.devDependencies) {
      const version = dep.version ? ` (${dep.version})` : '';
      lines.push(`- ${dep.name}${version}`);
    }
    lines.push('');
  }

  // Configuration Files
  if (techStack.configFiles.length > 0) {
    lines.push('## Configuration Files');
    lines.push('');
    for (const file of techStack.configFiles) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
};
