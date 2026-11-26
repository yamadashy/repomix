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
  path: string;
  languages: string[];
  frameworks: string[];
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  packageManager?: string;
  runtimeVersions: RuntimeVersion[];
  configFiles: string[];
}

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

        // Detect frameworks
        if (name === 'react' || name === 'react-dom') frameworks.push('React');
        if (name === 'vue') frameworks.push('Vue');
        if (name === 'next') frameworks.push('Next.js');
        if (name === 'nuxt') frameworks.push('Nuxt');
        if (name === '@angular/core') frameworks.push('Angular');
        if (name === 'express') frameworks.push('Express');
        if (name === 'fastify') frameworks.push('Fastify');
        if (name === 'hono') frameworks.push('Hono');
        if (name === 'svelte') frameworks.push('Svelte');
      }
    }

    // Parse devDependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        devDependencies.push({ name, version: String(version), isDev: true });

        // Detect TypeScript
        if (name === 'typescript') frameworks.push('TypeScript');
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
      frameworks: [...new Set(frameworks)],
      packageManager,
    };
  } catch {
    return {};
  }
}

// The Python frameworks the summary lists, keyed by the distribution that provides them.
// A requirement named through a URL installs the same distribution as `name==version`,
// so both branches classify it through this table instead of only the short form.
const PYTHON_FRAMEWORKS: Record<string, string> = {
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  pytorch: 'PyTorch',
  torch: 'PyTorch',
  tensorflow: 'TensorFlow',
};

const detectPythonFramework = (name: string, frameworks: string[]): void => {
  const key = name.toLowerCase();
  // A requirement is free text, so it can name an `Object.prototype` member. Reading the
  // table by key alone answered `constructor` with a function, and that function was then
  // listed as a framework next to Django and Flask.
  if (!Object.hasOwn(PYTHON_FRAMEWORKS, key)) return;
  frameworks.push(PYTHON_FRAMEWORKS[key]);
};

function parseRequirementsTxt(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

    // pip also accepts a bare URL, a VCS URL and a local path as a requirement. Reading
    // those with the `name==version` pattern below took the scheme for a name: a
    // `git+https://...#egg=requests` line became a dependency called `git` and dropped
    // `requests`, and a wheel URL became one called `https`.
    if (REQUIREMENT_URL_START.test(trimmed) || trimmed.startsWith('.') || trimmed.startsWith('/')) {
      const fromUrl = requirementNameFromUrl(trimmed);
      if (fromUrl !== undefined) {
        dependencies.push({ name: fromUrl });
        detectPythonFramework(fromUrl, frameworks);
      }
      continue;
    }

    // Parse package==version or package>=version format. Extras (`pkg[all]==1.0`) belong to
    // neither the name nor the version, and `name @ url` is a direct reference, not a pin.
    const match = trimmed.match(REQUIREMENT_NAME);
    if (match) {
      const name = match[1];
      const rest = match[3] ?? '';
      const version = rest.startsWith('@') ? undefined : rest.replace(/^[=<>!~]+\s*/, '') || undefined;
      dependencies.push({ name, version });
      detectPythonFramework(name, frameworks);
    }
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

// A requirement that is a URL rather than `name==version`: `https://`, `file:`, and the
// VCS schemes pip prefixes with `git+`, `hg+`, `svn+` or `bzr+`.
const REQUIREMENT_URL_START = /^[a-z][a-z0-9+.-]*:/i;

// `name`, then optional extras, then whatever follows it (`==1.0`, `@ url`, `; marker`).
const REQUIREMENT_NAME = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(\[[^\]]*\])?\s*(.*)$/;

// The distribution a URL requirement installs. `#egg=` names it outright; otherwise the
// last path segment does (`.../requests.git`, `.../thing-1.0-py3-none-any.whl`), with the
// archive suffix and the version dropped. A URL that names no distribution — a bare `file:`
// path, a directory — yields nothing rather than a dependency called `https`.
const requirementNameFromUrl = (requirement: string): string | undefined => {
  const egg = /[#&]egg=([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(requirement);
  if (egg) return egg[1];
  // pip allows a trailing comment after whitespace. Left on, it rides along on the last
  // path segment, the suffix check below fails, and the dependency disappears.
  const withoutComment = requirement.replace(/\s+#.*$/, '');
  const pathPart = withoutComment.split(/[#?]/)[0].replace(/\/+$/, '');
  const last = pathPart.slice(pathPart.lastIndexOf('/') + 1);
  // A VCS revision follows the repository path (`repo.git@main`), so the segment ends at
  // the `@`; reading the whole thing lost the dependency whenever a revision was pinned.
  const revisionAt = last.indexOf('@');
  const segment = revisionAt === -1 ? last : last.slice(0, revisionAt);
  // Only a segment that carries a distribution's archive suffix names one. Anything else
  // is a directory or a path pip resolves at install time, and guessing a name from it
  // would put `wheels` or `local` in the dependency table.
  const archive = /\.(?:whl|zip|tgz|tar\.gz|tar\.bz2)$/i.test(segment);
  if (!archive && !/\.git$/i.test(segment)) return undefined;
  const base = archive ? segment.replace(/\.(?:whl|zip|tgz|tar\.gz|tar\.bz2)$/i, '') : segment.replace(/\.git$/i, '');
  // An sdist or wheel puts the version after the name (`thing-1.0-py3-none-any`,
  // `python-dateutil-2.8.2`), so the name ends at the first `-<digit>`. A repository has
  // no such marker and keeps its hyphens (`my-lib`), which the old pattern cut to `my`.
  const versionAt = archive ? base.search(/-\d/) : -1;
  const name = versionAt === -1 ? base : base.slice(0, versionAt);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !/[A-Za-z]/.test(name)) return undefined;
  return name;
};

// Matches a TOML table header line such as `[project]` or `[[tool.foo]]`. Dependency strings
// with extras like `"fastapi[all]"` start with a quote, so they are not mistaken for headers.
const TOML_TABLE_HEADER = /^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*(?:#.*)?$/;

// Returns the body lines of the TOML table named `tableName`, up to the next table header.
function getTomlTableLines(content: string, tableName: string): string[] | undefined {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.match(TOML_TABLE_HEADER)?.[1] === tableName);
  if (startIndex === -1) return undefined;

  const body: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (TOML_TABLE_HEADER.test(line)) break;
    body.push(line);
  }
  return body;
}

// Collects the string literals of the TOML array assigned to `key` (e.g. `dependencies = [...]`),
// which may span multiple lines. Brackets inside strings (extras such as `fastapi[all]`) are ignored.
function getTomlStringArray(lines: string[], key: string): string[] {
  const text = lines.join('\n');
  const keyMatch = new RegExp(`^\\s*${key}\\s*=\\s*\\[`, 'm').exec(text);
  if (!keyMatch) return [];

  const values: string[] = [];
  let index = keyMatch.index + keyMatch[0].length;
  while (index < text.length) {
    const char = text[index];
    if (char === ']') break;
    if (char === '#') {
      // Skip comments to the end of the line
      const newline = text.indexOf('\n', index);
      index = newline === -1 ? text.length : newline;
      continue;
    }
    if (char === '"' || char === "'") {
      const closing = text.indexOf(char, index + 1);
      if (closing === -1) break;
      values.push(text.slice(index + 1, closing));
      index = closing + 1;
      continue;
    }
    index++;
  }
  return values;
}

// Extracts the distribution name from a PEP 508 requirement such as `fastapi[all]>=0.1; python_version > "3.8"`
function getPep508Name(requirement: string): string | undefined {
  return requirement.trim().match(/^[A-Za-z0-9][A-Za-z0-9._-]*/)?.[0];
}

function parsePyprojectToml(content: string): Partial<TechStackInfo> {
  const names: string[] = [];

  // PEP 621: `dependencies = [...]` inside the [project] table
  const projectLines = getTomlTableLines(content, 'project');
  if (projectLines) {
    names.push(
      ...getTomlStringArray(projectLines, 'dependencies')
        .map(getPep508Name)
        .filter((name) => name !== undefined),
    );
  }

  // Non-standard [project.dependencies] table holding one quoted requirement per line
  const projectDepsLines = getTomlTableLines(content, 'project.dependencies');
  if (projectDepsLines) {
    for (const line of projectDepsLines) {
      const requirement = line.match(/^\s*(['"])(.+?)\1/)?.[2];
      const name = requirement && getPep508Name(requirement);
      if (name) names.push(name);
    }
  }

  // Poetry: `name = "^1.0"` or `name = { version = "^1.0", extras = [...] }`; `python` is the interpreter constraint
  const poetryLines = getTomlTableLines(content, 'tool.poetry.dependencies');
  if (poetryLines) {
    for (const line of poetryLines) {
      const name = line.match(/^\s*["']?([A-Za-z0-9][A-Za-z0-9._-]*)["']?\s*=/)?.[1];
      if (name && name.toLowerCase() !== 'python') names.push(name);
    }
  }

  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];
  // Poetry 2.x projects may declare the same package in both [project] and [tool.poetry.dependencies];
  // package names are case-insensitive (PEP 503), so keep only the first occurrence.
  const seen = new Set<string>();
  for (const name of names) {
    const normalizedName = name.toLowerCase().replace(/[-_.]+/g, '-');
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    dependencies.push({ name });
    if (name.toLowerCase() === 'django') frameworks.push('Django');
    if (name.toLowerCase() === 'flask') frameworks.push('Flask');
    if (name.toLowerCase() === 'fastapi') frameworks.push('FastAPI');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parsePipfile(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];

  // Simple parsing for [packages] section
  const packagesMatch = content.match(/\[packages\]([\s\S]*?)(?=\[|$)/);
  if (packagesMatch) {
    const lines = packagesMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
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
  const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
  if (requireMatch) {
    const lines = requireMatch[1].split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^\s]+)\s+([^\s]+)/);
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

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parseCargoToml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse [dependencies] section
  const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsMatch) {
    const lines = depsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
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

  return { dependencies, frameworks: [...new Set(frameworks)] };
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

    return { dependencies, frameworks: [...new Set(frameworks)] };
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

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parsePomXml(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Simple XML parsing for dependencies
  const depMatches = content.matchAll(/<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g);
  for (const match of depMatches) {
    const name = match[1];
    dependencies.push({ name });

    if (name.includes('spring')) frameworks.push('Spring');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

function parseBuildGradle(content: string): Partial<TechStackInfo> {
  const dependencies: DependencyInfo[] = [];
  const frameworks: string[] = [];

  // Parse implementation/compile dependencies in Groovy (`implementation 'g:a:v'`)
  // and Kotlin DSL (`implementation("g:a:v")`) form
  const depMatches = content.matchAll(/(?:implementation|compile)\s*(?:\(\s*)?['"]([^'"]+)['"]/g);
  for (const match of depMatches) {
    const dep = match[1];
    const parts = dep.split(':');
    const name = parts.length >= 2 ? parts[1] : dep;
    dependencies.push({ name });

    if (dep.includes('spring')) frameworks.push('Spring');
    if (dep.includes('ktor')) frameworks.push('Ktor');
  }

  return { dependencies, frameworks: [...new Set(frameworks)] };
}

// Version manager files that hold a single bare version string (e.g. `.node-version`,
// `.ruby-version`) all parse the same way: trim the content and, when non-empty, report
// it for the associated runtime. Build one parser per runtime from this shared logic.
const createSingleRuntimeParser =
  (runtime: string) =>
  (content: string): RuntimeVersion[] => {
    const version = content.trim();
    if (version) {
      return [{ runtime, version }];
    }
    return [];
  };

const parseNodeVersion = createSingleRuntimeParser('Node.js');
const parseRubyVersion = createSingleRuntimeParser('Ruby');
const parsePythonVersion = createSingleRuntimeParser('Python');
const parseGoVersion = createSingleRuntimeParser('Go');
const parseJavaVersion = createSingleRuntimeParser('Java');

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

// Configuration files to detect
const CONFIG_FILE_PATTERNS: string[] = [
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
];

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

const ROOT_DIR_LABEL = '.';

/**
 * Gets the directory path from a file path.
 * Returns ROOT_DIR_LABEL ('.') for root-level files.
 */
const getDirPath = (filePath: string): string => {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash === -1 ? ROOT_DIR_LABEL : filePath.substring(0, lastSlash);
};

/**
 * Detects tech stack from processed files, grouped by package directory.
 * Each directory containing a dependency file produces a separate TechStackInfo entry.
 */
export const detectTechStack = (processedFiles: ProcessedFile[]): TechStackInfo[] => {
  // First pass: find directories that have dependency files
  const packageDirs = new Set<string>();
  for (const file of processedFiles) {
    const fileName = file.path.split('/').pop() || file.path;
    if (DEPENDENCY_FILES[fileName]) {
      packageDirs.add(getDirPath(file.path));
    }
  }

  if (packageDirs.size === 0) {
    return [];
  }

  // Initialize result per directory
  const resultMap = new Map<string, TechStackInfo>();
  for (const dir of packageDirs) {
    resultMap.set(dir, {
      path: dir,
      languages: [],
      frameworks: [],
      dependencies: [],
      devDependencies: [],
      runtimeVersions: [],
      configFiles: [],
    });
  }

  // Second pass: assign files to their directory's TechStackInfo
  for (const file of processedFiles) {
    const fileName = file.path.split('/').pop() || file.path;
    const dirPath = getDirPath(file.path);
    const result = resultMap.get(dirPath);
    if (!result) continue;

    // Check dependency files
    const config = DEPENDENCY_FILES[fileName];
    if (config) {
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
      const versions = versionParser(file.content);
      result.runtimeVersions.push(...versions);
    }

    // Check configuration files
    if (CONFIG_FILE_PATTERNS.includes(fileName)) {
      result.configFiles.push(fileName);
    }
  }

  // Deduplicate within each package
  for (const result of resultMap.values()) {
    result.languages = [...new Set(result.languages)];
    result.frameworks = [...new Set(result.frameworks)];
    result.configFiles = [...new Set(result.configFiles)];
    result.dependencies = deduplicateByName(result.dependencies);
    result.devDependencies = deduplicateByName(result.devDependencies);
    result.runtimeVersions = deduplicateRuntimeVersions(result.runtimeVersions);
  }

  // Sort with (root) first, then alphabetically
  return [...resultMap.values()].sort((a, b) => {
    if (a.path === ROOT_DIR_LABEL) return -1;
    if (b.path === ROOT_DIR_LABEL) return 1;
    return a.path.localeCompare(b.path);
  });
};

const deduplicateByName = (deps: DependencyInfo[]): DependencyInfo[] => {
  const seen = new Set<string>();
  return deps.filter((dep) => {
    if (seen.has(dep.name)) return false;
    seen.add(dep.name);
    return true;
  });
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
 * Generates tech-stacks.md content from detected tech stacks.
 */
export const generateTechStackMd = (techStacks: TechStackInfo[]): string => {
  const lines: string[] = ['# Tech Stacks', ''];

  for (const techStack of techStacks) {
    lines.push(`## Tech Stack: ${techStack.path}`, '');

    // Languages
    if (techStack.languages.length > 0) {
      lines.push('### Languages');
      lines.push('');
      for (const lang of techStack.languages) {
        lines.push(`- ${lang}`);
      }
      lines.push('');
    }

    // Frameworks
    if (techStack.frameworks.length > 0) {
      lines.push('### Frameworks');
      lines.push('');
      for (const fw of techStack.frameworks) {
        lines.push(`- ${fw}`);
      }
      lines.push('');
    }

    // Runtime Versions
    if (techStack.runtimeVersions.length > 0) {
      lines.push('### Runtime Versions');
      lines.push('');
      for (const rv of techStack.runtimeVersions) {
        lines.push(`- ${rv.runtime}: ${rv.version}`);
      }
      lines.push('');
    }

    // Package Manager
    if (techStack.packageManager) {
      lines.push('### Package Manager');
      lines.push('');
      lines.push(`- ${techStack.packageManager}`);
      lines.push('');
    }

    // Dependencies
    if (techStack.dependencies.length > 0) {
      lines.push('### Dependencies');
      lines.push('');
      for (const dep of techStack.dependencies) {
        const version = dep.version ? ` (${dep.version})` : '';
        lines.push(`- ${dep.name}${version}`);
      }
      lines.push('');
    }

    // Dev Dependencies
    if (techStack.devDependencies.length > 0) {
      lines.push('### Dev Dependencies');
      lines.push('');
      for (const dep of techStack.devDependencies) {
        const version = dep.version ? ` (${dep.version})` : '';
        lines.push(`- ${dep.name}${version}`);
      }
      lines.push('');
    }

    // Configuration Files
    if (techStack.configFiles.length > 0) {
      lines.push('### Configuration Files');
      lines.push('');
      for (const file of techStack.configFiles) {
        lines.push(`- ${file}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
};
